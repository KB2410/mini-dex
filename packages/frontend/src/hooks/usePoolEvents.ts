/**
 * usePoolEvents Hook
 * 
 * Monitors real-time blockchain events from the SimplePool contract.
 * Automatically invalidates React Query cache when events are detected.
 */

import { useWatchContractEvent } from 'wagmi';
import { useQueryClient } from '@tanstack/react-query';
import { SIMPLE_POOL_ABI, SIMPLE_POOL_ADDRESS } from '@/lib/contracts';

export function usePoolEvents() {
  const queryClient = useQueryClient();

  // Watch for SwapExecuted events
  useWatchContractEvent({
    address: SIMPLE_POOL_ADDRESS,
    abi: SIMPLE_POOL_ABI,
    eventName: 'SwapExecuted',
    onLogs(logs) {
      console.log('SwapExecuted event detected:', logs);
      
      // Invalidate relevant queries to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['poolStats'] });
      queryClient.invalidateQueries({ queryKey: ['balance'] });
      
      // Log event details for debugging
      logs.forEach((log) => {
        if (log.args) {
          console.log('Swap details:', {
            user: log.args.user,
            ethAmount: log.args.ethAmount?.toString(),
            tokenAmount: log.args.tokenAmount?.toString(),
            timestamp: log.args.timestamp?.toString(),
          });
        }
      });
    },
    onError(error) {
      console.error('Error watching SwapExecuted events:', error);
    },
  });

  // Watch for LiquidityAdded events
  useWatchContractEvent({
    address: SIMPLE_POOL_ADDRESS,
    abi: SIMPLE_POOL_ABI,
    eventName: 'LiquidityAdded',
    onLogs(logs) {
      console.log('LiquidityAdded event detected:', logs);
      
      // Invalidate pool stats to show updated reserves
      queryClient.invalidateQueries({ queryKey: ['poolStats'] });
      
      // Log event details for debugging
      logs.forEach((log) => {
        if (log.args) {
          console.log('Liquidity added:', {
            provider: log.args.provider,
            ethAmount: log.args.ethAmount?.toString(),
            tokenAmount: log.args.tokenAmount?.toString(),
            timestamp: log.args.timestamp?.toString(),
          });
        }
      });
    },
    onError(error) {
      console.error('Error watching LiquidityAdded events:', error);
    },
  });

  // Watch for LiquidityRemoved events
  useWatchContractEvent({
    address: SIMPLE_POOL_ADDRESS,
    abi: SIMPLE_POOL_ABI,
    eventName: 'LiquidityRemoved',
    onLogs(logs) {
      console.log('LiquidityRemoved event detected:', logs);
      
      // Invalidate pool stats to show updated reserves
      queryClient.invalidateQueries({ queryKey: ['poolStats'] });
      
      // Log event details for debugging
      logs.forEach((log) => {
        if (log.args) {
          console.log('Liquidity removed:', {
            provider: log.args.provider,
            ethAmount: log.args.ethAmount?.toString(),
            tokenAmount: log.args.tokenAmount?.toString(),
            timestamp: log.args.timestamp?.toString(),
          });
        }
      });
    },
    onError(error) {
      console.error('Error watching LiquidityRemoved events:', error);
    },
  });

  // This hook doesn't return anything - it just sets up event listeners
  // The side effects (query invalidation) happen automatically
}
