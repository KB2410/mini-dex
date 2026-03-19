/**
 * SwapInput Component Example
 * 
 * This file demonstrates how to use the SwapInput component.
 * You can use this as a reference for integrating the component into your pages.
 */

'use client';

import { useState } from 'react';
import { SwapInput } from './SwapInput';

export function SwapInputExample() {
  const [amount, setAmount] = useState('');

  return (
    <div className="max-w-md mx-auto p-4 space-y-4">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
        SwapInput Example
      </h2>
      
      <SwapInput
        value={amount}
        onChange={setAmount}
        disabled={false}
      />
      
      <div className="text-sm text-gray-600 dark:text-gray-400">
        <p>Current value: {amount || '(empty)'}</p>
        <p className="mt-2">Try:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Entering a number (e.g., 1.5)</li>
          <li>Clicking the MAX button</li>
          <li>Entering invalid characters (they will be rejected)</li>
        </ul>
      </div>
    </div>
  );
}
