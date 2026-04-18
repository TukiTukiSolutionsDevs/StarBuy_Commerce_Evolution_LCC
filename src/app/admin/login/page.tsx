'use client';

import { useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function AdminLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = (await res.json()) as { success: boolean; error?: string };

      if (data.success) {
        const redirect = searchParams.get('redirect') ?? '/admin';
        router.push(redirect);
      } else {
        setError(data.error ?? 'Invalid password');
        setPassword('');
        inputRef.current?.focus();
      }
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: 'var(--admin-bg)' }}
    >
      {/* Background grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }}
      />

      <div className="relative w-full max-w-sm">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <img src="/logo.png" alt="StarBuy" className="h-20 w-auto mx-auto mb-4" />
          <h1
            className="text-2xl font-bold"
            style={{ fontFamily: 'var(--font-heading)', color: 'var(--admin-text)' }}
          >
            Admin Panel
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--admin-text-muted)' }}>
            AI-powered store management
          </p>
        </div>

        {/* Login card */}
        <div
          className="rounded-2xl p-8 shadow-2xl shadow-black/40"
          style={{
            backgroundColor: 'var(--admin-bg-card)',
            borderWidth: 1,
            borderStyle: 'solid',
            borderColor: 'var(--admin-border)',
          }}
        >
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium mb-2"
                style={{ color: 'var(--admin-text-secondary)' }}
              >
                Admin password
              </label>
              <div className="relative">
                <input
                  ref={inputRef}
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  autoFocus
                  className="w-full rounded-xl px-4 pr-10 py-3 text-sm focus:outline-none transition-colors"
                  style={{
                    backgroundColor: 'var(--admin-bg-input)',
                    borderWidth: 1,
                    borderStyle: 'solid',
                    borderColor: 'var(--admin-border)',
                    color: 'var(--admin-text)',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: 'var(--admin-text-disabled)' }}
                >
                  <span className="material-symbols-outlined text-xl">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            {error && (
              <div
                className="flex items-center gap-2 rounded-xl px-4 py-3"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--admin-error) 10%, transparent)',
                  borderWidth: 1,
                  borderStyle: 'solid',
                  borderColor: 'color-mix(in srgb, var(--admin-error) 20%, transparent)',
                }}
              >
                <span
                  className="material-symbols-outlined text-base"
                  style={{ color: 'var(--admin-error)' }}
                >
                  error
                </span>
                <p className="text-sm" style={{ color: 'var(--admin-error)' }}>
                  {error}
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !password}
              className="w-full disabled:cursor-not-allowed font-semibold rounded-xl py-3 text-sm transition-colors flex items-center justify-center gap-2"
              style={{ backgroundColor: 'var(--admin-brand)', color: 'var(--admin-bg)' }}
            >
              {loading ? (
                <>
                  <span className="material-symbols-outlined text-base animate-spin">
                    progress_activity
                  </span>
                  Verifying…
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-base">login</span>
                  Sign in
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: 'var(--admin-text-disabled)' }}>
          StarBuy Admin — Internal tool
        </p>
      </div>
    </div>
  );
}
