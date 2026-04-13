'use client';

import { useSyncExternalStore } from 'react';
import Link from 'next/link';
import { getWishlistCount } from '@/lib/wishlist';

function subscribe(callback: () => void) {
  window.addEventListener('starbuy:wishlist-change', callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener('starbuy:wishlist-change', callback);
    window.removeEventListener('storage', callback);
  };
}

function getServerSnapshot() {
  return 0;
}

export function WishlistIcon() {
  const count = useSyncExternalStore(subscribe, getWishlistCount, getServerSnapshot);

  return (
    <Link
      href="/wishlist"
      className="relative flex p-2 text-[#5d605c] hover:text-[#795a00] rounded-md transition-colors active:scale-95"
      aria-label={`Wishlist${count > 0 ? ` (${count} items)` : ''}`}
    >
      <svg
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
        />
      </svg>
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#795a00] text-[10px] font-bold text-[#fff8f0]">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  );
}
