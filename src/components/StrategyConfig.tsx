'use client';

// Remove useState import if not needed
// import { useState } from 'react';
import useBotStore from '@/store/useBotStore'; // Import the Zustand store

// Remove unused types
// type IndicatorType = 'Moving Average' | 'RSI' | 'MACD' | 'Bollinger Bands';
// type StrategyType = 'Mean Reversion' | 'Breakout Momentum' | 'Range Scalping' | 'Multi-indicator';
// type ActionType = 'Buy' | 'Sell';

// interface Indicator {
//   type: IndicatorType;
//   parameters: Record<string, number>;
// }

// Update props interface - no props needed now
interface StrategyConfigProps {}

export default function StrategyConfig({}: StrategyConfigProps) { // Remove onStrategyUpdate
  // --- Get state and actions from Zustand store ---
  const { settings, setSettings } = useBotStore((state) => ({
    settings: state.settings,
    setSettings: state.setSettings,
  }));
  // Destructure for easier access in the component
  const { strategyType, amount, pair, action } = settings;

  // --- Handlers to update Zustand store ---
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    // Add basic validation for amount
    if (!isNaN(value) && value >= 0) {
      setSettings({ amount: value });
    } else if (e.target.value === '') {
      setSettings({ amount: 0 }); // Allow clearing the input
    }
  };

  const handleStrategyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Type assertion needed here based on the store's StrategyType
    setSettings({ strategyType: e.target.value as typeof strategyType });
  };

  const handleActionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    // Type assertion needed here based on the store's action type
    setSettings({ action: e.target.value as 'buy' | 'sell' });
  };

  const handlePairChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSettings({ pair: e.target.value });
  };

  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
      <h2 className="text-xl font-bold mb-4 text-white">Strategy Configuration</h2>
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-1">Amount</label>
        <input
          type="number"
          value={amount}
          onChange={handleAmountChange} // Use new handler
          className="w-full bg-gray-700 text-white px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          step="0.01" // Allow smaller steps
          min="0" // Allow zero or positive amounts
        />
      </div>
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-1">Strategy Type</label>
        {/* Replace select with radio buttons */}
        <div className="flex space-x-4 mt-2">
          <label className="flex items-center space-x-2 text-gray-300 cursor-pointer">
            <input
              type="radio"
              name="strategyType"
              value="TrendTracker"
              checked={strategyType === 'TrendTracker'}
              onChange={handleStrategyChange}
              className="form-radio h-4 w-4 text-blue-600 bg-gray-700 border-gray-600 focus:ring-blue-500"
            />
            <span>TrendTracker</span>
          </label>
          <label className="flex items-center space-x-2 text-gray-300 cursor-pointer">
            <input
              type="radio"
              name="strategyType"
              value="SmartRange Scout"
              checked={strategyType === 'SmartRange Scout'}
              onChange={handleStrategyChange}
              className="form-radio h-4 w-4 text-blue-600 bg-gray-700 border-gray-600 focus:ring-blue-500"
            />
            <span>SmartRange Scout</span>
          </label>
        </div>
      </div>

      {/* Indicator configuration section removed */}

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-1">Action</label>
        <select
          value={action}
          onChange={handleActionChange} // Use new handler
          className="w-full bg-gray-700 text-white px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="buy">Buy</option> {/* Use lowercase */}
          <option value="sell">Sell</option> {/* Use lowercase */}
        </select>
      </div>
      
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-300 mb-1">Pair</label>
        <select
          value={pair}
          onChange={handlePairChange} // Use new handler
          className="w-full bg-gray-700 text-white px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="SOL/USDC">SOL/USDC</option>
          <option value="SOL/USDT">SOL/USDT</option>
          {/* Add more pairs as needed */}
          {/* <option value="SOL/BTC">SOL/BTC</option> */}
        </select>
      </div>

      {/* Apply Settings button removed */}
    </div>
  );
}
