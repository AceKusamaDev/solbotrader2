'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
// Import safety features including StopLossConfig
import { Position, StopLossConfig, checkStopLoss, formatStopLossMessage } from '@/lib/safetyFeatures';
// Remove .ts extension from import
import useJupiterTrading, { SOL_MINT, USDC_MINT } from '@/lib/jupiter';
// Import Zustand store and types
import useBotStore, { Trade } from '@/store/useBotStore'; // Import the store

// BotControl component refactored to use Zustand store (props removed)
const BotControl = () => {
  // --- Zustand Store Hook ---
  const {
    status, settings, activePositions, tradeHistory, errorMessage,
    startBot: storeStartBot,
    stopBot: storeStopBot,
    toggleTestMode: storeToggleTestMode,
    addPosition, removePosition, addTradeHistory, setError,
    setSettings: updateSettingsInStore,
  } = useBotStore((state) => ({
      status: state.status,
      settings: state.settings,
      activePositions: state.activePositions,
      tradeHistory: state.tradeHistory,
      errorMessage: state.errorMessage,
      startBot: state.startBot,
      stopBot: state.stopBot,
      toggleTestMode: state.toggleTestMode,
      addPosition: state.addPosition,
      removePosition: state.removePosition,
      addTradeHistory: state.addTradeHistory,
      setError: state.setError,
      setSettings: state.setSettings,
  }));

  // Destructure settings for easier access in JSX
  const {
    isTestMode, stopLossPercentage, takeProfitPercentage, maxRuns,
    runIntervalMinutes, compoundCapital, strategyType, amount, pair, action,
  } = settings;


  // --- Local State (UI specific) ---
  const [stopLossTriggered, setStopLossTriggered] = useState(false);
  const [stopLossMessage, setStopLossMessage] = useState('');
  const tradingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isProcessingTrade, setIsProcessingTrade] = useState(false); // Local state for UI button disabling

  // Get wallet context using useWallet hook
  const { publicKey, connected: isWalletConnected, sendTransaction } = useWallet();

  // Get Jupiter trading function (no longer provides wallet state)
  const { executeTradeWithStrategy } = useJupiterTrading();

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (tradingIntervalRef.current) {
        clearInterval(tradingIntervalRef.current);
      }
    };
  }, []);

  // --- Event Handlers ---

  const startBot = () => {
    if (!isWalletConnected || !publicKey) {
      alert("Please connect your Phantom wallet first");
      return;
    }
    storeStartBot();
    setStopLossTriggered(false);
    setStopLossMessage('');
    // Trading logic will be handled by useEffect monitoring 'status'
  };

  const handleStopBot = () => {
    storeStopBot();
    if (tradingIntervalRef.current) {
      clearInterval(tradingIntervalRef.current);
      tradingIntervalRef.current = null;
    }
  };

  const handleToggleTestMode = () => {
    storeToggleTestMode();
  };

  const handleSettingChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    let parsedValue: string | number | boolean = value;

    if (type === 'number') {
      parsedValue = parseFloat(value);
      if (isNaN(parsedValue)) return;
      if ((name === 'stopLossPercentage' || name === 'takeProfitPercentage') && parsedValue < 0) parsedValue = 0;
      if (name === 'maxRuns' && parsedValue < 1) parsedValue = 1;
      if (name === 'runIntervalMinutes' && parsedValue < 1) parsedValue = 1;
    } else if (type === 'checkbox') {
      parsedValue = (e.target as HTMLInputElement).checked;
    }
    updateSettingsInStore({ [name]: parsedValue });
  };

  // --- Trading Logic Callbacks (Placeholders / To be fully implemented in Phase 3) ---

  const fetchCurrentPrice = useCallback(async (fetchPair: string): Promise<number | null> => {
    // Placeholder - actual implementation in Phase 2/3
    console.warn("fetchCurrentPrice needs implementation (GeckoTerminal)");
    return Math.random() * 100 + 50; // Return dummy price for now
  }, []);

  const handleStopLoss = useCallback(async (position: Position, currentPrice: number): Promise<boolean> => {
    // Placeholder - actual implementation in Phase 3
    console.warn("handleStopLoss needs full implementation");
    const latestSettings = useBotStore.getState().settings;
    const config: StopLossConfig = { enabled: true, percentage: latestSettings.stopLossPercentage };
    if (checkStopLoss(position, currentPrice, config)) {
        console.log("Simulating Stop Loss Trigger (No action taken yet)");
        // Simulate removal for UI testing
        if (latestSettings.isTestMode) {
            removePosition(position.id);
        }
        return true;
    }
    return false;
  }, [removePosition]); // Minimal dependencies for now

  const executeRealTrade = useCallback(async (tradeAction: 'buy' | 'sell') => {
    // Placeholder - actual implementation in Phase 3
    console.warn("executeRealTrade needs full implementation");
    const latestSettings = useBotStore.getState().settings;
    if (isProcessingTrade) return;
    if (!publicKey || !sendTransaction) {
        setError("Wallet not connected for trade.");
        return;
    }
    setIsProcessingTrade(true);
    console.log(`Simulating ${tradeAction} trade execution...`);
    await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate delay
    // Simulate adding trade/position for UI testing
    const simPrice = Math.random() * 100 + 50;
    const trade: Trade = {
        id: `sim-real-${Date.now()}`, timestamp: new Date().toISOString(), pair: latestSettings.pair,
        action: tradeAction, amount: latestSettings.amount, price: simPrice,
        strategy: latestSettings.strategyType, success: true, signature: `sim_${Date.now()}`
    };
    addTradeHistory(trade);
    const newPosition: Position = {
        id: `sim-pos-${Date.now()}`, pair: trade.pair, entryPrice: simPrice, amount: latestSettings.amount,
        timestamp: trade.timestamp, action: tradeAction
    };
    addPosition(newPosition);
    setIsProcessingTrade(false);
  }, [isProcessingTrade, publicKey, sendTransaction, addTradeHistory, addPosition, setError]); // Minimal dependencies for now


  // TODO: Add useEffect hook here to manage the trading loop based on 'status'
  // This hook will:
  // - Run initial analysis when status becomes 'analyzing'
  // - Start the interval (calling loopLogic) when status becomes 'running'
  // - Clear the interval when status becomes 'stopped' or on unmount

  // Determine if bot is active using status from store
  const isActive = status === 'running' || status === 'analyzing';
  // Get the latest trade from store history for display
  const latestTrade = tradeHistory.length > 0 ? tradeHistory[0] : null;

  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg space-y-4">
      <h2 className="text-xl font-bold text-white">Bot Control</h2>

      {/* Test Mode Toggle */}
      <div className="flex items-center">
        <label htmlFor="testModeToggle" className="mr-2 text-gray-300">Test Mode:</label>
        <button
          id="testModeToggle"
          onClick={handleToggleTestMode}
          className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
            isTestMode ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-600 hover:bg-gray-500'
          } ${status !== 'stopped' ? 'opacity-50 cursor-not-allowed' : 'text-white'}`}
          disabled={status !== 'stopped'}
        >
          {isTestMode ? 'Enabled' : 'Disabled'}
        </button>
        {!isTestMode && status === 'stopped' && (
          <span className="ml-2 text-red-400 text-xs italic">Warning: Real trading active!</span>
        )}
         {status !== 'stopped' && (
          <span className="ml-2 text-yellow-400 text-xs italic">Stop bot to change mode</span>
        )}
      </div>

      {/* Stop Loss Input */}
      <div className="flex items-center">
         <label htmlFor="stopLossPercentage" className="mr-2 text-gray-300 whitespace-nowrap">Stop Loss (%):</label>
         <input
            type="number"
            id="stopLossPercentage"
            name="stopLossPercentage"
            value={stopLossPercentage}
            onChange={handleSettingChange}
            min="0"
            step="0.1"
            className="w-full bg-gray-700 text-white px-3 py-1 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            disabled={isActive}
         />
      </div>

       {/* Take Profit Input */}
       <div className="flex items-center">
         <label htmlFor="takeProfitPercentage" className="mr-2 text-gray-300 whitespace-nowrap">Take Profit (%):</label>
         <input
            type="number"
            id="takeProfitPercentage"
            name="takeProfitPercentage"
            value={takeProfitPercentage}
            onChange={handleSettingChange}
            min="0"
            step="0.1"
            className="w-full bg-gray-700 text-white px-3 py-1 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            disabled={isActive}
         />
      </div>

       {/* Max Runs Input */}
       <div className="flex items-center">
         <label htmlFor="maxRuns" className="mr-2 text-gray-300 whitespace-nowrap">Max Runs:</label>
         <input
            type="number"
            id="maxRuns"
            name="maxRuns"
            value={maxRuns}
            onChange={handleSettingChange}
            min="1"
            step="1"
            className="w-full bg-gray-700 text-white px-3 py-1 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            disabled={isActive}
         />
      </div>

       {/* Run Interval Input */}
       <div className="flex items-center">
         <label htmlFor="runIntervalMinutes" className="mr-2 text-gray-300 whitespace-nowrap">Run Interval (min):</label>
         <input
            type="number"
            id="runIntervalMinutes"
            name="runIntervalMinutes"
            value={runIntervalMinutes}
            onChange={handleSettingChange}
            min="1"
            step="1"
            className="w-full bg-gray-700 text-white px-3 py-1 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            disabled={isActive}
         />
      </div>

       {/* Compound Capital Toggle */}
       <div className="flex items-center">
         <label htmlFor="compoundCapital" className="mr-2 text-gray-300">Compound Capital:</label>
         <input
            type="checkbox"
            id="compoundCapital"
            name="compoundCapital"
            checked={compoundCapital}
            onChange={handleSettingChange}
            className="form-checkbox h-4 w-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-offset-gray-800"
            disabled={isActive}
         />
      </div>


      {/* Start/Stop Buttons */}
      <div className="flex space-x-4 pt-2">
        {status !== 'running' && status !== 'analyzing' ? (
          <button
            onClick={startBot}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!isWalletConnected || !publicKey || isProcessingTrade || status === 'error'}
          >
            {isProcessingTrade ? 'Processing...' : status === 'error' ? 'Error Occurred' : 'Start Trading'}
          </button>
        ) : (
          <button
            onClick={handleStopBot}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isProcessingTrade}
          >
            {status === 'analyzing' ? 'Stop Analysis' : 'Stop Trading'}
          </button>
        )}
      </div>

      {/* Status Indicator */}
      {status !== 'stopped' && (
        <div className="bg-gray-900 p-3 rounded-md text-center">
          <div className="flex items-center justify-center">
            <div className={`w-3 h-3 rounded-full mr-2 ${
                status === 'running' ? 'bg-green-500 animate-pulse' :
                status === 'analyzing' ? 'bg-yellow-500 animate-pulse' :
                status === 'error' ? 'bg-red-500' : 'bg-gray-500'
            }`}></div>
            <span className="text-sm text-gray-300">
                Bot status: <span className="font-medium">{status}</span>
                {status === 'running' && ` (${strategyType})`}
            </span>
          </div>
        </div>
      )}

       {/* Error Message Display */}
       {status === 'error' && errorMessage && (
         <div className="mt-4 bg-red-900/50 p-3 rounded-md text-center">
             <p className="text-red-300 text-sm">{errorMessage}</p>
         </div>
       )}


      {/* Stop Loss Trigger Message */}
      {stopLossTriggered && (
        <div className="mt-4 bg-red-900/50 p-3 rounded-md">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
            <span className="text-red-300 text-sm">{stopLossMessage}</span>
          </div>
        </div>
      )}

      {/* Active Positions Display - Reads from Zustand */}
      {activePositions.length > 0 && (
        <div className="mt-4">
          <h3 className="font-bold mb-2 text-white">Active Positions</h3>
          <div className="bg-gray-900 p-3 rounded-md max-h-40 overflow-y-auto">
            {activePositions.map((position: Position) => (
              <div key={position.id} className="border-b border-gray-700 py-2 last:border-0 text-xs">
                <div className="grid grid-cols-2 gap-1">
                  <div className="text-gray-400">Pair: <span className="text-gray-200">{position.pair}</span></div>
                  <div className="text-gray-400">Action: <span className={position.action === 'buy' ? 'text-green-400' : 'text-red-400'}>{position.action}</span></div>
                  <div className="text-gray-400">Amount: <span className="text-gray-200">{position.amount}</span></div>
                  <div className="text-gray-400">Entry: <span className="text-gray-200">${position.entryPrice.toFixed(4)}</span></div>
                  <div className="text-gray-400">Stop Loss: <span className="text-gray-200">${(position.action === 'buy'
                    ? position.entryPrice * (1 - stopLossPercentage / 100)
                    : position.entryPrice * (1 + stopLossPercentage / 100)).toFixed(4)}</span></div>
                  <div className="text-gray-400">Time: <span className="text-gray-200">{new Date(position.timestamp).toLocaleTimeString()}</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Last Trade Display - Reads from Zustand */}
      {latestTrade && (
        <div className="mt-4">
          <h3 className="font-bold mb-2 text-white">Last Trade</h3>
          <div className="bg-gray-900 p-3 rounded-md text-xs">
            <div className="grid grid-cols-2 gap-1">
              <div className="text-gray-400">Pair: <span className="text-gray-200">{latestTrade.pair}</span></div>
              <div className="text-gray-400">Action: <span className={latestTrade.action === 'buy' ? 'text-green-400' : 'text-red-400'}>{latestTrade.action}</span></div>
              <div className="text-gray-400">Amount: <span className="text-gray-200">{latestTrade.amount}</span></div>
              <div className="text-gray-400">Price: <span className="text-gray-200">${Number(latestTrade.price).toFixed(4)}</span></div>
              <div className="text-gray-400">Status: <span className={latestTrade.success ? 'text-green-400' : 'text-red-400'}>{latestTrade.success ? 'Success' : 'Failed'}</span></div>
              <div className="text-gray-400">Time: <span className="text-gray-200">{new Date(latestTrade.timestamp).toLocaleTimeString()}</span></div>
              {latestTrade.signature && !latestTrade.signature.startsWith('sim') && (
                <div className="col-span-2">
                  <a
                    href={`https://solscan.io/tx/${latestTrade.signature}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:underline"
                  >
                    View on Solscan
                  </a>
                </div>
              )}
               {latestTrade.error && (
                 <div className="col-span-2 text-red-400">Error: {latestTrade.error}</div>
               )}
            </div>
          </div>
        </div>
      )}

      {/* Recent Trades Display - Reads from Zustand */}
      {tradeHistory.length > 0 && (
        <div className="mt-4">
          <h3 className="font-bold mb-2 text-white">Recent Trades</h3>
          <div className="max-h-60 overflow-y-auto space-y-2">
            {tradeHistory.map((trade: Trade) => (
              <div key={trade.id || trade.timestamp} className="bg-gray-900 p-2 rounded-md text-xs">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-medium text-gray-300">{trade.pair} - {trade.action.toUpperCase()}</span>
                  <span className="text-gray-400">{new Date(trade.timestamp).toLocaleTimeString()}</span>
                </div>
                <div className="flex justify-between items-center">
                   <span className="text-gray-300">{trade.amount} @ ${Number(trade.price).toFixed(4)}</span>
                  <span className={`font-semibold ${trade.success ? 'text-green-500' : 'text-red-500'}`}>
                    {trade.success ? 'Success' : 'Failed'}
                  </span>
                </div>
                {trade.signature && !trade.signature.startsWith('sim') && (
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
