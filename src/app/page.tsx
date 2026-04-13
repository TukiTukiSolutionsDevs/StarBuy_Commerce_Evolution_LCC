import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { getProducts, getCollections } from '@/lib/shopify';
import { ProductCard } from '@/components/ui/ProductCard';
import { NewsletterSection } from '@/components/home/NewsletterSection';
import { RecentlyViewed } from '@/components/product/RecentlyViewed';
import { OrganizationJsonLd, WebSiteJsonLd } from '@/components/seo/JsonLd';

export const metadata: Metadata = {
  title: 'StarBuyBaby — Celestial Shopping for Modern Living',
  description:
    'Discover curated essentials, trending products, and premium finds at StarBuyBaby. Elegant shopping, fast shipping, and celestial quality.',
  openGraph: {
    title: 'StarBuyBaby — Celestial Shopping for Modern Living',
    description:
      'Curated essentials and premium finds at StarBuyBaby. Elegant shopping experience.',
    url: '/',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'StarBuyBaby — Celestial Shopping for Modern Living',
    description: 'Curated essentials and premium finds at StarBuyBaby.',
  },
};

// ─── Trust items ─────────────────────────────────────────────────────────────
const TRUST_ITEMS = [
  {
    icon: 'local_shipping',
    title: 'Free Shipping',
    description: 'On all orders over $50 across the country.',
  },
  {
    icon: 'keyboard_return',
    title: 'Easy Returns',
    description: '30-day no-questions-asked return policy.',
  },
  {
    icon: 'verified_user',
    title: 'Secure Payment',
    description: 'Your data is protected by 256-bit SSL encryption.',
  },
  {
    icon: 'support_agent',
    title: '24/7 Support',
    description: 'Our team is always here to help you out.',
  },
];

// ─── Page (Server Component) ───────────────────────────────────────────────────

