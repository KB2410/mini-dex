/**
 * SwapWidget Component
 * 
 * Placeholder for Stellar token swap interface.
 * TODO: Implement Soroban contract interaction
 */

'use client';

interface SwapWidgetProps {
  className?: string;
}

export function SwapWidget({ className }: SwapWidgetProps) {
  return (
    <div className={`bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Swap Tokens
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Soroban swap interface coming soon...
      </p>
    </div>
  );
}
