'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage('');

    if (!email.trim()) {
      setStatus('error');
      setMessage('Please enter your email address.');
      return;
    }

    setStatus('loading');

    try {
      const res = await fetch('/api/auth/recover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json() as { success: boolean; error?: string };

      if (data.success) {
        setStatus('success');
        setMessage(
          "If an account with that email exists, we've sent a recovery email. Check your inbox."
        );
      } else {
        setStatus('error');
        setMessage(data.error ?? 'Something went wrong. Please try again.');
      }
    } catch {
      setStatus('error');
      setMessage('Network error. Please check your connection and try again.');
    }
  }

  if (status === 'success') {
    return (
      <div className="rounded-[var(--radius-lg)] bg-green-50 border border-green-200 p-6 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
          <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
          </svg>
        </div>
        <p className="text-sm font-medium text-green-800">{message}</p>
        <Link
          href="/account/login"
          className="mt-4 inline-block text-sm font-medium text-[var(--color-primary)] hover:text-[var(--color-primary-light)] transition-colors"
        >
          ← Back to Sign In
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {status === 'error' && message && (
        <div
          role="alert"
          className="rounded-[var(--radius-md)] bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700"
        >
          {message}
        </div>
      )}

      <div>
        <label
          htmlFor="recover-email"
          className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5"
        >
          Email address
        </label>
        <input
          id="recover-email"
          type="email"
          name="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={status === 'loading'}
          placeholder="you@example.com"
          className="w-full rounded-[var(--radius-md)] border border-gray-300 bg-white px-3 py-2.5 text-sm text-[var(--color-text-primary)] placeholder-gray-400 transition-colors focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 disabled:opacity-60"
        />
      </div>

      <Button
        type="submit"
        variant="primary"
        size="lg"
        fullWidth
        loading={status === 'loading'}
      >
        {status === 'loading' ? 'Sending…' : 'Send Recovery Email'}
      </Button>

      <p className="text-center text-sm text-[var(--color-text-secondary)]">
        Remembered your password?{' '}
        <Link
          href="/account/login"
          className="font-medium text-[var(--color-primary)] hover:text-[var(--color-primary-light)] transition-colors"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
