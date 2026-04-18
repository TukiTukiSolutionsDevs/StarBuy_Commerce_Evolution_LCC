'use client';

/**
 * Trend Engine Dashboard — Phase 4
 *
 * Migrated to use admin design tokens. Zero hardcoded hex colors.
 * Full intelligence platform home.
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

interface ProviderReadiness {
  enabled: boolean;
  hasKey: boolean;
  reason?: string;
}

interface EngineStatusData {
  strategy: string;
  enabledCount: number;
  cacheEnabled: boolean;
  readyCount: number;
  providerReadiness: Record<string, ProviderReadiness>;
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
      className="flex items-center gap-4 rounded-xl px-4 py-2.5 text-xs flex-wrap"
      style={{
        backgroundColor: 'var(--admin-bg-elevated)',
        border: '1px solid var(--admin-border)',
      }}
    >
      <div className="flex items-center gap-1.5">
        <span
          className="material-symbols-outlined"
          aria-hidden="true"
          style={{ fontSize: 14, color: 'var(--admin-accent)' }}
        >
          hub
        </span>
        <span style={{ color: 'var(--admin-text-muted)' }}>Strategy:</span>
        <span className="font-medium" style={{ color: 'var(--admin-text)' }}>
          {STRATEGY_LABELS[data.strategy] ?? data.strategy}
        </span>
      </div>

      <div
        className="hidden sm:block w-px h-3"
        style={{ backgroundColor: 'var(--admin-border)' }}
      />

      <div className="flex items-center gap-1.5">
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{
            backgroundColor:
              data.enabledCount > 0 ? 'var(--admin-success)' : 'var(--admin-text-disabled)',
          }}
        />
        <span style={{ color: 'var(--admin-text-muted)' }}>Providers:</span>
        <span
          className="font-medium"
          style={{ color: 'var(--admin-text)' }}
          data-testid="provider-count"
        >
          {data.enabledCount}
        </span>
        <span style={{ color: 'var(--admin-text-disabled)' }}>enabled</span>
      </div>

      <div
        className="hidden sm:block w-px h-3"
        style={{ backgroundColor: 'var(--admin-border)' }}
      />

      <div className="flex items-center gap-1.5">
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{
            backgroundColor: data.cacheEnabled
              ? 'var(--admin-success)'
              : 'var(--admin-text-disabled)',
          }}
        />
        <span style={{ color: 'var(--admin-text-muted)' }}>Cache:</span>
        <span className="font-medium" style={{ color: 'var(--admin-text)' }}>
          {data.cacheEnabled ? 'On' : 'Off'}
        </span>
      </div>

      <div className="ml-auto">
        <Link
          href="/admin/settings"
          className="transition-colors"
          style={{ color: 'var(--admin-accent)' }}
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
      className="rounded-2xl p-5 transition-all flex flex-col gap-4"
      style={{
        backgroundColor: 'var(--admin-bg-card)',
        border: '1px solid var(--admin-border)',
      }}
    >
      {/* Score ring + keyword + state badge */}
      <div className="flex items-start gap-4">
        <ScoreRing score={result.score} state={result.state} size="md" />
        <div className="flex-1 min-w-0">
          <h3
            className="font-semibold text-sm mb-1.5 truncate"
            style={{ color: 'var(--admin-text)' }}
          >
            {result.keyword}
          </h3>
          <TrendStateBadge state={result.state} size="sm" />
        </div>
      </div>

      {/* Related keywords */}
      {result.relatedKeywords.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {result.relatedKeywords.slice(0, 5).map((kw) => (
            <span
              key={kw}
              className="rounded-full px-2 py-0.5 text-xs"
              style={{
                backgroundColor: 'var(--admin-border)',
                color: 'var(--admin-text-secondary)',
              }}
            >
              {kw}
            </span>
          ))}
        </div>
      )}

      {/* Footer: sources + "Add to Research" */}
      <div
        className="flex items-center justify-between mt-auto pt-1"
        style={{ borderTop: '1px solid var(--admin-border)' }}
      >
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
          className="text-xs rounded-xl px-3 py-1.5 transition-colors"
          style={{
            color: 'var(--admin-brand)',
            border: '1px solid color-mix(in srgb, var(--admin-brand) 30%, transparent)',
          }}
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
    fetch('/api/admin/trends/config')
      .then((r) => r.json())
      .then(
        (data: {
          config?: {
            activeStrategy: string;
            enabledProviders: string[];
            cacheEnabled: boolean;
          };
          readyCount?: number;
          providerReadiness?: Record<string, ProviderReadiness>;
        }) => {
          if (data.config) {
            setEngineConfig({
              strategy: data.config.activeStrategy,
              enabledCount: data.config.enabledProviders.length,
              cacheEnabled: data.config.cacheEnabled,
              readyCount: data.readyCount ?? 0,
              providerReadiness: data.providerReadiness ?? {},
            });
          }
        },
      )
      .catch(() => {
        /* non-critical */
      });

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
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center flex-none"
          style={{ backgroundColor: 'color-mix(in srgb, var(--admin-accent) 15%, transparent)' }}
        >
          <span
            className="material-symbols-outlined"
            aria-hidden="true"
            style={{ fontSize: 24, color: 'var(--admin-accent)' }}
          >
            trending_up
          </span>
        </div>
        <div>
          <h1 className="admin-h1 text-2xl">Trend Engine</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>
            Intelligence platform — search, discover, and analyze market trends
          </p>
        </div>
      </div>

      {/* ── Engine Status Bar ── */}
      {engineConfig && <EngineStatusBar data={engineConfig} />}

      {/* ── No Providers Warning ── */}
      {engineConfig && engineConfig.readyCount === 0 && (
        <div
          className="rounded-2xl p-5 space-y-3"
          style={{
            backgroundColor: 'var(--admin-error-bg)',
            border: '1px solid color-mix(in srgb, var(--admin-error) 30%, transparent)',
          }}
        >
          <div className="flex items-start gap-3">
            <span
              className="material-symbols-outlined text-xl flex-none mt-0.5"
              style={{ color: 'var(--admin-error)' }}
            >
              warning
            </span>
            <div className="space-y-2">
              <h3 className="font-semibold text-sm" style={{ color: 'var(--admin-error)' }}>
                No trend providers configured
              </h3>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--admin-error)' }}>
                Searches will return empty results because none of your enabled providers have API
                keys configured. You need at least one working provider to use the Trend Engine.
              </p>
              <div className="space-y-1.5">
                {Object.entries(engineConfig.providerReadiness).map(([pid, info]) => (
                  <div key={pid} className="flex items-center gap-2 text-xs">
                    <span
                      className="w-2 h-2 rounded-full flex-none"
                      style={{
                        backgroundColor: info.hasKey
                          ? 'var(--admin-success)'
                          : 'var(--admin-error)',
                      }}
                    />
                    <span className="font-medium capitalize" style={{ color: 'var(--admin-text)' }}>
                      {pid}
                    </span>
                    {!info.hasKey && info.reason && (
                      <span style={{ color: 'var(--admin-error)' }}>— {info.reason}</span>
                    )}
                    {info.hasKey && <span style={{ color: 'var(--admin-success)' }}>— Ready</span>}
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-3 pt-1">
                <Link
                  href="/admin/settings"
                  className="inline-flex items-center gap-1.5 text-white font-semibold rounded-xl px-4 py-2 text-xs transition-colors"
                  style={{ backgroundColor: 'var(--admin-error)' }}
                >
                  <span className="material-symbols-outlined text-sm">settings</span>
                  Go to Settings
                </Link>
                <span className="text-[10px]" style={{ color: 'var(--admin-error)' }}>
                  Fastest option: add a free Tavily API key (1,000 searches/month)
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Search Section ── */}
      <div
        className="rounded-2xl p-6 space-y-4"
        style={{
          backgroundColor: 'var(--admin-bg-card)',
          border: '1px solid var(--admin-border)',
        }}
      >
        <form onSubmit={onSubmit} className="flex flex-col sm:flex-row gap-3">
          {/* Search input */}
          <div className="flex-1 relative">
            <span
              className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2"
              aria-hidden="true"
              style={{ fontSize: 18, color: 'var(--admin-text-disabled)' }}
            >
              search
            </span>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search trends... (e.g., montessori toys, wireless earbuds)"
              className="w-full rounded-xl pl-10 pr-4 py-3 text-sm outline-none transition-colors"
              style={{
                backgroundColor: 'var(--admin-bg-elevated)',
                border: '1px solid var(--admin-border)',
                color: 'var(--admin-text)',
              }}
            />
          </div>

          {/* State selector */}
          <select
            data-testid="state-selector"
            value={selectedState}
            onChange={(e) => updateSelectedState(e.target.value)}
            className="rounded-xl px-3 py-3 text-sm outline-none transition-colors sm:w-44"
            style={{
              backgroundColor: 'var(--admin-bg-elevated)',
              border: '1px solid var(--admin-border)',
              color: 'var(--admin-text)',
            }}
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
            className="font-semibold rounded-xl px-6 py-3 text-sm transition-colors flex items-center gap-2 justify-center disabled:opacity-60 disabled:cursor-not-allowed"
            style={{
              backgroundColor: 'var(--admin-brand)',
              color: 'var(--admin-bg)',
            }}
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

        {/* Search suggestions — guides for new users */}
        {!searchInput && searchStatus !== 'searching' && (
          <div className="space-y-3">
            <p
              className="text-xs font-medium uppercase tracking-wider"
              style={{ color: 'var(--admin-text-muted)' }}
            >
              Not sure what to search? Try one of these:
            </p>

            {/* Popular product ideas */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: 14, color: 'var(--admin-brand)' }}
                >
                  local_fire_department
                </span>
                <span
                  className="text-[11px] font-medium"
                  style={{ color: 'var(--admin-text-secondary)' }}
                >
                  Hot Right Now
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  'LED face mask',
                  'portable blender',
                  'smart ring',
                  'car phone mount',
                  'mini projector',
                ].map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setSearchInput(s);
                      void handleSearch(s);
                    }}
                    className="rounded-full px-3 py-1.5 text-xs font-medium transition-all"
                    style={{
                      backgroundColor: 'color-mix(in srgb, var(--admin-brand) 10%, transparent)',
                      border: '1px solid color-mix(in srgb, var(--admin-brand) 20%, transparent)',
                      color: 'var(--admin-brand)',
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* By category */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: 14, color: 'var(--admin-accent)' }}
                >
                  category
                </span>
                <span
                  className="text-[11px] font-medium"
                  style={{ color: 'var(--admin-text-secondary)' }}
                >
                  By Category
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: '🏠 Home & Garden', q: 'smart home gadgets, garden tools' },
                  { label: '💄 Beauty', q: 'skincare tools, hair accessories' },
                  { label: '🎮 Electronics', q: 'wireless earbuds, gaming accessories' },
                  { label: '🐾 Pet Supplies', q: 'dog toys, cat accessories' },
                  { label: '👶 Baby & Kids', q: 'montessori toys, baby gadgets' },
                  { label: '🏋️ Fitness', q: 'resistance bands, massage gun' },
                  { label: '👗 Fashion', q: 'sunglasses, minimalist jewelry' },
                  { label: '🚗 Auto', q: 'car organizer, dash cam' },
                ].map((item) => (
                  <button
                    key={item.q}
                    onClick={() => {
                      setSearchInput(item.q);
                      void handleSearch(item.q);
                    }}
                    className="rounded-full px-3 py-1.5 text-xs transition-all"
                    style={{
                      backgroundColor: 'var(--admin-bg-elevated)',
                      border: '1px solid var(--admin-border)',
                      color: 'var(--admin-text-secondary)',
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Pro tips */}
            <div
              className="rounded-xl px-4 py-3 mt-2"
              style={{
                backgroundColor: 'var(--admin-bg-elevated)',
                border: '1px solid var(--admin-border)',
              }}
            >
              <div className="flex items-start gap-2">
                <span
                  className="material-symbols-outlined flex-none mt-0.5"
                  style={{ fontSize: 16, color: 'var(--admin-success)' }}
                >
                  tips_and_updates
                </span>
                <div
                  className="text-xs leading-relaxed space-y-1"
                  style={{ color: 'var(--admin-text-muted)' }}
                >
                  <p>
                    <span className="font-medium" style={{ color: 'var(--admin-text-secondary)' }}>
                      Tip:
                    </span>{' '}
                    You can search multiple products at once — just separate them with commas.
                  </p>
                  <p>
                    Example:{' '}
                    <button
                      onClick={() => {
                        setSearchInput('yoga mat, resistance bands, foam roller');
                        void handleSearch('yoga mat, resistance bands, foam roller');
                      }}
                      className="hover:underline"
                      style={{ color: 'var(--admin-brand)' }}
                    >
                      yoga mat, resistance bands, foam roller
                    </button>
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Recent searches */}
        {recentSearches.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span
                className="text-xs font-medium uppercase tracking-wider"
                style={{ color: 'var(--admin-text-muted)' }}
              >
                Recent Searches
              </span>
              <button
                onClick={() => {
                  clearAllRecentSearches();
                  setRecentSearches([]);
                }}
                className="text-xs transition-colors"
                style={{ color: 'var(--admin-text-disabled)' }}
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
                  className="rounded-full px-3 py-1 text-xs transition-all"
                  style={{
                    backgroundColor: 'var(--admin-bg-elevated)',
                    border: '1px solid var(--admin-border)',
                    color: 'var(--admin-text-secondary)',
                  }}
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
            className="material-symbols-outlined text-5xl mb-3"
            aria-hidden="true"
            style={{ color: 'var(--admin-error)' }}
          >
            error
          </span>
          <p className="font-medium mb-1" style={{ color: 'var(--admin-error)' }}>
            Failed to fetch trends
          </p>
          <p className="text-sm mb-4" style={{ color: 'var(--admin-text-muted)' }}>
            {searchError}
          </p>
          <button
            onClick={() => searchInput && void handleSearch(searchInput)}
            className="flex items-center gap-2 font-semibold rounded-xl px-5 py-2.5 text-sm transition-colors"
            style={{
              backgroundColor: 'var(--admin-brand)',
              color: 'var(--admin-bg)',
            }}
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
            className="material-symbols-outlined text-5xl mb-3"
            aria-hidden="true"
            style={{ color: 'var(--admin-text-disabled)' }}
          >
            search_off
          </span>
          <p className="font-medium mb-1" style={{ color: 'var(--admin-text)' }}>
            No trends found
          </p>
          <p className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>
            Try different keywords or broaden your search
          </p>
        </div>
      )}

      {searchStatus === 'results' && searchResults.length > 0 && (
        <div>
          <p className="text-xs mb-4" style={{ color: 'var(--admin-text-muted)' }}>
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
        <div
          className="rounded-2xl p-6 space-y-6"
          style={{
            backgroundColor: 'var(--admin-bg-card)',
            border: '1px solid var(--admin-border)',
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-none"
              style={{ backgroundColor: 'color-mix(in srgb, var(--admin-brand) 15%, transparent)' }}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: 22, color: 'var(--admin-brand)' }}
              >
                lightbulb
              </span>
            </div>
            <div>
              <h2 className="font-semibold text-base" style={{ color: 'var(--admin-text)' }}>
                How to use the Trend Engine
              </h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>
                Find what products are selling right now — before your competitors do
              </p>
            </div>
          </div>

          {/* Step by step guide */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div
              className="rounded-xl p-4 space-y-2"
              style={{
                backgroundColor: 'var(--admin-bg-elevated)',
                border: '1px solid var(--admin-border)',
              }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center"
                  style={{ backgroundColor: 'var(--admin-brand)', color: 'var(--admin-bg)' }}
                >
                  1
                </span>
                <span className="text-sm font-medium" style={{ color: 'var(--admin-text)' }}>
                  Search a product idea
                </span>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--admin-text-muted)' }}>
                Type a product or niche in the search bar above. Example:{' '}
                <span style={{ color: 'var(--admin-brand)' }}>&quot;wireless earbuds&quot;</span> or{' '}
                <span style={{ color: 'var(--admin-brand)' }}>&quot;pet grooming&quot;</span>
              </p>
            </div>

            <div
              className="rounded-xl p-4 space-y-2"
              style={{
                backgroundColor: 'var(--admin-bg-elevated)',
                border: '1px solid var(--admin-border)',
              }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center"
                  style={{ backgroundColor: 'var(--admin-brand)', color: 'var(--admin-bg)' }}
                >
                  2
                </span>
                <span className="text-sm font-medium" style={{ color: 'var(--admin-text)' }}>
                  Review the trend score
                </span>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--admin-text-muted)' }}>
                Each result shows a{' '}
                <span style={{ color: 'var(--admin-success)' }}>score from 0-100</span>. Higher =
                more trending. Look for{' '}
                <span style={{ color: 'var(--admin-success)' }}>rising</span> or{' '}
                <span style={{ color: 'var(--admin-success)' }}>hot</span> products.
              </p>
            </div>

            <div
              className="rounded-xl p-4 space-y-2"
              style={{
                backgroundColor: 'var(--admin-bg-elevated)',
                border: '1px solid var(--admin-border)',
              }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center"
                  style={{ backgroundColor: 'var(--admin-brand)', color: 'var(--admin-bg)' }}
                >
                  3
                </span>
                <span className="text-sm font-medium" style={{ color: 'var(--admin-text)' }}>
                  Add to Research
                </span>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--admin-text-muted)' }}>
                Found something promising? Click{' '}
                <span style={{ color: 'var(--admin-brand)' }}>&quot;+ Research&quot;</span> to save
                it. Then go to <span style={{ color: 'var(--admin-brand)' }}>Market Intel</span> for
                deep analysis with prices and links.
              </p>
            </div>
          </div>

          {/* Quick actions */}
          <div
            className="flex flex-col sm:flex-row items-start sm:items-center gap-3 pt-2"
            style={{ borderTop: '1px solid var(--admin-border)' }}
          >
            <button
              onClick={loadTrendingNow}
              className="flex items-center gap-2 text-white font-semibold rounded-xl px-5 py-2.5 text-sm transition-colors"
              style={{ backgroundColor: 'var(--admin-accent)' }}
            >
              <span className="material-symbols-outlined text-base">trending_up</span>
              Show me what&apos;s trending now
            </button>
            <span className="text-xs" style={{ color: 'var(--admin-text-disabled)' }}>
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
              className="material-symbols-outlined"
              aria-hidden="true"
              style={{ fontSize: 18, color: 'var(--admin-brand)' }}
            >
              trending_up
            </span>
            <h2 className="font-semibold" style={{ color: 'var(--admin-text)' }}>
              Trending Now
            </h2>
            <span className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>
              — Popular across categories
            </span>
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
            <p className="text-sm text-center py-8" style={{ color: 'var(--admin-text-disabled)' }}>
              No trending data available. Configure providers in{' '}
              <Link
                href="/admin/settings"
                className="hover:underline"
                style={{ color: 'var(--admin-accent)' }}
              >
                Settings
              </Link>
              .
            </p>
          )}

          {trendingStatus === 'error' && (
            <div className="flex flex-col items-center py-8">
              <p className="text-sm mb-3" style={{ color: 'var(--admin-error)' }}>
                Failed to load trending data
              </p>
              <button
                onClick={loadTrendingNow}
                className="text-sm transition-colors"
                style={{ color: 'var(--admin-accent)' }}
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
      <div className="pt-6" style={{ borderTop: '1px solid var(--admin-border)' }}>
        <p
          className="text-xs font-medium uppercase tracking-wider mb-3"
          style={{ color: 'var(--admin-text-muted)' }}
        >
          Explore by Category
        </p>
        <div className="flex flex-wrap gap-2">
          {CATEGORY_TREE.map((cat) => (
            <button
              key={cat.id}
              data-testid="category-link"
              onClick={() => router.push(`/admin/explorer/${cat.id}`)}
              className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-all"
              style={{
                backgroundColor: 'var(--admin-bg-card)',
                border: '1px solid var(--admin-border)',
                color: 'var(--admin-text-secondary)',
              }}
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
