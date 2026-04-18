'use client';

/**
 * Market Explorer — Category Detail — Phase 4
 *
 * Migrated to use admin design tokens. Zero hardcoded hex colors.
 * Shows subcategory tabs for a given category.
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
    <div
      className="rounded-2xl p-4 flex items-center gap-4 transition-colors"
      style={{
        backgroundColor: 'var(--admin-bg-card)',
        border: '1px solid var(--admin-border)',
      }}
    >
      <ScoreRing score={result.score} state={result.state} size="md" />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate mb-1" style={{ color: 'var(--admin-text)' }}>
          {result.keyword}
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <TrendStateBadge state={result.state} size="sm" />
          <SourcePills sources={result.sources} />
        </div>
      </div>
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
          className="text-xs rounded-xl px-3 py-1.5 transition-colors"
          style={{
            color: 'var(--admin-brand)',
            border: '1px solid color-mix(in srgb, var(--admin-brand) 30%, transparent)',
          }}
        >
          + Research
        </button>
        <Link
          href={analyzeHref}
          className="flex items-center gap-1 text-xs font-medium transition-colors"
          style={{ color: 'var(--admin-info)' }}
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
        <span
          className="material-symbols-outlined text-5xl mb-4"
          style={{ color: 'var(--admin-text-disabled)' }}
        >
          category
        </span>
        <h2 className="font-semibold text-lg mb-2" style={{ color: 'var(--admin-text)' }}>
          Category not found
        </h2>
        <p className="text-sm mb-6" style={{ color: 'var(--admin-text-muted)' }}>
          The category you&apos;re looking for doesn&apos;t exist in the catalog.
        </p>
        <Link
          href="/admin/explorer"
          className="flex items-center gap-2 text-[var(--admin-text)] rounded-xl px-5 py-2.5 text-sm font-medium transition-colors"
          style={{ backgroundColor: 'var(--admin-border)' }}
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

  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [results, setResults] = useState<AggregatedTrendResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [researchModalOpen, setResearchModalOpen] = useState(false);
  const [researchTrendData, setResearchTrendData] = useState<AddToResearchTrendData | null>(null);

  function openResearchModal(data: AddToResearchTrendData) {
    setResearchTrendData(data);
    setResearchModalOpen(true);
  }

  const cacheRef = useRef<Map<string, AggregatedTrendResult[]>>(new Map());

  const fetchSubcategory = useCallback(
    async (subcategoryId: string) => {
      if (!category) return;
      setActiveTabId(subcategoryId);
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
        const data = (await res.json()) as { results?: AggregatedTrendResult[]; error?: string };
        if (!res.ok) throw new Error(data.error ?? 'Failed to load trends');
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

  useEffect(() => {
    if (category && category.subcategories.length > 0) {
      fetchSubcategory(category.subcategories[0].id);
    }
  }, [category, fetchSubcategory]);

  if (!category) return <NotFound />;

  const activeSubcategory = category.subcategories.find((s) => s.id === activeTabId);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm">
        <Link
          href="/admin/explorer"
          className="transition-colors"
          style={{ color: 'var(--admin-text-muted)' }}
        >
          Explorer
        </Link>
        <span
          className="material-symbols-outlined text-base"
          style={{ color: 'var(--admin-text-disabled)' }}
        >
          chevron_right
        </span>
        <span className="font-medium" style={{ color: 'var(--admin-text)' }}>
          {category.label}
        </span>
      </nav>

      {/* Category Header */}
      <div className="flex items-center gap-4">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center flex-none"
          style={{ backgroundColor: 'color-mix(in srgb, var(--admin-info) 10%, transparent)' }}
        >
          <span
            className="material-symbols-outlined"
            style={{ fontSize: 32, color: 'var(--admin-info)' }}
          >
            {category.icon}
          </span>
        </div>
        <div>
          <h1 className="admin-h1 text-2xl">{category.label}</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>
            {category.subcategories.length} subcategories &middot;{' '}
            {category.subcategories.reduce((s, sub) => s + sub.keywords.length, 0)} keywords
          </p>
        </div>
      </div>

      {/* Subcategory Tabs */}
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
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all flex-none"
              style={{
                backgroundColor: isActive
                  ? 'color-mix(in srgb, var(--admin-info) 15%, transparent)'
                  : 'var(--admin-bg-card)',
                border: `1px solid ${isActive ? 'color-mix(in srgb, var(--admin-info) 30%, transparent)' : 'var(--admin-border)'}`,
                color: isActive ? 'var(--admin-info)' : 'var(--admin-text-muted)',
              }}
            >
              {sub.label}
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-full font-mono"
                style={{
                  backgroundColor: isActive
                    ? 'color-mix(in srgb, var(--admin-info) 20%, transparent)'
                    : 'var(--admin-border)',
                  color: isActive ? 'var(--admin-info)' : 'var(--admin-text-disabled)',
                }}
              >
                {sub.keywords.length}
              </span>
            </button>
          );
        })}
      </div>

      {/* Results Area */}
      <div>
        {!activeTabId && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <span
              className="material-symbols-outlined text-5xl mb-3"
              style={{ color: 'var(--admin-text-disabled)' }}
            >
              tab
            </span>
            <p className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>
              Select a subcategory above to explore trend data
            </p>
          </div>
        )}

        {activeTabId && loading && (
          <div className="grid grid-cols-1 gap-3">
            <TrendSkeleton variant="row" count={6} />
          </div>
        )}

        {activeTabId && !loading && error && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span
              className="material-symbols-outlined text-4xl mb-3"
              style={{ color: 'var(--admin-error)' }}
            >
              error_outline
            </span>
            <p className="text-sm mb-4" style={{ color: 'var(--admin-error)' }}>
              Failed to load trends
            </p>
            <button
              onClick={() => activeTabId && fetchSubcategory(activeTabId)}
              className="flex items-center gap-2 text-[var(--admin-text)] rounded-xl px-4 py-2 text-sm font-medium transition-colors"
              style={{ backgroundColor: 'var(--admin-border)' }}
            >
              <span className="material-symbols-outlined text-base">refresh</span>
              Try again
            </button>
          </div>
        )}

        {activeTabId && !loading && !error && results.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span
              className="material-symbols-outlined text-4xl mb-3"
              style={{ color: 'var(--admin-text-disabled)' }}
            >
              signal_cellular_nodata
            </span>
            <p className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>
              No trend data available for{' '}
              <span className="font-medium" style={{ color: 'var(--admin-text)' }}>
                {activeSubcategory?.label}
              </span>
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--admin-text-disabled)' }}>
              Try enabling more providers in Settings
            </p>
          </div>
        )}

        {activeTabId && !loading && !error && results.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                {results.length} result{results.length !== 1 ? 's' : ''} for{' '}
                <span className="font-medium" style={{ color: 'var(--admin-text-secondary)' }}>
                  {activeSubcategory?.label}
                </span>
              </p>
            </div>
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
