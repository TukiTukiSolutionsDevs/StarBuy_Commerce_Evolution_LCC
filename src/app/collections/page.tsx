import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { getCollections } from '@/lib/shopify';
import { Container } from '@/components/ui/Container';

export const metadata: Metadata = {
  title: 'Collections',
  description: 'Browse all product collections at Starbuy.',
};

export default async function CollectionsPage() {
  let collections: Awaited<ReturnType<typeof getCollections>> = [];

  try {
    collections = await getCollections(24);
  } catch {
    // graceful fallback
  }

  return (
    <Container as="main" className="py-12">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-6">
        <ol className="flex items-center gap-2 text-sm text-slate-500">
          <li>
            <Link href="/" className="hover:text-[#1B2A5E] transition-colors">
              Home
            </Link>
          </li>
          <li aria-hidden="true">
            <span className="material-symbols-outlined text-sm text-slate-300">chevron_right</span>
          </li>
          <li className="text-[#1B2A5E] font-medium">Collections</li>
        </ol>
      </nav>

      <h1 className="text-4xl font-extrabold text-[#1B2A5E] font-[var(--font-heading)] mb-2">
        All Collections
      </h1>
      <p className="text-slate-500">Browse our curated product categories</p>

      {collections.length === 0 ? (
        <div className="mt-12 rounded-2xl border border-dashed border-gray-300 py-16 text-center">
          <span
            className="material-symbols-outlined text-5xl text-gray-300 mb-4 block"
            aria-hidden="true"
          >
            category
          </span>
          <p className="text-slate-500">No collections available yet.</p>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {collections.map((collection) => (
            <Link
              key={collection.id}
              href={`/collections/${collection.handle}`}
              className="group relative overflow-hidden rounded-2xl bg-gray-100 shadow-sm hover:shadow-md transition-all duration-300"
            >
              <div className="aspect-[4/3] relative">
                {collection.image ? (
                  <Image
                    src={collection.image.url}
                    alt={collection.image.altText ?? collection.title}
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-light)]">
                    <svg
                      className="h-16 w-16 text-white/30"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
                      />
                    </svg>
                  </div>
                )}
                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
              </div>

              <div className="absolute bottom-0 left-0 right-0 p-4">
                <h2 className="font-heading text-lg font-bold text-white">{collection.title}</h2>
                {collection.description && (
                  <p className="mt-1 text-xs text-white/70 line-clamp-2">
                    {collection.description}
                  </p>
                )}
                <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[var(--color-secondary)]">
                  Shop now
                  <svg
                    className="h-3 w-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                    />
                  </svg>
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </Container>
  );
}
