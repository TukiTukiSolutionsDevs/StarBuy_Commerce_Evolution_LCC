import type { Metadata } from 'next';
import Link from 'next/link';
import { getProducts } from '@/lib/shopify';
import { ProductCard } from '@/components/ui/ProductCard';
import { NewsletterSection } from '@/components/home/NewsletterSection';
import { OrganizationJsonLd, WebSiteJsonLd } from '@/components/seo/JsonLd';

export const metadata: Metadata = {
  title: "Starbuy — Discover What's Trending",
  description:
    'Shop trending products, electronics, fashion, and more at Starbuy. Fast shipping, 30-day returns, and unbeatable prices.',
  openGraph: {
    title: "Starbuy — Discover What's Trending",
    description:
      'Curated trending products at unbeatable prices. Shop electronics, fashion, home and more.',
    url: '/',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "Starbuy — Discover What's Trending",
    description: 'Curated trending products at unbeatable prices.',
  },
};

// ─── Static category data ─────────────────────────────────────────────────────
const CATEGORIES = [
  { icon: 'devices', name: 'Electronics', handle: 'electronics' },
  { icon: 'apparel', name: 'Fashion', handle: 'fashion' },
  { icon: 'home', name: 'Home & Garden', handle: 'home-garden' },
  { icon: 'face_3', name: 'Beauty', handle: 'beauty' },
  { icon: 'fitness_center', name: 'Sports', handle: 'sports' },
  { icon: 'smart_toy', name: 'Toys & Games', handle: 'toys' },
];

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
  // Fetch products — graceful fallback if API fails
  let products: Awaited<ReturnType<typeof getProducts>> = [];
  try {
    products = await getProducts({ first: 8, sortKey: 'BEST_SELLING' });
  } catch {
    // Show placeholder if Shopify is unreachable
  }

  return (
    <>
      {/* JSON-LD */}
      <OrganizationJsonLd />
      <WebSiteJsonLd />

      {/* ── Hero Section ──────────────────────────────────────────────────────── */}
      <section className="relative min-h-[500px] md:min-h-[600px] flex items-center overflow-hidden">
        {/* Dark navy gradient background with mesh pattern */}
        <div className="absolute inset-0 bg-[#1B2A5E]" />
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `radial-gradient(circle at 20% 50%, #D4A843 0%, transparent 50%),
                              radial-gradient(circle at 80% 20%, #2a3f7e 0%, transparent 40%),
                              radial-gradient(circle at 60% 80%, #111d42 0%, transparent 50%)`,
          }}
        />

        <div className="container mx-auto px-6 relative z-10 text-white">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            {/* Left: Text content */}
            <div>
              <span className="inline-block bg-white/10 backdrop-blur-sm text-amber-400 px-4 py-1.5 rounded-full text-sm font-semibold mb-6 border border-white/10">
                ✦ Trending Collection 2026
              </span>
              <h1 className="text-5xl md:text-7xl font-extrabold mb-6 leading-tight font-[var(--font-heading)]">
                Discover What&apos;s{' '}
                <span className="text-amber-400">Trending</span>
              </h1>
              <p className="text-xl md:text-2xl mb-10 text-white/80 leading-relaxed">
                Curated products at unbeatable prices — delivered to your door.
              </p>
              <div className="flex flex-wrap gap-4 items-center">
                <Link
                  href="/collections/all"
                  className="inline-block bg-[#D4A843] hover:bg-[#C1973A] text-[#1B2A5E] px-10 py-4 rounded-lg font-bold text-lg transition-transform active:scale-95 shadow-xl"
                >
                  Shop Now
                </Link>
                <Link
                  href="/collections"
                  className="inline-block text-white/90 hover:text-white px-6 py-4 font-semibold transition-colors"
                >
                  Browse Categories →
                </Link>
              </div>
            </div>

            {/* Right: Product showcase grid */}
            <div className="hidden md:grid grid-cols-2 gap-4" aria-hidden="true">
              <div className="space-y-4">
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 flex items-center justify-center aspect-square border border-white/5">
                  <span className="material-symbols-outlined text-7xl text-white/40">headphones</span>
                </div>
                <div className="bg-[#D4A843]/20 backdrop-blur-sm rounded-2xl p-6 flex items-center justify-center aspect-[4/3] border border-[#D4A843]/20">
                  <span className="material-symbols-outlined text-6xl text-[#D4A843]/60">watch</span>
                </div>
              </div>
              <div className="space-y-4 pt-8">
                <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 flex items-center justify-center aspect-[4/3] border border-white/5">
                  <span className="material-symbols-outlined text-6xl text-white/30">photo_camera</span>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 flex items-center justify-center aspect-square border border-white/5">
                  <span className="material-symbols-outlined text-7xl text-white/40">styler</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Categories ────────────────────────────────────────────────────────── */}
      <section className="py-20 bg-[#F8F9FC]">
        <div className="container mx-auto px-6">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h2 className="text-3xl font-extrabold text-[#1A1A2E] mb-2 font-[var(--font-heading)]">
                Shop by Category
              </h2>
              <div className="h-1 w-20 bg-[#D4A843] rounded-full" />
            </div>
            <Link
              href="/collections"
              className="text-sm font-medium text-[#1B2A5E] hover:text-[#D4A843] transition-colors"
            >
              All Categories →
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-5">
            {CATEGORIES.map((cat) => (
              <Link
                key={cat.handle}
                href={`/collections/${cat.handle}`}
                className="group relative bg-white rounded-2xl shadow-sm overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
              >
                <div className="aspect-square bg-gradient-to-br from-[#1B2A5E]/5 to-[#1B2A5E]/10 flex items-center justify-center group-hover:from-[#1B2A5E] group-hover:to-[#2a3f7e] transition-all duration-300">
                  <span
                    className="material-symbols-outlined text-[#1B2A5E] text-5xl group-hover:text-white group-hover:scale-110 transition-all duration-300"
                    aria-hidden="true"
                  >
                    {cat.icon}
                  </span>
                </div>
                <div className="p-4 text-center">
                  <span className="font-bold text-[#1A1A2E] text-sm group-hover:text-[#1B2A5E] transition-colors">
                    {cat.name}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Trending Products ─────────────────────────────────────────────────── */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <div className="flex justify-between items-center mb-12">
            <h2 className="text-3xl font-extrabold text-[#1A1A2E] font-[var(--font-heading)]">
              Trending Now
            </h2>
            <Link
              href="/collections/all"
              className="text-[#1B2A5E] font-bold hover:text-[#D4A843] transition-colors flex items-center gap-1"
            >
              View All
              <span className="material-symbols-outlined text-lg" aria-hidden="true">
                chevron_right
              </span>
            </Link>
          </div>

          {products.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {products.map((product, i) => (
                <ProductCard key={product.id} product={product} priority={i < 4} />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-gray-300 py-16 text-center">
              <p className="text-[var(--color-text-secondary)]">
                Products are being curated. Check back soon!
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ── Promo Banner ──────────────────────────────────────────────────────── */}
      <section className="py-12">
        <div className="container mx-auto px-6">
          <div className="relative rounded-2xl overflow-hidden bg-[#1B2A5E] p-12 md:p-20 text-center flex flex-col items-center">
            {/* Subtle background pattern */}
            <div
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage: `radial-gradient(circle at 30% 50%, #D4A843 0%, transparent 60%),
                                  radial-gradient(circle at 70% 50%, #2a3f7e 0%, transparent 60%)`,
              }}
            />
            <div className="relative z-10">
              <span className="bg-[#D4A843] text-[#1B2A5E] px-4 py-1 rounded-full font-bold text-sm mb-6 inline-block uppercase tracking-widest">
                Limited Time
              </span>
              <h2 className="text-4xl md:text-6xl font-extrabold text-white mb-6 font-[var(--font-heading)]">
                Up to 50% Off — Limited Time Deals
              </h2>
              <p className="text-white/80 text-lg md:text-xl mb-10 max-w-2xl mx-auto">
                Save big on your favorite electronics, apparel, and home essentials. While
                supplies last.
              </p>
              <Link
                href="/collections/deals"
                className="inline-block bg-[#D4A843] hover:bg-[#C1973A] text-[#1B2A5E] px-10 py-4 rounded-lg font-bold text-lg transition-transform active:scale-95 shadow-xl"
              >
                Shop Deals
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Trust Section ─────────────────────────────────────────────────────── */}
      <section className="py-20 border-b border-slate-100">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-extrabold text-[#1A1A2E] text-center mb-16 font-[var(--font-heading)]">
            Why Shop With Starbuy?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
            {TRUST_ITEMS.map((item) => (
              <div key={item.title} className="text-center">
                <div className="w-16 h-16 bg-[#F8F9FC] rounded-2xl flex items-center justify-center mb-6 mx-auto">
                  <span
                    className="material-symbols-outlined text-[#1B2A5E] text-3xl"
                    aria-hidden="true"
                  >
                    {item.icon}
                  </span>
                </div>
                <h3 className="font-bold text-lg mb-2 text-[#1A1A2E]">{item.title}</h3>
                <p className="text-slate-500 text-sm">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Newsletter ────────────────────────────────────────────────────────── */}
      <NewsletterSection />
    </>
  );
}
