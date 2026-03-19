/**
 * Sentry Configuration
 * 
 * Initializes Sentry SDK for error tracking and observability.
 */

import * as Sentry from '@sentry/nextjs';

// Initialize Sentry only if DSN is provided
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    
    // Set environment from Vercel or default to development
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV || 'development',
    
    // Adjust this value in production, or use tracesSampler for greater control
    tracesSampleRate: 1.0,
    
    // Setting this option to true will print useful information to the console while you're setting up Sentry.
    debug: false,
    
    // Replay configuration for session replay
    replaysOnErrorSampleRate: 1.0,
    replaysSessionSampleRate: 0.1,
    
    // Integrations
    integrations: [
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    
    // beforeSend hook to filter out user cancellations
    beforeSend(event, hint) {
      const error = hint.originalException;
      
      // Filter out user cancellations (error code 4001 or ACTION_REJECTED)
      if (error && typeof error === 'object') {
        const errorObj = error as { code?: number; message?: string };
        
        // User rejected the request (MetaMask error code 4001)
        if (errorObj.code === 4001) {
          return null;
        }
        
        // User rejected action (Wagmi/Viem error)
        if (errorObj.message?.includes('ACTION_REJECTED') || 
            errorObj.message?.includes('User rejected')) {
          return null;
        }
      }
      
      return event;
    },
  });
}

export { Sentry };
