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
        <ol className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
          <li>
            <Link href="/" className="hover:text-[var(--color-primary)] transition-colors">
              Home
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-[var(--color-text-primary)] font-medium">Search</li>
        </ol>
      </nav>

      {/* Search form */}
      <div className="mb-8 max-w-xl">
        <h1 className="font-heading text-3xl font-bold text-[var(--color-text-primary)] mb-4">
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
            <p className="text-sm text-[var(--color-text-secondary)]">
              {hasError
                ? 'An error occurred during search.'
                : products.length > 0
                ? `${products.length} result${products.length === 1 ? '' : 's'} for "${q}"`
                : `No results found for "${q}"`}
            </p>
          </div>

          {products.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : !hasError ? (
            <div className="rounded-[var(--radius-lg)] border border-dashed border-gray-300 py-16 text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-300 mb-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <h2 className="font-heading text-lg font-semibold text-[var(--color-text-primary)] mb-2">
                No products found
              </h2>
              <p className="text-[var(--color-text-secondary)] text-sm mb-6">
                Try adjusting your search or browse our collections.
              </p>
              <Link
                href="/collections"
                className="inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[var(--color-primary-light)] transition-colors"
              >
                Browse Collections
              </Link>
            </div>
          ) : null}
        </>
      )}

      {/* Empty state when no query */}
      {!q.trim() && (
        <div className="mt-8 text-center text-[var(--color-text-secondary)]">
          <p>Enter a search term above to find products.</p>
        </div>
      )}
    </Container>
  );
}
