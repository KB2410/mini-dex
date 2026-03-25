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

// Mock environment variables
vi.stubEnv('NEXT_PUBLIC_CONTRACT_ADDRESS', 'CDEESHHROI4TRAEKGTQN4R5ZG33KEGYCUP7JKUZKFR3XRKFPHSDT3HYF');
vi.stubEnv('NEXT_PUBLIC_NETWORK', 'testnet');

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
    
    expect(screen.getByText('Swap Stellar Tokens')).toBeInTheDocument();
    expect(screen.getByText(/Trade Stellar tokens instantly/)).toBeInTheDocument();
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

  it('should render footer with contract link', () => {
    render(<HomePage />);
    
    expect(screen.getByText('Deployed Contract (Stellar Testnet)')).toBeInTheDocument();
    expect(screen.getByText('MiniDex (Soroban)')).toBeInTheDocument();
  });

  it('should have correct Stellar Explorer links', () => {
    render(<HomePage />);
    
    const links = screen.getAllByRole('link');
    const stellarLinks = links.filter(link => 
      link.getAttribute('href')?.includes('stellar.expert/explorer/testnet')
    );
    
    expect(stellarLinks.length).toBeGreaterThanOrEqual(1);
  });

  it('should display contract address', () => {
    render(<HomePage />);
    
    expect(screen.getByText('CDEESHHROI4TRAEKGTQN4R5ZG33KEGYCUP7JKUZKFR3XRKFPHSDT3HYF')).toBeInTheDocument();
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
    
    expect(screen.getByText('Stellar Explorer')).toBeInTheDocument();
    expect(screen.getByText('Get Testnet XLM')).toBeInTheDocument();
  });

  it('should have responsive layout classes', () => {
    const { container } = render(<HomePage />);
    
    // Check for responsive grid classes
    const mainGrid = container.querySelector('.grid.grid-cols-1.lg\\:grid-cols-2');
    expect(mainGrid).toBeInTheDocument();
  });
});

