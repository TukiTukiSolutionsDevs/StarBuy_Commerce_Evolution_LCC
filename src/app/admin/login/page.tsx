'use client';

import { useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function AdminLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState('');
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
    <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center p-4">
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
          <img src="/StarBuy.png" alt="StarBuy" className="h-20 w-auto mx-auto mb-4" />
          <h1
            className="text-2xl font-bold"
            style={{ fontFamily: 'var(--font-heading)', color: '#ffffff' }}
          >
            Admin Panel
          </h1>
          <p className="text-[#6b7280] text-sm mt-1">AI-powered store management</p>
        </div>

        {/* Login card */}
        <div className="bg-[#111827] border border-[#1f2d4e] rounded-2xl p-8 shadow-2xl shadow-black/40">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[#9ca3af] mb-2">
                Admin password
              </label>
              <div className="relative">
                <input
                  ref={inputRef}
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  autoFocus
                  className="w-full bg-[#0f1729] border border-[#1f2d4e] text-white placeholder-[#374151] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#d4a843] focus:ring-1 focus:ring-[#d4a843] transition-colors"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-[#374151] text-xl">
                  lock
                </span>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                <span className="material-symbols-outlined text-red-400 text-base">error</span>
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !password}
              className="w-full bg-[#d4a843] hover:bg-[#e4c06a] disabled:bg-[#6b7280] disabled:cursor-not-allowed text-[#0a0f1e] font-semibold rounded-xl py-3 text-sm transition-colors flex items-center justify-center gap-2"
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

        <p className="text-center text-[#374151] text-xs mt-6">StarBuy Admin — Internal tool</p>
      </div>
    </div>
  );
}
