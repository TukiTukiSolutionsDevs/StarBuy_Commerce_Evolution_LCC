'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import type { PredictiveSearchResult } from '@/lib/shopify/types';

type PredictiveSearchProps = {
  isOpen: boolean;
  onClose: () => void;
};

function formatPrice(amount: string, currencyCode: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
  }).format(parseFloat(amount));
}

export function PredictiveSearch({ isOpen, onClose }: PredictiveSearchProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PredictiveSearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      // Small delay to let the modal animate in
      const t = setTimeout(() => inputRef.current?.focus(), 100);
      document.body.style.overflow = 'hidden';
      return () => {
        clearTimeout(t);
        document.body.style.overflow = '';
      };
    }
    // Reset state when closed
    setQuery('');
    setResults(null);
    setIsLoading(false);
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Debounced search
  const fetchResults = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/search/predictive?q=${encodeURIComponent(q)}`);
      if (!res.ok) throw new Error('Search failed');
      const data = (await res.json()) as PredictiveSearchResult;
      setResults(data);
    } catch {
      setResults(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  function handleInputChange(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchResults(value.trim()), 300);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    router.push(`/search?q=${encodeURIComponent(q)}`);
    onClose();
  }

  function handleResultClick() {
    onClose();
  }

  if (!isOpen) return null;

  const hasResults =
    results &&
    (results.products.length > 0 || results.collections.length > 0 || results.queries.length > 0);

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[#303330]/30 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal content */}
      <div className="relative z-10 w-full max-w-2xl mx-4 mt-[10vh] md:mt-[15vh] bg-[#ffffff] rounded-2xl shadow-[0_32px_64px_rgba(0,0,0,0.08)] overflow-hidden max-h-[70vh] flex flex-col">
        {/* Search input */}
        <form onSubmit={handleSubmit} className="flex items-center px-4">
          <span
            className="material-symbols-outlined text-xl text-[#795a00] flex-shrink-0"
            aria-hidden="true"
          >
            search
          </span>
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder="Search products, collections..."
            className="flex-1 bg-transparent py-4 px-3 text-[#303330] placeholder-[#b1b2af] font-body text-base focus:outline-none"
            aria-label="Search products"
          />
          <div className="flex items-center gap-2 flex-shrink-0">
            {isLoading && (
              <div className="h-4 w-4 border-2 border-[#b1b2af] border-t-[#795a00] rounded-full animate-spin" />
            )}
            <kbd className="hidden md:inline-flex items-center px-2 py-0.5 text-xs text-[#b1b2af] bg-[#f4f4f0] rounded">
              ESC
            </kbd>
          </div>
        </form>

        {/* Divider — ghost border style */}
        <div className="h-px bg-[#b1b2af]/15" />

        {/* Results area */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {/* Empty state — before typing */}
          {!query && !results && (
            <div className="px-6 py-10 text-center text-[#5d605c] text-sm">
              <p className="font-body">Start typing to search...</p>
              <p className="mt-2 text-xs text-[#b1b2af]">
                Press <kbd className="px-1.5 py-0.5 bg-[#f4f4f0] rounded text-[#5d605c]">Enter</kbd>{' '}
                for full results
              </p>
            </div>
          )}

          {/* Loading state */}
          {isLoading && query.length >= 2 && !results && (
            <div className="px-6 py-8 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="h-12 w-12 bg-[#f4f4f0] rounded-xl flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-[#f4f4f0] rounded w-3/4" />
                    <div className="h-3 bg-[#f4f4f0] rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* No results */}
          {query.length >= 2 && !isLoading && results && !hasResults && (
            <div className="px-6 py-10 text-center text-[#5d605c] font-body text-sm">
              No results found for &ldquo;{query}&rdquo;
            </div>
          )}

          {/* Results */}
          {hasResults && results && (
            <div className="py-2">
              {/* Suggested queries */}
              {results.queries.length > 0 && (
                <div className="px-4 py-2">
                  <h3 className="px-2 mb-1 font-label text-xs font-semibold uppercase tracking-widest text-[#5d605c]">
                    Suggestions
                  </h3>
                  {results.queries.map((q) => (
                    <button
                      key={q.text}
                      onClick={() => {
                        router.push(`/search?q=${encodeURIComponent(q.text)}`);
                        onClose();
                      }}
                      className="flex items-center gap-2 w-full px-2 py-2 font-body text-sm text-[#303330] hover:bg-[#f4f4f0] rounded-xl transition-colors duration-500 text-left"
                    >
                      <span
                        className="material-symbols-outlined text-lg text-[#b1b2af] flex-shrink-0"
                        aria-hidden="true"
                      >
                        search
                      </span>
                      <span dangerouslySetInnerHTML={{ __html: q.styledText }} />
                    </button>
                  ))}
                </div>
              )}

              {/* Products */}
              {results.products.length > 0 && (
                <div className="px-4 py-2">
                  <h3 className="px-2 mb-1 font-label text-xs font-semibold uppercase tracking-widest text-[#5d605c]">
                    Products
                  </h3>
                  {results.products.map((product) => (
                    <Link
                      key={product.id}
                      href={`/products/${product.handle}`}
                      onClick={handleResultClick}
                      className="flex items-center gap-3 px-2 py-2 hover:bg-[#f4f4f0] rounded-xl transition-colors duration-500"
                    >
                      {product.featuredImage ? (
                        <Image
                          src={product.featuredImage.url}
                          alt={product.featuredImage.altText || product.title}
                          width={48}
                          height={48}
                          className="h-12 w-12 rounded-xl object-cover flex-shrink-0 bg-[#f4f4f0]"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-xl bg-[#f4f4f0] flex items-center justify-center flex-shrink-0">
                          <span
                            className="material-symbols-outlined text-xl text-[#b1b2af]"
                            aria-hidden="true"
                          >
                            image
                          </span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-body text-sm text-[#303330] truncate">{product.title}</p>
                        <p className="font-body text-sm text-[#795a00] font-medium">
                          {formatPrice(
                            product.priceRange.minVariantPrice.amount,
                            product.priceRange.minVariantPrice.currencyCode,
                          )}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              {/* Collections */}
              {results.collections.length > 0 && (
                <div className="px-4 py-2">
                  <h3 className="px-2 mb-1 font-label text-xs font-semibold uppercase tracking-widest text-[#5d605c]">
                    Collections
                  </h3>
                  {results.collections.map((collection) => (
                    <Link
                      key={collection.id}
                      href={`/collections/${collection.handle}`}
                      onClick={handleResultClick}
                      className="flex items-center gap-3 px-2 py-2 hover:bg-[#f4f4f0] rounded-xl transition-colors duration-500"
                    >
                      <div className="h-10 w-10 rounded-xl bg-[#f4f4f0] flex items-center justify-center flex-shrink-0">
                        <span
                          className="material-symbols-outlined text-xl text-[#5d605c]"
                          aria-hidden="true"
                        >
                          grid_view
                        </span>
                      </div>
                      <p className="font-body text-sm text-[#303330]">{collection.title}</p>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer — full search link */}
        {query.trim().length > 0 && (
          <>
            <div className="h-px bg-[#b1b2af]/15" />
            <div className="px-4 py-3">
              <button
                onClick={handleSubmit as unknown as () => void}
                className="w-full flex items-center justify-center gap-2 font-body text-sm text-[#5d605c] hover:text-[#795a00] transition-colors duration-500"
              >
                <span>View all results for &ldquo;{query}&rdquo;</span>
                <span className="material-symbols-outlined text-lg" aria-hidden="true">
                  arrow_forward
                </span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
