'use client';

import { Connection, PublicKey, Transaction, VersionedTransaction, SendTransactionError } from '@solana/web3.js';
import { WalletContextState } from '@solana/wallet-adapter-react'; // Import WalletContextState
import { useState, useEffect, useCallback } from 'react'; // Added useCallback

// Constants for Jupiter API
const JUPITER_QUOTE_API = 'https://quote-api.jup.ag/v6/quote';
const JUPITER_SWAP_API = 'https://quote-api.jup.ag/v6/swap';

// Token constants
export const SOL_MINT = 'So11111111111111111111111111111111111111112';
export const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

// Interface for quote parameters
interface QuoteParams {
  inputMint: string;
  outputMint: string;
  amount: string;
  slippageBps: number;
}

// Interface for swap parameters
interface SwapParams {
  quoteResponse: any;
  userPublicKey: string;
}

// Get quote from Jupiter
export const getJupiterQuote = async (params: QuoteParams) => {
  try {
    const { inputMint, outputMint, amount, slippageBps } = params;
    
    // Request dynamic compute unit price for priority fees
    const queryParams = new URLSearchParams({
      inputMint,
      outputMint,
      amount,
      slippageBps: slippageBps.toString(),
      computeUnitPriceMicroLamports: 'auto', // Request dynamic fees
      // asLegacyTransaction: 'false', // Ensure VersionedTransaction is returned (default is false)
    });
    
    const response = await fetch(`${JUPITER_QUOTE_API}?${queryParams.toString()}`);

    if (!response.ok) {
      let errorBody = `Status: ${response.status} ${response.statusText}`;
      try {
        const jsonError = await response.json();
        errorBody = JSON.stringify(jsonError);
      } catch (e) {
        // Ignore if response body is not JSON
      }
      console.error('Jupiter quote API error response:', errorBody);
      throw new Error(`Jupiter quote API error: ${errorBody}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching Jupiter quote:', error);
    throw error;
  }
};

// Prepare swap transaction
export const prepareJupiterSwapTransaction = async (params: SwapParams) => {
  try {
    const { quoteResponse, userPublicKey } = params;
    
    const response = await fetch(JUPITER_SWAP_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        quoteResponse,
        userPublicKey,
        // Pass dynamic priority fee info if available in quoteResponse
        computeUnitPriceMicroLamports: quoteResponse.computeUnitPriceMicroLamports ?? undefined, 
        // asLegacyTransaction: false, // Ensure VersionedTransaction is returned
      }),
    });

    if (!response.ok) {
      let errorBody = `Status: ${response.status} ${response.statusText}`;
      try {
        const jsonError = await response.json();
        errorBody = JSON.stringify(jsonError);
      } catch (e) {
        // Ignore if response body is not JSON
      }
      console.error('Jupiter swap API error response:', errorBody);
      throw new Error(`Jupiter swap API error: ${errorBody}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error preparing Jupiter swap transaction:', error);
    throw error;
  }
};

// Execute swap transaction
// Accepts sendTransaction function directly
export const executeJupiterSwap = async (
  swapResponseData: any, 
  sendTransaction: WalletContextState['sendTransaction'], // Use WalletContextState type
  connection: Connection
) => { 
  try {
    let transaction;
    const base64Transaction = swapResponseData.swapTransaction; // Get the base64 string directly

    // Check if the base64 string exists
    if (base64Transaction && typeof base64Transaction === 'string') {
      // Deserialize the VersionedTransaction
      const serializedTransaction = Buffer.from(base64Transaction, 'base64');
      transaction = VersionedTransaction.deserialize(serializedTransaction);
    } else {
      // Log the unexpected structure and throw error
      console.error('Unexpected swap response structure or missing swapTransaction field:', swapResponseData);
      throw new Error('Invalid transaction format received from Jupiter API');
    }

    // Send transaction using the provided function
    let signature;
    try {
      console.log('Attempting to send transaction via wallet adapter...'); // Log before sending
      // The wallet adapter's sendTransaction handles signing
      signature = await sendTransaction(transaction, connection); 
      console.log('Transaction sent successfully, signature:', signature); // Log after successful send
    } catch (signError) {
      // Catch potential SendTransactionError for more details
      if (signError instanceof SendTransactionError) {
        console.error('SendTransactionError:', signError.message);
        console.error('Logs:', signError.logs);
      }
      console.error('Full error object during signing/sending transaction:', signError); // Log the full error
      throw signError; // Re-throw the specific error
    }

    // Wait for confirmation with increased timeout and strategy
    let confirmation;
    try {
      console.log(`Waiting for confirmation for signature: ${signature}`); 
      // Get the latest blockhash for confirmation strategy
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed'); 
      confirmation = await connection.confirmTransaction({
        signature, // Keep only one signature property
        blockhash, // Use the latest blockhash
        lastValidBlockHeight // Use the associated block height
      }, 'confirmed'); // Pass commitment as the second argument

      // Check for confirmation error within the response value
      if (confirmation.value.err) { 
        console.error('Transaction confirmation failed:', confirmation.value.err);
        throw new Error(`Transaction confirmation failed: ${JSON.stringify(confirmation.value.err)}`);
      }

      console.log('Transaction confirmed successfully:', confirmation); 
    } catch (confirmError) {
      console.error(`Error confirming transaction ${signature}:`, confirmError); // Log the specific error here
      // Optionally, you might want to handle confirmation errors differently
      // For now, we'll re-throw
      throw confirmError;
    }

    return {
      signature,
      confirmation,
    };
  } catch (error) {
    // Log the full error object for better debugging
    console.error('Full error object during Jupiter swap execution:', error);
    // Keep the original error throwing behavior
    throw error;
  }
};

// Hook exposing the trading function (no longer manages wallet state directly)
const useJupiterTrading = () => {

  // Execute trade with strategy - now requires wallet context
  // Use useCallback to memoize the function
  const executeTradeWithStrategy = useCallback(async ( 
    inputToken: string,
    outputToken: string,
    amount: string,
    slippage: number,
    strategy: string,
    // Required parameters from useWallet hook
    publicKey: PublicKey | null, 
    sendTransaction: WalletContextState['sendTransaction'],
    userPublicKeyString: string | null // Added userPublicKey as string
  ) => {
    // Check for publicKey (as PublicKey object) and userPublicKeyString (as string)
    if (!publicKey || !userPublicKeyString || !sendTransaction) { 
      return {
        success: false,
        error: 'Wallet not connected or sendTransaction not available',
      };
    }
    
    try {
      // Create connection to Solana - Consider making RPC endpoint configurable via hook params or context
      const connection = new Connection(
        process.env.NEXT_PUBLIC_RPC_ENDPOINT || 'https://api.mainnet-beta.solana.com', 
        'confirmed'
      );
      
      // Apply strategy parameters (this would be expanded based on strategy type)
      const slippageBps = slippage * 100; // Convert percentage to basis points
      
      // Get quote from Jupiter
      console.log(`Getting quote for ${amount} ${inputToken} to ${outputToken} with ${slippage}% slippage`);
      const quoteResponse = await getJupiterQuote({
        inputMint: inputToken,
        outputMint: outputToken,
        amount,
        slippageBps,
      });
      
      console.log('Quote received:', quoteResponse);
      
      // Prepare swap transaction - use the passed userPublicKeyString
      console.log('Preparing swap transaction...');
      const swapResponse = await prepareJupiterSwapTransaction({
        quoteResponse,
        userPublicKey: userPublicKeyString, // Use the string version here
      });
      
      console.log('Swap transaction prepared:', swapResponse);
      
      // Execute swap - pass sendTransaction function
      console.log('Executing swap...');
      const result = await executeJupiterSwap(swapResponse, sendTransaction, connection);
      
      console.log('Swap executed:', result);
      
      return {
        success: true,
        signature: result.signature,
        inputAmount: amount,
        expectedOutputAmount: quoteResponse.outAmount,
        strategy,
      };
    } catch (error) {
      // Log the full error object for better debugging
      console.error('Full error object during trade execution:', error);
      return {
        success: false,
        // Provide more detail if available, otherwise keep original message
        error: error instanceof Error ? error.message : JSON.stringify(error),
      };
    }
  // Dependency array for useCallback is empty as it doesn't depend on props/state of this hook
  }, []); 
  
  return {
    executeTradeWithStrategy, // Return the memoized function
    // Removed wallet state management from this hook
  };
};

export default useJupiterTrading;
