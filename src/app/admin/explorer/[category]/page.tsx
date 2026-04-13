'use client';

/**
 * Market Explorer — Category Detail
 *
 * Shows subcategory tabs for a given category.
 * Clicking a tab fetches trend data via POST /api/admin/trends/search.
 * Results are cached in-memory — no re-fetch on tab re-click.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getCategoryById } from '@/lib/trends/categories';
import type { AggregatedTrendResult } from '@/lib/trends/aggregator';
import { ScoreRing } from '@/components/admin/trends/ScoreRing';
import { TrendStateBadge } from '@/components/admin/trends/TrendStateBadge';
import { SourcePills } from '@/components/admin/trends/SourcePills';
import { TrendSkeleton } from '@/components/admin/trends/TrendSkeleton';
import {
  AddToResearchModal,
  type AddToResearchTrendData,
} from '@/components/admin/research/AddToResearchModal';

// ─── Result Card ──────────────────────────────────────────────────────────────

function TrendResultCard({
  result,
  onAddToResearch,
  category,
}: {
  result: AggregatedTrendResult;
  onAddToResearch: (data: AddToResearchTrendData) => void;
  category?: string;
}) {
  const analyzeHref = `/admin/trends?keywords=${encodeURIComponent(result.keyword)}&autorun=true`;

  return (
    <div className="bg-[#111827] border border-[#1f2d4e] rounded-2xl p-4 flex items-center gap-4 hover:border-[#1f3a6e] transition-colors">
      {/* Score Ring */}
      <ScoreRing score={result.score} state={result.state} size="md" />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-white font-medium text-sm truncate mb-1">{result.keyword}</p>
        <div className="flex items-center gap-2 flex-wrap">
          <TrendStateBadge state={result.state} size="sm" />
          <SourcePills sources={result.sources} />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-none">
        <button
          onClick={() =>
            onAddToResearch({
              keyword: result.keyword,
              trendScore: result.score,
              trendState: result.state,
              sources: result.sources,
              relatedKeywords: result.relatedKeywords,
              category,
            })
          }
          data-testid="add-to-research-btn"
          className="text-xs text-[#d4a843] border border-[#d4a843]/30 hover:bg-[#d4a843]/10 rounded-xl px-3 py-1.5 transition-colors"
        >
          + Research
        </button>
        <Link
          href={analyzeHref}
          className="flex items-center gap-1 text-[#6b8cff] hover:text-[#8ba4ff] text-xs font-medium transition-colors"
        >
          Analyze
          <span className="material-symbols-outlined text-sm">arrow_forward</span>
        </Link>
      </div>
    </div>
  );
}

// ─── Not Found ────────────────────────────────────────────────────────────────

