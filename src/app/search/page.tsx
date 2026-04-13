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
    title: q ? `Search: "${q}" — StarBuyBaby` : 'Search — StarBuyBaby',
    description: q
      ? `Search results for "${q}" at StarBuyBaby.`
      : 'Search for products at StarBuyBaby.',
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
      try {
        const fallback = await getProducts({ query: q, first: 12 });
        products = fallback;
      } catch {
        hasError = true;
      }
    }
  }

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
          <li className="text-[#303330] font-medium">Search</li>
        </ol>
      </nav>

      {/* Search form */}
      <div className="mb-8 max-w-xl">
        <h1 className="font-headline text-4xl text-[#303330] mb-4">Search Products</h1>
        <SearchForm initialQuery={q} />
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          <span className="text-sm text-[#5d605c]">Related searches:</span>
          {suggestions.map((s) => (
            <Link
              key={s}
              href={`/search?q=${encodeURIComponent(s)}`}
              className="rounded-full bg-[#f4f4f0] px-3 py-1 text-xs font-medium text-[#303330] hover:bg-[#f8cc69]/20 hover:text-[#795a00] transition-colors"
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
            <p className="text-sm text-[#5d605c]">
              {hasError ? (
                'An error occurred during search.'
              ) : products.length > 0 ? (
                <>
                  <span className="font-label text-xs uppercase tracking-widest text-[#5d605c]">
                    {products.length} result{products.length === 1 ? '' : 's'} for
                  </span>{' '}
                  <span className="font-semibold text-[#303330]">&quot;{q}&quot;</span>
                </>
              ) : (
                `No results found for "${q}"`
              )}
            </p>
          </div>

          {products.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 md:gap-6">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : !hasError ? (
            <div className="rounded-2xl bg-[#f4f4f0] py-16 text-center">
              <span
                className="material-symbols-outlined text-6xl text-[#b1b2af] mb-4 block"
                aria-hidden="true"
              >
                search_off
              </span>
              <h2 className="font-headline text-2xl text-[#303330] mb-2">No products found</h2>
              <p className="text-[#5d605c] text-sm mb-6">
                Try a different search term or browse our collections.
              </p>
              <Link
                href="/collections"
                className="inline-flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-bold tracking-widest text-[#fff8f0] transition-all duration-500 hover:shadow-[0_0_20px_rgba(121,90,0,0.3)]"
                style={{
                  background: 'radial-gradient(circle at center, #f8cc69 0%, #795a00 100%)',
                }}
              >
                <span className="material-symbols-outlined text-base" aria-hidden="true">
                  grid_view
                </span>
                Browse Collections
              </Link>
            </div>
          ) : (
            <div className="rounded-2xl bg-[#f4f4f0] py-16 text-center">
              <span
                className="material-symbols-outlined text-6xl text-[#b1b2af] mb-4 block"
                aria-hidden="true"
              >
                error_outline
              </span>
              <h2 className="font-headline text-2xl text-[#303330] mb-2">Search unavailable</h2>
              <p className="text-[#5d605c] text-sm">
                We couldn&apos;t complete your search. Please try again later.
              </p>
            </div>
          )}
        </>
      )}

      {/* Empty state when no query */}
      {!q.trim() && (
        <div className="mt-12 flex flex-col items-center gap-4 py-16 text-center">
          <span className="material-symbols-outlined text-7xl text-[#e1e3df]" aria-hidden="true">
            manage_search
          </span>
          <p className="text-[#5d605c] font-medium">Start typing to search products</p>
          <p className="text-sm text-[#b1b2af]">Search by product name, type, or keyword</p>
        </div>
      )}
    </Container>
  );
}
