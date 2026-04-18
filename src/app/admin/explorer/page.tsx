'use client';

/**
 * Market Explorer — Category Browser — Phase 4
 *
 * Migrated to use admin design tokens. Zero hardcoded hex colors.
 * Grid of 8 top-level categories from CATEGORY_TREE.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CATEGORY_TREE } from '@/lib/trends/categories';
import type { Category } from '@/lib/trends/types';

// ─── Category Card ────────────────────────────────────────────────────────────

function CategoryCard({ category, onClick }: { category: Category; onClick: () => void }) {
  const totalKeywords = category.subcategories.reduce((sum, sub) => sum + sub.keywords.length, 0);

  return (
    <button
      data-testid="category-card"
      onClick={onClick}
      className="rounded-2xl p-6 text-left transition-all group cursor-pointer w-full"
      style={{
        backgroundColor: 'var(--admin-bg-card)',
        border: '1px solid var(--admin-border)',
      }}
    >
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-colors"
        style={{ backgroundColor: 'color-mix(in srgb, var(--admin-info) 10%, transparent)' }}
      >
        <span
          className="material-symbols-outlined"
          style={{ fontSize: 30, color: 'var(--admin-info)' }}
        >
          {category.icon}
        </span>
      </div>
      <h3
        className="font-semibold text-base mb-2 transition-colors"
        style={{ color: 'var(--admin-text)' }}
      >
        {category.label}
      </h3>
      <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--admin-text-muted)' }}>
        <span>{category.subcategories.length} subcategories</span>
        <span
          className="w-1 h-1 rounded-full"
          style={{ backgroundColor: 'var(--admin-text-disabled)' }}
        />
        <span>{totalKeywords} keywords</span>
      </div>
    </button>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ExplorerPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');

  const filtered = CATEGORY_TREE.filter((c) =>
    c.label.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="p-6 space-y-6" style={{ backgroundColor: 'var(--admin-bg)' }}>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <span
            className="material-symbols-outlined"
            style={{ fontSize: 32, color: 'var(--admin-info)' }}
          >
            explore
          </span>
          <div>
            <h1 className="admin-h1 text-xl">Market Explorer</h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>
              Browse trending products by category — discover what&apos;s selling right now.
            </p>
          </div>
        </div>
        <button
          onClick={() => router.push('/admin/trends?keywords=all&autorun=true')}
          className="flex items-center gap-2 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
          style={{ backgroundColor: 'var(--admin-info)' }}
        >
          <span className="material-symbols-outlined text-base">rocket_launch</span>
          Explore All
        </button>
      </div>

      {/* Filter */}
      <div className="relative max-w-sm">
        <span
          className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-base"
          style={{ color: 'var(--admin-text-muted)' }}
        >
          search
        </span>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter categories..."
          className="w-full rounded-xl pl-9 pr-4 py-2.5 text-sm outline-none transition-colors"
          style={{
            backgroundColor: 'var(--admin-bg-card)',
            border: '1px solid var(--admin-border)',
            color: 'var(--admin-text)',
          }}
        />
      </div>

      {/* Grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {filtered.map((cat) => (
            <CategoryCard
              key={cat.id}
              category={cat}
              onClick={() => router.push(`/admin/explorer/${cat.id}`)}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <span
            className="material-symbols-outlined mb-3"
            style={{ fontSize: 48, color: 'var(--admin-text-disabled)' }}
          >
            search_off
          </span>
          <p className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>
            No categories match &ldquo;{search}&rdquo;
          </p>
        </div>
      )}
    </div>
  );
}
