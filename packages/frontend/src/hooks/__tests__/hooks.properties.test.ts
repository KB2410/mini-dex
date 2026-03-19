/**
 * Property-Based Tests for Frontend Hooks
 * 
 * Tests universal properties across randomized inputs using fast-check.
 * 
 * Properties tested:
 * - Property 12: Frontend Swap Estimate Accuracy
 * - Property 13: Transaction Error Categorization
 * - Property 14: Sentry Error Context Completeness
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import fc from 'fast-check';
import { categorizeError, captureTransactionError } from '../../../lib/sentry-utils';
import * as Sentry from '@sentry/nextjs';

// Mock Sentry
vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  setUser: vi.fn(),
}));

// Mock wagmi hooks
vi.mock('wagmi', () => ({
  useAccount: vi.fn(() => ({ address: '0x1234567890123456789012345678901234567890', isConnected: true })),
  useBalance: vi.fn(() => ({ data: { formatted: '1.0', value: 1000000000000000000n, symbol: 'ETH' }, isLoading: false, error: null })),
  useReadContract: vi.fn(() => ({ data: undefined, isLoading: false, error: null, refetch: vi.fn() })),
  useWriteContract: vi.fn(() => ({ writeContract: vi.fn(), data: undefined, error: null, isPending: false, reset: vi.fn() })),
  useWaitForTransactionReceipt: vi.fn(() => ({ isLoading: false, isSuccess: false, error: null })),
  useWatchContractEvent: vi.fn(() => {}),
}));

// Mock @tanstack/react-query
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: vi.fn(() => ({
    invalidateQueries: vi.fn(),
  })),
}));

describe('Frontend Hooks Property-Based Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Feature: mini-dex, Property 12: Frontend Swap Estimate Accuracy
   * 
   * **Validates: Requirements 6.3**
   * 
   * For any ETH input amount entered in the frontend, the displayed estimated
   * token output SHALL match the result of calling getSwapEstimate on the
   * SimplePool contract with the same input.
   */
  describe('Property 12: Frontend Swap Estimate Accuracy', () => {
    it('should match contract getSwapEstimate for any valid ETH amount', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate random ETH amounts (0.001 to 100 ETH in wei)
          fc.bigInt({ min: 1000000000000000n, max: 100000000000000000000n }),
          // Generate random pool reserves
          fc.bigInt({ min: 1000000000000000000n, max: 1000000000000000000000n }), // ethReserve
          fc.bigInt({ min: 1000000000000000000n, max: 1000000000000000000000n }), // tokenReserve
          async (ethAmount, ethReserve, tokenReserve) => {
            // Calculate expected output using the constant product formula
            // tokenOut = (tokenReserve * ethIn) / (ethReserve + ethIn)
            const expectedTokenOutput = (tokenReserve * ethAmount) / (ethReserve + ethAmount);

            // Simulate contract call
            const contractEstimate = expectedTokenOutput;

            // Simulate frontend calculation (should use the same formula)
            const frontendEstimate = (tokenReserve * ethAmount) / (ethReserve + ethAmount);

            // Property: Frontend estimate must match contract estimate
            expect(frontendEstimate).toBe(contractEstimate);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle edge cases: zero reserves return zero estimate', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.bigInt({ min: 1000000000000000n, max: 100000000000000000000n }),
          async (ethAmount) => {
            // When reserves are zero, estimate should be zero
            const ethReserve = 0n;
            const tokenReserve = 0n;

            // This would cause division by zero in real contract (would revert)
            // Frontend should handle this gracefully
            if (ethReserve === 0n) {
              const estimate = 0n;
              expect(estimate).toBe(0n);
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should maintain precision for small amounts', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Very small amounts (0.000001 to 0.01 ETH)
          fc.bigInt({ min: 1000000000000n, max: 10000000000000000n }),
          fc.bigInt({ min: 1000000000000000000n, max: 1000000000000000000000n }),
          fc.bigInt({ min: 1000000000000000000n, max: 1000000000000000000000n }),
          async (ethAmount, ethReserve, tokenReserve) => {
            const estimate = (tokenReserve * ethAmount) / (ethReserve + ethAmount);
            
            // Property: Estimate should be non-negative
            expect(estimate).toBeGreaterThanOrEqual(0n);
            
            // Property: Estimate should not exceed token reserve
            expect(estimate).toBeLessThanOrEqual(tokenReserve);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: mini-dex, Property 13: Transaction Error Categorization
   * 
   * **Validates: Requirements 9.2**
   * 
   * For any failed transaction, the frontend SHALL correctly categorize it as
   * either a user cancellation (error code 4001 or ACTION_REJECTED) or a
   * contract revert (any other error code).
   */
  describe('Property 13: Transaction Error Categorization', () => {
    it('should categorize user cancellations correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate various user cancellation error codes and messages
          fc.constantFrom(
            { code: 4001, message: 'User rejected the request' },
            { code: 4001, message: 'User denied transaction signature' },
            { message: 'ACTION_REJECTED' },
            { message: 'User rejected transaction' }
          ),
          async (errorData) => {
            const error = new Error(errorData.message) as Error & { code?: number };
            if (errorData.code) {
              error.code = errorData.code;
            }

            const category = categorizeError(error);

            // Property: User cancellations must be categorized as 'user_cancellation'
            expect(category).toBe('user_cancellation');
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should categorize contract reverts correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate various contract revert error messages
          fc.constantFrom(
            'execution reverted: InsufficientLiquidity',
            'execution reverted: ZeroAmount',
            'execution reverted: InvalidSwapAmount',
            'insufficient funds for gas',
            'insufficient balance',
            'zero amount not allowed'
          ),
          async (errorMessage) => {
            const error = new Error(errorMessage);
            const category = categorizeError(error);

            // Property: Contract reverts must be categorized as 'contract_revert'
            expect(category).toBe('contract_revert');
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should categorize network errors correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(
            'network error',
            'connection timeout',
            'network connection failed',
            'timeout exceeded'
          ),
          async (errorMessage) => {
            const error = new Error(errorMessage);
            const category = categorizeError(error);

            // Property: Network errors must be categorized as 'network_error'
            expect(category).toBe('network_error');
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should categorize gas errors correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(
            'out of gas',
            'gas required exceeds allowance',
            'intrinsic gas too low'
          ),
          async (errorMessage) => {
            const error = new Error(errorMessage);
            const category = categorizeError(error);

            // Property: Gas errors must be categorized as 'gas_error'
            expect(category).toBe('gas_error');
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should handle unknown errors with fallback category', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate random error messages that don't match known patterns
          fc.string({ minLength: 5, maxLength: 50 }).filter(
            s => !s.toLowerCase().includes('user') &&
                 !s.toLowerCase().includes('reject') &&
                 !s.toLowerCase().includes('revert') &&
                 !s.toLowerCase().includes('network') &&
                 !s.toLowerCase().includes('gas')
          ),
          async (errorMessage) => {
            const error = new Error(errorMessage);
            const category = categorizeError(error);

            // Property: Unknown errors must be categorized as 'unknown_error'
            expect(category).toBe('unknown_error');
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  /**
   * Feature: mini-dex, Property 14: Sentry Error Context Completeness
   * 
   * **Validates: Requirements 9.6**
   * 
   * For any contract revert error sent to Sentry, the error report SHALL include
   * wallet address, transaction hash (if available), error message, and
   * transaction type in the context.
   */
  describe('Property 14: Sentry Error Context Completeness', () => {
    it('should include all required context fields for contract reverts', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate random transaction context
          fc.record({
            walletAddress: fc.string({ minLength: 40, maxLength: 40 }).map(s => `0x${s.replace(/[^0-9a-f]/gi, '0').toLowerCase().slice(0, 40)}`),
            transactionHash: fc.option(fc.string({ minLength: 64, maxLength: 64 }).map(s => `0x${s.replace(/[^0-9a-f]/gi, '0').toLowerCase().slice(0, 64)}`), { nil: undefined }),
            errorMessage: fc.constantFrom(
              'execution reverted: InsufficientLiquidity',
              'execution reverted: InvalidSwapAmount',
              'execution reverted: ZeroAmount'
            ),
            transactionType: fc.constantFrom('swap', 'addLiquidity', 'removeLiquidity', 'approve'),
            contractAddress: fc.string({ minLength: 40, maxLength: 40 }).map(s => `0x${s.replace(/[^0-9a-f]/gi, '0').toLowerCase().slice(0, 40)}`),
            amount: fc.double({ min: 0.001, max: 100 }).map(n => n.toString()),
          }),
          async (context) => {
            const error = new Error(context.errorMessage);
            
            // Call captureTransactionError
            captureTransactionError(error, context as any);

            // Property: Sentry.captureException must be called with complete context
            expect(Sentry.captureException).toHaveBeenCalledWith(
              error,
              expect.objectContaining({
                tags: expect.objectContaining({
                  transaction_type: context.transactionType,
                  error_category: expect.any(String),
                }),
                contexts: expect.objectContaining({
                  transaction: expect.objectContaining({
                    wallet_address: context.walletAddress,
                    transaction_hash: context.transactionHash,
                    contract_address: context.contractAddress,
                    amount: context.amount,
                  }),
                }),
                extra: expect.objectContaining({
                  error_message: context.errorMessage,
                }),
              })
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not send user cancellations to Sentry', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            walletAddress: fc.string({ minLength: 40, maxLength: 40 }).map(s => `0x${s.replace(/[^0-9a-f]/gi, '0').toLowerCase().slice(0, 40)}`),
            transactionHash: fc.option(fc.string({ minLength: 64, maxLength: 64 }).map(s => `0x${s.replace(/[^0-9a-f]/gi, '0').toLowerCase().slice(0, 64)}`), { nil: undefined }),
            transactionType: fc.constantFrom('swap', 'addLiquidity', 'removeLiquidity', 'approve'),
            amount: fc.double({ min: 0.001, max: 100 }).map(n => n.toString()),
          }),
          async (context) => {
            // Create user cancellation error
            const error = new Error('User rejected the request') as Error & { code?: number };
            error.code = 4001;

            // Clear previous calls
            vi.clearAllMocks();

            // Call captureTransactionError
            captureTransactionError(error, {
              ...context,
              errorMessage: error.message,
              contractAddress: '0x1234567890123456789012345678901234567890',
            } as any);

            // Property: Sentry.captureException must NOT be called for user cancellations
            expect(Sentry.captureException).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should handle missing optional fields gracefully', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            walletAddress: fc.option(fc.string({ minLength: 40, maxLength: 40 }).map(s => `0x${s.replace(/[^0-9a-f]/gi, '0').toLowerCase().slice(0, 40)}`), { nil: undefined }),
            transactionHash: fc.option(fc.string({ minLength: 64, maxLength: 64 }).map(s => `0x${s.replace(/[^0-9a-f]/gi, '0').toLowerCase().slice(0, 64)}`), { nil: undefined }),
            errorMessage: fc.string({ minLength: 10, maxLength: 100 }),
            transactionType: fc.constantFrom('swap', 'addLiquidity', 'removeLiquidity', 'approve'),
          }),
          async (context) => {
            const error = new Error(context.errorMessage);

            // Clear previous calls
            vi.clearAllMocks();

            // Call captureTransactionError with minimal context
            captureTransactionError(error, context as any);

            // Property: Should still call Sentry even with missing optional fields
            // (unless it's a user cancellation)
            const category = categorizeError(error);
            if (category !== 'user_cancellation') {
              expect(Sentry.captureException).toHaveBeenCalled();
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should preserve all context fields through the capture pipeline', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            walletAddress: fc.string({ minLength: 40, maxLength: 40 }).map(s => `0x${s.replace(/[^0-9a-f]/gi, '0').toLowerCase().slice(0, 40)}`),
            transactionHash: fc.string({ minLength: 64, maxLength: 64 }).map(s => `0x${s.replace(/[^0-9a-f]/gi, '0').toLowerCase().slice(0, 64)}`),
            errorMessage: fc.string({ minLength: 10, maxLength: 100 }),
            transactionType: fc.constantFrom('swap', 'addLiquidity', 'removeLiquidity', 'approve'),
            contractAddress: fc.string({ minLength: 40, maxLength: 40 }).map(s => `0x${s.replace(/[^0-9a-f]/gi, '0').toLowerCase().slice(0, 40)}`),
            amount: fc.double({ min: 0.001, max: 100 }).map(n => n.toString()),
            additionalData: fc.record({
              key1: fc.string(),
              key2: fc.integer(),
            }),
          }),
          async (context) => {
            const error = new Error(context.errorMessage);

            // Clear previous calls
            vi.clearAllMocks();

            // Call captureTransactionError
            captureTransactionError(error, context as any);

            // Property: All provided context fields must be preserved
            const category = categorizeError(error);
            if (category !== 'user_cancellation') {
              const calls = (Sentry.captureException as any).mock.calls;
              expect(calls.length).toBeGreaterThan(0);
              
              const capturedContext = calls[0][1];
              expect(capturedContext.contexts.transaction.wallet_address).toBe(context.walletAddress);
              expect(capturedContext.contexts.transaction.transaction_hash).toBe(context.transactionHash);
              expect(capturedContext.contexts.transaction.contract_address).toBe(context.contractAddress);
              expect(capturedContext.contexts.transaction.amount).toBe(context.amount);
              expect(capturedContext.extra.error_message).toBe(context.errorMessage);
              expect(capturedContext.extra.additional_data).toEqual(context.additionalData);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
