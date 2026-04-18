'use client';

/**
 * AdminErrorState — Phase 1
 *
 * Consistent error display with icon, message, and retry button.
 * Replaces hardcoded error banners across admin pages.
 */

interface AdminErrorStateProps {
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export function AdminErrorState({
  message = 'Something went wrong. Please try again.',
  onRetry,
  retryLabel = 'Retry',
}: AdminErrorStateProps) {
  return (
    <div
      className="rounded-2xl px-6 py-5 flex items-center gap-4"
      style={{
        backgroundColor: 'var(--admin-error-bg)',
        border: '1px solid color-mix(in srgb, var(--admin-error) 30%, transparent)',
      }}
    >
      <span className="material-symbols-outlined text-xl" style={{ color: 'var(--admin-error)' }}>
        error
      </span>
      <p className="text-sm flex-1" style={{ color: 'var(--admin-error)' }}>
        {message}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-sm font-medium px-4 py-1.5 rounded-lg transition-colors cursor-pointer"
          style={{
            color: 'var(--admin-error)',
            backgroundColor: 'transparent',
            border: '1px solid color-mix(in srgb, var(--admin-error) 40%, transparent)',
          }}
        >
          {retryLabel}
        </button>
      )}
    </div>
  );
}
