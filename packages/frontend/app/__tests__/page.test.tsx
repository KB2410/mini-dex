/**
 * Home Page Tests
 * 
 * Tests for the main application page integration.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import HomePage from '../page';

// Mock the components
vi.mock('@/components/WalletConnect', () => ({
  WalletConnect: () => <div data-testid="wallet-connect">WalletConnect</div>,
}));

vi.mock('@/components/SwapWidget', () => ({
  SwapWidget: () => <div data-testid="swap-widget">SwapWidget</div>,
}));

vi.mock('@/components/PoolStats', () => ({
  PoolStats: () => <div data-testid="pool-stats">PoolStats</div>,
}));

vi.mock('@/lib/contracts', () => ({
  GEMINI_TOKEN_ADDRESS: '0x1234567890123456789012345678901234567890',
  SIMPLE_POOL_ADDRESS: '0x0987654321098765432109876543210987654321',
}));

describe('HomePage', () => {
  it('should render the header with logo and title', () => {
    render(<HomePage />);
    
    expect(screen.getByText('Mini-DEX')).toBeInTheDocument();
    expect(screen.getByText('Decentralized Exchange')).toBeInTheDocument();
  });

  it('should render the WalletConnect component in header', () => {
    render(<HomePage />);
    
    expect(screen.getByTestId('wallet-connect')).toBeInTheDocument();
  });

  it('should render the hero section', () => {
    render(<HomePage />);
    
    expect(screen.getByText('Swap ETH for GEMI')).toBeInTheDocument();
    expect(screen.getByText(/Trade Ethereum for Gemini tokens/)).toBeInTheDocument();
  });

  it('should render the SwapWidget component', () => {
    render(<HomePage />);
    
    expect(screen.getByTestId('swap-widget')).toBeInTheDocument();
  });

  it('should render the PoolStats component', () => {
    render(<HomePage />);
    
    expect(screen.getByTestId('pool-stats')).toBeInTheDocument();
  });

  it('should render feature cards', () => {
    render(<HomePage />);
    
    expect(screen.getByText('Instant Swaps')).toBeInTheDocument();
    expect(screen.getByText('Secure & Audited')).toBeInTheDocument();
    expect(screen.getByText('Real-Time Updates')).toBeInTheDocument();
  });

  it('should render footer with contract links', () => {
    render(<HomePage />);
    
    expect(screen.getByText('Deployed Contracts (Sepolia Testnet)')).toBeInTheDocument();
    expect(screen.getByText('GeminiToken (GEMI)')).toBeInTheDocument();
    expect(screen.getByText('SimplePool')).toBeInTheDocument();
  });

  it('should have correct Etherscan links', () => {
    render(<HomePage />);
    
    const links = screen.getAllByRole('link');
    const etherscanLinks = links.filter(link => 
      link.getAttribute('href')?.includes('sepolia.etherscan.io')
    );
    
    expect(etherscanLinks.length).toBeGreaterThanOrEqual(2);
  });

  it('should display contract addresses', () => {
    render(<HomePage />);
    
    expect(screen.getByText('0x1234567890123456789012345678901234567890')).toBeInTheDocument();
    expect(screen.getByText('0x0987654321098765432109876543210987654321')).toBeInTheDocument();
  });

  it('should have external links with proper attributes', () => {
    render(<HomePage />);
    
    const externalLinks = screen.getAllByRole('link').filter(link =>
      link.getAttribute('target') === '_blank'
    );
    
    externalLinks.forEach(link => {
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });

  it('should render footer links', () => {
    render(<HomePage />);
    
    expect(screen.getByText('Etherscan')).toBeInTheDocument();
    expect(screen.getByText('Get Testnet ETH')).toBeInTheDocument();
  });

  it('should have responsive layout classes', () => {
    const { container } = render(<HomePage />);
    
    // Check for responsive grid classes
    const mainGrid = container.querySelector('.grid.grid-cols-1.lg\\:grid-cols-2');
    expect(mainGrid).toBeInTheDocument();
  });
});
