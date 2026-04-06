/**
 * Unit tests — useToast hook
 *
 * Tests the hook behaviour within a ToastProvider context
 * and verifies it throws when used outside the provider.
 *
 * @vitest-environment happy-dom
 */

import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { render, screen } from '@testing-library/react';
import React, { useEffect, type ReactNode } from 'react';
import { useToast } from './useToast';
import { ToastProvider } from './ToastProvider';

// ─── Wrapper ───────────────────────────────────────────────────────────────────

function wrapper({ children }: { children: ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}

// ─── Basic hook tests ──────────────────────────────────────────────────────────

describe('useToast', () => {
  it('throws when used outside <ToastProvider>', () => {
    expect(() => renderHook(() => useToast())).toThrow(
      'useToastContext must be used within <ToastProvider>',
    );
  });

  it('returns a toast function when inside <ToastProvider>', () => {
    const { result } = renderHook(() => useToast(), { wrapper });
    expect(typeof result.current.toast).toBe('function');
  });

  it('toast.success is a function', () => {
    const { result } = renderHook(() => useToast(), { wrapper });
    expect(typeof result.current.toast.success).toBe('function');
  });

  it('toast.error is a function', () => {
    const { result } = renderHook(() => useToast(), { wrapper });
    expect(typeof result.current.toast.error).toBe('function');
  });

  it('toast.warning is a function', () => {
    const { result } = renderHook(() => useToast(), { wrapper });
    expect(typeof result.current.toast.warning).toBe('function');
  });

  it('toast.info is a function', () => {
    const { result } = renderHook(() => useToast(), { wrapper });
    expect(typeof result.current.toast.info).toBe('function');
  });
});

// ─── Integration: toast shortcuts add toasts to the DOM ──────────────────────

/** A minimal component that calls a toast method on mount */
function ToastCaller({
  method,
  message,
}: {
  method: 'success' | 'error' | 'warning' | 'info';
  message: string;
}) {
  const { toast } = useToast();
  useEffect(() => {
    toast[method](message);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

describe('useToast — shortcut methods add toasts to the DOM', () => {
  it('toast.success renders a toast with the correct message', async () => {
    render(
      <ToastProvider>
        <ToastCaller method="success" message="Product added!" />
      </ToastProvider>,
    );

    expect(await screen.findByText('Product added!')).toBeInTheDocument();
  });

  it('toast.error renders a toast with the correct message', async () => {
    render(
      <ToastProvider>
        <ToastCaller method="error" message="Something went wrong" />
      </ToastProvider>,
    );

    expect(await screen.findByText('Something went wrong')).toBeInTheDocument();
  });

  it('toast via base call renders with message and description', async () => {
    function ToastCallerFull() {
      const { toast } = useToast();
      useEffect(() => {
        toast({ type: 'info', message: 'FYI', description: 'Extra details here' });
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
      return null;
    }

    render(
      <ToastProvider>
        <ToastCallerFull />
      </ToastProvider>,
    );

    expect(await screen.findByText('FYI')).toBeInTheDocument();
    expect(await screen.findByText('Extra details here')).toBeInTheDocument();
  });
});
