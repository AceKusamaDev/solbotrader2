'use client';

import React, { useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets'; // Add other wallets if needed
import { clusterApiUrl } from '@solana/web3.js';

// Default styles for the modal
require('@solana/wallet-adapter-react-ui/styles.css');

export default function WalletConnectionProvider({ children }: { children: React.ReactNode }) {
  // Can be set to 'devnet', 'testnet', or 'mainnet-beta'
  // Use the environment variable for network, default to mainnet-beta
  const network = (process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'mainnet-beta') as WalletAdapterNetwork; 

  // You can also provide a custom RPC endpoint
  // Use the environment variable for RPC endpoint
  const endpoint = useMemo(() => process.env.NEXT_PUBLIC_RPC_ENDPOINT || clusterApiUrl(network), [network]);

  // @solana/wallet-adapter-wallets includes all the adapters but supports tree shaking and lazy loading --
  // Only the wallets you configure here will be compiled into your application, and only the dependencies
  // of wallets that your users connect to will be loaded.
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      // Add other wallet adapters here if desired (e.g., SolflareWalletAdapter)
    ],
    [network] // Network dependency might be relevant for some wallets
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          {children} 
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
