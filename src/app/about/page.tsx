import type { Metadata } from 'next';
import Link from 'next/link';
import { Container } from '@/components/ui/Container';

export const metadata: Metadata = {
  title: 'About Us — Starbuy',
  description:
    'Learn about Starbuy Commerce Revolution LLC — our mission to bring trending products at unbeatable prices to everyone.',
  openGraph: {
    title: 'About Starbuy',
    description: 'Our mission is to make trending products accessible to everyone.',
  },
};

const STATS = [
  { label: 'Products', value: '10,000+' },
  { label: 'Happy Customers', value: '50,000+' },
  { label: 'Categories', value: '20+' },
  { label: 'Countries Served', value: '15+' },
];

const VALUES = [
  {
    title: 'Curation Over Clutter',
    description:
      "We don't throw everything at you. We carefully select products that are trending, quality-tested, and worth your money.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
      </svg>
    ),
  },
  {
    title: 'Unbeatable Prices',
    description:
      "By working directly with suppliers and cutting out middlemen, we pass the savings directly to you. No gimmicks.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0c1.1.128 1.907 1.077 1.907 2.185zM9.75 9h.008v.008H9.75V9zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 4.5h.008v.008h-.008V13.5zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
      </svg>
    ),
  },
  {
    title: 'Fast, Reliable Shipping',
    description:
      "Every order is tracked from warehouse to your door. We partner with top couriers to ensure reliable, fast delivery.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
      </svg>
    ),
  },
  {
    title: 'Customer-First Support',
    description:
      "Real humans, real help. Our support team is available 7 days a week via email and chat to resolve any issue.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
      </svg>
    ),
  },
];

export default function AboutPage() {
  return (
    <main>
      {/* Hero */}
      <section className="bg-[var(--color-primary)] py-20">
        <Container>
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="font-heading text-4xl font-extrabold text-white sm:text-5xl">
              About <span className="text-[var(--color-secondary)]">Starbuy</span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-white/80">
              We&apos;re on a mission to make the world&apos;s trending products accessible to everyone —
              at prices that make sense.
            </p>
          </div>
        </Container>
      </section>

      {/* Stats */}
      <section className="py-12 bg-white border-b border-gray-100">
        <Container>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {STATS.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="font-heading text-3xl font-extrabold text-[var(--color-primary)]">
                  {stat.value}
                </p>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{stat.label}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Story */}
      <section className="py-16 bg-[var(--color-surface)]">
        <Container narrow>
          <h2 className="font-heading text-3xl font-bold text-[var(--color-text-primary)] mb-6">
            Our Story
          </h2>
          <div className="space-y-4 text-[var(--color-text-secondary)] leading-relaxed">
            <p>
              Starbuy was founded with a simple but powerful idea: everyone deserves access to
              trending, quality products without paying premium retail prices.
            </p>
            <p>
              Based in Arlington, Virginia, Starbuy Commerce Revolution LLC started as a small
              dropshipping operation with a handful of carefully curated products. Today, we serve
              tens of thousands of customers across 15+ countries, with a catalog spanning
              electronics, fashion, home goods, beauty, sports equipment, and more.
            </p>
            <p>
              Our secret? We work directly with suppliers, skip the middlemen, and invest heavily in
              customer experience. Every product on our site is evaluated for quality, value, and
              relevance. We don&apos;t list everything — we list what&apos;s worth listing.
            </p>
            <p>
              Whether you&apos;re looking for the latest tech gadget, a fashion statement, or a home
              upgrade, Starbuy is your one-stop destination for what&apos;s trending now.
            </p>
          </div>
        </Container>
      </section>

      {/* Values */}
      <section className="py-16 bg-white">
        <Container>
          <h2 className="font-heading text-3xl font-bold text-[var(--color-text-primary)] text-center mb-12">
            What We Stand For
          </h2>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {VALUES.map((value) => (
              <div
                key={value.title}
                className="flex flex-col items-center gap-4 text-center p-6 rounded-[var(--radius-lg)] border border-gray-100 hover:border-[var(--color-primary)]/20 hover:shadow-[var(--shadow-card)] transition-all"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-surface)] text-[var(--color-primary)]">
                  {value.icon}
                </div>
                <h3 className="font-heading text-base font-bold text-[var(--color-text-primary)]">
                  {value.title}
                </h3>
                <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">
                  {value.description}
                </p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* CTA */}
      <section className="py-16 bg-[var(--color-secondary)]">
        <Container>
          <div className="text-center">
            <h2 className="font-heading text-2xl font-bold text-[var(--color-primary)] sm:text-3xl">
              Ready to Discover What&apos;s Trending?
            </h2>
            <p className="mt-3 text-[var(--color-primary)]/80">
              Join thousands of happy customers already shopping with Starbuy.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/collections/all"
                className="inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-8 py-3.5 text-base font-bold text-white hover:bg-[var(--color-primary-light)] transition-colors"
              >
                Shop Now
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-primary)]/30 px-8 py-3.5 text-base font-medium text-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 transition-colors"
              >
                Contact Us
              </Link>
            </div>
          </div>
        </Container>
      </section>
    </main>
  );
}
