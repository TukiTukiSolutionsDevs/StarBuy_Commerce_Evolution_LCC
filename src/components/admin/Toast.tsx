'use client';

import { useEffect, useState } from 'react';

// ─── Types ─────────────────────────────────────────────────────────────────────

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export type ToastData = {
  id: string;
  type: ToastType;
  message: string;
  duration: number;
};

// ─── Config ────────────────────────────────────────────────────────────────────

const ICON_MAP: Record<ToastType, string> = {
  success: 'check_circle',
  error: 'error',
  warning: 'warning',
  info: 'info',
};

const COLOR_MAP: Record<ToastType, { bg: string; border: string; icon: string }> = {
  success: { bg: 'bg-[#10b981]/10', border: 'border-[#10b981]/20', icon: 'text-[#10b981]' },
  error: { bg: 'bg-[#ef4444]/10', border: 'border-[#ef4444]/20', icon: 'text-[#ef4444]' },
  warning: { bg: 'bg-[#f59e0b]/10', border: 'border-[#f59e0b]/20', icon: 'text-[#f59e0b]' },
  info: { bg: 'bg-[#3b82f6]/10', border: 'border-[#3b82f6]/20', icon: 'text-[#3b82f6]' },
};

// ─── Component ─────────────────────────────────────────────────────────────────

export function Toast({ toast, onDismiss }: { toast: ToastData; onDismiss: (id: string) => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Trigger enter animation
    const enterTimer = requestAnimationFrame(() => setVisible(true));

    // Auto-dismiss
    const dismissTimer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onDismiss(toast.id), 300);
    }, toast.duration);

    return () => {
      cancelAnimationFrame(enterTimer);
      clearTimeout(dismissTimer);
    };
  }, [toast.id, toast.duration, onDismiss]);

  const colors = COLOR_MAP[toast.type];

  return (
    <button
      type="button"
      onClick={() => {
        setVisible(false);
        setTimeout(() => onDismiss(toast.id), 300);
      }}
      className={`flex items-center gap-3 w-80 px-4 py-3 rounded-xl border ${colors.bg} ${colors.border} bg-[#111827] shadow-lg shadow-black/30 cursor-pointer transition-all duration-300 ${
        visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'
      }`}
    >
      <span className={`material-symbols-outlined text-xl flex-none ${colors.icon}`}>
        {ICON_MAP[toast.type]}
      </span>
      <span className="text-sm text-[#e5e7eb] text-left flex-1">{toast.message}</span>
    </button>
  );
}
