'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = (await res.json()) as { success: boolean; error?: string };

      if (!data.success) {
        setError(data.error ?? 'Invalid email or password. Please try again.');
        return;
      }

      router.push('/account');
      router.refresh();
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {/* Error message */}
      {error && (
        <div
          role="alert"
          className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {/* Email */}
      <div>
        <label htmlFor="login-email" className="block text-sm font-medium text-[#303330] mb-1.5">
          Email address
        </label>
        <input
          id="login-email"
          type="email"
          name="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isLoading}
          placeholder="you@example.com"
          className="w-full rounded-xl border border-[#e1e3df] bg-[#ffffff] px-3 py-2.5 text-sm text-[#303330] placeholder-[#b1b2af] transition-colors focus:border-[#795a00] focus:outline-none focus:ring-2 focus:ring-[#795a00]/20 disabled:opacity-60"
        />
      </div>

      {/* Password */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label htmlFor="login-password" className="block text-sm font-medium text-[#303330]">
            Password
          </label>
          <Link
            href="/account/forgot-password"
            className="text-xs font-medium text-[#795a00] hover:text-[#6b4f00] transition-colors"
          >
            Forgot password?
          </Link>
        </div>
        <input
          id="login-password"
          type="password"
          name="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isLoading}
          placeholder="••••••••"
          className="w-full rounded-xl border border-[#e1e3df] bg-[#ffffff] px-3 py-2.5 text-sm text-[#303330] placeholder-[#b1b2af] transition-colors focus:border-[#795a00] focus:outline-none focus:ring-2 focus:ring-[#795a00]/20 disabled:opacity-60"
        />
      </div>

      {/* Submit */}
      <Button type="submit" variant="primary" size="lg" fullWidth loading={isLoading}>
        {isLoading ? 'Signing in…' : 'Sign In'}
      </Button>

      {/* Register link */}
      <p className="text-center text-sm text-[#5d605c]">
        Don&apos;t have an account?{' '}
        <Link
          href="/account/register"
          className="font-medium text-[#795a00] hover:text-[#6b4f00] transition-colors"
        >
          Create one
        </Link>
      </p>
    </form>
  );
}
