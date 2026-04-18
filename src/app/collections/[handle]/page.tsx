import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { getCollectionByHandle, getProducts } from '@/lib/shopify';
import { Container } from '@/components/ui/Container';
import { ProductCard } from '@/components/ui/ProductCard';
import { SortSelect } from '@/components/collection/SortSelect';
import { FiltersPanel } from '@/components/collection/FiltersPanel';
import { CollectionGrid } from '@/components/collection/CollectionGrid';
import type { ShopifyProductCard } from '@/lib/shopify/types';

// ─── Sort param → Shopify sortKey + reverse ──────────────────────────────────

const SORT_MAP: Record<string, { sortKey: string; reverse: boolean }> = {
  'best-selling': { sortKey: 'BEST_SELLING', reverse: false },
  newest: { sortKey: 'CREATED', reverse: true },
  'price-asc': { sortKey: 'PRICE', reverse: false },
  'price-desc': { sortKey: 'PRICE', reverse: true },
  'title-asc': { sortKey: 'TITLE', reverse: false },
  'title-desc': { sortKey: 'TITLE', reverse: true },
};

function parseSortParam(sort?: string): { sortKey: string; reverse: boolean } {
  if (sort && sort in SORT_MAP) return SORT_MAP[sort];
  return { sortKey: 'BEST_SELLING', reverse: false };
}

// ─── URL params → Shopify ProductFilter[] ────────────────────────────────────

function buildShopifyFilters(sp: {
  minPrice?: string;
  maxPrice?: string;
  availability?: string;
  vendor?: string | string[];
  productType?: string | string[];
  tag?: string | string[];
}): Record<string, unknown>[] {
  const filters: Record<string, unknown>[] = [];

  const min = sp.minPrice ? parseFloat(sp.minPrice) : undefined;
  const max = sp.maxPrice ? parseFloat(sp.maxPrice) : undefined;
  if ((min !== undefined && !isNaN(min)) || (max !== undefined && !isNaN(max))) {
    const price: Record<string, number> = {};
    if (min !== undefined && !isNaN(min)) price.min = min;
    if (max !== undefined && !isNaN(max)) price.max = max;
    filters.push({ price });
  }

  if (sp.availability === 'in-stock') {
    filters.push({ available: true });
  }

  const vendors = Array.isArray(sp.vendor) ? sp.vendor : sp.vendor ? [sp.vendor] : [];
  for (const v of vendors) {
    filters.push({ productVendor: v });
  }

  const types = Array.isArray(sp.productType)
    ? sp.productType
    : sp.productType
      ? [sp.productType]
      : [];
  for (const t of types) {
    filters.push({ productType: t });
  }

  const tags = Array.isArray(sp.tag) ? sp.tag : sp.tag ? [sp.tag] : [];
  for (const tg of tags) {
    filters.push({ tag: tg });
  }

  return filters;
}

// ─── Types ───────────────────────────────────────────────────────────────────

