'use client';

import { useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

export function FiltersPanel() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [minPrice, setMinPrice] = useState(searchParams.get('minPrice') ?? '');
  const [maxPrice, setMaxPrice] = useState(searchParams.get('maxPrice') ?? '');
  const [inStockOnly, setInStockOnly] = useState(searchParams.get('inStock') === 'true');
  const [isOpen, setIsOpen] = useState(false);

  function applyFilters() {
    const params = new URLSearchParams(searchParams.toString());

    if (minPrice) params.set('minPrice', minPrice);
    else params.delete('minPrice');

    if (maxPrice) params.set('maxPrice', maxPrice);
    else params.delete('maxPrice');

    if (inStockOnly) params.set('inStock', 'true');
    else params.delete('inStock');

    params.delete('after'); // reset pagination
    router.push(`${pathname}?${params.toString()}`);
    setIsOpen(false);
  }

  function clearFilters() {
    setMinPrice('');
    setMaxPrice('');
    setInStockOnly(false);
    const params = new URLSearchParams(searchParams.toString());
    params.delete('minPrice');
    params.delete('maxPrice');
    params.delete('inStock');
    params.delete('after');
    router.push(`${pathname}?${params.toString()}`);
  }

  const hasActiveFilters =
    searchParams.has('minPrice') ||
    searchParams.has('maxPrice') ||
    searchParams.get('inStock') === 'true';

  const panelContent = (
    <div className="space-y-8">
      {/* Price Range */}
      <div className="space-y-4">
        <h3 className="font-bold text-sm text-[#1B2A5E]">Price Range</h3>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center border border-[#F8F9FC] rounded-lg px-2 bg-[#F8F9FC] flex-1">
            <span className="text-slate-400 text-xs">$</span>
            <input
              type="number"
              placeholder="Min"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              min="0"
              className="w-full bg-transparent border-none focus:ring-0 text-sm py-2 text-[#1A1A2E] placeholder-slate-400"
            />
          </div>
          <span className="text-slate-400">—</span>
          <div className="flex items-center border border-[#F8F9FC] rounded-lg px-2 bg-[#F8F9FC] flex-1">
            <span className="text-slate-400 text-xs">$</span>
            <input
              type="number"
              placeholder="Max"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              min="0"
              className="w-full bg-transparent border-none focus:ring-0 text-sm py-2 text-[#1A1A2E] placeholder-slate-400"
            />
          </div>
        </div>
      </div>

      {/* Availability */}
      <div>
        <h3 className="font-bold text-sm text-[#1B2A5E] mb-3">Availability</h3>
        <label className="flex items-center gap-3 cursor-pointer">
          <div
            className={[
              'relative h-5 w-10 rounded-full transition-colors duration-200 cursor-pointer',
              inStockOnly ? 'bg-[#1B2A5E]' : 'bg-slate-200',
            ].join(' ')}
            onClick={() => setInStockOnly(!inStockOnly)}
            role="checkbox"
            aria-checked={inStockOnly}
            tabIndex={0}
            onKeyDown={(e) => e.key === ' ' && setInStockOnly(!inStockOnly)}
          >
            <span
              className={[
                'absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200',
                inStockOnly ? 'translate-x-5' : 'translate-x-0',
              ].join(' ')}
            />
          </div>
          <span className="text-sm text-[#1A1A2E]">In Stock Only</span>
        </label>
      </div>

      {/* Buttons */}
      <div className="flex gap-2">
        <button
          onClick={applyFilters}
          className="flex-1 rounded-lg bg-[#1B2A5E] py-2 text-sm font-semibold text-white hover:bg-[#2a3f7e] transition-colors"
        >
          Apply Filters
        </button>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="text-sm text-slate-400 hover:text-[var(--color-error)] underline px-2 transition-colors"
          >
            Clear All
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-[#1A1A2E] hover:border-[#1B2A5E]/30 transition-colors lg:hidden"
      >
        <span className="material-symbols-outlined text-base" aria-hidden="true">
          tune
        </span>
        Filters
        {hasActiveFilters && (
          <span className="h-2 w-2 rounded-full bg-[#D4A843]" aria-hidden="true" />
        )}
      </button>

      {/* Mobile drawer */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-30 bg-black/40 lg:hidden"
            onClick={() => setIsOpen(false)}
          />
          <div className="fixed bottom-0 left-0 right-0 z-40 rounded-t-xl bg-white p-6 shadow-2xl lg:hidden">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#1B2A5E] font-[var(--font-heading)] uppercase tracking-wider">
                Filters
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-slate-100 rounded transition-colors"
                aria-label="Close filters"
              >
                <span className="material-symbols-outlined text-xl" aria-hidden="true">
                  close
                </span>
              </button>
            </div>
            {panelContent}
          </div>
        </>
      )}

      {/* Desktop sidebar — Stitch style */}
      <aside className="hidden lg:block flex-shrink-0">
        <div className="sticky top-24 space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="font-[var(--font-heading)] text-lg font-bold text-[#1B2A5E] uppercase tracking-wider">
              Filters
            </h2>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-sm text-slate-400 hover:text-[var(--color-error)] underline transition-colors"
              >
                Clear All
              </button>
            )}
          </div>
          {panelContent}
        </div>
      </aside>
    </>
  );
}
