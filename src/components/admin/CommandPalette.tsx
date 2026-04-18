'use client';

/**
 * CommandPalette
 *
 * Global admin search modal triggered by Cmd+K / Ctrl+K.
 * Fully self-contained — manages its own open/close state.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { AdminProduct } from '@/lib/shopify/admin/tools/products';
import type { AdminOrder } from '@/lib/shopify/admin/tools/orders';
import type { AdminCustomer } from '@/lib/shopify/admin/tools/customers';
import type { AdminCollection } from '@/lib/shopify/admin/tools/collections';

// ─── Types ─────────────────────────────────────────────────────────────────────

type SearchResults = {
  products: AdminProduct[];
  orders: AdminOrder[];
  customers: AdminCustomer[];
  collections: AdminCollection[];
};

type FlatItem = {
  id: string;
  label: string;
  sublabel?: string;
  icon: string;
  url: string;
  section: string;
};

// ─── Quick Actions ─────────────────────────────────────────────────────────────

const QUICK_ACTIONS: FlatItem[] = [
  {
    id: 'qa-dashboard',
    label: 'Go to Dashboard',
    icon: 'dashboard',
    url: '/admin',
    section: 'Quick Actions',
  },
  {
    id: 'qa-products',
    label: 'Go to Products',
    icon: 'inventory_2',
    url: '/admin/products',
    section: 'Quick Actions',
  },
  {
    id: 'qa-orders',
    label: 'Go to Orders',
    icon: 'receipt_long',
    url: '/admin/orders',
    section: 'Quick Actions',
  },
  {
    id: 'qa-customers',
    label: 'Go to Customers',
    icon: 'people',
    url: '/admin/customers',
    section: 'Quick Actions',
  },
  {
    id: 'qa-inventory',
    label: 'Go to Inventory',
    icon: 'warehouse',
    url: '/admin/inventory',
    section: 'Quick Actions',
  },
  {
    id: 'qa-collections',
    label: 'Go to Collections',
    icon: 'collections_bookmark',
    url: '/admin/collections',
    section: 'Quick Actions',
  },
  {
    id: 'qa-settings',
    label: 'Go to Settings',
    icon: 'settings',
    url: '/admin/settings',
    section: 'Quick Actions',
  },
];

// ─── Helpers ───────────────────────────────────────────────────────────────────

/** Extract numeric ID from a Shopify GID like gid://shopify/Order/1234 */
function gidToNumeric(gid: string): string {
  return gid.split('/').pop() ?? gid;
}

function formatMoney(amount: string, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(parseFloat(amount));
}

