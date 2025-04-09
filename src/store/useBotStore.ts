import { create } from 'zustand';

// --- Interfaces ---

// Define Position type (adjust based on actual needs)
// Consider moving this to a shared types file later (e.g., src/types.ts)
export interface Position {
  id: string;
  pair: string;
  entryPrice: number;
  amount: number;
  timestamp: string;
  action: 'buy' | 'sell'; // 'buy' or 'sell'
  // Add other relevant fields like currentPrice, PnL later if needed
}

// Define Trade type
export interface Trade {
  id: string;
  timestamp: string;
  pair: string;
  action: 'buy' | 'sell';
  amount: number;
  price: number; // Use number for price
  strategy: string;
  success: boolean;
  signature?: string;
  error?: string;
  pnl?: number; // Optional PnL for closed trades
}

// Define Bot Status types
type BotStatus = 'stopped' | 'running' | 'analyzing' | 'error';
type MarketCondition = 'Uptrend' | 'Ranging' | 'Unclear'; // Add more as needed
type StrategyType = 'TrendTracker' | 'SmartRange Scout'; // The two core strategies

// Define Bot Settings structure
interface BotSettings {
  strategyType: StrategyType;
  amount: number;
  pair: string; // e.g., "SOL/USDC"
  stopLossPercentage: number; // User-defined SL
  takeProfitPercentage: number; // User-defined TP
  maxRuns: number; // Max number of trade cycles (entry + exit)
  runIntervalMinutes: number; // Interval between runs
  compoundCapital: boolean; // Reinvest profits
  isTestMode: boolean;
  action: 'buy' | 'sell'; // Keep track of the intended action (Buy/Sell)
}

// Define the main state structure
interface BotState {
  status: BotStatus;
  settings: BotSettings;
  marketCondition: MarketCondition;
  activePositions: Position[];
  tradeHistory: Trade[];
  currentRun: number;
  errorMessage: string | null;
  // Add analysis results if needed here later
  // analysisResult: AnalysisResult | null;
  // currentPoolAddress: string | null;

  // Actions
  setSettings: (newSettings: Partial<BotSettings>) => void;
  startBot: () => void; // Will transition to 'analyzing'
  stopBot: () => void;
  setAnalyzing: () => void;
  setRunning: (condition: MarketCondition) => void; // Pass condition when starting
  setError: (message: string) => void;
  setMarketCondition: (condition: MarketCondition) => void;
  addPosition: (position: Position) => void;
  removePosition: (positionId: string) => void;
  addTradeHistory: (trade: Trade) => void;
  incrementRun: () => void;
  resetRuns: () => void;
  toggleTestMode: () => void;
  clearError: () => void;
}

// Create the Zustand store
const useBotStore = create<BotState>((set, get) => ({
  // --- Initial State ---
  status: 'stopped',
  settings: {
    strategyType: 'TrendTracker', // Default strategy
    amount: 0.1, // Default amount (e.g., 0.1 SOL or USDC) - adjust as needed
    pair: 'SOL/USDC', // Default pair
    stopLossPercentage: 2.5, // Default SL 2.5%
    takeProfitPercentage: 5, // Default TP 5%
    maxRuns: 1, // Default 1 run
    runIntervalMinutes: 5, // Default 5 minutes interval
    compoundCapital: false, // Default compounding off
    isTestMode: true, // Default to test mode ON
    action: 'buy', // Default action
  },
  marketCondition: 'Unclear',
  activePositions: [],
  tradeHistory: [],
  currentRun: 0,
  errorMessage: null,

  // --- Actions ---
  setSettings: (newSettings) =>
    set((state) => ({
      settings: { ...state.settings, ...newSettings },
    })),

  startBot: () => set({ status: 'analyzing', currentRun: 0, errorMessage: null }), // Start analysis first

  stopBot: () => set({ status: 'stopped', errorMessage: null }), // Reset error on stop

  setAnalyzing: () => set({ status: 'analyzing' }),

  setRunning: (condition) => set({ status: 'running', marketCondition: condition }), // Set condition when running starts

  setError: (message) => set({ status: 'error', errorMessage: message }),

  setMarketCondition: (condition) => set({ marketCondition: condition }),

  addPosition: (position) =>
    set((state) => ({
      activePositions: [...state.activePositions, position],
    })),

  removePosition: (positionId) =>
    set((state) => ({
      activePositions: state.activePositions.filter((p) => p.id !== positionId),
    })),

  addTradeHistory: (trade) =>
    set((state) => ({
      // Keep only the latest, e.g., 50 trades for performance
      tradeHistory: [trade, ...state.tradeHistory].slice(0, 50),
    })),

  incrementRun: () => set((state) => ({ currentRun: state.currentRun + 1 })),

  resetRuns: () => set({ currentRun: 0 }),

  toggleTestMode: () =>
    set((state) => {
      if (state.status !== 'stopped') {
        console.warn('Cannot change test mode while bot is running or analyzing.');
        return {}; // Prevent changing mode while active
      }
      return { settings: { ...state.settings, isTestMode: !state.settings.isTestMode } };
    }),

  clearError: () => set({ errorMessage: null }), // Action to clear error message
}));

export default useBotStore;
