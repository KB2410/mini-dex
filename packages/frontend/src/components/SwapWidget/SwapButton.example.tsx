/**
 * SwapButton Component Example
 * 
 * Demonstrates usage of the SwapButton component in different states.
 */

'use client';

import { SwapButton } from './SwapButton';
import { useState } from 'react';

export default function SwapButtonExample() {
  const [ethAmount, setEthAmount] = useState('0.1');

  return (
    <div className="max-w-md mx-auto p-6 space-y-8">
      <div>
        <h2 className="text-xl font-bold mb-4">SwapButton Examples</h2>
        
        {/* Example 1: Normal swap button */}
        <div className="space-y-4 p-4 border rounded-lg">
          <h3 className="font-semibold">Normal State</h3>
          <input
            type="number"
            value={ethAmount}
            onChange={(e) => setEthAmount(e.target.value)}
            placeholder="0.0"
            className="w-full p-2 border rounded"
          />
          <SwapButton
            ethAmount={ethAmount}
            onSuccess={() => {
              console.log('Swap successful!');
              setEthAmount('');
            }}
            onError={(error) => {
              console.error('Swap failed:', error);
            }}
          />
        </div>

        {/* Example 2: Disabled button */}
        <div className="space-y-4 p-4 border rounded-lg mt-4">
          <h3 className="font-semibold">Disabled State</h3>
          <SwapButton
            ethAmount="0.1"
            disabled={true}
          />
        </div>

        {/* Example 3: Empty amount */}
        <div className="space-y-4 p-4 border rounded-lg mt-4">
          <h3 className="font-semibold">Empty Amount (shows &quot;Enter Amount&quot;)</h3>
          <SwapButton ethAmount="" />
        </div>
      </div>

      <div className="text-sm text-gray-600 space-y-2">
        <p><strong>States handled by SwapButton:</strong></p>
        <ul className="list-disc list-inside space-y-1">
          <li>Connect Wallet - when wallet is not connected</li>
          <li>Switch Network - when on wrong network (not Sepolia)</li>
          <li>Enter Amount - when input is empty or zero</li>
          <li>Swap - when ready to execute</li>
          <li>&quot;Processing...&quot; - during transaction (with spinner)</li>
          <li>Success message - after successful swap</li>
          <li>Error message - after failed transaction</li>
        </ul>
      </div>
    </div>
  );
}
