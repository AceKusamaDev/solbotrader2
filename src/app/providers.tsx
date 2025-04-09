'use client';

import dynamic from 'next/dynamic';

// Dynamically import wallet components with no SSR
const WalletConnectionProvider = dynamic(
  () => import('@/components/WalletConnectionProvider'),
  { ssr: false }
);

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WalletConnectionProvider>
      {children}
    </WalletConnectionProvider>
  );
}

export default Providers;
