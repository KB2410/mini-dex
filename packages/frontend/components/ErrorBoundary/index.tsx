'use client';

/**
 * ErrorBoundary Component
 * 
 * Catches errors in the component tree and displays a fallback UI.
 * Integrates with Sentry for error tracking.
 */

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

interface ErrorBoundaryProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorBoundary({ error, reset }: ErrorBoundaryProps) {
  useEffect(() => {
    // Log the error to Sentry
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="max-w-md rounded-lg border border-red-200 bg-red-50 p-6 text-center shadow-lg">
        <div className="mb-4 flex justify-center">
          <svg
            className="h-12 w-12 text-red-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        
        <h2 className="mb-2 text-xl font-semibold text-red-900">
          Something went wrong
        </h2>
        
        <p className="mb-4 text-sm text-red-700">
          {error.message || 'An unexpected error occurred. Please try again.'}
        </p>
        
        {error.digest && (
          <p className="mb-4 text-xs text-red-600">
            Error ID: {error.digest}
          </p>
        )}
        
        <button
          onClick={reset}
          className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
