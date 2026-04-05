import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { getCollectionByHandle, getProducts } from '@/lib/shopify';
import { Container } from '@/components/ui/Container';
import { ProductCard } from '@/components/ui/ProductCard';
import { SortSelect } from '@/components/collection/SortSelect';
import { FiltersPanel } from '@/components/collection/FiltersPanel';
import { LoadMoreButton } from '@/components/collection/LoadMoreButton';
import type { ShopifyProductCard } from '@/lib/shopify/types';

type CollectionPageProps = {
  params: Promise<{ handle: string }>;
  searchParams: Promise<{
    sort?: string;
    reverse?: string;
    after?: string;
    minPrice?: string;
    maxPrice?: string;
    inStock?: string;
  }>;
};

export async function generateMetadata({ params }: CollectionPageProps): Promise<Metadata> {
  const { handle } = await params;

  if (handle === 'all') {
    return {
      title: 'All Products — Starbuy',
      description:
        'Browse all products at Starbuy. Find the best electronics, fashion, home & garden, beauty, and more at unbeatable prices.',
    };
  }

  try {
    const collection = await getCollectionByHandle(handle, { first: 1 });
    if (!collection) return { title: 'Collection Not Found' };

    const ogImage = collection.image?.url;
    return {
      title: `${collection.title} — Starbuy`,
      description:
        collection.seo?.description ||
        collection.description ||
        `Shop ${collection.title} at Starbuy. Find the best products at unbeatable prices.`,
      openGraph: ogImage
        ? {
            images: [
              {
                url: ogImage,
                width: collection.image?.width ?? 800,
                height: collection.image?.height ?? 600,
                alt: collection.image?.altText ?? collection.title,
              },
            ],
          }
        : undefined,
    };
  } catch {
    return { title: 'Collection — Starbuy' };
  }
}

export default async function CollectionPage({ params, searchParams }: CollectionPageProps) {
  const { handle } = await params;
  const { sort = 'BEST_SELLING', reverse = 'false', after, inStock } = await searchParams;

  const isAll = handle === 'all';

  // ── All Products: fetch with getProducts() ─────────────────────────────────
  if (isAll) {
    let products: ShopifyProductCard[] = [];

    try {
      products = await getProducts({
        first: 24,
        sortKey: sort,
        reverse: reverse === 'true',
      });
    } catch {
      // Graceful error — shows empty state below
    }

    if (inStock === 'true') {
      products = products.filter((p) => p.availableForSale);
    }

    return (
      <Container as="main" className="py-8 sm:py-12">
        {/* Breadcrumbs */}
        <nav aria-label="Breadcrumb" className="mb-6">
          <ol className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
            <li>
              <Link href="/" className="hover:text-[var(--color-primary)] transition-colors">
                Home
              </Link>
            </li>
            <li aria-hidden="true">
              <span className="material-symbols-outlined text-sm text-slate-300">
                chevron_right
              </span>
            </li>
            <li className="text-[var(--color-text-primary)] font-semibold">All Products</li>
          </ol>
        </nav>

        {/* Collection Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
          <div>
            <h1 className="text-4xl font-extrabold text-[#1B2A5E] font-[var(--font-heading)]">
              All Products
            </h1>
            <p className="text-[var(--color-text-secondary)] mt-1">
              {products.length} {products.length === 1 ? 'product' : 'products'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-[#1A1A2E]">Sort by:</span>
            <Suspense fallback={null}>
              <SortSelect />
            </Suspense>
          </div>
        </div>

        {/* Layout: sidebar + grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[250px_1fr] gap-10">
          <Suspense fallback={null}>
            <FiltersPanel />
          </Suspense>

          <div>
            {products.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-300 py-16 text-center">
                <span
                  className="material-symbols-outlined text-6xl text-gray-300 mb-4 block"
                  aria-hidden="true"
                >
                  inventory_2
                </span>
                <p className="text-[var(--color-text-secondary)]">
                  No products found. Try adjusting your filters.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 xl:grid-cols-3">
                {products.map((product, i) => (
                  <ProductCard key={product.id} product={product} priority={i < 3} />
                ))}
              </div>
            )}
          </div>
        </div>
      </Container>
    );
  }

  // ── Regular Collection ─────────────────────────────────────────────────────
  let collection: Awaited<ReturnType<typeof getCollectionByHandle>> = null;

  try {
    collection = await getCollectionByHandle(handle, {
      first: 12,
      after,
      sortKey: sort,
      reverse: reverse === 'true',
    });
  } catch {
    // Graceful error — will show below
  }

  if (!collection) {
    notFound();
  }

  // Client-side filtering by availability
  let products = (collection.products?.edges ?? []).map((e) => e.node);
  if (inStock === 'true') {
    products = products.filter((p) => p.availableForSale);
  }

  const pageInfo = collection.products?.pageInfo;
  const productCount = products.length;

  return (
    <Container as="main" className="py-8 sm:py-12">
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="mb-6">
        <ol className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
          <li>
            <Link href="/" className="hover:text-[var(--color-primary)] transition-colors">
              Home
            </Link>
          </li>
          <li aria-hidden="true">
            <span className="material-symbols-outlined text-sm text-slate-300">
              chevron_right
            </span>
          </li>
          <li>
            <Link
              href="/collections"
              className="hover:text-[var(--color-primary)] transition-colors"
            >
              Collections
            </Link>
          </li>
          <li aria-hidden="true">
            <span className="material-symbols-outlined text-sm text-slate-300">
              chevron_right
            </span>
          </li>
          <li className="text-[var(--color-text-primary)] font-semibold capitalize">
            {collection.title}
          </li>
        </ol>
      </nav>

      {/* Collection Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
        <div>
          <h1 className="text-4xl font-extrabold text-[#1B2A5E] font-[var(--font-heading)]">
            {collection.title}
          </h1>
          {collection.description && (
            <p className="text-[var(--color-text-secondary)] mt-1 max-w-2xl">
              {collection.description}
            </p>
          )}
          <p className="text-[var(--color-text-secondary)] mt-1">
            {productCount} {productCount === 1 ? 'product' : 'products'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-[#1A1A2E]">Sort by:</span>
          <Suspense fallback={null}>
            <SortSelect />
          </Suspense>
        </div>
      </div>

      {/* Layout: sidebar + grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[250px_1fr] gap-10">
        {/* FiltersPanel */}
        <Suspense fallback={null}>
          <FiltersPanel />
        </Suspense>

        {/* Product grid */}
        <div className="flex-1 min-w-0">
          {products.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 py-16 text-center">
              <span
                className="material-symbols-outlined text-6xl text-gray-300 mb-4 block"
                aria-hidden="true"
              >
                inventory_2
              </span>
              <p className="text-[var(--color-text-secondary)]">
                No products found. Try adjusting your filters.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 xl:grid-cols-3">
                {products.map((product, i) => (
                  <ProductCard key={product.id} product={product} priority={i < 3} />
                ))}
              </div>

              {/* Load More */}
              {pageInfo?.hasNextPage && pageInfo.endCursor && (
                <div className="mt-12 flex justify-center">
                  <Suspense fallback={null}>
                    <LoadMoreButton endCursor={pageInfo.endCursor} />
                  </Suspense>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Container>
  );
}
