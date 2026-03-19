/**
 * SwapOutput Component
 * 
 * Displays GEMI token selector (fixed) with estimated token output (read-only).
 * Shows user's GEMI balance and loading spinner while calculating estimate.
 * Uses useReadContract() to call getSwapEstimate() from SimplePool.
 * 
 * Requirements: 6.3, 6.5
 */

'use client';

import { useState, useEffect } from 'react';
import { useReadContract } from 'wagmi';
import { parseEther } from 'viem';
import { useBalances } from '@/hooks/useBalances';
import { SIMPLE_POOL_ABI, SIMPLE_POOL_ADDRESS } from '@/lib/contracts';

interface SwapOutputProps {
  ethAmount: string;
  disabled?: boolean;
}

export function SwapOutput({ ethAmount, disabled = false }: SwapOutputProps) {
  const [mounted, setMounted] = useState(false);
  const { tokenBalance, tokenBalanceFormatted, tokenLoading, isConnected } = useBalances();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Calculate swap estimate using getSwapEstimate()
  const {
    data: estimatedOutput,
    isLoading: isCalculating,
    error: estimateError,
  } = useReadContract({
    address: SIMPLE_POOL_ADDRESS,
    abi: SIMPLE_POOL_ABI,
    functionName: 'getSwapEstimate',
    args: ethAmount && parseFloat(ethAmount) > 0 ? [parseEther(ethAmount)] : undefined,
    query: {
      enabled: !!ethAmount && parseFloat(ethAmount) > 0,
      // Refetch when ethAmount changes
      refetchInterval: false,
    },
  });

  // Format the estimated output for display
  const formatEstimate = () => {
    if (!ethAmount || parseFloat(ethAmount) === 0) {
      return '0.0';
    }
    
    if (isCalculating) {
      return '...';
    }
    
    if (estimateError || !estimatedOutput) {
      return '0.0';
    }
    
    // Convert bigint to formatted string
    const formatted = Number(estimatedOutput) / 1e18;
    return formatted.toFixed(6);
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
      {/* Header with label and balance */}
      <div className="flex justify-between items-center mb-2">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          To (estimated)
        </label>
        {mounted && isConnected && (
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {tokenLoading ? (
              <span className="animate-pulse">Loading...</span>
            ) : (
              <span>
                Balance: {tokenBalanceFormatted ? parseFloat(tokenBalanceFormatted).toFixed(4) : '0.0000'} GEMI
              </span>
            )}
          </div>
        )}
      </div>

      {/* Output display and token selector */}
      <div className="flex items-center gap-3">
        {/* Estimated amount (read-only) */}
        <div className="flex-1 flex items-center">
          {isCalculating ? (
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-2xl font-semibold text-gray-400 dark:text-gray-500">
                Calculating...
              </span>
            </div>
          ) : (
            <span className="text-2xl font-semibold text-gray-900 dark:text-white">
              {formatEstimate()}
            </span>
          )}
        </div>

        {/* Token selector (fixed to GEMI) */}
        <div className="flex items-center gap-2 bg-white dark:bg-gray-700 rounded-lg px-3 py-2 border border-gray-200 dark:border-gray-600">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
            <span className="text-white text-xs font-bold">G</span>
          </div>
          <span className="font-semibold text-gray-900 dark:text-white">GEMI</span>
        </div>
      </div>

      {/* Error message if estimate fails */}
      {estimateError && ethAmount && parseFloat(ethAmount) > 0 && (
        <div className="mt-2 text-xs text-red-600 dark:text-red-400">
          Unable to calculate estimate. Pool may have insufficient liquidity.
        </div>
      )}
    </div>
  );
}
