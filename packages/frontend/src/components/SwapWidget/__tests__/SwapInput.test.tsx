/**
 * SwapInput Component Tests
 * 
 * Tests for the SwapInput component functionality.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SwapInput } from '../SwapInput';

// Mock the useBalances hook
vi.mock('@/hooks/useBalances', () => ({
  useBalances: vi.fn(() => ({
    ethBalance: '1.5',
    ethBalanceRaw: 1500000000000000000n,
    isLoading: false,
    isConnected: true,
  })),
}));

describe('SwapInput', () => {
  it('renders the component with ETH token selector', () => {
    const onChange = vi.fn();
    render(<SwapInput value="" onChange={onChange} />);
    
    expect(screen.getByText('ETH')).toBeTruthy();
    expect(screen.getByPlaceholderText('0.0')).toBeTruthy();
  });

  it('displays user balance when connected', () => {
    const onChange = vi.fn();
    render(<SwapInput value="" onChange={onChange} />);
    
    expect(screen.getByText(/Balance:/)).toBeTruthy();
    expect(screen.getByText(/1.5000 ETH/)).toBeTruthy();
  });

  it('calls onChange with valid numeric input', () => {
    const onChange = vi.fn();
    render(<SwapInput value="" onChange={onChange} />);
    
    const input = screen.getByPlaceholderText('0.0');
    fireEvent.change(input, { target: { value: '1.5' } });
    
    expect(onChange).toHaveBeenCalledWith('1.5');
  });

  it('rejects negative numbers', () => {
    const onChange = vi.fn();
    render(<SwapInput value="" onChange={onChange} />);
    
    const input = screen.getByPlaceholderText('0.0');
    fireEvent.change(input, { target: { value: '-1' } });
    
    expect(onChange).not.toHaveBeenCalled();
  });

  it('rejects non-numeric input', () => {
    const onChange = vi.fn();
    render(<SwapInput value="" onChange={onChange} />);
    
    const input = screen.getByPlaceholderText('0.0');
    fireEvent.change(input, { target: { value: 'abc' } });
    
    expect(onChange).not.toHaveBeenCalled();
  });

  it('allows decimal numbers', () => {
    const onChange = vi.fn();
    render(<SwapInput value="" onChange={onChange} />);
    
    const input = screen.getByPlaceholderText('0.0');
    fireEvent.change(input, { target: { value: '0.5' } });
    
    expect(onChange).toHaveBeenCalledWith('0.5');
  });

  it('renders MAX button when connected', () => {
    const onChange = vi.fn();
    render(<SwapInput value="" onChange={onChange} />);
    
    expect(screen.getByText('MAX')).toBeTruthy();
  });

  it('fills max balance minus gas when MAX button clicked', () => {
    const onChange = vi.fn();
    render(<SwapInput value="" onChange={onChange} />);
    
    const maxButton = screen.getByText('MAX');
    fireEvent.click(maxButton);
    
    // Should set to balance (1.5) minus gas buffer (0.001) = 1.499
    expect(onChange).toHaveBeenCalledWith('1.499000');
  });

  it('disables input when disabled prop is true', () => {
    const onChange = vi.fn();
    render(<SwapInput value="" onChange={onChange} disabled={true} />);
    
    const input = screen.getByPlaceholderText('0.0') as HTMLInputElement;
    expect(input.disabled).toBe(true);
  });
});
