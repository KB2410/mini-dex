'use client';

import { useAccount, useConnect, useDisconnect, useChainId, useSwitchChain } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { useState } from 'react';
import WalletButton from './WalletButton';

/**
 * WalletConnect Component
 * 
 * Displays wallet connection options and shows connected wallet information.
 * Includes network indicator and handles wallet connection/disconnection.
 * Implements network switching with error handling.
 * 
 * Requirements: 13.3, 13.4, 13.5
 */
export default function WalletConnect() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const [switchError, setSwitchError] = useState<string | null>(null);

  // Check if user is on the correct network (Sepolia)
  const isCorrectNetwork = chainId === sepolia.id;

  // Handle network switch
  const handleSwitchNetwork = async () => {
    setSwitchError(null);
    try {
      await switchChain({ chainId: sepolia.id });
    } catch (error: any) {
      console.error('Failed to switch network:', error);
      setSwitchError(error.message || 'Failed to switch network');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Network Mismatch Warning */}
      {isConnected && !isCorrectNetwork && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-sm text-yellow-800 dark:text-yellow-200">
                Wrong network detected. Please switch to Sepolia.
              </span>
            </div>
            <button
              onClick={handleSwitchNetwork}
              disabled={isSwitching}
              className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm whitespace-nowrap"
            >
              {isSwitching ? 'Switching...' : 'Switch to Sepolia'}
            </button>
          </div>
          {switchError && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">
              {switchError}
            </p>
          )}
        </div>
      )}

      <div className="flex items-center gap-4">
        {/* Network Indicator */}
        {isConnected && (
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                isCorrectNetwork ? 'bg-green-500' : 'bg-red-500'
              }`}
              title={isCorrectNetwork ? 'Connected to Sepolia' : 'Wrong network'}
            />
            <span className="text-sm text-gray-600 dark:text-gray-400 hidden sm:inline">
              {isCorrectNetwork ? 'Sepolia' : 'Wrong Network'}
            </span>
          </div>
        )}

        {/* Wallet Connection UI */}
        {!isConnected ? (
          <div className="flex flex-col gap-2">
            {connectors.map((connector) => (
              <button
                key={connector.id}
                onClick={() => connect({ connector })}
                disabled={isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isPending ? 'Connecting...' : `Connect ${connector.name}`}
              </button>
            ))}
          </div>
        ) : (
          <WalletButton address={address!} onDisconnect={disconnect} />
        )}
      </div>
    </div>
  );
}
