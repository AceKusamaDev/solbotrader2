'use client';

import { Inter } from 'next/font/google';
import './globals.css';
import dynamic from 'next/dynamic';
import { Providers } from './providers';

// Dynamically import Header with no SSR
const Header = dynamic(() => import('@/components/Header'), { ssr: false });

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-900 text-white min-h-screen`}>
        <Providers>
          <Header />
          <main className="container mx-auto py-8 px-4">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
