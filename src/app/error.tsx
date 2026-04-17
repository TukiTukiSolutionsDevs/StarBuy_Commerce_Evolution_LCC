'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { Container } from '@/components/ui/Container';

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: ErrorProps) {
  useEffect(() => {
    const timestamp = new Date().toISOString();
    console.error(`[GlobalError] ${timestamp}`, {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
    });
  }, [error]);

  return (
    <Container as="main" className="flex min-h-[60vh] items-center py-20">
      <div className="mx-auto max-w-lg text-center">
        {/* Error icon */}
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-[#ac3149]/10">
          <span
            className="material-symbols-outlined text-[#ac3149] text-4xl"
            style={{ fontVariationSettings: "'FILL' 1" }}
            aria-hidden="true"
          >
            error
          </span>
        </div>

        <h1 className="font-headline text-3xl text-[#303330] sm:text-4xl">Something Went Wrong</h1>
        <p className="mt-4 text-[#5d605c] leading-relaxed">
          We encountered an unexpected error. Our team has been notified and is working on a fix.
          Please try again in a moment.
        </p>

        {error.digest && (
          <p className="mt-2 font-mono text-xs text-[#b1b2af]">Error ID: {error.digest}</p>
        )}

        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-bold tracking-widest text-[#fff8f0] transition-all duration-500 hover:shadow-[0_0_20px_rgba(121,90,0,0.3)]"
            style={{
              background: 'radial-gradient(circle at center, #f8cc69 0%, #795a00 100%)',
            }}
          >
            <span className="material-symbols-outlined text-base" aria-hidden="true">
              refresh
            </span>
            Try Again
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg bg-[#d4e3ff] px-6 py-3 text-sm font-bold text-[#005396] hover:bg-[#c0d6ff] transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </Container>
  );
}
