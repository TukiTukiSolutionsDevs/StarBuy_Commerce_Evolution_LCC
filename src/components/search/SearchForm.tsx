'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

type SearchFormProps = {
  initialQuery?: string;
  onClose?: () => void;
  autoFocus?: boolean;
};

export function SearchForm({ initialQuery = '', onClose, autoFocus = false }: SearchFormProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    startTransition(() => {
      router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    });
    onClose?.();
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2" role="search">
      <label htmlFor="search-input" className="sr-only">
        Search products
      </label>
      <div className="relative flex-1">
        {isPending ? (
          <span
            className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-base text-[#1B2A5E] animate-spin"
            aria-hidden="true"
          >
            progress_activity
          </span>
        ) : (
          <svg
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
            />
          </svg>
        )}
        <input
          id="search-input"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search products..."
          autoFocus={autoFocus}
          disabled={isPending}
          className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm text-[#1A1A2E] placeholder-gray-400 focus:border-[#1B2A5E] focus:outline-none focus:ring-2 focus:ring-[#1B2A5E]/20 transition-all disabled:opacity-70"
        />
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-[#1B2A5E] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#2a3f7e] transition-colors disabled:opacity-70 flex items-center gap-1.5"
      >
        {isPending ? (
          <>
            <span className="material-symbols-outlined text-base animate-spin" aria-hidden="true">
              progress_activity
            </span>
            Searching…
          </>
        ) : (
          'Search'
        )}
      </button>
    </form>
  );
}
