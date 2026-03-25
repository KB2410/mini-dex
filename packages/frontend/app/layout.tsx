/**
 * Root Layout
 * 
 * Root layout component for the Next.js application.
 * Sets up HTML structure, metadata, and wraps app with providers.
 * 
 * Requirements: 6.1, 12.4
 */

import type { Metadata, Viewport } from 'next';
import { Providers } from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'Mini-DEX | Stellar Soroban DEX',
  description: 'Swap Stellar tokens on testnet with Soroban smart contracts',
  keywords: ['DEX', 'Stellar', 'Soroban', 'Swap', 'DeFi', 'Rust', 'AMM'],
  authors: [{ name: 'Mini-DEX Team' }],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#4F46E5',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-gray-50 dark:bg-gray-950">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