type CollectionPageProps = {
  params: Promise<{ handle: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

// ─── Metadata ────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: CollectionPageProps): Promise<Metadata> {
  const { handle } = await params;

  if (handle === 'all') {
    return {
      title: 'All Baby Essentials — StarBuyBaby',
      description:
        'Browse all baby essentials at StarBuyBaby. Safe, beautiful products curated by parents for little ones.',
    };
  }

  try {
    const collection = await getCollectionByHandle(handle, { first: 1 });
    if (!collection) return { title: 'Collection Not Found' };

    const ogImage = collection.image?.url;
    return {
      title: `${collection.title} — StarBuyBaby`,
      description:
        collection.seo?.description ||
        collection.description ||
        `Shop ${collection.title} at StarBuyBaby.`,
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
    return { title: 'Collection — StarBuyBaby' };
  }
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function CollectionPage({ params, searchParams }: CollectionPageProps) {
  const { handle } = await params;
  const sp = await searchParams;

  const sortParam = typeof sp.sort === 'string' ? sp.sort : undefined;
  const { sortKey, reverse } = parseSortParam(sortParam);

  const shopifyFilters = buildShopifyFilters({
    minPrice: typeof sp.minPrice === 'string' ? sp.minPrice : undefined,
    maxPrice: typeof sp.maxPrice === 'string' ? sp.maxPrice : undefined,
    availability: typeof sp.availability === 'string' ? sp.availability : undefined,
    vendor: sp.vendor,
    productType: sp.productType,
    tag: sp.tag,
  });

  const isAll = handle === 'all';

  // ── All Products ───────────────────────────────────────────────────────────
  if (isAll) {
    let products: ShopifyProductCard[] = [];

    try {
      products = await getProducts({ first: 24, sortKey, reverse });
    } catch {
      // Graceful error
    }

    products = applyClientFilters(products, sp);

    return (
      <Container as="main" className="py-8 sm:py-12 bg-[#faf9f6]">
        {/* Breadcrumbs */}
        <nav aria-label="Breadcrumb" className="mb-6">
          <ol className="flex items-center gap-2 text-sm text-[#5d605c]">
            <li>
              <Link href="/" className="hover:text-[#795a00] transition-colors">
                Home
              </Link>
            </li>
            <li aria-hidden="true">
              <span className="material-symbols-outlined text-sm text-[#b1b2af]">
                chevron_right
              </span>
            </li>
            <li className="text-[#303330] font-semibold">All Baby Essentials</li>
          </ol>
        </nav>

        {/* Collection Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
          <div>
            <h1 className="font-headline text-3xl md:text-5xl text-[#303330]">
              All Baby Essentials
            </h1>
            <p className="font-label text-xs uppercase tracking-widest text-[#5d605c] mt-2">
              {products.length} {products.length === 1 ? 'product' : 'products'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Suspense fallback={null}>
              <SortSelect />
            </Suspense>
          </div>
        </div>

        {/* Layout: sidebar + grid */}
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex items-center gap-3 lg:hidden">
            <Suspense fallback={null}>
              <FiltersPanel />
            </Suspense>
          </div>

          <div className="hidden lg:block">
            <Suspense fallback={null}>
              <FiltersPanel />
            </Suspense>
          </div>

          <div className="flex-1 min-w-0">
            {products.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:gap-8 xl:grid-cols-3">
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
      sortKey,
      reverse,
      filters: shopifyFilters.length > 0 ? shopifyFilters : undefined,
    });
  } catch {
    // Graceful error
  }

  if (!collection) {
    notFound();
  }

  const products = (collection.products?.edges ?? []).map((e) => e.node);
  const pageInfo = collection.products?.pageInfo;
  const collectionFilters = collection.products?.filters;
  const productCount = products.length;

  return (
    <Container as="main" className="py-8 sm:py-12 bg-[#faf9f6]">
      {/* Breadcrumbs */}
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
          <li>
            <Link href="/collections" className="hover:text-[#795a00] transition-colors">
              Collections
            </Link>
          </li>
          <li aria-hidden="true">
            <span className="material-symbols-outlined text-sm text-[#b1b2af]">chevron_right</span>
          </li>
          <li className="text-[#303330] font-semibold capitalize">{collection.title}</li>
        </ol>
      </nav>

      {/* Collection Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
        <div>
          <h1 className="font-headline text-3xl md:text-5xl text-[#303330]">{collection.title}</h1>
          {collection.description && (
            <p className="text-[#5d605c] leading-relaxed max-w-2xl mt-2">
              {collection.description}
            </p>
          )}
          <p className="font-label text-xs uppercase tracking-widest text-[#5d605c] mt-2">
            {productCount} {productCount === 1 ? 'product' : 'products'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Suspense fallback={null}>
            <SortSelect />
          </Suspense>
        </div>
      </div>

      {/* Layout: sidebar + grid */}
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="flex items-center gap-3 lg:hidden">
          <Suspense fallback={null}>
            <FiltersPanel filters={collectionFilters} />
          </Suspense>
        </div>

        <div className="hidden lg:block">
          <Suspense fallback={null}>
            <FiltersPanel filters={collectionFilters} />
          </Suspense>
        </div>

        <div className="flex-1 min-w-0">
          <CollectionGrid
            initialProducts={products}
            initialPageInfo={pageInfo}
            collectionHandle={handle}
            sortKey={sortKey}
            reverse={reverse}
          />
        </div>
      </div>
    </Container>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function applyClientFilters(
  items: ShopifyProductCard[],
  sp: Record<string, string | string[] | undefined>,
): ShopifyProductCard[] {
  let filtered = items;

  if (sp.availability === 'in-stock') {
    filtered = filtered.filter((p) => p.availableForSale);
  }

  const minPrice = typeof sp.minPrice === 'string' ? parseFloat(sp.minPrice) : NaN;
  if (!isNaN(minPrice)) {
    filtered = filtered.filter((p) => parseFloat(p.priceRange.minVariantPrice.amount) >= minPrice);
  }

  const maxPrice = typeof sp.maxPrice === 'string' ? parseFloat(sp.maxPrice) : NaN;
  if (!isNaN(maxPrice)) {
    filtered = filtered.filter((p) => parseFloat(p.priceRange.minVariantPrice.amount) <= maxPrice);
  }

  const vendors = Array.isArray(sp.vendor) ? sp.vendor : sp.vendor ? [sp.vendor] : [];
  if (vendors.length > 0) {
    filtered = filtered.filter((p) => vendors.includes(p.vendor));
  }

  const tags = Array.isArray(sp.tag) ? sp.tag : sp.tag ? [sp.tag] : [];
  if (tags.length > 0) {
    filtered = filtered.filter((p) => p.tags.some((t) => tags.includes(t)));
  }

  return filtered;
}

function EmptyState() {
  return (
    <div className="rounded-xl bg-[#f4f4f0] py-16 text-center">
      <span
        className="material-symbols-outlined text-6xl text-[#b1b2af] mb-4 block"
        aria-hidden="true"
      >
        inventory_2
      </span>
      <p className="text-[#5d605c]">
        No baby essentials match your filters yet. Try adjusting or browse all products.
      </p>
    </div>
  );
}
