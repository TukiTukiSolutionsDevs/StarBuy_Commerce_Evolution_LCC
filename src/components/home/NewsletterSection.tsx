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
    <section className="bg-[#f4f4f0] py-12 md:py-20 px-4 md:px-6">
      <div className="max-w-2xl mx-auto text-center">
        <p className="font-label text-[#795a00] uppercase tracking-[0.3em] text-xs font-bold mb-3">
          Stay Updated
        </p>
        <h2 className="font-headline text-2xl md:text-3xl text-[#303330] mb-4">Stay in the Loop</h2>
        <p className="text-[#5d605c] mb-10 leading-relaxed">
          Subscribe to receive updates, access to exclusive deals, and more.
        </p>

        {status === 'success' ? (
          <div className="rounded-2xl bg-[#ffffff] px-6 py-8 text-[#303330] shadow-[0_8px_32px_rgba(0,0,0,0.04)]">
            <span
              className="material-symbols-outlined text-[#795a00] text-4xl mb-3 block"
              style={{ fontVariationSettings: "'FILL' 1" }}
              aria-hidden="true"
            >
              check_circle
            </span>
            <p className="font-body font-bold text-lg">You&apos;re in!</p>
            <p className="text-[#5d605c] text-sm mt-1">Check your inbox for a welcome email.</p>
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
              className="flex-1 px-6 py-4 rounded-xl border border-[#e1e3df] bg-[#ffffff] focus:ring-2 focus:ring-[#795a00]/30 focus:border-[#795a00] focus:outline-none transition-all text-[#303330] placeholder-[#b1b2af] font-body"
            />
            <button
              type="submit"
              className="px-8 py-4 rounded-xl font-bold tracking-widest text-[#fff8f0] transition-all duration-500 hover:shadow-[0_0_20px_rgba(121,90,0,0.3)] flex-shrink-0 text-sm"
              style={{
                background: 'radial-gradient(circle at center, #f8cc69 0%, #795a00 100%)',
              }}
            >
              Subscribe
            </button>
          </form>
        )}

        <p className="mt-4 text-xs text-[#b1b2af]">
          By subscribing, you agree to our{' '}
          <Link
            href="/policies/privacy-policy"
            className="underline hover:text-[#795a00] transition-colors"
          >
            Privacy Policy
          </Link>
          . Unsubscribe at any time.
        </p>
      </div>
    </section>
  );
}
