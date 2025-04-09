'use client';

import { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
// Remove unused Jupiter hook import if wallet info isn't needed directly here
// import useJupiterTrading from '@/lib/jupiter';
import { useConnection, useWallet } from '@solana/wallet-adapter-react'; // Import useConnection and useWallet
// Import Zustand store and types
import useBotStore, { Trade } from '@/store/useBotStore';
import { Position } from '@/lib/safetyFeatures'; // Import Position type

// Remove local Trade/Position interfaces if using store types
/* interface Trade {
  id: string;
  pair: string;
  side: string;
  amount: number;
  price: number;
  timestamp: string;
  status: string;
  pnl: number;
  signature?: string;
}

interface Position {
  id: string;
  pair: string;
  side: string;
  amount: number;
  entryPrice: number;
  currentPrice: number;
  pnl: number;
  timestamp: string;
} */

interface PnLDataPoint {
  time: string;
  pnl: number;
}

// Remove props interface
// interface PerformanceDashboardProps { ... }

// Remove props from function signature
export default function PerformanceDashboard() {
  // Get state from Zustand store
  const {
    activePositions, // Use directly from store
    tradeHistory,    // Use directly from store
    settings,        // Get settings for display in Account tab
    // status: botStatus, // Get bot status from store - remove if not used directly
  } = useBotStore((state) => ({
    activePositions: state.activePositions,
    tradeHistory: state.tradeHistory,
    settings: state.settings,
    // status: state.status, // Remove if not used directly
  }));

  // Get wallet info and connection directly using hooks
  const { publicKey: walletPublicKey, connected: isWalletConnected } = useWallet();
  const { connection } = useConnection(); // Get the configured connection object

  // Local state for UI and derived data
  const [activeTab, setActiveTab] = useState<'livePnL' | 'openPositions' | 'recentTrades' | 'account'>('livePnL');
  const [pnlData, setPnlData] = useState<PnLDataPoint[]>([]); // Keep for chart formatting
  const [totalPnl, setTotalPnl] = useState<number>(0); // Keep for display calculation
  const [walletBalance, setWalletBalance] = useState<number | null>(null); // Keep for Account tab display
  const [error, setError] = useState<string | null>(null); // Keep for local fetch errors (e.g., balance fetch)
  // Remove local state for trades and positions
  // const [trades, setTrades] = useState<Trade[]>([]);
  // const [positions, setPositions] = useState<Position[]>([]);
  // Remove local botStatus state
  // const [botStatus, setBotStatus] = useState<'ready' | 'running' | 'stopped'>('ready');


  // Initialize with empty PnL data
  useEffect(() => {
    const hours = Array.from({ length: 8 }, (_, i) => {
      const hour = 9 + i;
      return hour < 10 ? `0${hour}:00` : `${hour}:00`;
    });
    
    const initialPnlData = hours.map((time, index) => ({
      time,
      pnl: 0
    }));
    
    setPnlData(initialPnlData);
  }, []);

  // Update derived state (like PnL) based on store changes
  useEffect(() => {
    // Calculate total PnL based on store's tradeHistory
    // TODO: Implement a more accurate PnL calculation based on entry/exit prices
    let calculatedPnl = 0;
    tradeHistory.forEach(trade => {
      if (trade.success && trade.pnl !== undefined) { // Check if PnL exists
        calculatedPnl += trade.pnl;
      } else if (trade.success) {
        // Simple PnL calculation placeholder if trade.pnl is not set
        // This needs refinement based on how PnL is calculated upon trade closure
        // calculatedPnl += trade.action === 'buy' ? -trade.amount : trade.amount; // Example placeholder
      }
    });
    setTotalPnl(calculatedPnl); // Update local PnL state

    // Update PnL data for chart (example - needs real data source/logic)
    if (tradeHistory.length > 0) {
      const newPnlData = [...pnlData]; // Use existing pnlData structure
      const lastIndex = Math.min(tradeHistory.length, newPnlData.length) - 1;
      if (lastIndex >= 0) {
         newPnlData[lastIndex].pnl = calculatedPnl; // Update last point
         setPnlData(newPnlData);
      }
    }
    // No need to set local trades/positions state anymore
    /*
    if (tradeHistory && tradeHistory.length > 0) { ... setTrades ... }
    if (activePositions && activePositions.length > 0) { ... setPositions ... }
    */
  }, [tradeHistory, pnlData]); // Depend on store's tradeHistory and local pnlData structure

  // Fetch wallet balance using the connection from the wallet adapter context
  useEffect(() => {
    const fetchWalletBalance = async () => {
      // Use connection object from useConnection hook
      if (isWalletConnected && walletPublicKey && connection) {
        try {
          // Use connection.getBalance method
          const balanceLamports = await connection.getBalance(walletPublicKey);
          setWalletBalance(balanceLamports / 1000000000); // Convert lamports to SOL
        } catch (error) {
          console.error('Error fetching wallet balance:', error);
          setError('Failed to fetch wallet balance');
        }
      } else {
        setWalletBalance(null); // Reset balance if wallet disconnects
      }
    };

    fetchWalletBalance();

    // Fetch balance every 30 seconds
    const intervalId = setInterval(fetchWalletBalance, 30000);

    return () => clearInterval(intervalId);
  }, [isWalletConnected, walletPublicKey, connection]); // Add connection to dependency array

  // Remove the redundant CoinGecko price fetching useEffect
  /*
  useEffect(() => {
    // ... removed fetchSolPrice logic ...
  }, []);
  */

  // Use settings from store for display where applicable
  // const { allocatedCapital, maxDrawdown, profitTarget, slippage } = settings; // Remove these if not in store yet
  const displayAllocatedCapital = walletBalance !== null ? walletBalance : 0; // Default to 0 if balance not fetched

  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
      {error && (
        <div className="bg-red-900/50 p-4 rounded-md mb-4">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
            <span className="text-red-300">{error}</span>
          </div>
        </div>
      )}
      
      <div className="flex mb-4 border-b border-gray-700">
        <button
          className={`px-4 py-2 font-medium ${activeTab === 'livePnL' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-400 hover:text-gray-300'}`}
          onClick={() => setActiveTab('livePnL')}
        >
          Live PnL
        </button>
        <button
          className={`px-4 py-2 font-medium ${activeTab === 'openPositions' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-400 hover:text-gray-300'}`}
          onClick={() => setActiveTab('openPositions')}
        >
          Open Positions
        </button>
        <button
          className={`px-4 py-2 font-medium ${activeTab === 'recentTrades' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-400 hover:text-gray-300'}`}
          onClick={() => setActiveTab('recentTrades')}
        >
          Recent Trades
        </button>
        <button
          className={`px-4 py-2 font-medium ${activeTab === 'account' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-400 hover:text-gray-300'}`}
          onClick={() => setActiveTab('account')}
        >
          Account
        </button>
      </div>

      <div className="mt-4">
        {activeTab === 'livePnL' && (
          <div>
            <div className="mb-4 flex items-center">
              <h3 className="text-xl font-bold text-white">Live PnL</h3>
              <span className={`ml-4 text-2xl font-bold ${totalPnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {totalPnl >= 0 ? '+' : ''}{totalPnl.toFixed(2)} SOL
              </span>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={pnlData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="time" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151' }}
                    labelStyle={{ color: '#F9FAFB' }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="pnl" 
                    stroke="#10B981" 
                    activeDot={{ r: 8 }} 
                    name="PnL (SOL)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {activeTab === 'openPositions' && (
          <div>
            <h3 className="text-xl font-bold text-white mb-4">Open Positions</h3>
            {/* Use activePositions from store */}
            {activePositions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-700">
                  <thead className="bg-gray-700">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Pair</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Side</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Amount</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Entry Price</th>
                      {/* PnL calculation needs current price - display placeholder or calculate if price available */}
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Unrealized PnL</th>
                    </tr>
                  </thead>
                  <tbody className="bg-gray-800 divide-y divide-gray-700">
                    {/* Map over storeActivePositions */}
                    {activePositions.map((position) => {
                       // TODO: Calculate PnL based on current price fetched elsewhere
                       const currentPrice = position.entryPrice; // Placeholder - needs real-time price
                       const priceDiff = position.action === 'buy'
                         ? currentPrice - position.entryPrice
                         : position.entryPrice - currentPrice;
                       const pnl = priceDiff * position.amount; // Simple PnL placeholder

                       return (
                         <tr key={position.id}>
                           <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{position.pair}</td>
                           <td className={`px-6 py-4 whitespace-nowrap text-sm ${position.action === 'buy' ? 'text-green-500' : 'text-red-500'}`}>
                             {position.action.toUpperCase()}
                           </td>
                           <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{position.amount}</td>
                           <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">${position.entryPrice.toFixed(4)}</td>
                           <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                             {/* Display calculated PnL */}
                             {pnl >= 0 ? '+' : ''}{pnl.toFixed(4)} {/* Assuming PnL in quote currency? Needs clarification */}
                           </td>
                         </tr>
                       );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">No open positions</div>
            )}
          </div>
        )}

        {activeTab === 'recentTrades' && (
          <div>
            <h3 className="text-xl font-bold text-white mb-4">Recent Trades</h3>
            {/* Use tradeHistory from store */}
            {tradeHistory.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-700">
                  <thead className="bg-gray-700">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Time</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Pair</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Side</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Amount</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Price</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Transaction</th>
                    </tr>
                  </thead>
                  <tbody className="bg-gray-800 divide-y divide-gray-700">
                     {/* Map over storeTradeHistory */}
                    {tradeHistory.map((trade) => (
                      <tr key={trade.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          {new Date(trade.timestamp).toLocaleTimeString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{trade.pair}</td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${trade.action === 'buy' ? 'text-green-500' : 'text-red-500'}`}>
                          {trade.action.toUpperCase()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{trade.amount}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">${Number(trade.price).toFixed(4)}</td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${trade.success ? 'text-green-500' : 'text-red-500'}`}>
                          {trade.success ? 'Completed' : 'Failed'} {/* Use Completed/Failed */}
                        </td>
                         {/* Add Transaction Link Column */}
                         <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                           {trade.signature && !trade.signature.startsWith('sim') ? (
                             <a
                               href={`https://solscan.io/tx/${trade.signature}`}
                               target="_blank"
                               rel="noopener noreferrer"
                               className="text-blue-400 hover:underline"
                             >
                               View
                             </a>
                           ) : (
                             <span className="text-gray-500">N/A</span>
                           )}
                         </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">No recent trades</div>
            )}
          </div>
        )}

        {activeTab === 'account' && (
          <div>
            <h3 className="text-xl font-bold text-white mb-4">Account</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-700 p-4 rounded-lg">
                <div className="text-sm text-gray-400">Wallet Balance</div>
                <div className="text-xl font-bold text-white">
                    {walletBalance !== null ? `${walletBalance.toFixed(4)} SOL` : 'Loading...'}
                </div>
              </div>
               {/* Display settings from store */}
               <div className="bg-gray-700 p-4 rounded-lg">
                 <div className="text-sm text-gray-400">Stop Loss Setting</div>
                 <div className="text-xl font-bold text-white">{settings.stopLossPercentage}%</div>
               </div>
               <div className="bg-gray-700 p-4 rounded-lg">
                 <div className="text-sm text-gray-400">Take Profit Setting</div>
                 <div className="text-xl font-bold text-white">{settings.takeProfitPercentage}%</div>
               </div>
               <div className="bg-gray-700 p-4 rounded-lg">
                 <div className="text-sm text-gray-400">Trading Pair</div>
                 <div className="text-xl font-bold text-white">{settings.pair}</div>
               </div>
              {walletPublicKey && (
                <div className="bg-gray-700 p-4 rounded-lg col-span-2">
                  <div className="text-sm text-gray-400">Connected Wallet</div>
                  <div className="text-md font-mono text-white truncate">
                    {walletPublicKey?.toBase58() ?? 'Not Connected'} {/* Display wallet key */}
                  </div>
                  {walletPublicKey && ( // Only show link if connected
                    <a
                      href={`https://solscan.io/account/${walletPublicKey.toBase58()}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:underline text-sm mt-1 inline-block"
                  >
                    View on Solscan
                  </a>
                  )} {/* Add missing closing parenthesis */}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Remove redundant bot status/controls section */}
      {/*
      <div className="mt-6 pt-6 border-t border-gray-700"> ... </div>
      */}
    </div>
  );
}
