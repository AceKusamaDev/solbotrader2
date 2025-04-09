'use client';

// Safety features for the SolBotX trading bot
export interface Position {
  id: string;
  pair: string;
  entryPrice: number;
  amount: number;
  timestamp: string;
  action: 'buy' | 'sell';
}

export interface StopLossConfig {
  enabled: boolean;
  percentage: number; // Percentage drop that triggers stop loss
}

// Default stop loss configuration with 2.5% as requested by user
export const DEFAULT_STOP_LOSS_CONFIG: StopLossConfig = {
  enabled: true,
  percentage: 2.5
};

// Check if stop loss should be triggered
export const checkStopLoss = (
  position: Position,
  currentPrice: number,
  stopLossConfig: StopLossConfig = DEFAULT_STOP_LOSS_CONFIG
): boolean => {
  if (!stopLossConfig.enabled) {
    return false;
  }

  // For long positions (buy), trigger stop loss if price drops below threshold
  if (position.action === 'buy') {
    const stopLossThreshold = position.entryPrice * (1 - stopLossConfig.percentage / 100);
    return currentPrice <= stopLossThreshold;
  }
  
  // For short positions (sell), trigger stop loss if price rises above threshold
  if (position.action === 'sell') {
    const stopLossThreshold = position.entryPrice * (1 + stopLossConfig.percentage / 100);
    return currentPrice >= stopLossThreshold;
  }

  return false;
};

// Format stop loss message
export const formatStopLossMessage = (
  position: Position, 
  currentPrice: number, 
  stopLossConfig: StopLossConfig = DEFAULT_STOP_LOSS_CONFIG
): string => {
  const direction = position.action === 'buy' ? 'dropped' : 'increased';
  const threshold = position.action === 'buy' 
    ? position.entryPrice * (1 - stopLossConfig.percentage / 100)
    : position.entryPrice * (1 + stopLossConfig.percentage / 100);
  
  return `Stop loss triggered for ${position.pair}: Price ${direction} to ${currentPrice.toFixed(2)} (${stopLossConfig.percentage}% from entry price of ${position.entryPrice.toFixed(2)})`;
};

// Calculate potential loss at stop loss point
export const calculatePotentialLoss = (
  position: Position,
  stopLossConfig: StopLossConfig = DEFAULT_STOP_LOSS_CONFIG
): number => {
  const stopLossPrice = position.action === 'buy'
    ? position.entryPrice * (1 - stopLossConfig.percentage / 100)
    : position.entryPrice * (1 + stopLossConfig.percentage / 100);
  
  const loss = position.action === 'buy'
    ? (stopLossPrice - position.entryPrice) * position.amount
    : (position.entryPrice - stopLossPrice) * position.amount;
  
  return Math.abs(loss);
};
