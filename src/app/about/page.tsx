import type { Metadata } from 'next';
import Link from 'next/link';
import { Container } from '@/components/ui/Container';

export const metadata: Metadata = {
  title: 'About Us — StarBuyBaby',
  description:
    'Learn about StarBuyBaby — curated essentials for modern living. Quality products, fast shipping, and celestial service from Arlington, Virginia.',
  openGraph: {
    title: 'About StarBuyBaby',
    description:
      'Curated essentials for modern living. Quality products, fast shipping, and celestial service.',
  },
};

const VALUES = [
  {
    title: 'Curated With Care',
    description:
      'Every product is handpicked for quality, design, and value. We don\u2019t list everything \u2014 only what\u2019s worth your time.',
    icon: 'auto_awesome',
  },
  {
    title: 'Honest Pricing',
    description:
      'We work directly with suppliers to bring you the best prices. No hidden fees, no gimmicks \u2014 just fair value.',
    icon: 'loyalty',
  },
  {
    title: 'Fast & Tracked Shipping',
    description:
      'Every order is tracked from warehouse to your door. We partner with trusted couriers for reliable delivery.',
    icon: 'local_shipping',
  },
  {
    title: 'Real Human Support',
    description:
      'Questions? Our team responds within 24\u201348 hours. Real people, real help \u2014 no chatbots, no runarounds.',
    icon: 'support_agent',
  },
];

const PROMISES = [
  { icon: 'verified', text: '30-Day Easy Returns' },
  { icon: 'lock', text: '256-Bit SSL Encryption' },
  { icon: 'package_2', text: 'Careful Packaging' },
  { icon: 'eco', text: 'Sustainable Practices' },
];

export default function AboutPage() {
  return (
    <main className="bg-[#faf9f6]">
      {/* Hero */}
      <section className="relative px-6 pt-20 pb-24 md:pt-28 md:pb-32 overflow-hidden">
        {/* Decorative blobs */}
        <div className="absolute -top-10 -left-20 w-64 h-64 bg-[#bcd6ff]/30 blur-[100px] rounded-full -z-10" />
        <div className="absolute top-40 -right-20 w-80 h-80 bg-[#f8cc69]/20 blur-[120px] rounded-full -z-10" />

        <div className="max-w-3xl mx-auto text-center">
          <p className="font-label text-[#795a00] uppercase tracking-[0.3em] text-xs font-bold mb-6">
            Our Story
          </p>
          <h1 className="font-headline text-5xl md:text-7xl text-[#303330] leading-tight tracking-tight mb-6">
            About StarBuyBaby
          </h1>
          <p className="font-body text-[#5d605c] max-w-xl mx-auto leading-relaxed text-lg">
            Curated essentials for modern living. We believe everyone deserves access to quality
            products, beautiful design, and an effortless shopping experience.
          </p>
        </div>
      </section>

      {/* Story */}
      <section className="px-6 mb-20">
        <Container narrow>
          <div className="bg-[#ffffff] rounded-2xl p-8 md:p-12 shadow-[0_8px_32px_rgba(0,0,0,0.04)]">
            <h2 className="font-headline text-3xl text-[#303330] mb-8">How It Started</h2>
            <div className="space-y-5 text-[#5d605c] leading-relaxed font-body">
              <p>
                StarBuyBaby began with a simple idea: make trending, quality-tested products
                accessible to everyone \u2014 without the premium retail markup.
              </p>
              <p>
                Based in Arlington, Virginia, we started as a small curated shop with a handful of
                carefully selected products. By working directly with suppliers and cutting out
                middlemen, we discovered we could offer exceptional value without compromising on
                quality.
              </p>
              <p>
                Today, StarBuyBaby serves customers across the United States with a growing catalog
                of electronics, home essentials, fashion, beauty, and lifestyle products. Every item
                on our site is evaluated for quality, relevance, and real-world value before it
                earns a spot in our collection.
              </p>
              <p className="text-[#303330] font-semibold">
                We don&apos;t list everything \u2014 we list what&apos;s worth listing.
              </p>
            </div>
          </div>
        </Container>
      </section>

      {/* Values */}
      <section className="bg-[#f4f4f0] py-20 px-6 mb-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <p className="font-label text-[#795a00] uppercase tracking-[0.3em] text-xs font-bold mb-3">
              What Drives Us
            </p>
            <h2 className="font-headline text-4xl text-[#303330]">Our Values</h2>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {VALUES.map((value) => (
              <div
                key={value.title}
                className="group bg-[#ffffff] rounded-2xl p-8 text-center shadow-[0_8px_32px_rgba(0,0,0,0.04)] hover:shadow-[0_16px_48px_rgba(0,0,0,0.08)] transition-all duration-500"
              >
                <div className="w-14 h-14 bg-[#f4f4f0] rounded-2xl flex items-center justify-center mb-5 mx-auto group-hover:bg-[#f8cc69]/20 transition-colors duration-500">
                  <span
                    className="material-symbols-outlined text-[#795a00] text-2xl"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                    aria-hidden="true"
                  >
                    {value.icon}
                  </span>
                </div>
                <h3 className="font-body font-bold text-sm mb-2 text-[#303330]">{value.title}</h3>
                <p className="text-[#5d605c] text-sm leading-relaxed">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Promises */}
      <section className="px-6 mb-20">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-headline text-3xl text-[#303330] text-center mb-10">
            Our Promise to You
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {PROMISES.map((promise) => (
              <div
                key={promise.text}
                className="flex flex-col items-center gap-3 rounded-2xl bg-[#ffffff] p-6 shadow-[0_4px_16px_rgba(0,0,0,0.03)]"
              >
                <span
                  className="material-symbols-outlined text-[#795a00] text-3xl"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                  aria-hidden="true"
                >
                  {promise.icon}
                </span>
                <p className="font-body text-xs font-bold text-[#303330] text-center">
                  {promise.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 mb-20">
        <div className="max-w-4xl mx-auto rounded-2xl bg-[#f4f4f0] p-10 md:p-16 text-center">
          <h2 className="font-headline text-3xl md:text-4xl text-[#303330] mb-4">
            Ready to Discover Something Special?
          </h2>
          <p className="text-[#5d605c] max-w-lg mx-auto mb-8 leading-relaxed">
            Browse our curated collection of essentials, trending finds, and everyday upgrades
            \u2014 all at prices that make sense.
          </p>
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/collections/all"
              className="inline-flex items-center gap-2 rounded-lg px-8 py-3.5 text-sm font-bold tracking-widest text-[#fff8f0] transition-all duration-500 hover:shadow-[0_0_20px_rgba(121,90,0,0.3)]"
              style={{
                background: 'radial-gradient(circle at center, #f8cc69 0%, #795a00 100%)',
              }}
            >
              Shop Now
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 rounded-lg bg-[#d4e3ff] px-8 py-3.5 text-sm font-bold text-[#005396] hover:bg-[#c0d6ff] transition-colors"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
