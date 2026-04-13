'use client';

import { useState, useRef, useEffect, useTransition } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

const SORT_OPTIONS = [
  { label: 'Best Selling', sortKey: 'BEST_SELLING', reverse: false, param: 'best-selling' },
  { label: 'Newest', sortKey: 'CREATED', reverse: true, param: 'newest' },
  { label: 'Price: Low to High', sortKey: 'PRICE', reverse: false, param: 'price-asc' },
  { label: 'Price: High to Low', sortKey: 'PRICE', reverse: true, param: 'price-desc' },
  { label: 'A\u2013Z', sortKey: 'TITLE', reverse: false, param: 'title-asc' },
  { label: 'Z\u2013A', sortKey: 'TITLE', reverse: true, param: 'title-desc' },
] as const;

function paramToSort(param: string | null): (typeof SORT_OPTIONS)[number] {
  if (!param) return SORT_OPTIONS[0];
  return SORT_OPTIONS.find((o) => o.param === param) ?? SORT_OPTIONS[0];
}

export function SortSelect() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const current = paramToSort(searchParams.get('sort'));

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleSelect(option: (typeof SORT_OPTIONS)[number]) {
    setIsOpen(false);
    const params = new URLSearchParams(searchParams.toString());
    params.set('sort', option.param);
    params.delete('reverse'); // reverse is encoded in the param name now
    params.delete('after'); // reset pagination
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isPending}
        className="inline-flex items-center gap-2 rounded-xl bg-[#ffffff] px-4 py-2.5 text-sm font-medium text-[#303330] hover:shadow-sm focus:shadow-[0_0_0_1px_rgba(121,90,0,0.3)] transition-all disabled:opacity-60"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label="Sort products"
      >
        {isPending && (
          <svg className="animate-spin h-3.5 w-3.5 text-[#795a00]" fill="none" viewBox="0 0 24 24">
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
        )}
        <span className="material-symbols-outlined text-base text-[#5d605c]" aria-hidden="true">
          swap_vert
        </span>
        <span>{current.label}</span>
        <span
          className={`material-symbols-outlined text-base text-[#b1b2af] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          aria-hidden="true"
        >
          expand_more
        </span>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          role="listbox"
          aria-label="Sort options"
          className="absolute right-0 top-full z-30 mt-2 w-56 rounded-xl bg-[#ffffff] py-1.5 shadow-[0_16px_32px_rgba(0,0,0,0.06)]"
        >
          {SORT_OPTIONS.map((option) => {
            const isSelected = option.param === current.param;
            return (
              <button
                key={option.param}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => handleSelect(option)}
                className={`flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                  isSelected
                    ? 'text-[#795a00] bg-[#f4f4f0]'
                    : 'text-[#303330] hover:bg-[#f4f4f0] hover:text-[#795a00]'
                }`}
              >
                {/* Check mark */}
                <span className="w-4 shrink-0">
                  {isSelected && (
                    <svg
                      className="h-4 w-4 text-[#795a00]"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </span>
                <span>{option.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
