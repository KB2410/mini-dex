/**
 * SwapOutput Component Example
 * 
 * This file demonstrates how to use the SwapOutput component.
 * You can use this as a reference for integrating the component into your pages.
 */

'use client';

import { useState } from 'react';
import { SwapInput } from './SwapInput';
import { SwapOutput } from './SwapOutput';

export function SwapOutputExample() {
  const [ethAmount, setEthAmount] = useState('');

  return (
    <div className="max-w-md mx-auto p-4 space-y-4">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
        SwapOutput Example
      </h2>
      
      <div className="space-y-3">
        {/* Input component to set the ETH amount */}
        <SwapInput
          value={ethAmount}
          onChange={setEthAmount}
          disabled={false}
        />
        
        {/* Output component shows estimated GEMI tokens */}
        <SwapOutput
          ethAmount={ethAmount}
          disabled={false}
        />
      </div>
      
      <div className="text-sm text-gray-600 dark:text-gray-400">
        <p>Current ETH amount: {ethAmount || '(empty)'}</p>
        <p className="mt-2">Try:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Entering different ETH amounts to see estimated output</li>
          <li>Watch the loading spinner while calculating</li>
          <li>The estimate updates automatically as you type</li>
        </ul>
      </div>
    </div>
  );
}
