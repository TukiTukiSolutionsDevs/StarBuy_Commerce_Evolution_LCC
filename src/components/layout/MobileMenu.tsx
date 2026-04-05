'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import type { ShopifyMenuItem } from '@/lib/shopify/types';

type MobileMenuProps = {
  isOpen: boolean;
  onClose: () => void;
  items: ShopifyMenuItem[];
};

const FALLBACK_ITEMS = [
  { id: '1', title: 'Shop', url: '/collections/all', type: 'COLLECTION', resourceId: null, tags: [], items: [] },
  { id: '2', title: 'Trending', url: '/collections/trending', type: 'COLLECTION', resourceId: null, tags: [], items: [] },
  { id: '3', title: 'New Arrivals', url: '/collections/new-arrivals', type: 'COLLECTION', resourceId: null, tags: [], items: [] },
  { id: '4', title: 'Deals', url: '/collections/deals', type: 'COLLECTION', resourceId: null, tags: [], items: [] },
];

export function MobileMenu({ isOpen, onClose, items }: MobileMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const navItems = items.length > 0 ? items : FALLBACK_ITEMS;

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
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
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
          'fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-[var(--color-primary)] text-white transition-transform duration-300 lg:hidden',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <img src="/StarBuy.png" alt="StarBuy" className="h-9 w-auto" />
          <button
            onClick={onClose}
            aria-label="Close menu"
            className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] hover:bg-white/10 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto px-6 py-6">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.id}>
                <Link
                  href={resolveMenuUrl(item.url)}
                  onClick={onClose}
                  className="flex items-center rounded-[var(--radius-md)] px-3 py-3 text-base font-medium hover:bg-white/10 transition-colors"
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
                          className="flex items-center rounded-[var(--radius-md)] px-3 py-2 text-sm text-white/70 hover:bg-white/10 hover:text-white transition-colors"
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
        <div className="border-t border-white/10 px-6 py-4 space-y-2">
          <Link
            href="/account"
            onClick={onClose}
            className="flex items-center gap-2 text-sm text-white/80 hover:text-white transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
            My Account
          </Link>
          <Link
            href="/cart"
            onClick={onClose}
            className="flex items-center gap-2 text-sm text-white/80 hover:text-white transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
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
