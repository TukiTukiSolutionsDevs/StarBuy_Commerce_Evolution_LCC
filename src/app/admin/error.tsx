'use client';

import Link from 'next/link';
import { useEffect } from 'react';

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function AdminError({ error, reset }: ErrorProps) {
  useEffect(() => {
    const timestamp = new Date().toISOString();
    console.error(`[AdminError] ${timestamp}`, {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
    });
  }, [error]);

  return (
    <div className="flex min-h-full items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Error card */}
        <div
          className="rounded-2xl p-8 text-center shadow-xl"
          style={{
            backgroundColor: 'var(--admin-bg-elevated)',
            borderWidth: 1,
            borderStyle: 'solid',
            borderColor: 'var(--admin-border)',
          }}
        >
          {/* Icon */}
          <div
            className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--admin-error) 10%, transparent)',
              borderWidth: 1,
              borderStyle: 'solid',
              borderColor: 'color-mix(in srgb, var(--admin-error) 20%, transparent)',
            }}
          >
            <span
              className="material-symbols-outlined text-3xl"
              style={{ color: 'var(--admin-error)' }}
            >
              error
            </span>
          </div>

          <h1 className="text-xl font-bold" style={{ color: 'var(--admin-text)' }}>
            Something went wrong
          </h1>
          <p
            className="mt-2 text-sm leading-relaxed"
            style={{ color: 'var(--admin-text-secondary)' }}
          >
            An unexpected error occurred in the admin panel. Try again or go back to the dashboard.
          </p>

          {/* Error details — dev only */}
          {process.env.NODE_ENV === 'development' && (
            <div
              className="mt-4 rounded-lg p-3 text-left"
              style={{
                backgroundColor: 'var(--admin-bg)',
                borderWidth: 1,
                borderStyle: 'solid',
                borderColor: 'var(--admin-border)',
              }}
            >
              <p
                className="text-[10px] font-semibold uppercase tracking-widest mb-1"
                style={{ color: 'var(--admin-text-disabled)' }}
              >
                Error details (dev)
              </p>
              <p
                className="font-mono text-xs break-all leading-relaxed"
                style={{ color: 'var(--admin-error)' }}
              >
                {error.message}
              </p>
              {error.digest && (
                <p
                  className="mt-1 font-mono text-[10px]"
                  style={{ color: 'var(--admin-text-muted)' }}
                >
                  digest: {error.digest}
                </p>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <button
              onClick={reset}
              className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors"
              style={{ backgroundColor: 'var(--admin-brand)', color: 'var(--admin-bg)' }}
            >
              <span className="material-symbols-outlined text-base" aria-hidden="true">
                refresh
              </span>
              Try Again
            </button>
            <Link
              href="/admin"
              className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors"
              style={{
                borderWidth: 1,
                borderStyle: 'solid',
                borderColor: 'var(--admin-border)',
                color: 'var(--admin-text-secondary)',
              }}
            >
              <span className="material-symbols-outlined text-base" aria-hidden="true">
                home
              </span>
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
