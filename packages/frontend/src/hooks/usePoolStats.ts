/**
 * usePoolStats Hook
 * 
 * Fetches pool statistics (ETH reserve, token reserve, total liquidity) from the SimplePool contract.
 * Automatically refetches every 10 seconds to keep data fresh.
 */

import { useReadContract } from 'wagmi';
import { formatEther } from 'viem';
import { SIMPLE_POOL_ABI, SIMPLE_POOL_ADDRESS } from '@/lib/contracts';

export function usePoolStats() {
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useReadContract({
    address: SIMPLE_POOL_ADDRESS,
    abi: SIMPLE_POOL_ABI,
    functionName: 'getPoolStats',
    query: {
      // Refetch every 10 seconds for real-time updates
      refetchInterval: 10000,
    },
  });

  // Extract values from the tuple returned by getPoolStats
  const ethReserve = data?.[0];
  const tokenReserve = data?.[1];
  const totalLiquidity = data?.[2];

  return {
    // Raw bigint values
    ethReserve,
    tokenReserve,
    totalLiquidity,
    
    // Formatted string values (in ether units)
    ethReserveFormatted: ethReserve ? formatEther(ethReserve) : undefined,
    tokenReserveFormatted: tokenReserve ? formatEther(tokenReserve) : undefined,
    totalLiquidityFormatted: totalLiquidity ? formatEther(totalLiquidity) : undefined,
    
    // Loading and error states
    isLoading,
    error,
    
    // Manual refetch function
    refetch,
    
    // Helper to check if pool has liquidity
    hasLiquidity: ethReserve !== undefined && ethReserve > 0n && 
                  tokenReserve !== undefined && tokenReserve > 0n,
  };
}
