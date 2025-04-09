'use client';

import React, { useState, useEffect } from 'react'; // Import useState, useEffect
import { useWallet } from '@solana/wallet-adapter-react';
import dynamic from 'next/dynamic';

// Dynamically import WalletMultiButton to avoid SSR issues
const WalletMultiButton = dynamic(
  async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton,
  { ssr: false }
);

// Header component using Wallet Adapter context and UI components
const Header = () => {
  const { connected } = useWallet(); // Get state from adapter context
  const [isMounted, setIsMounted] = useState(false); // State to track client mount

  useEffect(() => {
    // Set mounted state to true only on the client side after initial render
    setIsMounted(true); 
  }, []);

  // Note: Balance fetching is removed for simplicity, 
  // it can be added back using the adapter's connection if needed.

  return (
    <header className="bg-gray-900 text-white p-4 flex justify-between items-center">
      <div className="flex items-center">
        <h1 className="text-xl font-bold">SolBotX</h1>
        {!connected && (
          <div className="ml-4 px-3 py-1 bg-yellow-600 text-white rounded-md text-sm">
            Connect Wallet to Start
          </div>
        )}
      </div>
      
      <div className="flex items-center">
        {/* Render the WalletMultiButton component only after mounting on client */}
        {/* This prevents potential SSR/hydration issues */}
        {isMounted && (
          <WalletMultiButton style={{ height: '40px', fontSize: '14px' }} /> 
        )}
      </div>
    </header>
  );
};

// Remove the manual Phantom type definition as it's handled by the adapter
// declare global { ... }

export default Header;
