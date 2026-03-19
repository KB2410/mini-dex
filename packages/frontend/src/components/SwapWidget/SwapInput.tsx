/**
 * SwapInput Component
 * 
 * Displays ETH token selector (fixed) with amount input field.
 * Shows user's ETH balance and includes a "Max" button.
 * Validates positive numbers only.
 * 
 * Requirements: 6.1, 6.2, 6.5
 */

'use client';

import { useState, useEffect } from 'react';
import { useBalances } from '@/hooks/useBalances';

interface SwapInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function SwapInput({ value, onChange, disabled = false }: SwapInputProps) {
  const [mounted, setMounted] = useState(false);
  const { ethBalance, ethBalanceRaw, isLoading, isConnected } = useBalances();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    
    // Allow empty string
    if (inputValue === '') {
      onChange('');
      return;
    }
    
    // Validate positive numbers only (including decimals)
    // Allow numbers like: 1, 1.5, 0.5, .5
    const regex = /^\d*\.?\d*$/;
    if (regex.test(inputValue)) {
      // Prevent leading zeros (except for decimals like 0.5)
      if (inputValue.startsWith('0') && inputValue.length > 1 && !inputValue.startsWith('0.')) {
        return;
      }
      onChange(inputValue);
    }
  };

  const handleMaxClick = () => {
    if (ethBalance && !disabled) {
      // Use the full balance, but leave a small amount for gas
      // Subtract ~0.001 ETH for gas fees
      const maxAmount = parseFloat(ethBalance);
      if (maxAmount > 0.001) {
        onChange((maxAmount - 0.001).toFixed(6));
      } else {
        onChange(ethBalance);
      }
    }
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
      {/* Header with label and balance */}
      <div className="flex justify-between items-center mb-2">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          From
        </label>
        {mounted && isConnected && (
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {isLoading ? (
              <span className="animate-pulse">Loading...</span>
            ) : (
              <span>
                Balance: {ethBalance ? parseFloat(ethBalance).toFixed(4) : '0.0000'} ETH
              </span>
            )}
          </div>
        )}
      </div>

      {/* Input and token selector */}
      <div className="flex items-center gap-3">
        {/* Amount input */}
        <input
          type="text"
          inputMode="decimal"
          placeholder="0.0"
          value={value}
          onChange={handleInputChange}
          disabled={disabled || !isConnected}
          className="flex-1 bg-transparent text-2xl font-semibold outline-none text-gray-900 dark:text-white placeholder-gray-400 disabled:cursor-not-allowed disabled:opacity-50"
          autoComplete="off"
          autoCorrect="off"
          spellCheck="false"
        />

        {/* Token selector (fixed to ETH) */}
        <div className="flex items-center gap-2 bg-white dark:bg-gray-700 rounded-lg px-3 py-2 border border-gray-200 dark:border-gray-600">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center">
            <span className="text-white text-xs font-bold">Ξ</span>
          </div>
          <span className="font-semibold text-gray-900 dark:text-white">ETH</span>
        </div>
      </div>

      {/* Max button */}
      {mounted && isConnected && (
        <div className="flex justify-end mt-2">
          <button
            type="button"
            onClick={handleMaxClick}
            disabled={disabled || isLoading || !ethBalanceRaw || ethBalanceRaw === 0n}
            className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            MAX
          </button>
        </div>
      )}
    </div>
  );
}
