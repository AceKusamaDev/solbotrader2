'use client';

import React, { useState, useEffect, useRef } from 'react'; // Import useRef
import { useWallet } from '@solana/wallet-adapter-react'; // Import useWallet
import { DEFAULT_STOP_LOSS_CONFIG, Position, checkStopLoss, formatStopLossMessage } from '@/lib/safetyFeatures';
// Remove .ts extension from import
import useJupiterTrading, { SOL_MINT, USDC_MINT } from '@/lib/jupiter'; 

// Define StrategyParams interface
export interface StrategyParams {
  type: string;
  indicators: Array<{
    type: string;
    parameters: any;
  }>;
  amount: number;
  pair: string;
  action: 'buy' | 'sell';
}

// Define Trade interface for state typing
interface Trade {
  timestamp: string;
  pair: string;
  action: 'buy' | 'sell';
  amount: number;
  price: string; // Keep as string since it's sometimes '0' on failure
  strategy: string;
  success: boolean;
  signature?: string; // Optional signature
  error?: string; // Optional error message
}

// BotControl component with real trading functionality
// Add explicit type for strategyParams prop
const BotControl = ({ strategyParams }: { strategyParams: StrategyParams }) => { 
  const [isRunning, setIsRunning] = useState(false);
  const [isTestMode, setIsTestMode] = useState(true);
  // Use Trade type for state
  const [lastTrade, setLastTrade] = useState<Trade | null>(null); 
  const [tradeHistory, setTradeHistory] = useState<Trade[]>([]); 
  const [activePositions, setActivePositions] = useState<Position[]>([]);
  const [stopLossConfig, setStopLossConfig] = useState(DEFAULT_STOP_LOSS_CONFIG);
  const [stopLossTriggered, setStopLossTriggered] = useState(false);
  const [stopLossMessage, setStopLossMessage] = useState('');
  // Use useRef to store the interval ID
  const tradingIntervalRef = useRef<NodeJS.Timeout | null>(null); 
  const [isProcessingTrade, setIsProcessingTrade] = useState(false);

  // Get wallet context using useWallet hook
  const { publicKey, connected: isWalletConnected, sendTransaction } = useWallet(); 
  
  // Get Jupiter trading function (no longer provides wallet state)
  const { executeTradeWithStrategy } = useJupiterTrading(); 
  
  // Clean up interval on unmount
  useEffect(() => {
    // Return a cleanup function
    return () => {
      // Clear the interval using the ref's current value
      if (tradingIntervalRef.current) { 
        clearInterval(tradingIntervalRef.current);
      }
    };
  }, []); // Empty dependency array ensures this runs only on mount and unmount
  
  // Function to start trading bot
  const startBot = async () => {
    // Use connected and publicKey from useWallet
    if (!isWalletConnected || !publicKey) { 
      alert("Please connect your Phantom wallet first");
      return;
    }
    
    setIsRunning(true);
    setStopLossTriggered(false);
    setStopLossMessage('');
    
    if (isTestMode) {
      simulateTrading();
    } else {
      // Real trading mode
      startRealTrading();
    }
  };
  
  // Function to stop trading bot
  const stopBot = () => {
    setIsRunning(false);
    // Clear interval using the ref
    if (tradingIntervalRef.current) { 
      clearInterval(tradingIntervalRef.current);
      tradingIntervalRef.current = null; // Reset the ref
    }
  };
  
  // Function to toggle test mode
  const toggleTestMode = () => {
    if (isRunning) {
      alert("Please stop the bot before changing modes");
      return;
    }
    setIsTestMode(!isTestMode);
  };
  
  // Function to handle stop loss
  const handleStopLoss = async (position: Position, currentPrice: number) => {
    if (checkStopLoss(position, currentPrice, stopLossConfig)) {
      // Stop loss triggered
      const message = formatStopLossMessage(position, currentPrice, stopLossConfig);
      console.log(message);
      
      if (!isTestMode) {
        // Execute real exit trade for stop loss
        try {
          setIsProcessingTrade(true);
          
          // Determine token mints based on pair
          const [baseCurrency, quoteCurrency] = position.pair.split('/');
          const inputMint = position.action === 'buy' ? SOL_MINT : USDC_MINT;
          const outputMint = position.action === 'buy' ? USDC_MINT : SOL_MINT;
          
          // Execute opposite action for exit
          const exitAction = position.action === 'buy' ? 'sell' : 'buy';
          
          // Convert amount to lamports/smallest unit
          const amountInSmallestUnit = (position.amount * 1000000000).toString(); // For SOL to lamports
          
          // Execute trade with Jupiter
          const result = await executeTradeWithStrategy(
            inputMint,
            outputMint,
            amountInSmallestUnit,
            0.5, // Use fixed 0.5% slippage like regular trades
            'Stop Loss',
            // Pass wallet context
            publicKey,
            sendTransaction,
            publicKey?.toBase58() || null 
          );
          
          if (result.success) {
            // Create exit trade record
            const now = new Date();
            // Cast exitAction to the correct type
            const exitTrade: Trade = { 
              timestamp: now.toISOString(),
              pair: position.pair,
              action: exitAction as 'buy' | 'sell', 
              amount: position.amount,
              price: currentPrice.toFixed(2),
              strategy: 'Stop Loss',
              success: true,
              signature: result.signature,
            };
            
            // Update trade history
            setLastTrade(exitTrade);
            setTradeHistory(prev => [exitTrade, ...prev].slice(0, 10));
            
            // Remove position from active positions
            setActivePositions(prev => prev.filter(p => p.id !== position.id));
            
            // Set stop loss message
            setStopLossTriggered(true);
            setStopLossMessage(message);
          } else {
            console.error('Stop loss trade failed:', result.error);
          }
        } catch (error) {
          console.error('Error executing stop loss:', error);
        } finally {
          setIsProcessingTrade(false);
        }
      } else {
        // Test mode - simulate exit trade
        const exitAction = position.action === 'buy' ? 'sell' : 'buy';
        const now = new Date();
        // Cast exitAction to the correct type
        const exitTrade: Trade = { 
          timestamp: now.toISOString(),
          pair: position.pair,
          action: exitAction as 'buy' | 'sell', 
          amount: position.amount,
          price: currentPrice.toFixed(2),
          strategy: 'Stop Loss',
          success: true,
          signature: 'simulated_stop_loss_' + Math.random().toString(36).substring(2, 15),
        };
        
        // Update trade history
        setLastTrade(exitTrade);
        setTradeHistory(prev => [exitTrade, ...prev].slice(0, 10));
        
        // Remove position from active positions
        setActivePositions(prev => prev.filter(p => p.id !== position.id));
        
        // Set stop loss message
        setStopLossTriggered(true);
        setStopLossMessage(message);
      }
      
      return true;
    }
    return false;
  };
  
  // Simulate trading activity for demonstration (test mode only)
  const simulateTrading = () => {
    const interval = setInterval(() => {
      if (!isRunning) {
        clearInterval(interval);
        return;
      }
      
      const now = new Date();
      const action = Math.random() > 0.5 ? 'buy' : 'sell';
      const price = parseFloat((Math.random() * 100 + 50).toFixed(2));
      const amount = parseFloat((Math.random() * strategyParams.amount).toFixed(3));
      
      // Create simulated trade
      // Cast action to the correct type
      const trade: Trade = { 
        timestamp: now.toISOString(),
        pair: strategyParams.pair,
        action: action as 'buy' | 'sell', 
        amount,
        price: price.toString(), // Ensure price is string
        strategy: strategyParams.type,
        success: Math.random() > 0.1, // 90% success rate
        signature: 'simulated_tx_' + Math.random().toString(36).substring(2, 15),
      };
      
      // Update trade history
      setLastTrade(trade);
      setTradeHistory(prev => [trade, ...prev].slice(0, 10));
      
      // If trade is successful, add to active positions
      if (trade.success) {
        const newPosition: Position = {
          id: `pos-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          pair: trade.pair,
          entryPrice: price,
          amount,
          timestamp: trade.timestamp,
          action: action as 'buy' | 'sell',
        };
        
        setActivePositions(prev => [...prev, newPosition]);
      }
      
      // Check stop loss for all active positions
      setActivePositions(prev => {
        const updatedPositions = [...prev];
        
        // Simulate price movement for each position
        for (const position of [...updatedPositions]) {
          // Simulate current price with some random movement
          const priceMovement = (Math.random() * 6) - 3; // -3% to +3%
          const currentPrice = position.entryPrice * (1 + priceMovement / 100);
          
          // Check if stop loss should be triggered
          handleStopLoss(position, currentPrice);
        }
        
        return updatedPositions.filter(p => 
          !handleStopLoss(p, p.entryPrice * (1 - (Math.random() * 5) / 100))
        );
      });
      
    }, 10000); // Simulate a trade every 10 seconds
    
    // Store interval ID in the ref
    tradingIntervalRef.current = interval; 
  };
  
  // Start real trading with Jupiter
  const startRealTrading = async () => {
    // Remove check for walletPublicKey (no longer exists here)
    if (!isWalletConnected || !publicKey) { 
      alert("Please connect your Phantom wallet first");
      return;
    }
    
    // Execute initial trade based on strategy parameters
    await executeRealTrade();
    
    // Set up interval for periodic trading
    const interval = setInterval(async () => {
      if (!isRunning) {
        clearInterval(interval);
        return;
      }
      
      // Execute trade based on strategy
      await executeRealTrade();
      
      // Check stop loss for all active positions
      const currentPrice = await fetchCurrentPrice(strategyParams.pair);
      
      if (currentPrice) {
        for (const position of [...activePositions]) {
          await handleStopLoss(position, currentPrice);
        }
      }
      
    }, 60000); // Execute a trade every minute
    
    // Store interval ID in the ref
    tradingIntervalRef.current = interval; 
  };
  
  // Execute a real trade using Jupiter
  const executeRealTrade = async () => {
    if (isProcessingTrade) return;
    
    try {
      setIsProcessingTrade(true);
      
      // Determine token mints based on pair
      const [baseCurrency, quoteCurrency] = strategyParams.pair.split('/');
      const inputMint = strategyParams.action === 'buy' ? USDC_MINT : SOL_MINT;
      const outputMint = strategyParams.action === 'buy' ? SOL_MINT : USDC_MINT;
      
      // Convert amount to lamports/smallest unit
      const amountInSmallestUnit = (strategyParams.amount * 1000000000).toString(); // For SOL to lamports
      
      console.log(`Executing real trade: ${strategyParams.action} ${strategyParams.amount} ${strategyParams.pair}`);
      
      // Execute trade with Jupiter
      const result = await executeTradeWithStrategy(
        inputMint,
            outputMint,
            amountInSmallestUnit,
            0.5, // 0.5% slippage
            strategyParams.type,
            // Pass wallet context
            publicKey,
            sendTransaction,
            publicKey?.toBase58() || null
          );
          
          console.log('Trade result:', result);
      
      if (result.success) {
        // Get current price
        const currentPrice = await fetchCurrentPrice(strategyParams.pair) || 
                            parseFloat((Math.random() * 100 + 50).toFixed(2)); // Fallback to random price
        
        // Create trade record
        const now = new Date();
        // Ensure type safety
        const trade: Trade = { 
          timestamp: now.toISOString(),
          pair: strategyParams.pair,
          action: strategyParams.action, // Already 'buy' | 'sell' from StrategyParams
          amount: strategyParams.amount,
          price: currentPrice.toFixed(2),
          strategy: strategyParams.type,
          success: true,
          signature: result.signature,
        };
        
        // Update trade history
        setLastTrade(trade);
        setTradeHistory(prev => [trade, ...prev].slice(0, 10));
        
        // Add to active positions
        const newPosition: Position = {
          id: `pos-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          pair: trade.pair,
          entryPrice: currentPrice,
          amount: strategyParams.amount,
          timestamp: trade.timestamp,
          action: strategyParams.action as 'buy' | 'sell',
        };
        
        setActivePositions(prev => [...prev, newPosition]);
      } else {
        // Handle failed trade
        console.error('Trade failed:', result.error);
        
        // Create failed trade record
        const now = new Date();
        // Ensure type safety
        const failedTrade: Trade = { 
          timestamp: now.toISOString(),
          pair: strategyParams.pair,
          action: strategyParams.action, // Already 'buy' | 'sell' from StrategyParams
          amount: strategyParams.amount,
          price: '0',
          strategy: strategyParams.type,
          success: false,
          error: result.error,
        };
        
        // Update trade history
        setLastTrade(failedTrade);
        setTradeHistory(prev => [failedTrade, ...prev].slice(0, 10));
      }
    } catch (error) {
      console.error('Error executing trade:', error);
    } finally {
      setIsProcessingTrade(false);
    }
  };
  
  // Fetch current price for a trading pair
  const fetchCurrentPrice = async (pair: string) => {
    // Only fetch SOL price for now, ignore pair parameter
    const apiKey = process.env.NEXT_PUBLIC_COINGECKO_API_KEY;
    let url = 'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd';
    
    // Add API key if available
    if (apiKey) {
      url += `&x_cg_demo_api_key=${apiKey}`;
    } else {
      // Warn if key is missing, as requests might fail without it
      console.warn('CoinGecko API key not found. Price fetching might be unreliable.');
    }

    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        // Log CoinGecko API errors
        console.error(`CoinGecko API error: ${response.status} ${response.statusText}`);
        try {
          const errorData = await response.json();
          console.error('CoinGecko error details:', errorData);
        } catch (e) { /* Ignore if error response is not JSON */ }
        return null; // Return null on error
      }

      const data = await response.json();
      
      if (data && data.solana && data.solana.usd) {
        return data.solana.usd;
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching price:', error);
      return null;
    }
  };
  
  return (
    <div className="bg-gray-800 p-6 rounded-lg">
      <h2 className="text-xl font-bold mb-4">Bot Control</h2>
      
      <div className="flex items-center mb-4">
        <span className="mr-2">Test Mode:</span>
        <button 
          onClick={toggleTestMode}
          className={`px-3 py-1 rounded-md ${isTestMode ? 'bg-green-600' : 'bg-gray-600'}`}
          disabled={isRunning}
        >
          {isTestMode ? 'Enabled' : 'Disabled'}
        </button>
        {!isTestMode && (
          <span className="ml-2 text-red-500 text-sm">Warning: Real trading enabled!</span>
        )}
      </div>
      
      <div className="flex items-center mb-4">
        <span className="mr-2">Stop Loss (2.5%):</span>
        <button 
          onClick={() => setStopLossConfig({...stopLossConfig, enabled: !stopLossConfig.enabled})}
          className={`px-3 py-1 rounded-md ${stopLossConfig.enabled ? 'bg-green-600' : 'bg-gray-600'}`}
        >
          {stopLossConfig.enabled ? 'Enabled' : 'Disabled'}
        </button>
      </div>
      
      <div className="flex space-x-4 mb-6">
        {!isRunning ? (
          <button 
            onClick={startBot}
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
            // Use connected from useWallet
            disabled={!isWalletConnected || !publicKey || isProcessingTrade} 
          >
            {isProcessingTrade ? 'Processing...' : 'Start Trading'}
          </button>
        ) : (
          <button 
            onClick={stopBot}
            className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
            disabled={isProcessingTrade}
          >
            Stop Trading
          </button>
        )}
      </div>
      
      {isRunning && (
        <div className="bg-gray-900 p-4 rounded-md">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-2 animate-pulse"></div>
            <span>Bot is running with {strategyParams.type} strategy</span>
          </div>
        </div>
      )}
      
      {stopLossTriggered && (
        <div className="mt-4 bg-red-900/50 p-4 rounded-md">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
            <span className="text-red-300">{stopLossMessage}</span>
          </div>
        </div>
      )}
      
      {activePositions.length > 0 && (
        <div className="mt-4">
          <h3 className="font-bold mb-2">Active Positions</h3>
          <div className="bg-gray-900 p-3 rounded-md">
            {activePositions.map((position) => (
              <div key={position.id} className="border-b border-gray-700 py-2 last:border-0">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>Pair: {position.pair}</div>
                  <div>Action: <span className={position.action === 'buy' ? 'text-green-500' : 'text-red-500'}>{position.action}</span></div>
                  <div>Amount: {position.amount}</div>
                  <div>Entry Price: ${position.entryPrice.toFixed(2)}</div>
                  <div>Stop Loss: ${(position.action === 'buy' 
                    ? position.entryPrice * (1 - stopLossConfig.percentage / 100) 
                    : position.entryPrice * (1 + stopLossConfig.percentage / 100)).toFixed(2)}</div>
                  <div>Time: {new Date(position.timestamp).toLocaleTimeString()}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {lastTrade && (
        <div className="mt-4">
          <h3 className="font-bold mb-2">Last Trade</h3>
          <div className="bg-gray-900 p-3 rounded-md">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>Pair: {lastTrade.pair}</div>
              <div>Action: <span className={lastTrade.action === 'buy' ? 'text-green-500' : 'text-red-500'}>{lastTrade.action}</span></div>
              <div>Amount: {lastTrade.amount}</div>
              <div>Price: ${lastTrade.price}</div>
              <div>Status: {lastTrade.success ? 'Success' : 'Failed'}</div>
              <div>Time: {new Date(lastTrade.timestamp).toLocaleTimeString()}</div>
              {lastTrade.signature && (
                <div className="col-span-2">
                  <a 
                    href={`https://solscan.io/tx/${lastTrade.signature}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:underline"
                  >
                    View on Solscan
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {tradeHistory.length > 0 && (
        <div className="mt-4">
          <h3 className="font-bold mb-2">Recent Trades</h3>
          <div className="max-h-40 overflow-y-auto">
            {tradeHistory.map((trade, index) => (
              <div key={index} className="bg-gray-900 p-2 rounded-md mb-2 text-xs">
                <div className="flex justify-between">
                  <span>{trade.pair} - {trade.action.toUpperCase()}</span>
                  <span>{new Date(trade.timestamp).toLocaleTimeString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>{trade.amount} @ ${trade.price}</span>
                  <span className={trade.success ? 'text-green-500' : 'text-red-500'}>
                    {trade.success ? 'Success' : 'Failed'}
                  </span>
                </div>
                {trade.signature && (
                  <div className="mt-1">
                    <a 
                      href={`https://solscan.io/tx/${trade.signature}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:underline text-xs"
                    >
                      View on Solscan
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default BotControl;
