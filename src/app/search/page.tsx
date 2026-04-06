import type { Metadata } from 'next';
import Link from 'next/link';
import { predictiveSearch, getProducts } from '@/lib/shopify';
import { Container } from '@/components/ui/Container';
import { ProductCard } from '@/components/ui/ProductCard';
import { SearchForm } from '@/components/search/SearchForm';
import type { ShopifyProductCard } from '@/lib/shopify/types';

type SearchPageProps = {
  searchParams: Promise<{ q?: string }>;
};

export async function generateMetadata({ searchParams }: SearchPageProps): Promise<Metadata> {
  const { q } = await searchParams;
  return {
    title: q ? `Search: "${q}" — Starbuy` : 'Search Results — Starbuy',
    description: q
      ? `Search results for "${q}" at Starbuy. Find trending products at unbeatable prices.`
      : 'Search for products at Starbuy.',
    robots: { index: false, follow: true },
  };
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q = '' } = await searchParams;

  let products: ShopifyProductCard[] = [];
  let suggestions: string[] = [];
  let hasError = false;

  if (q.trim()) {
    try {
      // Try predictive search first
      const results = await predictiveSearch(q);
      products = results.products.map((p) => ({
        id: p.id,
        title: p.title,
        handle: p.handle,
        availableForSale: p.availableForSale,
        priceRange: p.priceRange,
        compareAtPriceRange: { minVariantPrice: { amount: '0', currencyCode: 'USD' } },
        featuredImage: p.featuredImage,
        tags: [],
        vendor: '',
        variants: { edges: [] },
      }));
      suggestions = results.queries?.map((s) => s.text) ?? [];
    } catch {
      // Fallback: search products by title
      try {
        const fallback = await getProducts({ query: q, first: 12 });
        products = fallback;
      } catch {
        hasError = true;
      }
    }
  }

  return (
    <Container as="main" className="py-8 sm:py-12">
      {/* Breadcrumbs */}
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
          <li className="text-[#1B2A5E] font-medium">Search</li>
        </ol>
      </nav>

      {/* Search form */}
      <div className="mb-8 max-w-xl">
        <h1 className="text-4xl font-extrabold text-[#1B2A5E] font-[var(--font-heading)] mb-4">
          Search Products
        </h1>
        <SearchForm initialQuery={q} />
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          <span className="text-sm text-[var(--color-text-secondary)]">Related searches:</span>
          {suggestions.map((s) => (
            <Link
              key={s}
              href={`/search?q=${encodeURIComponent(s)}`}
              className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-[var(--color-text-primary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors"
            >
              {s}
            </Link>
          ))}
        </div>
      )}

      {/* Results */}
      {q.trim() && (
        <>
          <div className="mb-6 flex items-center justify-between">
            <p className="text-sm text-slate-500">
              {hasError ? (
                'An error occurred during search.'
              ) : products.length > 0 ? (
                <>
                  <span className="font-semibold text-[#1B2A5E]">{products.length}</span>
                  {` result${products.length === 1 ? '' : 's'} for `}
                  <span className="font-semibold text-[#1B2A5E]">&quot;{q}&quot;</span>
                </>
              ) : (
                `No results found for "${q}"`
              )}
            </p>
          </div>

          {products.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : !hasError ? (
            <div className="rounded-2xl border border-dashed border-gray-300 py-16 text-center">
              <span
                className="material-symbols-outlined text-6xl text-gray-300 mb-4 block"
                aria-hidden="true"
              >
                search_off
              </span>
              <h2 className="text-lg font-bold text-[#1B2A5E] font-[var(--font-heading)] mb-2">
                No products found
              </h2>
              <p className="text-slate-500 text-sm mb-6">
                Try a different search term or browse our collections.
              </p>
              <Link
                href="/collections"
                className="inline-flex items-center gap-2 rounded-lg bg-[#1B2A5E] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#2a3f7e] transition-colors"
              >
                <span className="material-symbols-outlined text-base" aria-hidden="true">
                  grid_view
                </span>
                Browse Collections
              </Link>
            </div>
          ) : (
            /* hasError — show error state */
            <div className="rounded-2xl border border-dashed border-red-200 py-16 text-center bg-red-50/50">
              <span
                className="material-symbols-outlined text-6xl text-red-300 mb-4 block"
                aria-hidden="true"
              >
                error_outline
              </span>
              <h2 className="text-lg font-bold text-red-700 font-[var(--font-heading)] mb-2">
                Search unavailable
              </h2>
              <p className="text-slate-500 text-sm">
                We couldn&apos;t complete your search. Please try again later.
              </p>
            </div>
          )}
        </>
      )}

      {/* Empty state when no query */}
      {!q.trim() && (
        <div className="mt-12 flex flex-col items-center gap-4 py-16 text-center">
          <span className="material-symbols-outlined text-7xl text-gray-200" aria-hidden="true">
            manage_search
          </span>
          <p className="text-slate-500 font-medium">Start typing to search products</p>
          <p className="text-sm text-slate-400">Search by product name, type, or keyword</p>
        </div>
      )}
    </Container>
  );
}
