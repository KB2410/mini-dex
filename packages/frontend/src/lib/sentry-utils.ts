/**
 * Sentry Utility Functions
 * 
 * Helper functions for error categorization and Sentry error reporting.
 * Distinguishes between user cancellations and contract reverts.
 */

import * as Sentry from '@sentry/nextjs';

/**
 * Error categories for transaction errors
 */
export type ErrorCategory = 'user_cancellation' | 'contract_revert' | 'network_error' | 'unknown';

/**
 * Transaction error context for Sentry reporting
 */
export interface TransactionErrorContext {
  walletAddress?: string;
  transactionHash?: string;
  errorMessage: string;
  transactionType: string;
  contractAddress?: string;
  amount?: string;
  additionalData?: Record<string, any>;
}

/**
 * Categorize an error based on its properties
 * 
 * @param error - The error to categorize
 * @returns The error category
 */
export function categorizeError(error: Error): ErrorCategory {
  const errorMessage = error.message.toLowerCase();
  const errorCode = (error as any).code;

  // User cancellation (MetaMask and other wallets)
  if (errorCode === 4001 || errorCode === 'ACTION_REJECTED') {
    return 'user_cancellation';
  }

  // Check for user rejection in error message
  if (
    errorMessage.includes('user rejected') ||
    errorMessage.includes('user denied') ||
    errorMessage.includes('user cancelled') ||
    errorMessage.includes('rejected by user')
  ) {
    return 'user_cancellation';
  }

  // Contract revert errors
  if (
    errorMessage.includes('revert') ||
    errorMessage.includes('insufficient') ||
    errorMessage.includes('execution reverted') ||
    (error as any).data?.message?.includes('revert')
  ) {
    return 'contract_revert';
  }

  // Network errors
  if (
    errorMessage.includes('network') ||
    errorMessage.includes('timeout') ||
    errorMessage.includes('connection') ||
    errorMessage.includes('fetch')
  ) {
    return 'network_error';
  }

  return 'unknown';
}

/**
 * Capture a transaction error in Sentry with full context
 * 
 * @param error - The error to capture
 * @param context - Transaction context information
 */
export function captureTransactionError(error: Error, context: TransactionErrorContext) {
  const errorCategory = categorizeError(error);

  // Don't send user cancellations to Sentry
  if (errorCategory === 'user_cancellation') {
    return;
  }

  // Capture the error with full context
  Sentry.captureException(error, {
    tags: {
      transaction_type: context.transactionType,
      error_category: errorCategory,
    },
    contexts: {
      transaction: {
        wallet_address: context.walletAddress,
        transaction_hash: context.transactionHash,
        error_message: context.errorMessage,
        contract_address: context.contractAddress,
        amount: context.amount,
        ...context.additionalData,
      },
    },
  });
}
