'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ShopifyMenuItem } from '@/lib/shopify/types';

type MobileMenuProps = {
  isOpen: boolean;
  onClose: () => void;
  items: ShopifyMenuItem[];
};

const FALLBACK_ITEMS = [
  {
    id: '1',
    title: 'Shop',
    url: '/collections/all',
    type: 'COLLECTION',
    resourceId: null,
    tags: [],
    items: [],
  },
  {
    id: '2',
    title: 'Trending',
    url: '/collections/trending',
    type: 'COLLECTION',
    resourceId: null,
    tags: [],
    items: [],
  },
  {
    id: '3',
    title: 'New Arrivals',
    url: '/collections/new-arrivals',
    type: 'COLLECTION',
    resourceId: null,
    tags: [],
    items: [],
  },
  {
    id: '4',
    title: 'Deals',
    url: '/collections/deals',
    type: 'COLLECTION',
    resourceId: null,
    tags: [],
    items: [],
  },
];

export function MobileMenu({ isOpen, onClose, items }: MobileMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const navItems = items.length > 0 ? items : FALLBACK_ITEMS;

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    router.push(`/search?q=${encodeURIComponent(q)}`);
    setSearchQuery('');
    onClose();
  }

  // Trap focus and close on Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-[#303330]/30 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Drawer */}
      <div
        ref={menuRef}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        className={[
          'fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-[#faf9f6] text-[#303330] transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] lg:hidden',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4">
          <img src="/logo.png" alt="StarBuyBaby" className="h-14 w-auto" />
          <button
            onClick={onClose}
            aria-label="Close menu"
            className="flex h-8 w-8 items-center justify-center rounded-xl text-[#795a00] hover:bg-[#f4f4f0] transition-colors duration-500"
          >
            <span className="material-symbols-outlined text-xl" aria-hidden="true">
              close
            </span>
          </button>
        </div>

        {/* Search */}
        <div className="px-6 pt-2 pb-2">
          <form onSubmit={handleSearchSubmit} className="relative" role="search">
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products..."
              className="w-full rounded-xl bg-[#f4f4f0] border-none px-4 py-2.5 pl-10 text-sm text-[#303330] placeholder-[#b1b2af] focus:outline-none focus:ring-1 focus:ring-[#795a00]/30 transition-all duration-500"
              aria-label="Search products"
            />
            <span
              className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-lg text-[#b1b2af]"
              aria-hidden="true"
            >
              search
            </span>
          </form>
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto px-6 py-4">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.id}>
                <Link
                  href={resolveMenuUrl(item.url)}
                  onClick={onClose}
                  className="flex items-center rounded-xl px-3 py-3 font-body text-base font-medium text-[#303330] hover:bg-[#f4f4f0] hover:text-[#795a00] transition-colors duration-500"
                >
                  {item.title}
                </Link>
                {item.items && item.items.length > 0 && (
                  <ul className="ml-4 mt-1 space-y-1">
                    {item.items.map((sub) => (
                      <li key={sub.id}>
                        <Link
                          href={resolveMenuUrl(sub.url)}
                          onClick={onClose}
                          className="flex items-center rounded-xl px-3 py-2 font-body text-sm text-[#5d605c] hover:bg-[#f4f4f0] hover:text-[#795a00] transition-colors duration-500"
                        >
                          {sub.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </nav>

        {/* Footer links */}
        <div className="px-6 py-4 space-y-2">
          <Link
            href="/account"
            onClick={onClose}
            className="flex items-center gap-2 font-body text-sm text-[#5d605c] hover:text-[#795a00] transition-colors duration-500"
          >
            <span className="material-symbols-outlined text-lg" aria-hidden="true">
              person
            </span>
            My Account
          </Link>
          <Link
            href="/cart"
            onClick={onClose}
            className="flex items-center gap-2 font-body text-sm text-[#5d605c] hover:text-[#795a00] transition-colors duration-500"
          >
            <span className="material-symbols-outlined text-lg" aria-hidden="true">
              shopping_bag
            </span>
            Cart
          </Link>
        </div>
      </div>
    </>
  );
}

function resolveMenuUrl(url: string): string {
  // Shopify menu URLs are absolute — convert to relative for Next.js routing
  try {
    const parsed = new URL(url);
    return parsed.pathname;
  } catch {
    return url;
  }
}
