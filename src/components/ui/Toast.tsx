'use client';

import { useEffect, useState } from 'react';

// ─── Types ─────────────────────────────────────────────────────────────────────

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export type ToastData = {
  id: string;
  type: ToastType;
  message: string;
  description?: string;
  duration?: number;
};

// ─── Icon map ──────────────────────────────────────────────────────────────────

const ICONS: Record<ToastType, string> = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ',
};

// ─── Style map ─────────────────────────────────────────────────────────────────

const STYLES: Record<ToastType, { container: string; icon: string; bar: string }> = {
  success: {
    container: 'bg-[#0d1526] border border-[#10b981]/30 shadow-lg shadow-black/40',
    icon: 'bg-[#10b981]/15 text-[#10b981]',
    bar: 'bg-[#10b981]',
  },
  error: {
    container: 'bg-[#0d1526] border border-[#ef4444]/30 shadow-lg shadow-black/40',
    icon: 'bg-[#ef4444]/15 text-[#ef4444]',
    bar: 'bg-[#ef4444]',
  },
  warning: {
    container: 'bg-[#0d1526] border border-[#f59e0b]/30 shadow-lg shadow-black/40',
    icon: 'bg-[#f59e0b]/15 text-[#f59e0b]',
    bar: 'bg-[#f59e0b]',
  },
  info: {
    container: 'bg-[#0d1526] border border-[#3b82f6]/30 shadow-lg shadow-black/40',
    icon: 'bg-[#3b82f6]/15 text-[#3b82f6]',
    bar: 'bg-[#3b82f6]',
  },
};

// ─── Component ─────────────────────────────────────────────────────────────────

type ToastProps = ToastData & {
  onRemove: (id: string) => void;
};

export function Toast({ id, type, message, description, duration = 5000, onRemove }: ToastProps) {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const style = STYLES[type];

  // Trigger enter animation on mount
  useEffect(() => {
    const enterTimer = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(enterTimer);
  }, []);

  // Auto-dismiss
  useEffect(() => {
    const timer = setTimeout(() => dismiss(), duration);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration]);

  function dismiss() {
    setLeaving(true);
    setTimeout(() => onRemove(id), 300);
  }

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={[
        'relative flex items-start gap-3 w-80 p-4 rounded-xl overflow-hidden',
        style.container,
        'transition-all duration-300 ease-out',
        visible && !leaving ? 'translate-x-0 opacity-100' : 'translate-x-8 opacity-0',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {/* Progress bar */}
      <div
        className={['absolute bottom-0 left-0 h-0.5 rounded-b-xl', style.bar].join(' ')}
        style={{
          animation: `shrink ${duration}ms linear forwards`,
        }}
      />

      {/* Icon */}
      <span
        className={[
          'flex-none flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold',
          style.icon,
        ].join(' ')}
        aria-hidden="true"
      >
        {ICONS[type]}
      </span>

      {/* Content */}
      <div className="flex-1 min-w-0 pt-0.5">
        <p className="text-sm font-semibold text-white leading-snug">{message}</p>
        {description && (
          <p className="mt-0.5 text-xs text-[#9ca3af] leading-relaxed">{description}</p>
        )}
      </div>

      {/* Close button */}
      <button
        onClick={dismiss}
        aria-label="Dismiss notification"
        className="flex-none flex items-center justify-center w-6 h-6 rounded-lg text-[#4b5563] hover:text-white hover:bg-white/10 transition-colors"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <path
            d="M1 1l10 10M11 1L1 11"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </button>

      <style>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
}
