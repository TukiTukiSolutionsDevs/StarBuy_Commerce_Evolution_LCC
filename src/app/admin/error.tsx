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
        <div className="rounded-2xl bg-[#0d1526] border border-[#1f2d4e] p-8 text-center shadow-xl">
          {/* Icon */}
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#ef4444]/10 border border-[#ef4444]/20">
            <span className="material-symbols-outlined text-3xl text-[#ef4444]">error</span>
          </div>

          <h1 className="text-xl font-bold text-white">Something went wrong</h1>
          <p className="mt-2 text-sm text-[#9ca3af] leading-relaxed">
            An unexpected error occurred in the admin panel. Try again or go back to the dashboard.
          </p>

          {/* Error details — dev only */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-4 rounded-lg bg-[#0a0f1e] border border-[#1f2d4e] p-3 text-left">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#374151] mb-1">
                Error details (dev)
              </p>
              <p className="font-mono text-xs text-[#ef4444] break-all leading-relaxed">
                {error.message}
              </p>
              {error.digest && (
                <p className="mt-1 font-mono text-[10px] text-[#4b5563]">digest: {error.digest}</p>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <button
              onClick={reset}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#d4a843] px-5 py-2.5 text-sm font-semibold text-[#0a0f1e] hover:bg-[#e4c06a] transition-colors"
            >
              <span className="material-symbols-outlined text-base" aria-hidden="true">
                refresh
              </span>
              Try Again
            </button>
            <Link
              href="/admin"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#1f2d4e] px-5 py-2.5 text-sm font-semibold text-[#9ca3af] hover:text-white hover:border-[#d4a843]/40 transition-colors"
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
