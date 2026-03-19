'use client';

import { useState } from 'react';

/**
 * WalletButton Component
 * 
 * Displays connected wallet address with copy functionality.
 * Shows abbreviated address and provides disconnect option.
 * Styled with Tailwind CSS for mobile responsiveness.
 * 
 * Requirements: 6.1, 6.6
 */

interface WalletButtonProps {
  address: `0x${string}`;
  onDisconnect: () => void;
}

export default function WalletButton({ address, onDisconnect }: WalletButtonProps) {
  const [copied, setCopied] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  // Abbreviate address: 0x1234...5678
  const abbreviatedAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;

  // Copy address to clipboard
  const handleCopyAddress = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy address:', error);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors font-mono text-sm"
      >
        {abbreviatedAddress}
      </button>

      {/* Dropdown Menu */}
      {showMenu && (
        <>
          {/* Backdrop to close menu */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowMenu(false)}
          />
          
          {/* Menu Content */}
          <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20">
            <div className="py-1">
              {/* Copy Address */}
              <button
                onClick={handleCopyAddress}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                {copied ? '✓ Copied!' : 'Copy Address'}
              </button>

              {/* Disconnect */}
              <button
                onClick={() => {
                  onDisconnect();
                  setShowMenu(false);
                }}
                className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                Disconnect
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
