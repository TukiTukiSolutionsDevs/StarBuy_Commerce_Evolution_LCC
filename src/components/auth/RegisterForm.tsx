'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';

export function RegisterForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  function handleChange(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
    };
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');

    // Validate
    if (!form.email.trim() || !form.password) {
      setError('Email and password are required.');
      return;
    }

    if (form.password.length < 5) {
      setError('Password must be at least 5 characters.');
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email.trim(),
          password: form.password,
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
        }),
      });

      const data = await res.json() as { success: boolean; error?: string; autoLogin?: boolean };

      if (!data.success) {
        setError(data.error ?? 'Could not create account. Please try again.');
        return;
      }

      // Redirect based on auto-login status
      if (data.autoLogin) {
        router.push('/account');
      } else {
        router.push('/account/login');
      }
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
          className="rounded-[var(--radius-md)] bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {/* Name row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="reg-first-name"
            className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5"
          >
            First name
          </label>
          <input
            id="reg-first-name"
            type="text"
            name="firstName"
            autoComplete="given-name"
            value={form.firstName}
            onChange={handleChange('firstName')}
            disabled={isLoading}
            placeholder="Jane"
            className="w-full rounded-[var(--radius-md)] border border-gray-300 bg-white px-3 py-2.5 text-sm text-[var(--color-text-primary)] placeholder-gray-400 transition-colors focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 disabled:opacity-60"
          />
        </div>
        <div>
          <label
            htmlFor="reg-last-name"
            className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5"
          >
            Last name
          </label>
          <input
            id="reg-last-name"
            type="text"
            name="lastName"
            autoComplete="family-name"
            value={form.lastName}
            onChange={handleChange('lastName')}
            disabled={isLoading}
            placeholder="Smith"
            className="w-full rounded-[var(--radius-md)] border border-gray-300 bg-white px-3 py-2.5 text-sm text-[var(--color-text-primary)] placeholder-gray-400 transition-colors focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 disabled:opacity-60"
          />
        </div>
      </div>

      {/* Email */}
      <div>
        <label
          htmlFor="reg-email"
          className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5"
        >
          Email address <span className="text-red-500">*</span>
        </label>
        <input
          id="reg-email"
          type="email"
          name="email"
          autoComplete="email"
          required
          value={form.email}
          onChange={handleChange('email')}
          disabled={isLoading}
          placeholder="you@example.com"
          className="w-full rounded-[var(--radius-md)] border border-gray-300 bg-white px-3 py-2.5 text-sm text-[var(--color-text-primary)] placeholder-gray-400 transition-colors focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 disabled:opacity-60"
        />
      </div>

      {/* Password */}
      <div>
        <label
          htmlFor="reg-password"
          className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5"
        >
          Password <span className="text-red-500">*</span>
        </label>
        <input
          id="reg-password"
          type="password"
          name="password"
          autoComplete="new-password"
          required
          value={form.password}
          onChange={handleChange('password')}
          disabled={isLoading}
          placeholder="Min. 5 characters"
          className="w-full rounded-[var(--radius-md)] border border-gray-300 bg-white px-3 py-2.5 text-sm text-[var(--color-text-primary)] placeholder-gray-400 transition-colors focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 disabled:opacity-60"
        />
      </div>

      {/* Confirm password */}
      <div>
        <label
          htmlFor="reg-confirm-password"
          className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5"
        >
          Confirm password <span className="text-red-500">*</span>
        </label>
        <input
          id="reg-confirm-password"
          type="password"
          name="confirmPassword"
          autoComplete="new-password"
          required
          value={form.confirmPassword}
          onChange={handleChange('confirmPassword')}
          disabled={isLoading}
          placeholder="••••••••"
          className="w-full rounded-[var(--radius-md)] border border-gray-300 bg-white px-3 py-2.5 text-sm text-[var(--color-text-primary)] placeholder-gray-400 transition-colors focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 disabled:opacity-60"
        />
      </div>

      {/* Submit */}
      <Button
        type="submit"
        variant="primary"
        size="lg"
        fullWidth
        loading={isLoading}
      >
        {isLoading ? 'Creating account…' : 'Create Account'}
      </Button>

      {/* Login link */}
      <p className="text-center text-sm text-[var(--color-text-secondary)]">
        Already have an account?{' '}
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
