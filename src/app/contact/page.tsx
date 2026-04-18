import type { Metadata } from 'next';
import { Container } from '@/components/ui/Container';
import { ContactForm } from '@/components/contact/ContactForm';

export const metadata: Metadata = {
  title: 'Contact Us — StarBuyBaby',
  description:
    "Get in touch with the StarBuyBaby team. We're here to help with orders, shipping, returns, and anything else you need.",
  openGraph: {
    title: 'Contact StarBuyBaby',
    description: 'Get in touch with our support team. We respond within 24-48 hours.',
  },
};

const CONTACT_INFO = [
  {
    label: 'Email',
    value: 'support@starbuybaby.com',
    icon: 'mail',
  },
  {
    label: 'Location',
    value: 'Arlington, Virginia, USA',
    icon: 'location_on',
  },
  {
    label: 'Response Time',
    value: '24-48 business hours',
    icon: 'schedule',
  },
];

export default function ContactPage() {
  return (
    <Container as="main" className="py-16 bg-[#faf9f6]">
      {/* Header */}
      <div className="mx-auto max-w-2xl text-center mb-12">
        <p className="font-label text-[#795a00] uppercase tracking-[0.3em] text-xs font-bold mb-4">
          We&apos;re Here to Help
        </p>
        <h1 className="font-headline text-3xl md:text-5xl text-[#303330]">Get in Touch</h1>
        <p className="mt-4 text-[#5d605c] leading-relaxed">
          Have a question about your order or want to learn more about StarBuyBaby? We&apos;re here
          to help. Fill out the form and we&apos;ll respond within 24-48 business hours.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-12 lg:grid-cols-3">
        {/* Contact info */}
        <div className="space-y-6">
          <h2 className="font-headline text-xl text-[#303330]">Contact Information</h2>

          {CONTACT_INFO.map((item) => (
            <div key={item.label} className="flex items-start gap-4">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-[#f4f4f0] text-[#795a00]">
                <span
                  className="material-symbols-outlined text-xl"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                  aria-hidden="true"
                >
                  {item.icon}
                </span>
              </div>
              <div>
                <p className="font-label text-xs uppercase tracking-widest text-[#5d605c]">
                  {item.label}
                </p>
                <p className="mt-0.5 text-sm font-medium text-[#303330]">{item.value}</p>
              </div>
            </div>
          ))}

          {/* FAQ link */}
          <div className="rounded-2xl bg-[#f4f4f0] p-5 mt-8">
            <p className="text-sm font-bold text-[#303330] mb-1">Check our policies first</p>
            <p className="text-xs text-[#5d605c] mb-3">
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
                  className="flex items-center gap-1 text-xs font-medium text-[#795a00] hover:text-[#6b4f00] transition-colors"
                >
                  {link.label}
                  <span className="material-symbols-outlined text-xs" aria-hidden="true">
                    arrow_forward
                  </span>
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl bg-[#ffffff] p-5 md:p-8 shadow-[0_8px_32px_rgba(0,0,0,0.04)]">
            <h2 className="font-headline text-xl text-[#303330] mb-6">Send a Message</h2>
            <ContactForm />
          </div>
        </div>
      </div>
    </Container>
  );
}
