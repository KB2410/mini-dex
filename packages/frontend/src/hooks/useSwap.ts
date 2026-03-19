/**
 * useSwap Hook
 * 
 * Handles ETH to GEMI token swaps with comprehensive error tracking via Sentry.
 * Distinguishes between user cancellations and contract reverts.
 */

import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther } from 'viem';
import { SIMPLE_POOL_ABI, SIMPLE_POOL_ADDRESS } from '@/lib/contracts';
import { captureTransactionError, categorizeError } from '@/lib/sentry-utils';

export function useSwap() {
  const { address } = useAccount();
  const {
    writeContract,
    data: hash,
    error: writeError,
    isPending: isWritePending,
    reset,
  } = useWriteContract();

  const {
    isLoading: isConfirming,
    isSuccess,
    error: receiptError,
  } = useWaitForTransactionReceipt({
    hash,
  });

  /**
   * Execute a swap transaction
   * @param ethAmount - Amount of ETH to swap (as string in ether units)
   */
  const swap = async (ethAmount: string) => {
    try {
      // Validate input
      if (!ethAmount || parseFloat(ethAmount) <= 0) {
        throw new Error('Invalid swap amount');
      }

      // Execute the swap
      writeContract({
        address: SIMPLE_POOL_ADDRESS,
        abi: SIMPLE_POOL_ABI,
        functionName: 'swapEthForToken',
        value: parseEther(ethAmount),
      });
    } catch (err) {
      handleSwapError(err as Error, ethAmount);
      throw err;
    }
  };

  /**
   * Handle swap errors with proper categorization and Sentry reporting
   */
  const handleSwapError = (error: Error, ethAmount: string) => {
    const errorCategory = categorizeError(error);

    // Don't send user cancellations to Sentry (filtered by beforeSend hook)
    if (errorCategory === 'user_cancellation') {
      console.log('User cancelled swap transaction');
      return;
    }

    // Capture contract reverts and other errors in Sentry
    captureTransactionError(error, {
      walletAddress: address,
      transactionHash: hash,
      errorMessage: error.message,
      transactionType: 'swap',
      contractAddress: SIMPLE_POOL_ADDRESS,
      amount: ethAmount,
      additionalData: {
        errorCategory,
        isPending: isWritePending,
        isConfirming,
      },
    });
  };

  // Handle receipt errors (transaction failed after being submitted)
  if (receiptError && !isSuccess) {
    handleSwapError(receiptError as Error, '');
  }

  // Determine overall error state
  const error = writeError || receiptError;
  const errorCategory = error ? categorizeError(error as Error) : undefined;

  return {
    // Main swap function
    swap,
    
    // Transaction state
    hash,
    isWritePending,
    isConfirming,
    isSuccess,
    isPending: isWritePending || isConfirming,
    
    // Error state
    error,
    errorCategory,
    isUserCancellation: errorCategory === 'user_cancellation',
    isContractRevert: errorCategory === 'contract_revert',
    
    // Reset function to clear state
    reset,
  };
}
