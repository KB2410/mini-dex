import { beforeAll, afterEach, afterAll } from 'vitest';

// Setup for all tests
beforeAll(() => {
  // Mock environment variables
  process.env.NEXT_PUBLIC_SIMPLE_POOL_ADDRESS = '0x1234567890123456789012345678901234567890';
  process.env.NEXT_PUBLIC_GEMINI_TOKEN_ADDRESS = '0x0987654321098765432109876543210987654321';
});

// Cleanup after each test
afterEach(() => {
  // Clear any mocks
});

// Cleanup after all tests
afterAll(() => {
  // Final cleanup
});