export default async function HomePage() {
  let products: Awaited<ReturnType<typeof getProducts>> = [];
  let collections: Awaited<ReturnType<typeof getCollections>> = [];

  try {
    products = await getProducts({ first: 8, sortKey: 'BEST_SELLING' });
  } catch {
    // Graceful fallback
  }

  try {
    collections = await getCollections(6);
  } catch {
    // Graceful fallback
  }

  // Pick featured collections for bento grid
  const featuredCollection = collections[0] ?? null;
  const accentCollection = collections[1] ?? null;
  const promoCollection = collections[2] ?? null;

  return (
    <>
      {/* JSON-LD */}
      <OrganizationJsonLd />
      <WebSiteJsonLd />

      {/* ── Hero Section (Stitch-inspired) ──────────────────────────────── */}
      <section className="relative px-6 pt-20 pb-24 md:pt-28 md:pb-32 mb-20 overflow-hidden">
        {/* Decorative blobs */}
        <div className="absolute -top-10 -left-20 w-64 h-64 bg-[#bcd6ff]/30 blur-[100px] rounded-full -z-10" />
        <div className="absolute top-40 -right-20 w-80 h-80 bg-[#f8cc69]/20 blur-[120px] rounded-full -z-10" />

        <div className="max-w-3xl mx-auto text-center">
          <p className="font-label text-[#795a00] uppercase tracking-[0.3em] text-xs font-bold mb-6">
            The Ethereal Collection
          </p>
          <h1 className="font-headline text-5xl md:text-7xl text-[#303330] leading-tight tracking-tight mb-6">
            StarBuyBaby
          </h1>
          <p className="font-body text-[#5d605c] max-w-xl mx-auto leading-relaxed text-lg mb-10">
            Curated essentials for modern living. Discover celestial quality, timeless design, and
            products that elevate your everyday.
          </p>
          <Link
            href="/collections/all"
            className="inline-block px-10 py-4 rounded-lg font-bold tracking-widest text-[#fff8f0] hover:shadow-[0_0_20px_rgba(121,90,0,0.3)] transition-all duration-500"
            style={{
              background: 'radial-gradient(circle at center, #f8cc69 0%, #795a00 100%)',
            }}
          >
            Shop Now
          </Link>
        </div>
      </section>

      {/* ── Featured Collections — Bento Grid ────────────────────────────── */}
      <section className="px-6 mb-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <p className="font-label text-[#795a00] uppercase tracking-[0.3em] text-xs font-bold mb-3">
              Curated For You
            </p>
            <h2 className="font-headline text-4xl text-[#303330]">Featured Collections</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Large featured card */}
            <Link
              href={
                featuredCollection
                  ? `/collections/${featuredCollection.handle}`
                  : '/collections/all'
              }
              className="group md:col-span-2 bg-[#f4f4f0] rounded-xl p-10 transition-all duration-500 hover:shadow-[0_32px_64px_rgba(0,0,0,0.06)]"
            >
              {featuredCollection?.image && (
                <div className="relative w-full aspect-[2/1] rounded-lg overflow-hidden mb-6">
                  <Image
                    src={featuredCollection.image.url}
                    alt={featuredCollection.image.altText ?? featuredCollection.title}
                    fill
                    sizes="(min-width: 768px) 66vw, 100vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
              )}
              <h3 className="font-headline text-3xl text-[#303330] mb-2">
                {featuredCollection?.title ?? 'All Products'}
              </h3>
              <p className="text-[#5d605c] max-w-sm">
                {featuredCollection?.description ??
                  'Browse our complete collection of curated essentials.'}
              </p>
            </Link>

            {/* Smaller accent card */}
            <Link
              href={accentCollection ? `/collections/${accentCollection.handle}` : '/collections'}
              className="group bg-[#d4e3ff] rounded-xl p-8 text-[#005396] transition-all duration-500 hover:shadow-[0_32px_64px_rgba(0,0,0,0.06)] flex flex-col justify-end"
            >
              {accentCollection?.image && (
                <div className="relative w-full aspect-square rounded-lg overflow-hidden mb-6">
                  <Image
                    src={accentCollection.image.url}
                    alt={accentCollection.image.altText ?? accentCollection.title}
                    fill
                    sizes="(min-width: 768px) 33vw, 100vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
              )}
              <h3 className="font-headline text-3xl mb-2">
                {accentCollection?.title ?? 'Browse Collections'}
              </h3>
              <p className="text-[#005396]/70 max-w-sm">
                {accentCollection?.description ?? 'Explore our curated categories.'}
              </p>
            </Link>

            {/* Full-width promo card */}
            <Link
              href={promoCollection ? `/collections/${promoCollection.handle}` : '/collections/all'}
              className="group md:col-span-3 bg-[#ffffff] rounded-xl p-8 md:p-12 shadow-[0_32px_64px_rgba(0,0,0,0.04)] transition-all duration-500 hover:shadow-[0_32px_64px_rgba(0,0,0,0.08)] flex flex-col md:flex-row md:items-center md:justify-between gap-6"
            >
              <div>
                <p className="font-label text-[#795a00] uppercase tracking-[0.3em] text-xs font-bold mb-3">
                  Special Offer
                </p>
                <h3 className="font-headline text-3xl text-[#303330] mb-2">
                  {promoCollection?.title ?? 'Discover More'}
                </h3>
                <p className="text-[#5d605c] max-w-md">
                  {promoCollection?.description ??
                    'Explore curated selections with celestial quality and fast shipping.'}
                </p>
              </div>
              <span
                className="inline-block px-8 py-3 rounded-lg font-bold tracking-widest text-[#fff8f0] text-sm shrink-0"
                style={{
                  background: 'radial-gradient(circle at center, #f8cc69 0%, #795a00 100%)',
                }}
              >
                Shop Now
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Trending Products ─────────────────────────────────────────────── */}
      <section className="bg-[#f4f4f0] py-20 -mx-0 px-6 mb-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-headline text-4xl text-[#303330] mb-4">Trending Now</h2>
            <p className="text-[#5d605c] text-lg">Handpicked favorites our customers love</p>
          </div>

          {products.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
              {products.map((product, i) => (
                <ProductCard key={product.id} product={product} priority={i < 4} />
              ))}
            </div>
          ) : (
            <div className="rounded-xl bg-[#ffffff] py-16 text-center shadow-[0_32px_64px_rgba(0,0,0,0.04)]">
              <p className="text-[#5d605c]">Products are being curated. Check back soon!</p>
            </div>
          )}

          <div className="text-center mt-10">
            <Link
              href="/collections/all"
              className="inline-flex items-center gap-2 font-body font-bold text-[#795a00] hover:text-[#6b4f00] transition-colors"
            >
              View All Products
              <span className="material-symbols-outlined text-lg" aria-hidden="true">
                arrow_forward
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Trust Section ─────────────────────────────────────────────────── */}
      <section className="px-6 mb-20">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-headline text-3xl text-[#303330] text-center mb-12">
            Why Shop With StarBuyBaby?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {TRUST_ITEMS.map((item) => (
              <div
                key={item.title}
                className="text-center group bg-[#ffffff] rounded-2xl p-8 shadow-[0_8px_32px_rgba(0,0,0,0.04)] hover:shadow-[0_16px_48px_rgba(0,0,0,0.08)] transition-all duration-500"
              >
                <div className="w-14 h-14 bg-[#f4f4f0] rounded-2xl flex items-center justify-center mb-5 mx-auto group-hover:bg-[#f8cc69]/20 transition-colors duration-500">
                  <span
                    className="material-symbols-outlined text-[#795a00] text-2xl"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                    aria-hidden="true"
                  >
                    {item.icon}
                  </span>
                </div>
                <h3 className="font-body font-bold text-sm mb-2 text-[#303330]">{item.title}</h3>
                <p className="text-[#5d605c] text-sm leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Recently Viewed ───────────────────────────────────────────────── */}
      <section className="px-6 mb-12">
        <div className="max-w-6xl mx-auto">
          <RecentlyViewed />
        </div>
      </section>

      {/* ── Newsletter ────────────────────────────────────────────────────── */}
      <NewsletterSection />
    </>
  );
}