function buildFlatItems(results: SearchResults): FlatItem[] {
  const items: FlatItem[] = [];

  for (const p of results.products) {
    const price = p.priceRangeV2.minVariantPrice;
    items.push({
      id: p.id,
      label: p.title,
      sublabel: formatMoney(price.amount, price.currencyCode),
      icon: 'sell',
      url: '/admin/products',
      section: 'Products',
    });
  }

  for (const o of results.orders) {
    const total = o.currentTotalPriceSet.shopMoney;
    const customerName = o.customer
      ? [o.customer.firstName, o.customer.lastName].filter(Boolean).join(' ')
      : (o.email ?? 'Guest');
    items.push({
      id: o.id,
      label: `${o.name} — ${customerName}`,
      sublabel: formatMoney(total.amount, total.currencyCode),
      icon: 'receipt_long',
      url: `/admin/orders/${gidToNumeric(o.id)}`,
      section: 'Orders',
    });
  }

  for (const c of results.customers) {
    const name = [c.firstName, c.lastName].filter(Boolean).join(' ') || c.email;
    items.push({
      id: c.id,
      label: name,
      sublabel: c.email,
      icon: 'person',
      url: `/admin/customers/${gidToNumeric(c.id)}`,
      section: 'Customers',
    });
  }

  for (const col of results.collections) {
    items.push({
      id: col.id,
      label: col.title,
      sublabel: `${col.productsCount.count} products`,
      icon: 'collections_bookmark',
      url: '/admin/collections',
      section: 'Collections',
    });
  }

  return items;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Open / Close ─────────────────────────────────────────────────────────────

  const openPalette = useCallback(() => {
    setOpen(true);
    setQuery('');
    setResults(null);
    setActiveIndex(0);
  }, []);

  const closePalette = useCallback(() => {
    setOpen(false);
    setQuery('');
    setResults(null);
  }, []);

  // ── Global keyboard listener for Cmd+K / Ctrl+K ───────────────────────────

  useEffect(() => {
    function handleGlobalKey(e: KeyboardEvent) {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => {
          if (prev) {
            closePalette();
            return false;
          }
          openPalette();
          return true;
        });
      }
    }
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, [closePalette, openPalette]);

  // ── Expose open method via custom event (for sidebar button) ─────────────

  useEffect(() => {
    function handleOpenEvent() {
      openPalette();
    }
    window.addEventListener('open-command-palette', handleOpenEvent);
    return () => window.removeEventListener('open-command-palette', handleOpenEvent);
  }, [openPalette]);

  // ── Focus input when opened ────────────────────────────────────────────────

  useEffect(() => {
    if (open) {
      // Tiny delay to ensure the element is mounted and visible
      const t = setTimeout(() => inputRef.current?.focus(), 30);
      return () => clearTimeout(t);
    }
  }, [open]);

  // ── Debounced search ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (!query.trim()) {
      setResults(null);
      setLoading(false);
      setActiveIndex(0);
      return;
    }

    setLoading(true);
    debounceTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/search?q=${encodeURIComponent(query.trim())}`);
        if (res.ok) {
          const data = (await res.json()) as SearchResults;
          setResults(data);
          setActiveIndex(0);
        }
      } catch {
        // silently fail — palette remains usable
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [query]);

  // ── Flat list for keyboard nav ─────────────────────────────────────────────

  const flatItems: FlatItem[] = query.trim()
    ? results
      ? buildFlatItems(results)
      : []
    : QUICK_ACTIONS;

  // ── Scroll active item into view ─────────────────────────────────────────

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>('[data-active="true"]');
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  // ── Keyboard navigation inside palette ────────────────────────────────────

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      e.preventDefault();
      closePalette();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (flatItems.length === 0 ? 0 : (i + 1) % flatItems.length));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) =>
        flatItems.length === 0 ? 0 : (i - 1 + flatItems.length) % flatItems.length,
      );
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const item = flatItems[activeIndex];
      if (item) {
        router.push(item.url);
        closePalette();
      }
      return;
    }
  }

  // ── Group results by section for display ─────────────────────────────────

  const sections = flatItems.reduce<Record<string, FlatItem[]>>((acc, item) => {
    (acc[item.section] ??= []).push(item);
    return acc;
  }, {});

  const hasResults = flatItems.length > 0;
  const isSearching = query.trim().length > 0;

  // ── Render ────────────────────────────────────────────────────────────────

  if (!open) return null;

  return (
    <>
      {/* ── Backdrop ────────────────────────────────────────────────────── */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] animate-in fade-in duration-150"
        onClick={closePalette}
        aria-hidden="true"
      />

      {/* ── Modal ───────────────────────────────────────────────────────── */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="fixed inset-x-0 top-0 z-[101] flex justify-center px-4"
        style={{ paddingTop: '20vh' }}
      >
        <div
          className="w-full max-w-xl bg-[var(--admin-bg-card)] border border-[var(--admin-border)] rounded-2xl shadow-2xl shadow-black/50 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          {/* ── Input row ─────────────────────────────────────────────── */}
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[var(--admin-border)]">
            {loading ? (
              <span className="material-symbols-outlined text-xl text-[var(--admin-brand)] animate-spin flex-none">
                progress_activity
              </span>
            ) : (
              <span className="material-symbols-outlined text-xl text-[var(--admin-text-disabled)] flex-none">
                search
              </span>
            )}
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search across your store..."
              className="flex-1 bg-transparent text-[var(--admin-text)] placeholder-[var(--admin-text-disabled)] text-[15px] outline-none"
              autoComplete="off"
              spellCheck={false}
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="text-[var(--admin-text-disabled)] hover:text-[var(--admin-text-secondary)] transition-colors flex-none"
                aria-label="Clear search"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            )}
          </div>

          {/* ── Results list ──────────────────────────────────────────── */}
          <div ref={listRef} className="max-h-[400px] overflow-y-auto overscroll-contain">
            {/* Empty state while searching with no results yet */}
            {isSearching && !loading && results && !hasResults && (
              <div className="flex flex-col items-center gap-2 py-10 text-[var(--admin-text-disabled)]">
                <span className="material-symbols-outlined text-3xl">search_off</span>
                <p className="text-sm">No results for &ldquo;{query}&rdquo;</p>
              </div>
            )}

            {/* Quick actions or search results, grouped by section */}
            {hasResults &&
              Object.entries(sections).map(([section, items]) => (
                <div key={section}>
                  {/* Section header */}
                  <div className="px-4 pt-3 pb-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--admin-text-disabled)]">
                      {section}
                    </span>
                  </div>

                  {/* Items */}
                  {items.map((item) => {
                    const globalIdx = flatItems.indexOf(item);
                    const isActive = globalIdx === activeIndex;
                    return (
                      <button
                        key={item.id}
                        data-active={isActive}
                        onClick={() => {
                          router.push(item.url);
                          closePalette();
                        }}
                        onMouseEnter={() => setActiveIndex(globalIdx)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                          isActive
                            ? 'bg-[var(--admin-chat-avatar-bg)]/40 text-[var(--admin-text)]'
                            : 'text-[var(--admin-text-secondary)] hover:text-[var(--admin-text)]'
                        }`}
                      >
                        <span
                          className={`material-symbols-outlined text-lg flex-none ${
                            isActive
                              ? 'text-[var(--admin-brand)]'
                              : 'text-[var(--admin-text-disabled)]'
                          }`}
                        >
                          {item.icon}
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm font-medium truncate">{item.label}</span>
                          {item.sublabel && (
                            <span className="block text-xs text-[var(--admin-text-muted)] truncate">
                              {item.sublabel}
                            </span>
                          )}
                        </span>
                        {isActive && (
                          <span className="text-[var(--admin-text-disabled)] flex-none">
                            <span className="material-symbols-outlined text-base">
                              keyboard_return
                            </span>
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
          </div>

          {/* ── Footer hints ──────────────────────────────────────────── */}
          <div className="flex items-center gap-4 px-4 py-2.5 border-t border-[var(--admin-border)] bg-[var(--admin-bg-sidebar)]/60">
            <span className="flex items-center gap-1 text-[var(--admin-text-disabled)] text-xs">
              <kbd className="px-1 py-0.5 rounded bg-[var(--admin-border)] text-[var(--admin-text-muted)] font-mono text-[10px]">
                esc
              </kbd>
              <span>close</span>
            </span>
            <span className="flex items-center gap-1 text-[var(--admin-text-disabled)] text-xs">
              <kbd className="px-1 py-0.5 rounded bg-[var(--admin-border)] text-[var(--admin-text-muted)] font-mono text-[10px]">
                ↑↓
              </kbd>
              <span>navigate</span>
            </span>
            <span className="flex items-center gap-1 text-[var(--admin-text-disabled)] text-xs">
              <kbd className="px-1 py-0.5 rounded bg-[var(--admin-border)] text-[var(--admin-text-muted)] font-mono text-[10px]">
                ↵
              </kbd>
              <span>select</span>
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
