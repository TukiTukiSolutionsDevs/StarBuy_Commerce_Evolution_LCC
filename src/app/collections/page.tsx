import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { getCollections } from '@/lib/shopify';
import { Container } from '@/components/ui/Container';

export const metadata: Metadata = {
  title: 'Collections — StarBuyBaby',
  description: 'Browse all curated collections at StarBuyBaby.',
};

export default async function CollectionsPage() {
  let collections: Awaited<ReturnType<typeof getCollections>> = [];

  try {
    collections = await getCollections(24);
  } catch {
    // graceful fallback
  }

  return (
    <Container as="main" className="py-12 bg-[#faf9f6]">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-6">
        <ol className="flex items-center gap-2 text-sm text-[#5d605c]">
          <li>
            <Link href="/" className="hover:text-[#795a00] transition-colors">
              Home
            </Link>
          </li>
          <li aria-hidden="true">
            <span className="material-symbols-outlined text-sm text-[#b1b2af]">chevron_right</span>
          </li>
          <li className="text-[#303330] font-medium">Collections</li>
        </ol>
      </nav>

      <h1 className="font-headline text-4xl md:text-5xl text-[#303330] mb-2">All Collections</h1>
      <p className="text-[#5d605c] leading-relaxed">Browse our curated product categories</p>

      {collections.length === 0 ? (
        <div className="mt-12 rounded-2xl bg-[#f4f4f0] py-16 text-center">
          <span
            className="material-symbols-outlined text-5xl text-[#b1b2af] mb-4 block"
            aria-hidden="true"
          >
            category
          </span>
          <p className="text-[#5d605c]">No collections available yet.</p>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {collections.map((collection) => (
            <Link
              key={collection.id}
              href={`/collections/${collection.handle}`}
              className="group relative overflow-hidden rounded-2xl bg-[#f4f4f0] shadow-[0_8px_32px_rgba(0,0,0,0.04)] hover:shadow-[0_16px_48px_rgba(0,0,0,0.08)] transition-all duration-500"
            >
              <div className="aspect-[4/3] relative">
                {collection.image ? (
                  <Image
                    src={collection.image.url}
                    alt={collection.image.altText ?? collection.title}
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-[#f4f4f0]">
                    <span
                      className="material-symbols-outlined text-6xl text-[#b1b2af]"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                      aria-hidden="true"
                    >
                      category
                    </span>
                  </div>
                )}
                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#303330]/60 via-[#303330]/10 to-transparent" />
              </div>

              <div className="absolute bottom-0 left-0 right-0 p-5">
                <h2 className="font-headline text-lg font-bold text-white">{collection.title}</h2>
                {collection.description && (
                  <p className="mt-1 text-xs text-white/70 line-clamp-2">
                    {collection.description}
                  </p>
                )}
                <span className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-[#f8cc69] group-hover:gap-2 transition-all">
                  Shop now
                  <span className="material-symbols-outlined text-xs" aria-hidden="true">
                    arrow_forward
                  </span>
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </Container>
  );
}
