import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { getProducts, getCollections } from '@/lib/shopify';
import { ProductCard } from '@/components/ui/ProductCard';
import { HeroSection } from '@/components/home/HeroSection';
import { BrandStorySection } from '@/components/home/BrandStorySection';
import { NewsletterSection } from '@/components/home/NewsletterSection';
import { RecentlyViewed } from '@/components/product/RecentlyViewed';
import { OrganizationJsonLd, WebSiteJsonLd } from '@/components/seo/JsonLd';

export const metadata: Metadata = {
  title: 'StarBuyBaby — Curated Baby Essentials Parents Trust',
  description:
    'Shop safe, beautiful baby essentials at StarBuyBaby. From nursery must-haves to feeding gear — curated by parents, loved by little ones. Free shipping on orders over $50.',
  openGraph: {
    title: 'StarBuyBaby — Curated Baby Essentials Parents Trust',
    description:
      'Safe, beautiful baby essentials curated by parents. Nursery, feeding, gear & more.',
    url: '/',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'StarBuyBaby — Curated Baby Essentials Parents Trust',
    description: 'Safe, beautiful baby essentials curated by parents at StarBuyBaby.',
  },
};

// ─── Trust items ─────────────────────────────────────────────────────────────
const TRUST_ITEMS = [
  {
    icon: 'local_shipping',
    title: 'Free Baby Shipping',
    description: "Free on all orders over $50. Because diaper runs shouldn't cost extra.",
  },
  {
    icon: 'keyboard_return',
    title: 'Hassle-Free Returns',
    description: '30-day easy returns. We know babies grow fast — no stress if sizes change.',
  },
  {
    icon: 'health_and_safety',
    title: 'Safety Certified',
    description: "Every product is tested and certified. Your little one's safety comes first.",
  },
  {
    icon: 'support_agent',
    title: 'Parent Support Team',
    description: "Real parents on our support team — we get it, and we're here 24/7.",
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

      {/* ── Hero Section ──────────────────────────────────────────────── */}
      <HeroSection />

      {/* ── Featured Collections — Bento Grid ────────────────────────────── */}
      <section className="px-4 md:px-6 mb-12 md:mb-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8 md:mb-12">
            <p className="font-label text-[#c9a84c] uppercase tracking-[0.3em] text-xs font-bold mb-3">
              Curated For Your Family
            </p>
            <h2 className="font-headline text-2xl md:text-4xl text-[#1a1a2e]">
              Featured Baby Collections
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Large featured card */}
            <Link
              href={
                featuredCollection
                  ? `/collections/${featuredCollection.handle}`
                  : '/collections/all'
              }
              className="group md:col-span-2 bg-gradient-to-br from-[#f5e1dc] to-[#faf5f0] rounded-[1.5rem] p-6 md:p-10 transition-all duration-500 hover:shadow-[0_16px_48px_rgba(45,27,78,0.08)]"
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
              <h3 className="font-headline text-xl md:text-3xl text-[#1a1a2e] mb-2">
                {featuredCollection?.title ?? 'All Products'}
              </h3>
              <p className="text-[#6b6580] max-w-sm">
                {featuredCollection?.description ??
                  'Browse our complete collection of curated baby essentials.'}
              </p>
            </Link>

            {/* Smaller accent card */}
            <Link
              href={accentCollection ? `/collections/${accentCollection.handle}` : '/collections'}
              className="group bg-gradient-to-br from-[#e8daf0] to-[#d4c5e2] rounded-[1.5rem] p-8 text-[#2d1b4e] transition-all duration-500 hover:shadow-[0_16px_48px_rgba(45,27,78,0.12)] flex flex-col justify-end"
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
              <h3 className="font-headline text-xl md:text-3xl mb-2">
                {accentCollection?.title ?? 'Browse Collections'}
              </h3>
              <p className="text-[#2d1b4e]/70 max-w-sm">
                {accentCollection?.description ?? 'Explore our curated baby categories.'}
              </p>
            </Link>

            {/* Full-width promo card */}
            <Link
              href={promoCollection ? `/collections/${promoCollection.handle}` : '/collections/all'}
              className="group md:col-span-3 bg-white rounded-[1.5rem] p-8 md:p-12 shadow-[0_4px_24px_rgba(45,27,78,0.06)] transition-all duration-500 hover:shadow-[0_16px_48px_rgba(45,27,78,0.12)] flex flex-col md:flex-row md:items-center md:justify-between gap-6"
            >
              <div>
                <p className="font-label text-[#c9a84c] uppercase tracking-[0.3em] text-xs font-bold mb-3">
                  New Arrivals
                </p>
                <h3 className="font-headline text-xl md:text-3xl text-[#1a1a2e] mb-2">
                  {promoCollection?.title ?? 'Discover More'}
                </h3>
                <p className="text-[#6b6580] max-w-md">
                  {promoCollection?.description ??
                    'Discover the latest baby essentials — safe, beautiful, and parent-approved.'}
                </p>
              </div>
              <span
                className="inline-block px-8 py-3 rounded-full font-bold tracking-widest text-[#1a1a2e] text-sm shrink-0"
                style={{
                  background: 'linear-gradient(135deg, #f8cc69 0%, #c9a84c 50%, #b8963a 100%)',
                }}
              >
                Shop Now
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Brand Storytelling ─────────────────────────────────────────── */}
      <BrandStorySection />

      {/* ── Trending Products ─────────────────────────────────────────────── */}
      <section className="bg-[#f5ede5] py-12 md:py-20 -mx-0 px-4 md:px-6 mb-12 md:mb-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-headline text-2xl md:text-4xl text-[#1a1a2e] mb-4">
              Bestsellers Parents Love
            </h2>
            <p className="text-[#6b6580] text-lg">
              Top-rated baby essentials flying off the shelves
            </p>
          </div>

          {products.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
              {products.map((product, i) => (
                <ProductCard key={product.id} product={product} priority={i < 4} />
              ))}
            </div>
          ) : (
            <div className="rounded-[1.5rem] bg-white py-16 text-center shadow-[0_4px_24px_rgba(45,27,78,0.06)]">
              <p className="text-[#6b6580]">
                We&apos;re curating the best baby essentials for you. Check back soon!
              </p>
            </div>
          )}

          <div className="text-center mt-10">
            <Link
              href="/collections/all"
              className="inline-flex items-center gap-2 font-body font-bold text-[#c9a84c] hover:text-[#b8963a] transition-colors"
            >
              View All Baby Essentials
              <span className="material-symbols-outlined text-lg" aria-hidden="true">
                arrow_forward
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Trust Section ─────────────────────────────────────────────────── */}
      <section className="px-4 md:px-6 mb-12 md:mb-20">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-headline text-2xl md:text-3xl text-[#1a1a2e] text-center mb-8 md:mb-12">
            Why Parents Choose StarBuyBaby
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {TRUST_ITEMS.map((item) => (
              <div
                key={item.title}
                className="text-center group bg-white rounded-[1.5rem] p-5 md:p-8 shadow-[0_4px_24px_rgba(45,27,78,0.06)] hover:shadow-[0_16px_48px_rgba(45,27,78,0.12)] transition-all duration-500"
              >
                <div className="w-14 h-14 bg-[#f5ede5] rounded-2xl flex items-center justify-center mb-5 mx-auto group-hover:bg-[#f8cc69]/20 transition-colors duration-500">
                  <span
                    className="material-symbols-outlined text-[#c9a84c] text-2xl"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                    aria-hidden="true"
                  >
                    {item.icon}
                  </span>
                </div>
                <h3 className="font-body font-bold text-sm mb-2 text-[#1a1a2e]">{item.title}</h3>
                <p className="text-[#6b6580] text-sm leading-relaxed">{item.description}</p>
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
