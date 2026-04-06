'use client';

/**
 * Root Error Boundary — catches errors in the root layout itself.
 *
 * This is the last-resort error page. It renders its own <html>/<body>
 * because the root layout may have been the source of the error.
 */

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily: 'system-ui, -apple-system, sans-serif',
          backgroundColor: '#0a0f1e',
          color: '#e5e7eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '2rem',
        }}
      >
        <div style={{ maxWidth: '28rem', textAlign: 'center' }}>
          <div
            style={{
              fontSize: '4rem',
              fontWeight: 800,
              color: '#d4a843',
              opacity: 0.2,
              lineHeight: 1,
              marginBottom: '-0.5rem',
            }}
          >
            500
          </div>
          <h1
            style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              color: '#ffffff',
              margin: '1rem 0',
            }}
          >
            Something went wrong
          </h1>
          <p style={{ color: '#9ca3af', fontSize: '0.875rem', lineHeight: 1.6 }}>
            We encountered an unexpected error. Please try again.
          </p>
          {error.digest && (
            <p
              style={{
                color: '#374151',
                fontSize: '0.75rem',
                fontFamily: 'monospace',
                marginTop: '0.5rem',
              }}
            >
              Error ID: {error.digest}
            </p>
          )}
          <div
            style={{
              display: 'flex',
              gap: '0.75rem',
              justifyContent: 'center',
              marginTop: '2rem',
            }}
          >
            <button
              onClick={reset}
              style={{
                backgroundColor: '#d4a843',
                color: '#0a0f1e',
                border: 'none',
                borderRadius: '0.75rem',
                padding: '0.75rem 1.5rem',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Try Again
            </button>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- global-error renders own html, Link unavailable */}
            <a
              href="/"
              style={{
                backgroundColor: 'transparent',
                color: '#9ca3af',
                border: '1px solid #1f2d4e',
                borderRadius: '0.75rem',
                padding: '0.75rem 1.5rem',
                fontSize: '0.875rem',
                fontWeight: 600,
                textDecoration: 'none',
                display: 'inline-block',
              }}
            >
              Back to Home
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
