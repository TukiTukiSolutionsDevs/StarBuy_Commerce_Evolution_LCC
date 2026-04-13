'use client';

/**
 * Market Explorer — Category Browser
 *
 * Grid of 8 top-level categories from CATEGORY_TREE.
 * Clicking a card navigates to /admin/explorer/[categoryId].
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CATEGORY_TREE } from '@/lib/trends/categories';
import type { Category } from '@/lib/trends/types';

// ─── Category Card ────────────────────────────────────────────────────────────

interface CategoryCardProps {
  category: Category;
  onClick: () => void;
}

function CategoryCard({ category, onClick }: CategoryCardProps) {
  const totalKeywords = category.subcategories.reduce((sum, sub) => sum + sub.keywords.length, 0);

  return (
    <button
      data-testid="category-card"
      onClick={onClick}
      className="bg-[#111827] border border-[#1f2d4e] rounded-2xl p-6 text-left hover:border-[#6b8cff]/40 hover:bg-[#111827]/80 transition-all group cursor-pointer w-full"
    >
      {/* Icon */}
      <div className="w-14 h-14 rounded-2xl bg-[#6b8cff]/10 flex items-center justify-center mb-4 group-hover:bg-[#6b8cff]/15 transition-colors">
        <span className="material-symbols-outlined text-[#6b8cff]" style={{ fontSize: 30 }}>
          {category.icon}
        </span>
      </div>

      {/* Label */}
      <h3 className="text-white font-semibold text-base mb-2 group-hover:text-[#e5e7eb] transition-colors">
        {category.label}
      </h3>

      {/* Counts */}
      <div className="flex items-center gap-3 text-xs text-[#6b7280]">
        <span>{category.subcategories.length} subcategories</span>
        <span className="w-1 h-1 rounded-full bg-[#374151]" />
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
    <div className="min-h-screen bg-[#0d1117] p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-[#6b8cff]" style={{ fontSize: 32 }}>
            explore
          </span>
          <div>
            <h1
              role="heading"
              className="text-xl font-bold text-white"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              Market Explorer
            </h1>
            <p className="text-sm text-[#6b7280] mt-0.5">
              Browse trending products by category — discover what&apos;s selling right now.
            </p>
          </div>
        </div>

        <button
          onClick={() => router.push('/admin/trends?keywords=all&autorun=true')}
          className="flex items-center gap-2 bg-[#6b8cff] hover:bg-[#5a7aee] text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
        >
          <span className="material-symbols-outlined text-base">rocket_launch</span>
          Explore All
        </button>
      </div>

      {/* Filter */}
      <div className="relative max-w-sm">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#6b7280] text-base">
          search
        </span>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter categories..."
          className="w-full bg-[#111827] border border-[#1f2d4e] rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-[#6b7280] focus:outline-none focus:border-[#6b8cff]/50"
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
          <span className="material-symbols-outlined text-[#374151] mb-3" style={{ fontSize: 48 }}>
            search_off
          </span>
          <p className="text-[#6b7280] text-sm">No categories match &ldquo;{search}&rdquo;</p>
        </div>
      )}
    </div>
  );
}
