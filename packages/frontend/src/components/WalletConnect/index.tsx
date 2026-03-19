/**
 * WalletConnect Component
 * 
 * Wallet connection interface that supports multiple wallet providers.
 * Displays connected address, network status, and handles wallet connection/disconnection.
 * 
 * Requirements: 13.1, 13.2, 13.3, 13.4, 13.5
 */

'use client';

import { useAccount, useConnect, useDisconnect, useChainId } from 'wagmi';
import { sepolia, hardhat } from 'wagmi/chains';
import { useState, useEffect } from 'react';

export function WalletConnect() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const [showConnectors, setShowConnectors] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch by only rendering after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button
        disabled
        className="px-6 py-2.5 bg-indigo-400 text-white font-medium rounded-lg"
        type="button"
      >
        Loading...
      </button>
    );
  }

  // Check if on correct network (Hardhat in development, Sepolia in production)
  const isDevelopment = process.env.NODE_ENV === 'development';
  const expectedChainId = isDevelopment ? hardhat.id : sepolia.id;
  const isCorrectNetwork = chainId === expectedChainId;
  const networkName = chainId === hardhat.id ? 'Hardhat Local' : chainId === sepolia.id ? 'Sepolia' : 'Wrong Network';

  // Format address for display (0x1234...5678)
  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  // Handle wallet connection
  const handleConnect = (connectorId: string) => {
    const connector = connectors.find((c) => c.id === connectorId);
    if (connector) {
      connect({ connector });
      setShowConnectors(false);
    }
  };

  // If connected, show address and disconnect button
  if (isConnected && address) {
    return (
      <div className="flex items-center gap-3">
        {/* Network indicator */}
        <div
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
            isCorrectNetwork
              ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800'
              : 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
          }`}
        >
          <div
            className={`w-2 h-2 rounded-full ${
              isCorrectNetwork ? 'bg-green-500' : 'bg-red-500'
            }`}
          />
          <span>{networkName}</span>
        </div>

        {/* Address display */}
        <div className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2">
          <div className="w-2 h-2 bg-green-500 rounded-full" />
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {formatAddress(address)}
          </span>
        </div>

        {/* Disconnect button */}
        <button
          onClick={() => disconnect()}
          className="px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg transition-colors"
          type="button"
        >
          Disconnect
        </button>
      </div>
    );
  }

  // If not connected, show connect button and wallet options
  return (
    <div className="relative">
      {/* Connect button */}
      <button
        onClick={() => setShowConnectors(!showConnectors)}
        disabled={isPending}
        className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium rounded-lg transition-colors shadow-lg shadow-indigo-500/30"
        type="button"
      >
        {isPending ? 'Connecting...' : 'Connect Wallet'}
      </button>

      {/* Wallet connector dropdown */}
      {showConnectors && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowConnectors(false)}
          />

          {/* Dropdown menu */}
          <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-20 overflow-hidden">
            <div className="p-3 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                Connect Wallet
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Choose your preferred wallet
              </p>
            </div>

            <div className="p-2">
              {connectors.map((connector) => (
                <button
                  key={connector.id}
                  onClick={() => handleConnect(connector.id)}
                  disabled={isPending}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  type="button"
                >
                  {/* Wallet icon placeholder */}
                  <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <span className="text-white text-xs font-bold">
                      {connector.name.charAt(0)}
                    </span>
                  </div>

                  {/* Wallet name */}
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {connector.name}
                    </p>
                  </div>

                  {/* Arrow icon */}
                  <svg
                    className="w-4 h-4 text-gray-400"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ))}
            </div>

            {/* Footer note */}
            <div className="p-3 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                By connecting, you agree to the terms of service
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
