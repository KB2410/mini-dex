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
  title: 'Mini-DEX | Decentralized Exchange',
  description: 'Swap ETH for GEMI tokens on Sepolia testnet',
  keywords: ['DEX', 'Ethereum', 'Swap', 'DeFi', 'Sepolia'],
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
