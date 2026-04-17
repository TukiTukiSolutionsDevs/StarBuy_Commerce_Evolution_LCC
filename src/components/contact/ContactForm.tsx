'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';

type FormState = {
  name: string;
  email: string;
  subject: string;
  message: string;
};

export function ContactForm() {
  const [form, setForm] = useState<FormState>({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg('');

    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      setStatus('error');
      setErrorMsg('Please fill in all required fields.');
      return;
    }

    setStatus('loading');

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = (await res.json()) as { success: boolean; error?: string };

      if (!data.success) {
        setStatus('error');
        setErrorMsg(data.error ?? 'Something went wrong. Please try again.');
        return;
      }

      setStatus('success');
      setForm({ name: '', email: '', subject: '', message: '' });
    } catch {
      setStatus('error');
      setErrorMsg('Network error. Please check your connection and try again.');
    }
  }

  if (status === 'success') {
    return (
      <div className="rounded-2xl bg-[#ffffff] p-8 text-center shadow-[0_8px_32px_rgba(0,0,0,0.04)]">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f4f4f0]">
          <span
            className="material-symbols-outlined text-[#795a00] text-3xl"
            style={{ fontVariationSettings: "'FILL' 1" }}
            aria-hidden="true"
          >
            check_circle
          </span>
        </div>
        <h3 className="font-headline text-xl font-bold text-[#303330] mb-2">Message Sent!</h3>
        <p className="text-sm text-[#5d605c]">
          Thank you for reaching out. We&apos;ll get back to you within 24–48 hours.
        </p>
        <button
          onClick={() => setStatus('idle')}
          className="mt-4 text-sm font-medium text-[#795a00] hover:text-[#6b4f00] transition-colors"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {status === 'error' && errorMsg && (
        <div
          role="alert"
          className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700"
        >
          {errorMsg}
        </div>
      )}

      {/* Name */}
      <div>
        <label htmlFor="contact-name" className="block text-sm font-medium text-[#303330] mb-1.5">
          Your Name <span className="text-red-500">*</span>
        </label>
        <input
          id="contact-name"
          type="text"
          name="name"
          autoComplete="name"
          required
          value={form.name}
          onChange={handleChange}
          disabled={status === 'loading'}
          placeholder="Jane Smith"
          className="w-full rounded-xl border border-[#e1e3df] bg-[#ffffff] px-3 py-2.5 text-sm text-[#303330] placeholder-[#b1b2af] transition-colors focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 disabled:opacity-60"
        />
      </div>

      {/* Email */}
      <div>
        <label htmlFor="contact-email" className="block text-sm font-medium text-[#303330] mb-1.5">
          Email Address <span className="text-red-500">*</span>
        </label>
        <input
          id="contact-email"
          type="email"
          name="email"
          autoComplete="email"
          required
          value={form.email}
          onChange={handleChange}
          disabled={status === 'loading'}
          placeholder="you@example.com"
          className="w-full rounded-xl border border-[#e1e3df] bg-[#ffffff] px-3 py-2.5 text-sm text-[#303330] placeholder-[#b1b2af] transition-colors focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 disabled:opacity-60"
        />
      </div>

      {/* Subject */}
      <div>
        <label
          htmlFor="contact-subject"
          className="block text-sm font-medium text-[#303330] mb-1.5"
        >
          Subject
        </label>
        <select
          id="contact-subject"
          name="subject"
          value={form.subject}
          onChange={handleChange}
          disabled={status === 'loading'}
          className="w-full rounded-xl border border-[#e1e3df] bg-[#ffffff] px-3 py-2.5 text-sm text-[#303330] transition-colors focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 disabled:opacity-60"
        >
          <option value="">Select a topic…</option>
          <option value="order">Order Issue</option>
          <option value="shipping">Shipping & Delivery</option>
          <option value="return">Returns & Refunds</option>
          <option value="product">Product Question</option>
          <option value="account">Account Help</option>
          <option value="other">Other</option>
        </select>
      </div>

      {/* Message */}
      <div>
        <label
          htmlFor="contact-message"
          className="block text-sm font-medium text-[#303330] mb-1.5"
        >
          Message <span className="text-red-500">*</span>
        </label>
        <textarea
          id="contact-message"
          name="message"
          rows={5}
          required
          value={form.message}
          onChange={handleChange}
          disabled={status === 'loading'}
          placeholder="Tell us how we can help…"
          className="w-full rounded-xl border border-[#e1e3df] bg-[#ffffff] px-3 py-2.5 text-sm text-[#303330] placeholder-[#b1b2af] transition-colors focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 disabled:opacity-60 resize-none"
        />
      </div>

      <Button type="submit" variant="primary" size="lg" fullWidth loading={status === 'loading'}>
        {status === 'loading' ? 'Sending…' : 'Send Message'}
      </Button>
    </form>
  );
}
