import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { getCollections } from '@/lib/shopify';
import { Container } from '@/components/ui/Container';

export const metadata: Metadata = {
  title: 'Baby Collections — StarBuyBaby',
  description:
    'Browse all curated baby collections at StarBuyBaby. From nursery essentials to feeding gear — safe, beautiful, and parent-approved.',
};

export default async function CollectionsPage() {
  let collections: Awaited<ReturnType<typeof getCollections>> = [];

  try {
    collections = await getCollections(24);
  } catch {
    // graceful fallback
  }

  return (
    <main className="bg-[#faf9f6]">
      {/* ── Hero Banner ────────────────────────────────────────────────── */}
      <section className="relative bg-gradient-to-r from-[#1a1a2e] to-[#16213e] py-16 md:py-20 px-6 overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#f8cc69]/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-0 left-1/4 w-48 h-48 bg-[#0060ad]/8 blur-[100px] rounded-full" />

        <Container>
          <nav aria-label="Breadcrumb" className="mb-6">
            <ol className="flex items-center gap-2 text-sm text-white/50">
              <li>
                <Link href="/" className="hover:text-[#f8cc69] transition-colors">
                  Home
                </Link>
              </li>
              <li aria-hidden="true">
                <span className="material-symbols-outlined text-sm">chevron_right</span>
              </li>
              <li className="text-[#f8cc69] font-medium">Collections</li>
            </ol>
          </nav>

          <h1 className="font-headline text-3xl md:text-5xl text-white mb-3">Baby Collections</h1>
          <p className="font-body text-white/70 max-w-lg text-lg leading-relaxed">
            Everything your little star needs — organized by category so you can find the perfect
            essentials quickly and easily.
          </p>
        </Container>
      </section>

      {/* ── Collections Grid ───────────────────────────────────────────── */}
      <Container className="py-12">
        {collections.length === 0 ? (
          <div className="rounded-2xl bg-[#ffffff] py-20 text-center shadow-[0_4px_32px_rgba(48,51,48,0.04)]">
            <span
              className="material-symbols-outlined text-6xl text-[#b1b2af] mb-4 block"
              style={{ fontVariationSettings: "'FILL' 1" }}
              aria-hidden="true"
            >
              child_care
            </span>
            <h2 className="font-headline text-2xl text-[#303330] mb-2">Collections Coming Soon</h2>
            <p className="text-[#5d605c] max-w-md mx-auto mb-6">
              We&apos;re curating the best baby essentials into beautiful collections. Check back
              soon or browse all products.
            </p>
            <Link
              href="/collections/all"
              className="inline-flex items-center gap-2 px-8 py-3 rounded-xl font-bold tracking-widest text-[#1a1a2e] text-sm"
              style={{
                background: 'linear-gradient(135deg, #f8cc69 0%, #daa520 50%, #f8cc69 100%)',
              }}
            >
              Browse All Products
              <span className="material-symbols-outlined text-lg" aria-hidden="true">
                arrow_forward
              </span>
            </Link>
          </div>
        ) : (
          <>
            <p className="font-label text-xs uppercase tracking-widest text-[#5d605c] mb-8">
              {collections.length} {collections.length === 1 ? 'collection' : 'collections'}
            </p>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {collections.map((collection) => (
                <Link
                  key={collection.id}
                  href={`/collections/${collection.handle}`}
                  className="group relative overflow-hidden rounded-2xl bg-[#ffffff] shadow-[0_4px_32px_rgba(48,51,48,0.04)] hover:shadow-[0_16px_48px_rgba(48,51,48,0.08)] hover:-translate-y-1 transition-all duration-500"
                >
                  <div className="aspect-[4/3] relative overflow-hidden">
                    {collection.image ? (
                      <Image
                        src={collection.image.url}
                        alt={collection.image.altText ?? collection.title}
                        fill
                        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-gradient-to-br from-[#f4f4f0] to-[#eeeeea]">
                        <span
                          className="material-symbols-outlined text-6xl text-[#b1b2af]"
                          style={{ fontVariationSettings: "'FILL' 1" }}
                          aria-hidden="true"
                        >
                          child_care
                        </span>
                      </div>
                    )}
                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#303330]/70 via-[#303330]/20 to-transparent" />
                  </div>

                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <h2 className="font-headline text-xl font-bold text-white mb-1">
                      {collection.title}
                    </h2>
                    {collection.description && (
                      <p className="text-sm text-white/70 line-clamp-2 mb-3">
                        {collection.description}
                      </p>
                    )}
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-[#f8cc69] group-hover:gap-2 transition-all duration-300">
                      Shop Collection
                      <span className="material-symbols-outlined text-sm" aria-hidden="true">
                        arrow_forward
                      </span>
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </Container>
    </main>
  );
}
