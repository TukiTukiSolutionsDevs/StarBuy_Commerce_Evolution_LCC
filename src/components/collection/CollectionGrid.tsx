'use client';

import { useState, useTransition } from 'react';
import { useSearchParams } from 'next/navigation';
import { ProductCard } from '@/components/ui/ProductCard';
import { loadMoreCollectionProducts } from '@/app/collections/[handle]/actions';
import type { ShopifyProductCard } from '@/lib/shopify/types';

type CollectionGridProps = {
  initialProducts: ShopifyProductCard[];
  initialPageInfo?: {
    hasNextPage: boolean;
    endCursor?: string | null;
  };
  collectionHandle: string;
  sortKey?: string;
  reverse?: boolean;
};

/** Build Shopify filters from current URL search params (mirrors page.tsx logic) */
function buildFiltersFromParams(sp: URLSearchParams): Record<string, unknown>[] | undefined {
  const filters: Record<string, unknown>[] = [];

  const minPrice = sp.get('minPrice');
  const maxPrice = sp.get('maxPrice');
  if (minPrice || maxPrice) {
    const price: Record<string, number> = {};
    if (minPrice) {
      const n = parseFloat(minPrice);
      if (!isNaN(n)) price.min = n;
    }
    if (maxPrice) {
      const n = parseFloat(maxPrice);
      if (!isNaN(n)) price.max = n;
    }
    if (Object.keys(price).length > 0) filters.push({ price });
  }

  if (sp.get('availability') === 'in-stock') {
    filters.push({ available: true });
  }

  for (const v of sp.getAll('vendor')) {
    filters.push({ productVendor: v });
  }

  for (const t of sp.getAll('productType')) {
    filters.push({ productType: t });
  }

  for (const tg of sp.getAll('tag')) {
    filters.push({ tag: tg });
  }

  return filters.length > 0 ? filters : undefined;
}

export function CollectionGrid({
  initialProducts,
  initialPageInfo,
  collectionHandle,
  sortKey = 'BEST_SELLING',
  reverse = false,
}: CollectionGridProps) {
  const [products, setProducts] = useState(initialProducts);
  const [pageInfo, setPageInfo] = useState(initialPageInfo);
  const [isPending, startTransition] = useTransition();
  const searchParams = useSearchParams();

  function handleLoadMore() {
    if (!pageInfo?.endCursor) return;
    const cursor = pageInfo.endCursor;
    const filters = buildFiltersFromParams(searchParams);

    startTransition(async () => {
      const result = await loadMoreCollectionProducts(
        collectionHandle,
        cursor,
        sortKey,
        reverse,
        filters,
      );
      setProducts((prev) => [...prev, ...result.products]);
      setPageInfo(result.pageInfo);
    });
  }

  if (products.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[#b1b2af] py-16 text-center">
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

  return (
    <>
      <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:gap-8 xl:grid-cols-3">
        {products.map((product, i) => (
          <ProductCard key={product.id} product={product} priority={i < 3} />
        ))}
      </div>

      {pageInfo?.hasNextPage && pageInfo.endCursor && (
        <div className="mt-12 flex justify-center">
          <button
            onClick={handleLoadMore}
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-full border border-[#795a00] px-8 py-3 text-sm font-semibold text-[#795a00] hover:bg-[#795a00] hover:text-[#fff8f0] transition-colors disabled:opacity-60"
          >
            {isPending ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Loading...
              </>
            ) : (
              <>
                Load More Baby Essentials
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </>
            )}
          </button>
        </div>
      )}
    </>
  );
}
