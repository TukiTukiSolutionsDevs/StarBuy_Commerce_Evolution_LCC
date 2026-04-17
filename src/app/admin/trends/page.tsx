'use client';

/**
 * Trend Engine Dashboard — Sprint B
 * Full intelligence platform home. Replaces the Sprint A stub.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CATEGORY_TREE } from '@/lib/trends/categories';
import type { AggregatedTrendResult } from '@/lib/trends/aggregator';
import { ScoreRing } from '@/components/admin/trends/ScoreRing';
import { TrendStateBadge } from '@/components/admin/trends/TrendStateBadge';
import { SourcePills } from '@/components/admin/trends/SourcePills';
import { TrendSkeleton } from '@/components/admin/trends/TrendSkeleton';
import {
  AddToResearchModal,
  type AddToResearchTrendData,
} from '@/components/admin/research/AddToResearchModal';

// ─── Constants ────────────────────────────────────────────────────────────────

const LS_KEY = 'starbuy:trend-searches';
const MAX_RECENT = 10;

const STRATEGY_LABELS: Record<string, string> = {
  'smart-merge': 'Smart Merge',
  'primary-only': 'Primary Only',
  'fallback-chain': 'Fallback Chain',
};

const US_STATES = [
  { value: 'ALL', label: 'All States' },
  { value: 'AL', label: 'Alabama' },
  { value: 'AK', label: 'Alaska' },
  { value: 'AZ', label: 'Arizona' },
  { value: 'AR', label: 'Arkansas' },
  { value: 'CA', label: 'California' },
  { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' },
  { value: 'DE', label: 'Delaware' },
  { value: 'DC', label: 'Washington DC' },
  { value: 'FL', label: 'Florida' },
  { value: 'GA', label: 'Georgia' },
  { value: 'HI', label: 'Hawaii' },
  { value: 'ID', label: 'Idaho' },
  { value: 'IL', label: 'Illinois' },
  { value: 'IN', label: 'Indiana' },
  { value: 'IA', label: 'Iowa' },
  { value: 'KS', label: 'Kansas' },
  { value: 'KY', label: 'Kentucky' },
  { value: 'LA', label: 'Louisiana' },
  { value: 'ME', label: 'Maine' },
  { value: 'MD', label: 'Maryland' },
  { value: 'MA', label: 'Massachusetts' },
  { value: 'MI', label: 'Michigan' },
  { value: 'MN', label: 'Minnesota' },
  { value: 'MS', label: 'Mississippi' },
  { value: 'MO', label: 'Missouri' },
  { value: 'MT', label: 'Montana' },
  { value: 'NE', label: 'Nebraska' },
  { value: 'NV', label: 'Nevada' },
  { value: 'NH', label: 'New Hampshire' },
  { value: 'NJ', label: 'New Jersey' },
  { value: 'NM', label: 'New Mexico' },
  { value: 'NY', label: 'New York' },
  { value: 'NC', label: 'North Carolina' },
  { value: 'ND', label: 'North Dakota' },
  { value: 'OH', label: 'Ohio' },
  { value: 'OK', label: 'Oklahoma' },
  { value: 'OR', label: 'Oregon' },
  { value: 'PA', label: 'Pennsylvania' },
  { value: 'RI', label: 'Rhode Island' },
  { value: 'SC', label: 'South Carolina' },
  { value: 'SD', label: 'South Dakota' },
  { value: 'TN', label: 'Tennessee' },
  { value: 'TX', label: 'Texas' },
  { value: 'UT', label: 'Utah' },
  { value: 'VT', label: 'Vermont' },
  { value: 'VA', label: 'Virginia' },
  { value: 'WA', label: 'Washington' },
  { value: 'WV', label: 'West Virginia' },
  { value: 'WI', label: 'Wisconsin' },
  { value: 'WY', label: 'Wyoming' },
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface EngineStatusData {
  strategy: string;
  enabledCount: number;
  cacheEnabled: boolean;
}

// ─── localStorage helpers ─────────────────────────────────────────────────────

function loadRecentSearches(): string[] {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) ?? '[]') as string[];
  } catch {
    return [];
  }
}

function saveRecentSearch(query: string): string[] {
  const recent = loadRecentSearches().filter((s) => s.toLowerCase() !== query.toLowerCase());
  const updated = [query, ...recent].slice(0, MAX_RECENT);
  localStorage.setItem(LS_KEY, JSON.stringify(updated));
  return updated;
}

function clearAllRecentSearches(): void {
  localStorage.removeItem(LS_KEY);
}

// ─── Trending Now seed keywords ───────────────────────────────────────────────

function getTrendingNowKeywords(): string[] {
  return CATEGORY_TREE.slice(0, 4).flatMap((cat) => {
    const allKws = cat.subcategories.flatMap((sub) => sub.keywords);
    return [...allKws]
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 3)
      .map((k) => k.keyword);
  });
}

// ─── Engine Status Bar ────────────────────────────────────────────────────────

function EngineStatusBar({ data }: { data: EngineStatusData }) {
  return (
    <div
      data-testid="engine-status-bar"
      className="flex items-center gap-4 bg-[#0d1526] border border-[#1f2d4e] rounded-xl px-4 py-2.5 text-xs flex-wrap"
    >
      <div className="flex items-center gap-1.5">
        <span
          className="material-symbols-outlined text-[#6366f1]"
          aria-hidden="true"
          style={{ fontSize: 14 }}
        >
          hub
        </span>
        <span className="text-[#6b7280]">Strategy:</span>
        <span className="text-white font-medium">
          {STRATEGY_LABELS[data.strategy] ?? data.strategy}
        </span>
      </div>

      <div className="hidden sm:block w-px h-3 bg-[#1f2d4e]" />

      <div className="flex items-center gap-1.5">
        <span
          className={`w-1.5 h-1.5 rounded-full ${data.enabledCount > 0 ? 'bg-[#10b981]' : 'bg-[#374151]'}`}
        />
        <span className="text-[#6b7280]">Providers:</span>
        <span className="text-white font-medium" data-testid="provider-count">
          {data.enabledCount}
        </span>
        <span className="text-[#374151]">enabled</span>
      </div>

      <div className="hidden sm:block w-px h-3 bg-[#1f2d4e]" />

      <div className="flex items-center gap-1.5">
        <span
          className={`w-1.5 h-1.5 rounded-full ${data.cacheEnabled ? 'bg-[#10b981]' : 'bg-[#374151]'}`}
        />
        <span className="text-[#6b7280]">Cache:</span>
        <span className="text-white font-medium">{data.cacheEnabled ? 'On' : 'Off'}</span>
      </div>

      <div className="ml-auto">
        <Link
          href="/admin/settings"
          className="text-[#6366f1] hover:text-[#818cf8] transition-colors"
        >
          Settings →
        </Link>
      </div>
    </div>
  );
}

// ─── Result Card ──────────────────────────────────────────────────────────────

function ResultCard({
  result,
  onAddToResearch,
}: {
  result: AggregatedTrendResult;
  onAddToResearch: (data: AddToResearchTrendData) => void;
}) {
  return (
    <div
      data-testid="result-card"
      className="bg-[#111827] border border-[#1f2d4e] rounded-2xl p-5 hover:border-[#6366f1]/30 transition-all flex flex-col gap-4"
    >
      {/* Score ring + keyword + state badge */}
      <div className="flex items-start gap-4">
        <ScoreRing score={result.score} state={result.state} size="md" />
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-semibold text-sm mb-1.5 truncate">{result.keyword}</h3>
          <TrendStateBadge state={result.state} size="sm" />
        </div>
      </div>

      {/* Related keywords */}
      {result.relatedKeywords.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {result.relatedKeywords.slice(0, 5).map((kw) => (
            <span key={kw} className="bg-[#1f2d4e] text-[#9ca3af] rounded-full px-2 py-0.5 text-xs">
              {kw}
            </span>
          ))}
        </div>
      )}

      {/* Footer: sources + "Add to Research" */}
      <div className="flex items-center justify-between mt-auto pt-1 border-t border-[#1f2d4e]">
        <SourcePills sources={result.sources} />
        <button
          onClick={() =>
            onAddToResearch({
              keyword: result.keyword,
              trendScore: result.score,
              trendState: result.state,
              sources: result.sources,
              relatedKeywords: result.relatedKeywords,
            })
          }
          data-testid="add-to-research-btn"
          className="text-xs text-[#d4a843] border border-[#d4a843]/30 hover:bg-[#d4a843]/10 rounded-xl px-3 py-1.5 transition-colors"
        >
          + Research
        </button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TrendEnginePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // ── Search state ─────────────────────────────────────────────────────────────
  const [searchInput, setSearchInput] = useState('');
  const selectedStateRef = useRef('VA');
  const [selectedState, setSelectedState] = useState('VA');
  const [searchResults, setSearchResults] = useState<AggregatedTrendResult[]>([]);
  const [searchStatus, setSearchStatus] = useState<'idle' | 'searching' | 'results' | 'error'>(
    'idle',
  );
  const [searchError, setSearchError] = useState('');

  // ── Trending Now ──────────────────────────────────────────────────────────────
  const [trendingNow, setTrendingNow] = useState<AggregatedTrendResult[]>([]);
  const [trendingStatus, setTrendingStatus] = useState<'idle' | 'loading' | 'done' | 'error'>(
    'idle',
  );

  // ── Engine config ─────────────────────────────────────────────────────────────
  const [engineConfig, setEngineConfig] = useState<EngineStatusData | null>(null);

  // ── Recent searches ───────────────────────────────────────────────────────────
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // ── Research modal ────────────────────────────────────────────────────────────
  const [researchModalOpen, setResearchModalOpen] = useState(false);
  const [researchTrendData, setResearchTrendData] = useState<AddToResearchTrendData | null>(null);

  function openResearchModal(data: AddToResearchTrendData) {
    setResearchTrendData(data);
    setResearchModalOpen(true);
  }

  // ── Autorun guard ─────────────────────────────────────────────────────────────
  const autorunFired = useRef(false);

  // ── State selector (keeps ref in sync for stable handleSearch) ────────────────
  const updateSelectedState = (val: string) => {
    setSelectedState(val);
    selectedStateRef.current = val;
  };

  // ── Search handler — stable (ref for state, no deps) ─────────────────────────
  const handleSearch = useCallback(async (query: string, stateOverride?: string) => {
    const keywords = query
      .split(/\s*,\s*/)
      .map((k) => k.trim())
      .filter(Boolean);
    if (!keywords.length) return;

    setSearchStatus('searching');
    setSearchError('');

    const saved = saveRecentSearch(query.trim());
    setRecentSearches(saved);

    try {
      const res = await fetch('/api/admin/trends/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keywords,
          state: stateOverride ?? selectedStateRef.current,
        }),
      });

      const data = (await res.json()) as {
        results?: AggregatedTrendResult[];
        error?: string;
      };

      if (!res.ok) throw new Error(data.error ?? 'Failed to fetch trends');

      setSearchResults(data.results ?? []);
      setSearchStatus('results');
    } catch {
      setSearchError('Failed to fetch trends. Check your provider configuration.');
      setSearchStatus('error');
    }
  }, []);

  // ── Load trending now on demand (NOT automatic) ────────────────────────────
  const loadTrendingNow = useCallback(() => {
    const trendKeywords = getTrendingNowKeywords();
    setTrendingStatus('loading');
    fetch('/api/admin/trends/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keywords: trendKeywords }),
    })
      .then((r) => r.json())
      .then((data: { results?: AggregatedTrendResult[] }) => {
        setTrendingNow(data.results ?? []);
        setTrendingStatus('done');
      })
      .catch(() => setTrendingStatus('error'));
  }, []);

  // ── Mount: config + recent searches ONLY (no auto-fetch) ──────────────────
  useEffect(() => {
    // Engine config — free, no tokens
    fetch('/api/admin/trends/config')
      .then((r) => r.json())
      .then(
        (data: {
          config?: {
            activeStrategy: string;
            enabledProviders: string[];
            cacheEnabled: boolean;
          };
        }) => {
          if (data.config) {
            setEngineConfig({
              strategy: data.config.activeStrategy,
              enabledCount: data.config.enabledProviders.length,
              cacheEnabled: data.config.cacheEnabled,
            });
          }
        },
      )
      .catch(() => {
        /* non-critical */
      });

    // Recent searches from localStorage — free
    setRecentSearches(loadRecentSearches());
  }, []);

  // ── URL autorun ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const urlKeywords = searchParams?.get('keywords');
    const autorun = searchParams?.get('autorun');
    if (urlKeywords && autorun === 'true' && !autorunFired.current) {
      autorunFired.current = true;
      setSearchInput(urlKeywords);
      void handleSearch(urlKeywords);
    }
  }, [searchParams, handleSearch]);

  // ── Form submit ───────────────────────────────────────────────────────────────
  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchInput.trim();
    if (trimmed) void handleSearch(trimmed);
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* ── Header ── */}
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl bg-[#6366f1]/15 flex items-center justify-center flex-none">
          <span
            className="material-symbols-outlined text-[#6366f1]"
            aria-hidden="true"
            style={{ fontSize: 24 }}
          >
            trending_up
          </span>
        </div>
        <div>
          <h1
            className="text-2xl font-bold text-white"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Trend Engine
          </h1>
          <p className="text-[#6b7280] text-sm mt-0.5">
            Intelligence platform — search, discover, and analyze market trends
          </p>
        </div>
      </div>

      {/* ── Engine Status Bar ── */}
      {engineConfig && <EngineStatusBar data={engineConfig} />}

      {/* ── Search Section ── */}
      <div className="bg-[#111827] border border-[#1f2d4e] rounded-2xl p-6 space-y-4">
        <form onSubmit={onSubmit} className="flex flex-col sm:flex-row gap-3">
          {/* Search input */}
          <div className="flex-1 relative">
            <span
              className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#374151]"
              aria-hidden="true"
              style={{ fontSize: 18 }}
            >
              search
            </span>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search trends... (e.g., montessori toys, wireless earbuds)"
              className="w-full bg-[#0d1526] border border-[#1f2d4e] text-white placeholder-[#374151] rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-[#d4a843]/50 transition-colors"
            />
          </div>

          {/* State selector */}
          <select
            data-testid="state-selector"
            value={selectedState}
            onChange={(e) => updateSelectedState(e.target.value)}
            className="bg-[#0d1526] border border-[#1f2d4e] text-white rounded-xl px-3 py-3 text-sm focus:outline-none focus:border-[#d4a843]/50 transition-colors sm:w-44"
          >
            {US_STATES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>

          {/* Search button */}
          <button
            type="submit"
            data-testid="search-submit"
            disabled={searchStatus === 'searching'}
            className="bg-[#d4a843] hover:bg-[#c49833] disabled:opacity-60 disabled:cursor-not-allowed text-[#0d1526] font-semibold rounded-xl px-6 py-3 text-sm transition-colors flex items-center gap-2 justify-center"
          >
            {searchStatus === 'searching' ? (
              <>
                <span
                  className="material-symbols-outlined text-base animate-spin"
                  aria-hidden="true"
                >
                  progress_activity
                </span>
                Searching…
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-base" aria-hidden="true">
                  search
                </span>
                Search
              </>
            )}
          </button>
        </form>

        {/* Recent searches */}
        {recentSearches.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[#6b7280] text-xs font-medium uppercase tracking-wider">
                Recent Searches
              </span>
              <button
                onClick={() => {
                  clearAllRecentSearches();
                  setRecentSearches([]);
                }}
                className="text-[#374151] hover:text-[#9ca3af] text-xs transition-colors"
              >
                Clear
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {recentSearches.map((query) => (
                <button
                  key={query}
                  data-testid="recent-search-chip"
                  onClick={() => {
                    setSearchInput(query);
                    void handleSearch(query);
                  }}
                  className="bg-[#0d1526] hover:bg-[#1f2d4e] border border-[#1f2d4e] hover:border-[#374151] text-[#9ca3af] hover:text-white rounded-full px-3 py-1 text-xs transition-all"
                >
                  {query}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Search Results ── */}

      {searchStatus === 'searching' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <TrendSkeleton variant="card" count={6} />
        </div>
      )}

      {searchStatus === 'error' && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <span
            className="material-symbols-outlined text-[#ef4444] text-5xl mb-3"
            aria-hidden="true"
          >
            error
          </span>
          <p className="text-[#ef4444] font-medium mb-1">Failed to fetch trends</p>
          <p className="text-[#6b7280] text-sm mb-4">{searchError}</p>
          <button
            onClick={() => searchInput && void handleSearch(searchInput)}
            className="flex items-center gap-2 bg-[#d4a843] hover:bg-[#c49833] text-[#0d1526] font-semibold rounded-xl px-5 py-2.5 text-sm transition-colors"
          >
            <span className="material-symbols-outlined text-base" aria-hidden="true">
              refresh
            </span>
            Retry
          </button>
        </div>
      )}

      {searchStatus === 'results' && searchResults.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <span
            className="material-symbols-outlined text-[#374151] text-5xl mb-3"
            aria-hidden="true"
          >
            search_off
          </span>
          <p className="text-white font-medium mb-1">No trends found</p>
          <p className="text-[#6b7280] text-sm">Try different keywords or broaden your search</p>
        </div>
      )}

      {searchStatus === 'results' && searchResults.length > 0 && (
        <div>
          <p className="text-[#6b7280] text-xs mb-4">
            {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} found
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {searchResults.map((result) => (
              <ResultCard
                key={result.keyword}
                result={result}
                onAddToResearch={openResearchModal}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Getting Started Guide (idle state, no search yet) ── */}
      {searchStatus === 'idle' && trendingStatus === 'idle' && (
        <div className="bg-[#111827] border border-[#1f2d4e] rounded-2xl p-6 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#d4a843]/15 flex items-center justify-center flex-none">
              <span className="material-symbols-outlined text-[#d4a843]" style={{ fontSize: 22 }}>
                lightbulb
              </span>
            </div>
            <div>
              <h2 className="text-white font-semibold text-base">How to use the Trend Engine</h2>
              <p className="text-[#6b7280] text-xs mt-0.5">
                Find what products are selling right now — before your competitors do
              </p>
            </div>
          </div>

          {/* Step by step guide */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[#0d1526] border border-[#1f2d4e] rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#d4a843] text-[#0d1526] text-xs font-bold flex items-center justify-center">
                  1
                </span>
                <span className="text-white text-sm font-medium">Search a product idea</span>
              </div>
              <p className="text-[#6b7280] text-xs leading-relaxed">
                Type a product or niche in the search bar above. Example:{' '}
                <span className="text-[#d4a843]">&quot;wireless earbuds&quot;</span> or{' '}
                <span className="text-[#d4a843]">&quot;pet grooming&quot;</span>
              </p>
            </div>

            <div className="bg-[#0d1526] border border-[#1f2d4e] rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#d4a843] text-[#0d1526] text-xs font-bold flex items-center justify-center">
                  2
                </span>
                <span className="text-white text-sm font-medium">Review the trend score</span>
              </div>
              <p className="text-[#6b7280] text-xs leading-relaxed">
                Each result shows a <span className="text-[#10b981]">score from 0-100</span>. Higher
                = more trending. Look for <span className="text-[#10b981]">rising</span> or{' '}
                <span className="text-[#10b981]">hot</span> products.
              </p>
            </div>

            <div className="bg-[#0d1526] border border-[#1f2d4e] rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#d4a843] text-[#0d1526] text-xs font-bold flex items-center justify-center">
                  3
                </span>
                <span className="text-white text-sm font-medium">Add to Research</span>
              </div>
              <p className="text-[#6b7280] text-xs leading-relaxed">
                Found something promising? Click{' '}
                <span className="text-[#d4a843]">&quot;+ Research&quot;</span> to save it. Then go
                to <span className="text-[#d4a843]">Market Intel</span> for deep analysis with
                prices and links.
              </p>
            </div>
          </div>

          {/* Quick actions */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 pt-2 border-t border-[#1f2d4e]">
            <button
              onClick={loadTrendingNow}
              className="flex items-center gap-2 bg-[#6366f1] hover:bg-[#5558e6] text-white font-semibold rounded-xl px-5 py-2.5 text-sm transition-colors"
            >
              <span className="material-symbols-outlined text-base">trending_up</span>
              Show me what&apos;s trending now
            </button>
            <span className="text-[#374151] text-xs">
              This will search popular keywords across categories (uses provider credits)
            </span>
          </div>
        </div>
      )}

      {/* ── Trending Now results (after user clicks the button) ── */}
      {searchStatus === 'idle' && trendingStatus !== 'idle' && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <span
              className="material-symbols-outlined text-[#d4a843]"
              aria-hidden="true"
              style={{ fontSize: 18 }}
            >
              trending_up
            </span>
            <h2 className="text-white font-semibold">Trending Now</h2>
            <span className="text-[#6b7280] text-sm">— Popular across categories</span>
          </div>

          {trendingStatus === 'loading' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <TrendSkeleton variant="card" count={6} />
            </div>
          )}

          {trendingStatus === 'done' && trendingNow.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {trendingNow.map((result) => (
                <ResultCard
                  key={result.keyword}
                  result={result}
                  onAddToResearch={openResearchModal}
                />
              ))}
            </div>
          )}

          {trendingStatus === 'done' && trendingNow.length === 0 && (
            <p className="text-[#374151] text-sm text-center py-8">
              No trending data available. Configure providers in{' '}
              <Link href="/admin/settings" className="text-[#6366f1] hover:underline">
                Settings
              </Link>
              .
            </p>
          )}

          {trendingStatus === 'error' && (
            <div className="flex flex-col items-center py-8">
              <p className="text-[#ef4444] text-sm mb-3">Failed to load trending data</p>
              <button
                onClick={loadTrendingNow}
                className="text-[#6366f1] hover:text-[#818cf8] text-sm transition-colors"
              >
                Try again
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Add to Research Modal ── */}
      {researchTrendData && (
        <AddToResearchModal
          isOpen={researchModalOpen}
          onClose={() => setResearchModalOpen(false)}
          trendData={researchTrendData}
        />
      )}

      {/* ── Quick Category Links ── */}
      <div className="border-t border-[#1f2d4e] pt-6">
        <p className="text-[#6b7280] text-xs font-medium uppercase tracking-wider mb-3">
          Explore by Category
        </p>
        <div className="flex flex-wrap gap-2">
          {CATEGORY_TREE.map((cat) => (
            <button
              key={cat.id}
              data-testid="category-link"
              onClick={() => router.push(`/admin/explorer/${cat.id}`)}
              className="flex items-center gap-1.5 bg-[#111827] hover:bg-[#1f2d4e] border border-[#1f2d4e] hover:border-[#374151] text-[#9ca3af] hover:text-white rounded-xl px-3 py-1.5 text-xs font-medium transition-all"
            >
              <span
                className="material-symbols-outlined"
                aria-hidden="true"
                style={{ fontSize: 14 }}
              >
                {cat.icon}
              </span>
              {cat.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
