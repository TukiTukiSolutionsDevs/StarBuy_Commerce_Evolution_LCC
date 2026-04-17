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

      const data = (await res.json()) as { success: boolean; error?: string };

      if (data.success) {
        setStatus('success');
        setMessage(
          "If an account with that email exists, we've sent a recovery email. Check your inbox.",
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
      <div className="rounded-2xl bg-[#ffffff] p-6 text-center shadow-[0_8px_32px_rgba(0,0,0,0.04)]">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f4f4f0]">
          <span
            className="material-symbols-outlined text-[#795a00] text-2xl"
            style={{ fontVariationSettings: "'FILL' 1" }}
            aria-hidden="true"
          >
            mark_email_read
          </span>
        </div>
        <p className="text-sm font-medium text-[#303330]">{message}</p>
        <Link
          href="/account/login"
          className="mt-4 inline-block text-sm font-medium text-[#795a00] hover:text-[#6b4f00] transition-colors"
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
          className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700"
        >
          {message}
        </div>
      )}

      <div>
        <label htmlFor="recover-email" className="block text-sm font-medium text-[#303330] mb-1.5">
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
          className="w-full rounded-xl border border-[#e1e3df] bg-[#ffffff] px-3 py-2.5 text-sm text-[#303330] placeholder-[#b1b2af] transition-colors focus:border-[#795a00] focus:outline-none focus:ring-2 focus:ring-[#795a00]/20 disabled:opacity-60"
        />
      </div>

      <Button type="submit" variant="primary" size="lg" fullWidth loading={status === 'loading'}>
        {status === 'loading' ? 'Sending…' : 'Send Recovery Email'}
      </Button>

      <p className="text-center text-sm text-[#5d605c]">
        Remembered your password?{' '}
        <Link
          href="/account/login"
          className="font-medium text-[#795a00] hover:text-[#6b4f00] transition-colors"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
