/**
 * SwapWidget Example Usage
 * 
 * This file demonstrates how to use the SwapWidget component.
 */

import { SwapWidget } from './index';

export function SwapWidgetExample() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8 text-gray-900 dark:text-white">
          Mini-DEX Swap Interface
        </h1>
        
        {/* Basic usage */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold mb-4 text-gray-800 dark:text-gray-200">
            Basic Usage
          </h2>
          <SwapWidget />
        </div>

        {/* With custom className */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold mb-4 text-gray-800 dark:text-gray-200">
            With Custom Styling
          </h2>
          <SwapWidget className="shadow-2xl" />
        </div>

        {/* Usage notes */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
          <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
            Features
          </h3>
          <ul className="space-y-2 text-gray-700 dark:text-gray-300">
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-1">✓</span>
              <span>Manages swap amount state internally</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-1">✓</span>
              <span>Displays real-time exchange rate from pool reserves</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-1">✓</span>
              <span>Shows price impact with color-coded warnings</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-1">✓</span>
              <span>Calculates minimum received with 0.5% slippage tolerance</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-1">✓</span>
              <span>Responsive design for mobile and desktop</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-1">✓</span>
              <span>Automatic input reset after successful swap</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-1">✓</span>
              <span>No liquidity warning when pool is empty</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default SwapWidgetExample;
