/**
 * PoolStats Component
 * 
 * Placeholder for pool statistics display.
 * TODO: Implement Soroban contract stats fetching
 */

'use client';

interface PoolStatsProps {
  className?: string;
}

export function PoolStats({ className }: PoolStatsProps) {
  return (
    <div className={`bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Pool Statistics
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Pool stats coming soon...
      </p>
    </div>
  );
}
