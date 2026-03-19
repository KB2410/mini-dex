/**
 * Sentry Utility Functions
 * 
 * Helper functions for capturing transaction errors with context.
 */

import * as Sentry from '@sentry/nextjs';

export interface TransactionErrorContext {
  walletAddress?: string;
  transactionHash?: string;
  errorMessage: string;
  transactionType: 'swap' | 'addLiquidity' | 'removeLiquidity' | 'approve';
  contractAddress?: string;
  amount?: string;
  additionalData?: Record<string, unknown>;
}

/**
 * Captures a transaction error with full context for Sentry
 * 
 * @param error - The error object
 * @param context - Transaction context information
 */
export function captureTransactionError(
  error: Error,
  context: TransactionErrorContext
): void {
  // Check if this is a user cancellation (should be filtered by beforeSend)
  const errorObj = error as { code?: number; message?: string };
  if (
    errorObj.code === 4001 ||
    errorObj.message?.includes('ACTION_REJECTED') ||
    errorObj.message?.includes('User rejected')
  ) {
    // Don't send user cancellations to Sentry
    return;
  }

  // Capture the error with context
  Sentry.captureException(error, {
    tags: {
      transaction_type: context.transactionType,
      error_category: categorizeError(error),
    },
    contexts: {
      transaction: {
        wallet_address: context.walletAddress,
        transaction_hash: context.transactionHash,
        contract_address: context.contractAddress,
        amount: context.amount,
      },
    },
    extra: {
      error_message: context.errorMessage,
      additional_data: context.additionalData,
    },
  });
}

/**
 * Categorizes errors for better filtering in Sentry
 * 
 * @param error - The error object
 * @returns Error category string
 */
export function categorizeError(error: Error): string {
  const errorObj = error as { code?: number; message?: string };
  const message = errorObj.message?.toLowerCase() || '';

  // User cancellations
  if (
    errorObj.code === 4001 ||
    message.includes('user rejected') ||
    message.includes('action_rejected')
  ) {
    return 'user_cancellation';
  }

  // Contract reverts
  if (
    message.includes('execution reverted') ||
    message.includes('insufficient') ||
    message.includes('zero amount') ||
    message.includes('invalid')
  ) {
    return 'contract_revert';
  }

  // Network errors
  if (
    message.includes('network') ||
    message.includes('timeout') ||
    message.includes('connection')
  ) {
    return 'network_error';
  }

  // Gas errors
  if (
    message.includes('gas') ||
    message.includes('out of gas') ||
    message.includes('intrinsic gas')
  ) {
    return 'gas_error';
  }

  // Nonce errors
  if (message.includes('nonce')) {
    return 'nonce_error';
  }

  // Unknown errors
  return 'unknown_error';
}

/**
 * Captures a message with transaction context
 * 
 * @param message - The message to capture
 * @param context - Transaction context information
 * @param level - Sentry severity level
 */
export function captureTransactionMessage(
  message: string,
  context: Partial<TransactionErrorContext>,
  level: 'info' | 'warning' | 'error' = 'info'
): void {
  Sentry.captureMessage(message, {
    level,
    tags: {
      transaction_type: context.transactionType,
    },
    contexts: {
      transaction: {
        wallet_address: context.walletAddress,
        transaction_hash: context.transactionHash,
        contract_address: context.contractAddress,
        amount: context.amount,
      },
    },
    extra: {
      additional_data: context.additionalData,
    },
  });
}

/**
 * Sets user context for Sentry
 * 
 * @param walletAddress - The user's wallet address
 */
export function setSentryUser(walletAddress: string | undefined): void {
  if (walletAddress) {
    Sentry.setUser({
      id: walletAddress,
      username: `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`,
    });
  } else {
    Sentry.setUser(null);
  }
}
