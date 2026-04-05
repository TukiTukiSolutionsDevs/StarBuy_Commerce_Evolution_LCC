'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';

const SORT_OPTIONS = [
  { label: 'Best Selling', value: 'BEST_SELLING', reverse: 'false' },
  { label: 'Price: Low to High', value: 'PRICE', reverse: 'false' },
  { label: 'Price: High to Low', value: 'PRICE', reverse: 'true' },
  { label: 'Newest Arrivals', value: 'CREATED', reverse: 'true' },
  { label: 'A–Z', value: 'TITLE', reverse: 'false' },
  { label: 'Customer Rating', value: 'RELEVANCE', reverse: 'false' },
];

export function SortSelect() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentSort = searchParams.get('sort') ?? 'BEST_SELLING';
  const currentReverse = searchParams.get('reverse') ?? 'false';
  const currentValue = `${currentSort}|${currentReverse}`;

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const [sortKey, reverse] = e.target.value.split('|');
    const params = new URLSearchParams(searchParams.toString());
    params.set('sort', sortKey);
    params.set('reverse', reverse);
    params.delete('after'); // reset pagination
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  return (
    <select
      id="sort-select"
      value={currentValue}
      onChange={handleChange}
      disabled={isPending}
      className="border border-[#F8F9FC] bg-[#F8F9FC] rounded-lg px-4 py-2 text-sm focus:ring-[#1B2A5E] focus:border-[#1B2A5E] outline-none cursor-pointer text-[#1A1A2E] disabled:opacity-60 transition-colors hover:border-[#1B2A5E]/30"
      aria-label="Sort products"
    >
      {SORT_OPTIONS.map((opt) => (
        <option key={`${opt.value}|${opt.reverse}`} value={`${opt.value}|${opt.reverse}`}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