function NotFound() {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <span className="material-symbols-outlined text-[#374151] text-5xl mb-4">category</span>
        <h2 className="text-white font-semibold text-lg mb-2">Category not found</h2>
        <p className="text-[#6b7280] text-sm mb-6">
          The category you&apos;re looking for doesn&apos;t exist in the catalog.
        </p>
        <Link
          href="/admin/explorer"
          className="flex items-center gap-2 bg-[#1f2d4e] hover:bg-[#263d6e] text-white rounded-xl px-5 py-2.5 text-sm font-medium transition-colors"
        >
          <span className="material-symbols-outlined text-base">arrow_back</span>
          Back to Explorer
        </Link>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CategoryPage() {
  const params = useParams();
  const categoryId = typeof params?.category === 'string' ? params.category : '';

  const category = getCategoryById(categoryId);

  // ── State ───────────────────────────────────────────────────────────────────
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [results, setResults] = useState<AggregatedTrendResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Research modal ─────────────────────────────────────────────────────────
  const [researchModalOpen, setResearchModalOpen] = useState(false);
  const [researchTrendData, setResearchTrendData] = useState<AddToResearchTrendData | null>(null);

  function openResearchModal(data: AddToResearchTrendData) {
    setResearchTrendData(data);
    setResearchModalOpen(true);
  }

  // In-memory cache: subcategoryId → results
  const cacheRef = useRef<Map<string, AggregatedTrendResult[]>>(new Map());

  // ── Fetch ───────────────────────────────────────────────────────────────────

  const fetchSubcategory = useCallback(
    async (subcategoryId: string) => {
      if (!category) return;

      setActiveTabId(subcategoryId);

      // Cache hit — no re-fetch
      if (cacheRef.current.has(subcategoryId)) {
        setResults(cacheRef.current.get(subcategoryId)!);
        setError(null);
        return;
      }

      const sub = category.subcategories.find((s) => s.id === subcategoryId);
      if (!sub) return;

      const keywords = sub.keywords.map((k) => k.keyword);

      setLoading(true);
      setError(null);

      try {
        const res = await fetch('/api/admin/trends/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ keywords, category: category.id }),
        });

        const data = (await res.json()) as {
          results?: AggregatedTrendResult[];
          error?: string;
        };

        if (!res.ok) {
          throw new Error(data.error ?? 'Failed to load trends');
        }

        const fetched = data.results ?? [];
        cacheRef.current.set(subcategoryId, fetched);
        setResults(fetched);
      } catch {
        setError('Failed to load trends. Please try again.');
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [category],
  );

  // ── Auto-load first tab on mount ────────────────────────────────────────────
  useEffect(() => {
    if (category && category.subcategories.length > 0) {
      fetchSubcategory(category.subcategories[0].id);
    }
  }, [category, fetchSubcategory]);

  // ── Not found guard ─────────────────────────────────────────────────────────

  if (!category) {
    return <NotFound />;
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  const activeSubcategory = category.subcategories.find((s) => s.id === activeTabId);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* ── Breadcrumb ── */}
      <nav className="flex items-center gap-2 text-sm">
        <Link href="/admin/explorer" className="text-[#6b7280] hover:text-white transition-colors">
          Explorer
        </Link>
        <span className="material-symbols-outlined text-[#374151] text-base">chevron_right</span>
        <span className="text-white font-medium">{category.label}</span>
      </nav>

      {/* ── Category Header ── */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-[#6b8cff]/10 flex items-center justify-center flex-none">
          <span className="material-symbols-outlined text-[#6b8cff]" style={{ fontSize: 32 }}>
            {category.icon}
          </span>
        </div>
        <div>
          <h1
            role="heading"
            className="text-2xl font-bold text-white"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            {category.label}
          </h1>
          <p className="text-[#6b7280] text-sm mt-0.5">
            {category.subcategories.length} subcategories &middot;{' '}
            {category.subcategories.reduce((s, sub) => s + sub.keywords.length, 0)} keywords
          </p>
        </div>
      </div>

      {/* ── Subcategory Tabs ── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {category.subcategories.map((sub) => {
          const isActive = activeTabId === sub.id;
          return (
            <button
              key={sub.id}
              data-testid="subcategory-tab"
              role="button"
              aria-selected={isActive}
              onClick={() => fetchSubcategory(sub.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all flex-none ${
                isActive
                  ? 'bg-[#6b8cff]/15 text-[#6b8cff] border border-[#6b8cff]/30'
                  : 'bg-[#111827] border border-[#1f2d4e] text-[#6b7280] hover:text-[#9ca3af] hover:border-[#374151]'
              }`}
            >
              {sub.label}
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                  isActive ? 'bg-[#6b8cff]/20 text-[#6b8cff]' : 'bg-[#1f2d4e] text-[#374151]'
                }`}
              >
                {sub.keywords.length}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Results Area ── */}
      <div>
        {/* No tab selected */}
        {!activeTabId && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <span className="material-symbols-outlined text-[#374151] text-5xl mb-3">tab</span>
            <p className="text-[#6b7280] text-sm">
              Select a subcategory above to explore trend data
            </p>
          </div>
        )}

        {/* Loading */}
        {activeTabId && loading && (
          <div className="grid grid-cols-1 gap-3">
            <TrendSkeleton variant="row" count={6} />
          </div>
        )}

        {/* Error */}
        {activeTabId && !loading && error && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="material-symbols-outlined text-[#ef4444] text-4xl mb-3">
              error_outline
            </span>
            <p className="text-[#ef4444] text-sm mb-4">Failed to load trends</p>
            <button
              onClick={() => activeTabId && fetchSubcategory(activeTabId)}
              className="flex items-center gap-2 bg-[#1f2d4e] hover:bg-[#263d6e] text-white rounded-xl px-4 py-2 text-sm font-medium transition-colors"
            >
              <span className="material-symbols-outlined text-base">refresh</span>
              Try again
            </button>
          </div>
        )}

        {/* Empty results */}
        {activeTabId && !loading && !error && results.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="material-symbols-outlined text-[#374151] text-4xl mb-3">
              signal_cellular_nodata
            </span>
            <p className="text-[#6b7280] text-sm">
              No trend data available for{' '}
              <span className="text-white font-medium">{activeSubcategory?.label}</span>
            </p>
            <p className="text-[#374151] text-xs mt-1">Try enabling more providers in Settings</p>
          </div>
        )}

        {/* Results */}
        {activeTabId && !loading && !error && results.length > 0 && (
          <div className="space-y-3">
            {/* Sub-header */}
            <div className="flex items-center justify-between">
              <p className="text-[#6b7280] text-xs">
                {results.length} result{results.length !== 1 ? 's' : ''} for{' '}
                <span className="text-[#9ca3af] font-medium">{activeSubcategory?.label}</span>
              </p>
            </div>

            {/* Cards */}
            <div className="grid grid-cols-1 gap-3">
              {results.map((result) => (
                <TrendResultCard
                  key={result.keyword}
                  result={result}
                  onAddToResearch={openResearchModal}
                  category={category.id}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Add to Research Modal ── */}
      {researchTrendData && (
        <AddToResearchModal
          isOpen={researchModalOpen}
          onClose={() => setResearchModalOpen(false)}
          trendData={researchTrendData}
        />
      )}
    </div>
  );
}
