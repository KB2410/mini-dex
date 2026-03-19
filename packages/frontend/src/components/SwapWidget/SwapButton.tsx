/**
 * SwapButton Component
 * 
 * Orchestrates swap transaction execution with comprehensive state management.
 * Displays appropriate button text and states based on:
 * - Wallet connection status
 * - Network validation (Sepolia)
 * - Input validation
 * - Transaction states (pending, success, error)
 * 
 * Validates: Requirements 6.4, 6.5
 */

'use client';

import { useAccount, useChainId } from 'wagmi';
import { sepolia, hardhat } from 'wagmi/chains';
import { useSwap } from '@/hooks/useSwap';
import { useEffect, useState, useRef } from 'react';

export interface SwapButtonProps {
  /** Amount of ETH to swap (as string in ether units) */
  ethAmount: string;
  /** Whether the button should be disabled */
  disabled?: boolean;
  /** Callback fired when swap succeeds */
  onSuccess?: () => void;
  /** Callback fired when swap fails */
  onError?: (error: Error) => void;
}

export function SwapButton({ ethAmount, disabled = false, onSuccess, onError }: SwapButtonProps) {
  const [mounted, setMounted] = useState(false);
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { swap, isPending, isSuccess, error, errorCategory, reset } = useSwap();
  
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const prevSuccessRef = useRef(false);
  const prevErrorRef = useRef<Error | null>(null);

  // Set mounted state
  useEffect(() => {
    setMounted(true);
  }, []);

  // Check if on correct network (Hardhat in development, Sepolia in production)
  const isDevelopment = process.env.NODE_ENV === 'development';
  const expectedChainId = isDevelopment ? hardhat.id : sepolia.id;
  const isCorrectNetwork = chainId === expectedChainId;

  // Validate input amount
  const hasValidAmount = ethAmount && parseFloat(ethAmount) > 0;

  // Handle success state changes
  useEffect(() => {
    if (isSuccess && !prevSuccessRef.current) {
      // eslint-disable-next-line react-compiler/react-compiler
      setShowSuccess(true);
      onSuccess?.();
      
      // Auto-hide success message after 5 seconds
      const timer = setTimeout(() => {
        setShowSuccess(false);
        reset();
      }, 5000);
      
      prevSuccessRef.current = true;
      return () => clearTimeout(timer);
    } else if (!isSuccess) {
      prevSuccessRef.current = false;
    }
  }, [isSuccess, onSuccess, reset]);

  // Handle error state changes
  useEffect(() => {
    if (error && error !== prevErrorRef.current) {
      // eslint-disable-next-line react-compiler/react-compiler
      setShowError(true);
      onError?.(error as Error);
      
      // Auto-hide error message after 5 seconds (except for user cancellations)
      if (errorCategory !== 'user_cancellation') {
        const timer = setTimeout(() => {
          setShowError(false);
          reset();
        }, 5000);
        
        prevErrorRef.current = error;
        return () => clearTimeout(timer);
      }
      prevErrorRef.current = error;
    } else if (!error) {
      prevErrorRef.current = null;
    }
  }, [error, errorCategory, onError, reset]);

  // Handle swap execution
  const handleSwap = async () => {
    try {
      setShowSuccess(false);
      setShowError(false);
      await swap(ethAmount);
    } catch (err) {
      // Error is already handled by useSwap hook
      console.error('Swap failed:', err);
    }
  };

  // Determine button text and state
  const getButtonContent = () => {
    // Show loading spinner during transaction
    if (isPending) {
      return (
        <div className="flex items-center justify-center gap-2">
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          <span>Processing...</span>
        </div>
      );
    }

    // Before mount, show generic text to match SSR
    if (!mounted) {
      return 'Connect Wallet';
    }

    // Priority order for button states
    if (!isConnected) {
      return 'Connect Wallet';
    }

    if (!isCorrectNetwork) {
      return 'Switch Network';
    }

    if (!hasValidAmount) {
      return 'Enter Amount';
    }

    return 'Swap';
  };

  // Determine if button should be disabled
  const isDisabled = 
    !mounted ||
    disabled || 
    isPending || 
    !isConnected || 
    !isCorrectNetwork || 
    !hasValidAmount;

  // Get button styling based on state
  const getButtonClassName = () => {
    const baseClasses = 'w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-200';
    
    if (isDisabled) {
      return `${baseClasses} bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed`;
    }

    return `${baseClasses} bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-lg hover:shadow-xl`;
  };

  // Get user-friendly error message
  const getErrorMessage = () => {
    if (!error) return null;

    const errorMessage = (error as Error).message;

    // User cancellation
    if (errorCategory === 'user_cancellation') {
      return 'Transaction cancelled';
    }

    // Contract-specific errors
    if (errorMessage.includes('InsufficientLiquidity')) {
      return 'Insufficient liquidity in pool';
    }

    if (errorMessage.includes('InvalidSwapAmount')) {
      return 'Swap amount too small';
    }

    if (errorMessage.includes('ZeroAmount')) {
      return 'Amount must be greater than zero';
    }

    // Network errors
    if (errorMessage.includes('network') || errorMessage.includes('RPC')) {
      return 'Network error. Please check your connection';
    }

    // Generic error
    return 'Transaction failed. Please try again';
  };

  return (
    <div className="space-y-3">
      {/* Main swap button */}
      <button
        onClick={handleSwap}
        disabled={isDisabled}
        className={getButtonClassName()}
        type="button"
      >
        {getButtonContent()}
      </button>

      {/* Success message */}
      {showSuccess && (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <div className="flex items-center gap-2">
            <svg
              className="w-5 h-5 text-green-600 dark:text-green-400"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-sm font-medium text-green-800 dark:text-green-200">
              Swap successful!
            </span>
          </div>
        </div>
      )}

      {/* Error message */}
      {showError && error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-start gap-2">
            <svg
              className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800 dark:text-red-200">
                {getErrorMessage()}
              </p>
              {errorCategory !== 'user_cancellation' && (
                <button
                  onClick={() => {
                    setShowError(false);
                    reset();
                  }}
                  className="mt-2 text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 underline"
                >
                  Dismiss
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
