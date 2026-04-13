'use client';

import { useSyncExternalStore } from 'react';
import { isInWishlist, toggleWishlist } from '@/lib/wishlist';

// ─── External store subscription ──────────────────────────────────────────────

function subscribe(callback: () => void) {
  window.addEventListener('starbuy:wishlist-change', callback);
  return () => window.removeEventListener('starbuy:wishlist-change', callback);
}

function getServerSnapshot() {
  // Server-side or before hydration: assume not wishlisted
  return false;
}

// ─── Component ────────────────────────────────────────────────────────────────

type WishlistButtonProps = {
  productId: string;
  className?: string;
  size?: 'sm' | 'md';
};

export function WishlistButton({ productId, className = '', size = 'md' }: WishlistButtonProps) {
  // useSyncExternalStore safely reads from localStorage without triggering cascading renders
  const isWishlisted = useSyncExternalStore(
    subscribe,
    () => isInWishlist(productId),
    getServerSnapshot,
  );

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(productId);
    // No need to update state — useSyncExternalStore re-renders via the event
  }

  const sizeClasses = size === 'sm' ? 'h-8 w-8' : 'h-10 w-10';
  const iconSize = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';

  return (
    <button
      onClick={handleClick}
      aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
      aria-pressed={isWishlisted}
      className={[
        'flex items-center justify-center rounded-full transition-all duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#795a00] focus-visible:ring-offset-2',
        isWishlisted
          ? 'bg-[#fff8f0] text-[#795a00] fill-[#795a00] hover:bg-[#f8cc69]/30'
          : 'bg-[#ffffff]/90 backdrop-blur text-[#b1b2af] hover:text-[#795a00] hover:bg-white',
        sizeClasses,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {isWishlisted ? (
        /* Filled heart */
        <svg className={iconSize} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
        </svg>
      ) : (
        /* Outline heart */
        <svg
          className={iconSize}
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
      )}
    </button>
  );
}
