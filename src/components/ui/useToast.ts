'use client';

import { useMemo } from 'react';
import { useToastContext } from './ToastProvider';
import type { ToastType } from './Toast';

// ─── Types ─────────────────────────────────────────────────────────────────────

type ToastOptions = {
  message: string;
  description?: string;
  duration?: number;
};

type ToastFn = (options: ToastOptions & { type: ToastType }) => void;

type ShortcutFn = (message: string, options?: Omit<ToastOptions, 'message'>) => void;

type ToastHook = ToastFn & {
  success: ShortcutFn;
  error: ShortcutFn;
  warning: ShortcutFn;
  info: ShortcutFn;
};

// ─── Hook ──────────────────────────────────────────────────────────────────────

export function useToast(): { toast: ToastHook } {
  const { addToast } = useToastContext();

  const toast = useMemo(() => {
    const baseFn: ToastFn = ({ type, message, description, duration }) => {
      addToast({ type, message, description, duration });
    };

    const makeShortcut =
      (type: ToastType): ShortcutFn =>
      (message, opts) =>
        addToast({ type, message, ...opts });

    return Object.assign(baseFn, {
      success: makeShortcut('success'),
      error: makeShortcut('error'),
      warning: makeShortcut('warning'),
      info: makeShortcut('info'),
    }) as ToastHook;
  }, [addToast]);

  return { toast };
}
