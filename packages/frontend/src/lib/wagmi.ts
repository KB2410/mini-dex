/**
 * Wagmi Configuration
 * 
 * Configures Wagmi with Sepolia network and local Hardhat network for testing.
 */

import { http, createConfig } from 'wagmi';
import { sepolia, hardhat } from 'wagmi/chains';
import { injected, walletConnect, coinbaseWallet } from 'wagmi/connectors';

// Get RPC URL from environment or use public RPC
const sepoliaRpcUrl = process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || 'https://rpc.sepolia.org';
const hardhatRpcUrl = 'http://127.0.0.1:8545';

// Determine which chains to use based on environment
const isDevelopment = process.env.NODE_ENV === 'development';

// WalletConnect Project ID (optional - for WalletConnect v2)
const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '';

// Create Wagmi configuration with proper typing
export const config = isDevelopment
  ? createConfig({
      chains: [hardhat, sepolia],
      connectors: [
        // MetaMask and other injected wallets
        injected({
          target: 'metaMask',
        }),
        // WalletConnect
        ...(walletConnectProjectId
          ? [
              walletConnect({
                projectId: walletConnectProjectId,
                metadata: {
                  name: 'Mini-DEX',
                  description: 'Decentralized exchange for ETH to GEMI token swaps',
                  url: 'https://mini-dex.vercel.app',
                  icons: ['https://mini-dex.vercel.app/icon.png'],
                },
              }),
            ]
          : []),
        // Coinbase Wallet
        coinbaseWallet({
          appName: 'Mini-DEX',
          appLogoUrl: 'https://mini-dex.vercel.app/icon.png',
        }),
      ],
      transports: {
        [sepolia.id]: http(sepoliaRpcUrl),
        [hardhat.id]: http(hardhatRpcUrl),
      },
    })
  : createConfig({
      chains: [sepolia],
      connectors: [
        // MetaMask and other injected wallets
        injected({
          target: 'metaMask',
        }),
        // WalletConnect
        ...(walletConnectProjectId
          ? [
              walletConnect({
                projectId: walletConnectProjectId,
                metadata: {
                  name: 'Mini-DEX',
                  description: 'Decentralized exchange for ETH to GEMI token swaps',
                  url: 'https://mini-dex.vercel.app',
                  icons: ['https://mini-dex.vercel.app/icon.png'],
                },
              }),
            ]
          : []),
        // Coinbase Wallet
        coinbaseWallet({
          appName: 'Mini-DEX',
          appLogoUrl: 'https://mini-dex.vercel.app/icon.png',
        }),
      ],
      transports: {
        [sepolia.id]: http(sepoliaRpcUrl),
      },
    });

// Export chains for convenience
export { sepolia, hardhat };
