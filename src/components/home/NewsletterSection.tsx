'use client';

import Link from 'next/link';
import { useState } from 'react';

export function NewsletterSection() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;

    // TODO: Integrate with Klaviyo or email provider
    console.log('[newsletter] signup:', email);
    setStatus('success');
    setEmail('');
  }

  return (
    <section className="py-20 bg-[#F8F9FC]">
      <div className="container mx-auto px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-extrabold text-[#1A1A2E] mb-4 font-[var(--font-heading)]">
            Stay in the Loop
          </h2>
          <p className="text-slate-500 mb-10">
            Subscribe to receive updates, access to exclusive deals, and more.
          </p>

          {status === 'success' ? (
            <div className="rounded-lg bg-[#1B2A5E]/5 border border-[#1B2A5E]/10 px-6 py-8 text-[#1B2A5E]">
              <span
                className="material-symbols-outlined text-[#D4A843] text-4xl mb-3 block"
                style={{ fontVariationSettings: "'FILL' 1" }}
                aria-hidden="true"
              >
                check_circle
              </span>
              <p className="font-bold text-lg">You&apos;re in!</p>
              <p className="text-slate-500 text-sm mt-1">Check your inbox for a welcome email.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4">
              <label htmlFor="newsletter-email" className="sr-only">
                Email address
              </label>
              <input
                id="newsletter-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                required
                className="flex-1 px-6 py-4 rounded-lg border border-slate-200 focus:ring-2 focus:ring-[#1B2A5E] focus:border-[#1B2A5E] focus:outline-none transition-all text-[#1A1A2E] placeholder-slate-400"
              />
              <button
                type="submit"
                className="bg-[#1B2A5E] hover:bg-[#2a3f7e] text-white px-8 py-4 rounded-lg font-bold transition-colors flex-shrink-0"
              >
                Subscribe
              </button>
            </form>
          )}

          <p className="mt-4 text-xs text-slate-400">
            By subscribing, you agree to our{' '}
            <Link
              href="/policies/privacy-policy"
              className="underline hover:text-[#1B2A5E] transition-colors"
            >
              Privacy Policy
            </Link>
            . Unsubscribe at any time.
          </p>
        </div>
      </div>
    </section>
  );
}
