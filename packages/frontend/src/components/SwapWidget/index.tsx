/**
 * SwapWidget Component
 * 
 * Main container component that composes the swap interface.
 * Manages swap amount state and coordinates child components.
 * Displays exchange rate, price impact, and swap details.
 * 
 * Requirements: 6.1, 6.5
 */

'use client';

import { useState, useMemo } from 'react';
import { useReadContract } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { SwapInput } from './SwapInput';
import { SwapOutput } from './SwapOutput';
import { SwapButton } from './SwapButton';
import { usePoolStats } from '@/hooks/usePoolStats';
import { SIMPLE_POOL_ABI, SIMPLE_POOL_ADDRESS } from '@/lib/contracts';

export interface SwapWidgetProps {
  className?: string;
}

export function SwapWidget({ className = '' }: SwapWidgetProps) {
  const [ethAmount, setEthAmount] = useState('');
  const { ethReserve, tokenReserve, hasLiquidity } = usePoolStats();

  // Get swap estimate for details calculation
  const { data: estimatedOutput } = useReadContract({
    address: SIMPLE_POOL_ADDRESS,
    abi: SIMPLE_POOL_ABI,
    functionName: 'getSwapEstimate',
    args: ethAmount && parseFloat(ethAmount) > 0 ? [parseEther(ethAmount)] : undefined,
    query: {
      enabled: !!ethAmount && parseFloat(ethAmount) > 0 && hasLiquidity,
    },
  });

  // Calculate exchange rate and price impact
  const swapDetails = useMemo(() => {
    if (!ethReserve || !tokenReserve || !ethAmount || parseFloat(ethAmount) === 0) {
      return {
        exchangeRate: '0.00',
        priceImpact: '0.00',
        minimumReceived: '0.00',
      };
    }

    // Current exchange rate (tokens per ETH)
    const currentRate = Number(tokenReserve) / Number(ethReserve);
    
    // Calculate price impact if we have an estimate
    let priceImpact = 0;
    let minimumReceived = '0.00';
    
    if (estimatedOutput) {
      const ethAmountWei = parseFloat(ethAmount) * 1e18;
      const actualRate = Number(estimatedOutput) / ethAmountWei;
      priceImpact = ((currentRate - actualRate) / currentRate) * 100;
      
      // Minimum received with 0.5% slippage tolerance
      const minReceived = Number(estimatedOutput) * 0.995;
      minimumReceived = (minReceived / 1e18).toFixed(6);
    }

    return {
      exchangeRate: currentRate.toFixed(6),
      priceImpact: priceImpact.toFixed(2),
      minimumReceived,
    };
  }, [ethReserve, tokenReserve, ethAmount, estimatedOutput]);

  // Handle successful swap - reset input
  const handleSwapSuccess = () => {
    setEthAmount('');
  };

  return (
    <div className={`w-full max-w-md mx-auto ${className}`}>
      {/* Main swap card */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Swap
          </h2>
          <div className="flex items-center gap-2">
            {/* Settings icon placeholder */}
            <button
              type="button"
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              aria-label="Settings"
            >
              <svg
                className="w-5 h-5 text-gray-600 dark:text-gray-400"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Swap Input */}
        <SwapInput
          value={ethAmount}
          onChange={setEthAmount}
        />

        {/* Swap direction icon */}
        <div className="flex justify-center -my-2 relative z-10">
          <div className="bg-white dark:bg-gray-900 border-4 border-gray-100 dark:border-gray-800 rounded-xl p-2">
            <svg
              className="w-6 h-6 text-gray-600 dark:text-gray-400"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </div>
        </div>

        {/* Swap Output */}
        <SwapOutput ethAmount={ethAmount} />

        {/* Swap Details */}
        {ethAmount && parseFloat(ethAmount) > 0 && hasLiquidity && (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2 border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600 dark:text-gray-400">Exchange Rate</span>
              <span className="font-medium text-gray-900 dark:text-white">
                1 ETH = {swapDetails.exchangeRate} GEMI
              </span>
            </div>
            
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600 dark:text-gray-400">Price Impact</span>
              <span
                className={`font-medium ${
                  parseFloat(swapDetails.priceImpact) > 5
                    ? 'text-red-600 dark:text-red-400'
                    : parseFloat(swapDetails.priceImpact) > 2
                    ? 'text-yellow-600 dark:text-yellow-400'
                    : 'text-green-600 dark:text-green-400'
                }`}
              >
                {swapDetails.priceImpact}%
              </span>
            </div>

            {estimatedOutput && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600 dark:text-gray-400">
                  Minimum Received
                  <span className="text-xs ml-1">(0.5% slippage)</span>
                </span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {swapDetails.minimumReceived} GEMI
                </span>
              </div>
            )}
          </div>
        )}

        {/* No liquidity warning */}
        {!hasLiquidity && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <svg
                className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  No liquidity available
                </p>
                <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                  The pool needs liquidity before swaps can be executed.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Swap Button */}
        <SwapButton
          ethAmount={ethAmount}
          disabled={!hasLiquidity}
          onSuccess={handleSwapSuccess}
        />
      </div>

      {/* Info footer */}
      <div className="mt-4 text-center text-xs text-gray-500 dark:text-gray-400">
        <p>Powered by Mini-DEX • Sepolia Testnet</p>
      </div>
    </div>
  );
}

// Re-export child components for convenience
export { SwapInput } from './SwapInput';
export { SwapOutput } from './SwapOutput';
export { SwapButton } from './SwapButton';
