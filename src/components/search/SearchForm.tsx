'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

type SearchFormProps = {
  initialQuery?: string;
  onClose?: () => void;
  autoFocus?: boolean;
};

export function SearchForm({ initialQuery = '', onClose, autoFocus = false }: SearchFormProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    onClose?.();
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2" role="search">
      <label htmlFor="search-input" className="sr-only">
        Search products
      </label>
      <div className="relative flex-1">
        <svg
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-secondary)]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        <input
          id="search-input"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search products..."
          autoFocus={autoFocus}
          className="w-full rounded-[var(--radius-md)] border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm text-[var(--color-text-primary)] placeholder-gray-400 focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 transition-all"
        />
      </div>
      <button
        type="submit"
        className="rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--color-primary-light)] transition-colors"
      >
        Search
      </button>
    </form>
  );
}
