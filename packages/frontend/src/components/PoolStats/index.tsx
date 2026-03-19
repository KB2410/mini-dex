/**
 * PoolStats Component
 * 
 * Displays real-time statistics about the liquidity pool including:
 * - Total liquidity (combined value)
 * - ETH reserve
 * - Token reserve
 * 
 * Automatically updates when pool events are detected (LiquidityAdded, LiquidityRemoved, SwapExecuted).
 * Formats large numbers with appropriate units (K, M, B).
 * 
 * Requirements: 7.3, 7.4
 */

'use client';

import { usePoolStats } from '@/hooks/usePoolStats';
import { usePoolEvents } from '@/hooks/usePoolEvents';

/**
 * Format large numbers with appropriate units (K, M, B, T)
 * Examples:
 * - 1234 -> "1.23K"
 * - 1234567 -> "1.23M"
 * - 1234567890 -> "1.23B"
 */
function formatLargeNumber(value: string | undefined): string {
  if (!value) return '0.00';
  
  const num = parseFloat(value);
  
  if (isNaN(num)) return '0.00';
  
  // Less than 1000 - show full number with 2 decimals
  if (num < 1000) {
    return num.toFixed(2);
  }
  
  // Thousands (K)
  if (num < 1_000_000) {
    return (num / 1_000).toFixed(2) + 'K';
  }
  
  // Millions (M)
  if (num < 1_000_000_000) {
    return (num / 1_000_000).toFixed(2) + 'M';
  }
  
  // Billions (B)
  if (num < 1_000_000_000_000) {
    return (num / 1_000_000_000).toFixed(2) + 'B';
  }
  
  // Trillions (T)
  return (num / 1_000_000_000_000).toFixed(2) + 'T';
}

export interface PoolStatsProps {
  className?: string;
}

export function PoolStats({ className = '' }: PoolStatsProps) {
  // Fetch pool statistics
  const {
    ethReserveFormatted,
    tokenReserveFormatted,
    totalLiquidityFormatted,
    isLoading,
    hasLiquidity,
  } = usePoolStats();
  
  // Set up real-time event monitoring (automatically invalidates queries)
  usePoolEvents();

  return (
    <div className={`w-full max-w-md mx-auto ${className}`}>
      {/* Pool Stats Card */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Pool Statistics
          </h2>
          
          {/* Live indicator */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <div className="absolute inset-0 w-2 h-2 bg-green-500 rounded-full animate-ping opacity-75" />
            </div>
            <span className="text-xs font-medium text-green-600 dark:text-green-400">
              Live
            </span>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-2" />
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
              </div>
            ))}
          </div>
        )}

        {/* Stats Display */}
        {!isLoading && (
          <div className="space-y-6">
            {/* Total Liquidity */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2 mb-2">
                <svg
                  className="w-5 h-5 text-blue-600 dark:text-blue-400"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-medium text-blue-900 dark:text-blue-200">
                  Total Liquidity
                </span>
              </div>
              <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">
                {formatLargeNumber(totalLiquidityFormatted)} ETH
              </p>
              {!hasLiquidity && (
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                  Pool is empty
                </p>
              )}
            </div>

            {/* Reserves Grid */}
            <div className="grid grid-cols-2 gap-4">
              {/* ETH Reserve */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                    <span className="text-white text-xs font-bold">Ξ</span>
                  </div>
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                    ETH Reserve
                  </span>
                </div>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {formatLargeNumber(ethReserveFormatted)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  ETH
                </p>
              </div>

              {/* Token Reserve */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                    <span className="text-white text-xs font-bold">G</span>
                  </div>
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                    Token Reserve
                  </span>
                </div>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {formatLargeNumber(tokenReserveFormatted)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  GEMI
                </p>
              </div>
            </div>

            {/* Exchange Rate Info */}
            {hasLiquidity && ethReserveFormatted && tokenReserveFormatted && (
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600 dark:text-gray-400">
                    Current Rate
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    1 ETH = {(parseFloat(tokenReserveFormatted) / parseFloat(ethReserveFormatted)).toFixed(2)} GEMI
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer Info */}
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            Updates automatically when pool events are detected
          </p>
        </div>
      </div>
    </div>
  );
}
