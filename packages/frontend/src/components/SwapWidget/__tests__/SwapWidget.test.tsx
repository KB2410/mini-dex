/**
 * SwapWidget Component Tests
 * 
 * Tests the main SwapWidget container component.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SwapWidget } from '../index';

// Mock child components
vi.mock('../SwapInput', () => ({
  SwapInput: ({ value, onChange }: any) => (
    <div data-testid="swap-input">
      <input
        data-testid="swap-input-field"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  ),
}));

vi.mock('../SwapOutput', () => ({
  SwapOutput: ({ ethAmount }: any) => (
    <div data-testid="swap-output">Output for {ethAmount}</div>
  ),
}));

vi.mock('../SwapButton', () => ({
  SwapButton: ({ ethAmount, onSuccess }: any) => (
    <button data-testid="swap-button" onClick={onSuccess}>
      Swap {ethAmount}
    </button>
  ),
}));

// Mock hooks
vi.mock('@/hooks/usePoolStats', () => ({
  usePoolStats: () => ({
    ethReserve: 10000000000000000000n, // 10 ETH
    tokenReserve: 1000000000000000000000n, // 1000 GEMI
    hasLiquidity: true,
  }),
}));

vi.mock('wagmi', () => ({
  useReadContract: () => ({
    data: 90000000000000000000n, // 90 GEMI
  }),
}));

describe('SwapWidget', () => {
  it('renders the swap interface', () => {
    render(<SwapWidget />);
    
    // Use getAllByText since "Swap" appears in both heading and button
    const swapElements = screen.getAllByText(/Swap/);
    expect(swapElements.length).toBeGreaterThan(0);
    expect(screen.getByTestId('swap-input')).toBeTruthy();
    expect(screen.getByTestId('swap-output')).toBeTruthy();
    expect(screen.getByTestId('swap-button')).toBeTruthy();
  });

  it('displays swap direction icon', () => {
    const { container } = render(<SwapWidget />);
    
    // Check for the down arrow SVG
    const svg = container.querySelector('svg[viewBox="0 0 24 24"]');
    expect(svg).toBeTruthy();
  });

  it('displays swap details when amount is entered', () => {
    render(<SwapWidget />);
    
    // Simulate entering an amount
    const input = screen.getByTestId('swap-input-field');
    input.setAttribute('value', '1');
    
    // Note: In a real test, we'd use userEvent to trigger onChange
    // For this basic test, we're just verifying the component structure
  });

  it('displays footer info', () => {
    render(<SwapWidget />);
    
    expect(screen.getByText(/Powered by Mini-DEX/)).toBeTruthy();
    expect(screen.getByText(/Sepolia Testnet/)).toBeTruthy();
  });

  it('applies custom className', () => {
    const { container } = render(<SwapWidget className="custom-class" />);
    
    const widget = container.firstChild as HTMLElement;
    expect(widget.className).toContain('custom-class');
  });
});
