'use client';

import { useState } from 'react';

type IndicatorType = 'Moving Average' | 'RSI' | 'MACD' | 'Bollinger Bands';
type StrategyType = 'Mean Reversion' | 'Breakout Momentum' | 'Range Scalping' | 'Multi-indicator';
type ActionType = 'Buy' | 'Sell';

interface Indicator {
  type: IndicatorType;
  parameters: Record<string, number>;
}

interface StrategyConfigProps {
  onStrategyUpdate?: (params: any) => void;
}

export default function StrategyConfig({ onStrategyUpdate }: StrategyConfigProps) {
  const [amount, setAmount] = useState<number>(0.5);
  const [strategyType, setStrategyType] = useState<StrategyType>('Multi-indicator');
  const [indicators, setIndicators] = useState<Indicator[]>([
    { type: 'Moving Average', parameters: { period: 14 } },
    { type: 'RSI', parameters: { period: 30 } },
    { type: 'MACD', parameters: { fast: 12, slow: 26 } }
  ]);
  const [action, setAction] = useState<ActionType>('Buy');
  const [pair, setPair] = useState<string>('SOL/USDC');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleStartBot = async () => {
    setIsLoading(true);
    // Here we would connect to the backend to start the bot
    console.log('Starting bot with config:', {
      amount,
      strategyType,
      indicators,
      action,
      pair
    });
    
    // Notify parent component of strategy update
    if (onStrategyUpdate) {
      onStrategyUpdate({
        type: strategyType,
        indicators: indicators.map(ind => ({
          type: ind.type === 'Moving Average' ? 'SMA' : ind.type,
          parameters: ind.parameters
        })),
        amount,
        pair,
        action: action.toLowerCase()
      });
    }
    
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
    }, 2000);
  };

  const updateIndicator = (index: number, field: string, value: any) => {
    const newIndicators = [...indicators];
    if (field === 'type') {
      newIndicators[index].type = value as IndicatorType;
      
      // Reset parameters based on indicator type
      switch (value) {
        case 'Moving Average':
          newIndicators[index].parameters = { period: 14 };
          break;
        case 'RSI':
          newIndicators[index].parameters = { period: 14 };
          break;
        case 'MACD':
          newIndicators[index].parameters = { fast: 12, slow: 26 };
          break;
        case 'Bollinger Bands':
          newIndicators[index].parameters = { period: 20, deviation: 2 };
          break;
      }
    } else {
      // It's a parameter update
      const [paramName, paramValue] = value;
      newIndicators[index].parameters[paramName] = paramValue;
    }
    
    setIndicators(newIndicators);
  };

  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
      <h2 className="text-xl font-bold mb-4 text-white">Strategy Configuration</h2>
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-1">Amount</label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(parseFloat(e.target.value))}
          className="w-full bg-gray-700 text-white px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          step="0.1"
          min="0.1"
        />
      </div>
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-1">Strategy Type</label>
        <select
          value={strategyType}
          onChange={(e) => setStrategyType(e.target.value as StrategyType)}
          className="w-full bg-gray-700 text-white px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="Mean Reversion">Mean Reversion</option>
          <option value="Breakout Momentum">Breakout Momentum</option>
          <option value="Range Scalping">Range Scalping</option>
          <option value="Multi-indicator">Multi-indicator</option>
        </select>
      </div>
      
      {indicators.map((indicator, index) => (
        <div key={index} className="mb-4 p-4 bg-gray-700 rounded-md">
          <div className="mb-2">
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Indicator {index + 1}
            </label>
            <select
              value={indicator.type}
              onChange={(e) => updateIndicator(index, 'type', e.target.value)}
              className="w-full bg-gray-600 text-white px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Moving Average">Moving Average</option>
              <option value="RSI">RSI</option>
              <option value="MACD">MACD</option>
              <option value="Bollinger Bands">Bollinger Bands</option>
            </select>
          </div>
          
          {/* Render parameters based on indicator type */}
          {indicator.type === 'Moving Average' && (
            <div className="mb-2">
              <label className="block text-sm font-medium text-gray-300 mb-1">Period</label>
              <input
                type="number"
                value={indicator.parameters.period}
                onChange={(e) => updateIndicator(index, 'parameters', ['period', parseInt(e.target.value)])}
                className="w-full bg-gray-600 text-white px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="1"
              />
            </div>
          )}
          
          {indicator.type === 'RSI' && (
            <div className="mb-2">
              <label className="block text-sm font-medium text-gray-300 mb-1">Period</label>
              <input
                type="number"
                value={indicator.parameters.period}
                onChange={(e) => updateIndicator(index, 'parameters', ['period', parseInt(e.target.value)])}
                className="w-full bg-gray-600 text-white px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="1"
              />
            </div>
          )}
          
          {indicator.type === 'MACD' && (
            <>
              <div className="mb-2">
                <label className="block text-sm font-medium text-gray-300 mb-1">Fast Period</label>
                <input
                  type="number"
                  value={indicator.parameters.fast}
                  onChange={(e) => updateIndicator(index, 'parameters', ['fast', parseInt(e.target.value)])}
                  className="w-full bg-gray-600 text-white px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="1"
                />
              </div>
              <div className="mb-2">
                <label className="block text-sm font-medium text-gray-300 mb-1">Slow Period</label>
                <input
                  type="number"
                  value={indicator.parameters.slow}
                  onChange={(e) => updateIndicator(index, 'parameters', ['slow', parseInt(e.target.value)])}
                  className="w-full bg-gray-600 text-white px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="1"
                />
              </div>
            </>
          )}
          
          {indicator.type === 'Bollinger Bands' && (
            <>
              <div className="mb-2">
                <label className="block text-sm font-medium text-gray-300 mb-1">Period</label>
                <input
                  type="number"
                  value={indicator.parameters.period}
                  onChange={(e) => updateIndicator(index, 'parameters', ['period', parseInt(e.target.value)])}
                  className="w-full bg-gray-600 text-white px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="1"
                />
              </div>
              <div className="mb-2">
                <label className="block text-sm font-medium text-gray-300 mb-1">Standard Deviation</label>
                <input
                  type="number"
                  value={indicator.parameters.deviation}
                  onChange={(e) => updateIndicator(index, 'parameters', ['deviation', parseFloat(e.target.value)])}
                  className="w-full bg-gray-600 text-white px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0.1"
                  step="0.1"
                />
              </div>
            </>
          )}
        </div>
      ))}
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-1">Action</label>
        <select
          value={action}
          onChange={(e) => setAction(e.target.value as ActionType)}
          className="w-full bg-gray-700 text-white px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="Buy">Buy</option>
          <option value="Sell">Sell</option>
        </select>
      </div>
      
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-300 mb-1">Pair</label>
        <select
          value={pair}
          onChange={(e) => setPair(e.target.value)}
          className="w-full bg-gray-700 text-white px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="SOL/USDC">SOL/USDC</option>
          <option value="SOL/USDT">SOL/USDT</option>
          <option value="SOL/BTC">SOL/BTC</option>
        </select>
      </div>
      
      <button
        onClick={handleStartBot}
        disabled={isLoading}
        className={`w-full py-3 px-4 rounded-md font-medium transition-colors ${
          isLoading 
            ? 'bg-gray-600 cursor-not-allowed' 
            : 'bg-green-600 hover:bg-green-700 text-white'
        }`}
      >
        {isLoading ? 'Starting...' : 'Apply Settings'}
      </button>
    </div>
  );
}
