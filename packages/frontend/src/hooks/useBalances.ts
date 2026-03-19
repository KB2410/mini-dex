/**
 * useBalances Hook
 * 
 * Fetches and returns ETH and GEMI token balances for the connected wallet.
 * Queries are only enabled when a wallet is connected.
 */

import { useAccount, useBalance, useReadContract } from 'wagmi';
import { formatEther } from 'viem';
import { GEMINI_TOKEN_ABI, GEMINI_TOKEN_ADDRESS } from '@/lib/contracts';

export function useBalances() {
  const { address, isConnected } = useAccount();

  // Fetch ETH balance
  const {
    data: ethBalanceData,
    isLoading: ethLoading,
    error: ethError,
  } = useBalance({
    address,
    query: {
      enabled: isConnected && !!address,
    },
  });

  // Fetch GEMI token balance
  const {
    data: tokenBalance,
    isLoading: tokenLoading,
    error: tokenError,
  } = useReadContract({
    address: GEMINI_TOKEN_ADDRESS,
    abi: GEMINI_TOKEN_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: isConnected && !!address,
    },
  });

  return {
    // ETH balance (formatted as string)
    ethBalance: ethBalanceData ? (Number(ethBalanceData.value) / 1e18).toFixed(6) : undefined,
    ethBalanceRaw: ethBalanceData?.value,
    ethSymbol: ethBalanceData?.symbol,
    
    // GEMI token balance (raw bigint)
    tokenBalance,
    tokenBalanceFormatted: tokenBalance ? formatEther(tokenBalance) : undefined,
    
    // Loading states
    isLoading: ethLoading || tokenLoading,
    ethLoading,
    tokenLoading,
    
    // Error states
    ethError,
    tokenError,
    hasError: !!ethError || !!tokenError,
    
    // Connection state
    isConnected,
    address,
  };
}
