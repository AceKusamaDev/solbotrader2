// Error types for the application
export enum ErrorType {
  WALLET_ERROR = 'WALLET_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TRANSACTION_ERROR = 'TRANSACTION_ERROR',
  API_ERROR = 'API_ERROR',
  STRATEGY_ERROR = 'STRATEGY_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

// Error interface
export interface AppError {
  type: ErrorType;
  message: string;
  details?: any;
  timestamp: number;
}

// Error logging service
class ErrorLogger {
  private errors: AppError[] = [];
  private maxErrors = 100;

  // Log an error
  log(error: AppError): void {
    // Add timestamp if not present
    if (!error.timestamp) {
      error.timestamp = Date.now();
    }
    
    // Add to error log
    this.errors.unshift(error);
    
    // Keep log size manageable
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(0, this.maxErrors);
    }
    
    // Log to console in development
    console.error(`[${error.type}] ${error.message}`, error.details || '');
  }

  // Get all logged errors
  getErrors(): AppError[] {
    return [...this.errors];
  }

  // Clear error log
  clearErrors(): void {
    this.errors = [];
  }
}

// Create singleton instance
export const errorLogger = new ErrorLogger();

// Error handler function
export function handleError(type: ErrorType, message: string, details?: any): AppError {
  const error: AppError = {
    type,
    message,
    details,
    timestamp: Date.now()
  };
  
  errorLogger.log(error);
  return error;
}

// Function to handle wallet errors
export function handleWalletError(message: string, details?: any): AppError {
  return handleError(ErrorType.WALLET_ERROR, message, details);
}

// Function to handle network errors
export function handleNetworkError(message: string, details?: any): AppError {
  return handleError(ErrorType.NETWORK_ERROR, message, details);
}

// Function to handle transaction errors
export function handleTransactionError(message: string, details?: any): AppError {
  return handleError(ErrorType.TRANSACTION_ERROR, message, details);
}

// Function to handle API errors
export function handleApiError(message: string, details?: any): AppError {
  return handleError(ErrorType.API_ERROR, message, details);
}

// Function to handle strategy errors
export function handleStrategyError(message: string, details?: any): AppError {
  return handleError(ErrorType.STRATEGY_ERROR, message, details);
}

// Function to create user-friendly error messages
export function getUserFriendlyErrorMessage(error: AppError): string {
  switch (error.type) {
    case ErrorType.WALLET_ERROR:
      return `Wallet error: ${error.message}. Please check your wallet connection and try again.`;
    
    case ErrorType.NETWORK_ERROR:
      return `Network error: ${error.message}. Please check your internet connection and try again.`;
    
    case ErrorType.TRANSACTION_ERROR:
      return `Transaction error: ${error.message}. Your transaction could not be completed.`;
    
    case ErrorType.API_ERROR:
      return `Service error: ${error.message}. Please try again later.`;
    
    case ErrorType.STRATEGY_ERROR:
      return `Strategy error: ${error.message}. Please adjust your strategy parameters.`;
    
    default:
      return `An unexpected error occurred: ${error.message}`;
  }
}

// Retry mechanism for API calls
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  delay = 1000
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Wait before retrying
      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * (attempt + 1)));
      }
    }
  }
  
  throw lastError;
}
