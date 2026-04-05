import type { Metadata } from 'next';
import { Container } from '@/components/ui/Container';
import { ContactForm } from '@/components/contact/ContactForm';

export const metadata: Metadata = {
  title: 'Contact Us — Starbuy',
  description:
    'Get in touch with the Starbuy team. We\'re here to help with orders, shipping, returns, and anything else you need.',
  openGraph: {
    title: 'Contact Starbuy',
    description: 'Get in touch with our support team. We respond within 24–48 hours.',
  },
};

const CONTACT_INFO = [
  {
    label: 'Email',
    value: 'support@starbuy.com',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
      </svg>
    ),
  },
  {
    label: 'Location',
    value: 'Arlington, Virginia, USA',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
      </svg>
    ),
  },
  {
    label: 'Response Time',
    value: '24–48 business hours',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

export default function ContactPage() {
  return (
    <Container as="main" className="py-16">
      {/* Header */}
      <div className="mx-auto max-w-2xl text-center mb-12">
        <h1 className="font-heading text-4xl font-bold text-[var(--color-primary)]">
          Get in Touch
        </h1>
        <p className="mt-4 text-[var(--color-text-secondary)] leading-relaxed">
          Have a question about your order or want to learn more about Starbuy? We&apos;re here to
          help. Fill out the form and we&apos;ll respond within 24–48 business hours.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-12 lg:grid-cols-3">
        {/* Contact info */}
        <div className="space-y-6">
          <h2 className="font-heading text-xl font-bold text-[var(--color-text-primary)]">
            Contact Information
          </h2>

          {CONTACT_INFO.map((item) => (
            <div key={item.label} className="flex items-start gap-4">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[var(--color-surface)] text-[var(--color-primary)]">
                {item.icon}
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
                  {item.label}
                </p>
                <p className="mt-0.5 text-sm font-medium text-[var(--color-text-primary)]">
                  {item.value}
                </p>
              </div>
            </div>
          ))}

          {/* FAQ link */}
          <div className="rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-4 mt-8">
            <p className="text-sm font-semibold text-[var(--color-text-primary)] mb-1">
              Check our policies first
            </p>
            <p className="text-xs text-[var(--color-text-secondary)] mb-3">
              Many questions about returns, shipping, and payments are answered in our policies.
            </p>
            <div className="space-y-2">
              {[
                { label: 'Refund Policy', href: '/policies/refund-policy' },
                { label: 'Shipping Policy', href: '/policies/shipping-policy' },
                { label: 'Privacy Policy', href: '/policies/privacy-policy' },
              ].map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="flex items-center gap-1 text-xs font-medium text-[var(--color-primary)] hover:text-[var(--color-primary-light)] transition-colors"
                >
                  {link.label} →
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="lg:col-span-2">
          <div className="rounded-[var(--radius-lg)] border border-gray-200 bg-white p-8 shadow-[var(--shadow-card)]">
            <h2 className="font-heading text-xl font-bold text-[var(--color-text-primary)] mb-6">
              Send a Message
            </h2>
            <ContactForm />
          </div>
        </div>
      </div>
    </Container>
  );
}
