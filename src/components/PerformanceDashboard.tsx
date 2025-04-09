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
  ResponsiveContainer
} from 'recharts';
import useJupiterTrading from '@/lib/jupiter';

interface Trade {
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
}

interface PnLDataPoint {
  time: string;
  pnl: number;
}

interface PerformanceDashboardProps {
  allocatedCapital?: number;
  maxDrawdown?: number;
  profitTarget?: number;
  slippage?: number;
  tradeHistory?: any[];
  activePositions?: any[];
}

export default function PerformanceDashboard({
  allocatedCapital = 0.05,
  maxDrawdown = 20,
  profitTarget = 30,
  slippage = 0.5,
  tradeHistory = [],
  activePositions = []
}: PerformanceDashboardProps) {
  const [activeTab, setActiveTab] = useState<'livePnL' | 'openPositions' | 'recentTrades' | 'account'>('livePnL');
  const [botStatus, setBotStatus] = useState<'ready' | 'running' | 'stopped'>('ready');
  const [pnlData, setPnlData] = useState<PnLDataPoint[]>([]);
  const [totalPnl, setTotalPnl] = useState<number>(0);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Get Jupiter trading functions and wallet info
  const { isWalletConnected, walletPublicKey } = useJupiterTrading();
  
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
  
  // Update trades and positions from props
  useEffect(() => {
    if (tradeHistory && tradeHistory.length > 0) {
      const formattedTrades = tradeHistory.map((trade, index) => ({
        id: trade.id || `trade-${index}`,
        pair: trade.pair,
        side: trade.action,
        amount: trade.amount,
        price: parseFloat(trade.price) || 0,
        timestamp: trade.timestamp,
        status: trade.success ? 'completed' : 'failed',
        pnl: 0, // Will be calculated later
        signature: trade.signature
      }));
      
      setTrades(formattedTrades);
      
      // Calculate total PnL based on trades
      let calculatedPnl = 0;
      formattedTrades.forEach(trade => {
        if (trade.status === 'completed') {
          // Simple PnL calculation for demonstration
          calculatedPnl += trade.side === 'buy' ? -trade.amount : trade.amount;
        }
      });
      
      setTotalPnl(calculatedPnl);
      
      // Update PnL data for chart
      if (formattedTrades.length > 0) {
        const newPnlData = [...pnlData];
        const lastIndex = Math.min(formattedTrades.length, newPnlData.length) - 1;
        newPnlData[lastIndex].pnl = calculatedPnl;
        setPnlData(newPnlData);
      }
    }
    
    if (activePositions && activePositions.length > 0) {
      const formattedPositions = activePositions.map((position, index) => ({
        id: position.id || `position-${index}`,
        pair: position.pair,
        side: position.action,
        amount: position.amount,
        entryPrice: position.entryPrice,
        currentPrice: position.entryPrice, // Will be updated with real data
        pnl: 0, // Will be calculated later
        timestamp: position.timestamp
      }));
      
      setPositions(formattedPositions);
    }
  }, [tradeHistory, activePositions]);
  
  // Fetch wallet balance
  useEffect(() => {
    const fetchWalletBalance = async () => {
      if (isWalletConnected && walletPublicKey) {
        try {
          const response = await fetch(`https://api.mainnet-beta.solana.com`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              "jsonrpc": "2.0",
              "id": 1,
              "method": "getBalance",
              "params": [walletPublicKey]
            })
          });
          
          const data = await response.json();
          if (data.result?.value) {
            setWalletBalance(data.result.value / 1000000000); // Convert lamports to SOL
          }
        } catch (error) {
          console.error('Error fetching wallet balance:', error);
          setError('Failed to fetch wallet balance');
        }
      }
    };
    
    fetchWalletBalance();
    
    // Fetch balance every 30 seconds
    const intervalId = setInterval(fetchWalletBalance, 30000);
    
    return () => clearInterval(intervalId);
  }, [isWalletConnected, walletPublicKey]);
  
  // Fetch current SOL price
  useEffect(() => {
    const fetchSolPrice = async () => {
      try {
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
        const data = await response.json();
        
        if (data && data.solana && data.solana.usd) {
          // Update positions with current price
          setPositions(prevPositions => 
            prevPositions.map(position => {
              const currentPrice = data.solana.usd;
              const priceDiff = position.side === 'buy' 
                ? currentPrice - position.entryPrice 
                : position.entryPrice - currentPrice;
              const pnl = priceDiff * position.amount;
              
              return {
                ...position,
                currentPrice,
                pnl
              };
            })
          );
        }
      } catch (error) {
        console.error('Error fetching SOL price:', error);
      }
    };
    
    fetchSolPrice();
    
    // Fetch price every minute
    const intervalId = setInterval(fetchSolPrice, 60000);
    
    return () => clearInterval(intervalId);
  }, []);
  
  // Calculate actual allocated capital
  const actualAllocatedCapital = walletBalance !== null ? walletBalance : allocatedCapital;
  
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
            {positions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-700">
                  <thead className="bg-gray-700">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Pair</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Side</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Amount</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Entry Price</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Current PnL</th>
                    </tr>
                  </thead>
                  <tbody className="bg-gray-800 divide-y divide-gray-700">
                    {positions.map((position) => (
                      <tr key={position.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{position.pair}</td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${position.side === 'buy' ? 'text-green-500' : 'text-red-500'}`}>
                          {position.side.toUpperCase()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{position.amount}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">${position.entryPrice.toFixed(2)}</td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${position.pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {position.pnl >= 0 ? '+' : ''}{position.pnl.toFixed(2)} SOL
                        </td>
                      </tr>
                    ))}
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
            {trades.length > 0 ? (
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
                    {trades.map((trade) => (
                      <tr key={trade.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          {new Date(trade.timestamp).toLocaleTimeString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{trade.pair}</td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${trade.side === 'buy' ? 'text-green-500' : 'text-red-500'}`}>
                          {trade.side.toUpperCase()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{trade.amount}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">${trade.price.toFixed(2)}</td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${trade.status === 'completed' ? 'text-green-500' : 'text-red-500'}`}>
                          {trade.status}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          {trade.signature && !trade.signature.startsWith('simulated') ? (
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
                <div className="text-sm text-gray-400">Allocated Capital</div>
                <div className="text-xl font-bold text-white">{actualAllocatedCapital.toFixed(4)} SOL</div>
              </div>
              <div className="bg-gray-700 p-4 rounded-lg">
                <div className="text-sm text-gray-400">Max Drawdown</div>
                <div className="text-xl font-bold text-white">{maxDrawdown}%</div>
              </div>
              <div className="bg-gray-700 p-4 rounded-lg">
                <div className="text-sm text-gray-400">Profit Target</div>
                <div className="text-xl font-bold text-white">{profitTarget}%</div>
              </div>
              <div className="bg-gray-700 p-4 rounded-lg">
                <div className="text-sm text-gray-400">Slippage</div>
                <div className="text-xl font-bold text-white">{slippage}%</div>
              </div>
              {walletPublicKey && (
                <div className="bg-gray-700 p-4 rounded-lg col-span-2">
                  <div className="text-sm text-gray-400">Wallet Address</div>
                  <div className="text-md font-mono text-white truncate">
                    {walletPublicKey}
                  </div>
                  <a 
                    href={`https://solscan.io/account/${walletPublicKey}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:underline text-sm mt-1 inline-block"
                  >
                    View on Solscan
                  </a>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 pt-6 border-t border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full mr-2 ${
              botStatus === 'running' ? 'bg-green-500' : 
              botStatus === 'ready' ? 'bg-yellow-500' : 'bg-red-500'
            }`}></div>
            <span className="text-gray-300">
              Bot {botStatus === 'running' ? 'running' : botStatus === 'ready' ? 'not ready' : 'stopped'}
            </span>
          </div>
          <button
            onClick={() => setBotStatus(botStatus === 'running' ? 'stopped' : 'running')}
            className={`px-4 py-2 rounded-md font-medium ${
              botStatus === 'running' 
                ? 'bg-red-600 hover:bg-red-700 text-white' 
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
            disabled={!isWalletConnected || botStatus === 'ready'}
          >
            {botStatus === 'running' ? 'Stop Bot' : 'Start Bot'}
          </button>
        </div>
      </div>
    </div>
  );
}
