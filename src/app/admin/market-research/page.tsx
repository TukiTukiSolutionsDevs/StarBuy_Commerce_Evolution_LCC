'use client';

/**
 * Admin Market Intelligence Page — Phase 4
 *
 * Migrated to use admin design tokens. Zero hardcoded hex colors
 * (except intentional marketplace brand colors).
 *
 * Lets the store owner research products and niches for their dropshipping store.
 * Supports two search modes: Free (web scraping) and Tavily Pro (API key required).
 * Results are scored across trend, demand, competition, and margin dimensions.
 */

import { useCallback, useEffect, useState } from 'react';
import { useToast } from '@/components/ui/useToast';
import type { ResearchSession, ResearchResult, SearchMode } from '@/lib/market-research/types';

// ─── Constants ─────────────────────────────────────────────────────────────────

const CATEGORIES = [
  'All',
  'Electronics',
  'Beauty',
  'Home & Garden',
  'Fashion',
  'Sports',
  'Toys',
  'Pet Supplies',
] as const;

const RECOMMENDATION_STYLE: Record<
  ResearchResult['recommendation'],
  { label: string; color: string }
> = {
  hot: { label: '🔥 HOT', color: 'var(--admin-error)' },
  promising: { label: '✨ Promising', color: 'var(--admin-success)' },
  saturated: { label: '⚠️ Saturated', color: 'var(--admin-brand)' },
  pass: { label: '❌ Pass', color: 'var(--admin-text-muted)' },
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function relativeDate(ts: number): string {
  const diff = Date.now() - ts;
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString();
}

function scoreToken(score: number): string {
  if (score >= 70) return 'var(--admin-success)';
  if (score >= 40) return 'var(--admin-brand)';
  return 'var(--admin-error)';
}

function strengthToken(strength: 'strong' | 'moderate' | 'weak'): string {
  if (strength === 'strong') return 'var(--admin-success)';
  if (strength === 'moderate') return 'var(--admin-brand)';
  return 'var(--admin-text-muted)';
}

// ─── Score Bar ──────────────────────────────────────────────────────────────────

function ScoreBar({ label, score }: { label: string; score: number }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span
          className="text-[10px] font-medium uppercase tracking-wider"
          style={{ color: 'var(--admin-text-muted)' }}
        >
          {label}
        </span>
        <span className="text-[11px] font-bold" style={{ color: scoreToken(score) }}>
          {score}
        </span>
      </div>
      <div
        className="h-1.5 rounded-full overflow-hidden"
        style={{ backgroundColor: 'var(--admin-border)' }}
      >
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${score}%`, backgroundColor: scoreToken(score) }}
        />
      </div>
    </div>
  );
}

// ─── Result Card ───────────────────────────────────────────────────────────────

function ResultCard({
  result,
  onImport,
  importing,
}: {
  result: ResearchResult;
  onImport: (result: ResearchResult) => void;
  importing: boolean;
}) {
  const [showSources, setShowSources] = useState(false);
  const badge = RECOMMENDATION_STYLE[result.recommendation];

  return (
    <div
      className="rounded-2xl p-5 space-y-4 transition-colors"
      style={{
        backgroundColor: 'var(--admin-bg-card)',
        border: '1px solid var(--admin-border)',
      }}
    >
      {/* Title row */}
      <div className="flex items-start justify-between gap-3">
        <h3
          className="text-base font-bold leading-snug flex-1"
          style={{ color: 'var(--admin-text-heading)' }}
        >
          {result.title}
        </h3>
        <span
          className="flex-none inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap"
          style={{
            backgroundColor: `color-mix(in srgb, ${badge.color} 10%, transparent)`,
            color: badge.color,
          }}
        >
          {badge.label}
        </span>
      </div>

      {/* Overall score */}
      <div className="flex items-center gap-4">
        <div className="flex flex-col items-center gap-0.5">
          <div className="text-4xl font-black" style={{ color: scoreToken(result.scores.overall) }}>
            {Math.round(result.scores.overall)}
          </div>
          <span
            className="text-[8px] uppercase tracking-widest font-semibold"
            style={{ color: 'var(--admin-text-muted)' }}
          >
            Score
          </span>
        </div>
        <div className="flex-1 space-y-2">
          <ScoreBar label="Trend" score={result.scores.trend} />
          <ScoreBar label="Demand" score={result.scores.demand} />
          <ScoreBar label="Competition" score={result.scores.competition} />
          <ScoreBar label="Margin" score={result.scores.margin} />
        </div>
      </div>

      {/* Signals */}
      {result.signals.length > 0 && (
        <div className="space-y-1.5">
          <p
            className="text-[10px] font-semibold uppercase tracking-wider"
            style={{ color: 'var(--admin-text-disabled)' }}
          >
            Signals
          </p>
          {result.signals.map((signal, i) => (
            <div key={i} className="flex items-center gap-2">
              <span
                className="flex-none w-2 h-2 rounded-full"
                style={{ backgroundColor: strengthToken(signal.strength) }}
              />
              <span
                className="text-[11px] font-medium"
                style={{ color: 'var(--admin-text-secondary)' }}
              >
                {signal.source}
              </span>
              <span className="text-[11px]" style={{ color: 'var(--admin-text-muted)' }}>
                {signal.indicator}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Marketplace Listings — DIRECT product links */}
      {result.listings && result.listings.length > 0 && (
        <div className="space-y-2">
          <p
            className="text-[10px] font-semibold uppercase tracking-wider"
            style={{ color: 'var(--admin-text-disabled)' }}
          >
            Buy on Marketplaces
          </p>
          {result.listings.map((listing, i) => {
            // Intentional: marketplace brand colors — NOT admin theme colors
            const marketplaceColors: Record<string, { bg: string; text: string; icon: string }> = {
              amazon: { bg: '#ff9900', text: '#ff9900', icon: '🛒' },
              aliexpress: { bg: '#e62e04', text: '#e62e04', icon: '🇨🇳' },
              temu: { bg: '#fb7701', text: '#fb7701', icon: '🏪' },
              cjdropshipping: { bg: '#1a73e8', text: '#1a73e8', icon: '📦' },
              ebay: { bg: '#e53238', text: '#e53238', icon: '🏷️' },
              walmart: { bg: '#0071dc', text: '#0071dc', icon: '🏬' },
              other: { bg: 'var(--admin-text-muted)', text: 'var(--admin-text-muted)', icon: '🔗' },
            };
            const colors = marketplaceColors[listing.marketplace] ?? marketplaceColors.other;

            return (
              <a
                key={i}
                href={listing.productUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-xl px-4 py-2.5 transition-all group"
                style={{
                  backgroundColor: `color-mix(in srgb, ${colors.bg} 10%, transparent)`,
                  border: '1px solid var(--admin-border)',
                }}
              >
                <span className="text-lg flex-none">{colors.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-[11px] font-bold uppercase"
                      style={{ color: colors.text }}
                    >
                      {listing.marketplace}
                    </span>
                    <span className="text-sm font-bold" style={{ color: 'var(--admin-text)' }}>
                      {listing.price}
                    </span>
                    {listing.rating && (
                      <span className="text-[10px]" style={{ color: 'var(--admin-brand)' }}>
                        {listing.rating}
                      </span>
                    )}
                  </div>
                  <p
                    className="text-[10px] truncate mt-0.5"
                    style={{ color: 'var(--admin-text-secondary)' }}
                  >
                    {listing.title}
                  </p>
                  {listing.shippingInfo && (
                    <p className="text-[10px]" style={{ color: 'var(--admin-text-muted)' }}>
                      {listing.shippingInfo}
                    </p>
                  )}
                </div>
                <span
                  className="material-symbols-outlined text-base transition-colors flex-none"
                  style={{ color: 'var(--admin-text-disabled)' }}
                >
                  open_in_new
                </span>
              </a>
            );
          })}
        </div>
      )}

      {/* Price range summary */}
      <div
        className="rounded-xl px-4 py-2.5"
        style={{
          backgroundColor: 'var(--admin-bg)',
          border: '1px solid var(--admin-border)',
        }}
      >
        <p
          className="text-[10px] font-semibold uppercase tracking-wider mb-1"
          style={{ color: 'var(--admin-text-muted)' }}
        >
          Price Summary
        </p>
        <p className="text-xs font-mono" style={{ color: 'var(--admin-text-body)' }}>
          Supplier: {result.priceRange.supplier} → Retail: {result.priceRange.retail}
          <span className="ml-2" style={{ color: 'var(--admin-success)' }}>
            → Margin: ~{result.priceRange.marginPercent}
          </span>
        </p>
      </div>

      {/* Reasoning */}
      <p className="text-xs leading-relaxed" style={{ color: 'var(--admin-text-secondary)' }}>
        {result.reasoning}
      </p>

      {/* Sources collapsible */}
      {result.sources.length > 0 && (
        <div>
          <button
            onClick={() => setShowSources((v) => !v)}
            className="flex items-center gap-1.5 text-[11px] transition-colors"
            style={{ color: 'var(--admin-text-disabled)' }}
          >
            <span className="material-symbols-outlined text-sm">
              {showSources ? 'expand_less' : 'expand_more'}
            </span>
            {result.sources.length} source{result.sources.length !== 1 ? 's' : ''}
          </button>
          {showSources && (
            <div className="mt-2 space-y-1.5">
              {result.sources.map((src, i) => (
                <a
                  key={i}
                  href={src.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-lg px-3 py-2 transition-colors"
                  style={{
                    backgroundColor: 'var(--admin-bg)',
                    border: '1px solid var(--admin-border)',
                  }}
                >
                  <p
                    className="text-[11px] font-medium truncate"
                    style={{ color: 'var(--admin-brand)' }}
                  >
                    {src.title}
                  </p>
                  <p
                    className="text-[10px] mt-0.5 line-clamp-2"
                    style={{ color: 'var(--admin-text-muted)' }}
                  >
                    {src.snippet}
                  </p>
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Import button */}
      <button
        onClick={() => onImport(result)}
        disabled={importing}
        className="w-full flex items-center justify-center gap-2 font-semibold text-sm rounded-xl px-4 py-2.5 transition-all disabled:opacity-50"
        style={{
          backgroundColor: importing
            ? 'color-mix(in srgb, var(--admin-brand) 40%, transparent)'
            : 'var(--admin-brand)',
          color: 'var(--admin-bg)',
        }}
      >
        {importing ? (
          <span className="material-symbols-outlined text-base animate-spin">hourglass_empty</span>
        ) : (
          <span className="material-symbols-outlined text-base">add_shopping_cart</span>
        )}
        {importing ? 'Importing…' : 'Import to Store'}
      </button>
    </div>
  );
}

// ─── Session History Row ────────────────────────────────────────────────────────

function HistoryRow({
  session,
  active,
  onSelect,
  onDelete,
  deleting,
}: {
  session: ResearchSession;
  active: boolean;
  onSelect: (s: ResearchSession) => void;
  onDelete: (id: string) => void;
  deleting: boolean;
}) {
  return (
    <div
      className="last:border-b-0 transition-colors"
      style={{
        borderBottom: '1px solid var(--admin-border)',
        backgroundColor: active
          ? 'color-mix(in srgb, var(--admin-brand) 5%, transparent)'
          : 'transparent',
      }}
    >
      <div className="flex items-center gap-3 px-5 py-3.5">
        <button
          onClick={() => onSelect(session)}
          className="flex-1 flex items-start gap-3 text-left min-w-0"
        >
          <span
            className="material-symbols-outlined text-lg flex-none mt-0.5"
            style={{
              color: active ? 'var(--admin-brand)' : 'var(--admin-text-disabled)',
            }}
          >
            {session.status === 'running' ? 'pending' : 'query_stats'}
          </span>
          <div className="min-w-0">
            <p
              className="text-sm font-medium truncate"
              style={{
                color: active ? 'var(--admin-brand)' : 'var(--admin-text-body)',
              }}
            >
              {session.query}
            </p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {session.category && session.category !== 'All' && (
                <span
                  className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px]"
                  style={{
                    backgroundColor: 'var(--admin-border)',
                    color: 'var(--admin-text-secondary)',
                  }}
                >
                  {session.category}
                </span>
              )}
              <span
                className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium"
                style={{
                  backgroundColor:
                    session.searchMode === 'tavily'
                      ? 'color-mix(in srgb, var(--admin-warning) 10%, transparent)'
                      : 'color-mix(in srgb, var(--admin-info) 10%, transparent)',
                  color:
                    session.searchMode === 'tavily' ? 'var(--admin-warning)' : 'var(--admin-info)',
                }}
              >
                {session.searchMode === 'tavily' ? '⚡ Tavily' : '🆓 Free'}
              </span>
              <span className="text-[10px]" style={{ color: 'var(--admin-text-disabled)' }}>
                {relativeDate(session.createdAt)}
              </span>
              {session.results.length > 0 && (
                <span className="text-[10px]" style={{ color: 'var(--admin-text-disabled)' }}>
                  {session.results.length} result{session.results.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
        </button>

        <button
          onClick={() => onDelete(session.id)}
          disabled={deleting}
          className="flex-none p-1.5 rounded-lg transition-all disabled:opacity-50"
          style={{ color: 'var(--admin-text-disabled)' }}
          title="Delete session"
        >
          <span className="material-symbols-outlined text-base">
            {deleting ? 'hourglass_empty' : 'delete'}
          </span>
        </button>
      </div>
    </div>
  );
}

// ─── Skeletons ─────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div
      className="rounded-2xl p-5 space-y-4"
      style={{
        backgroundColor: 'var(--admin-bg-card)',
        border: '1px solid var(--admin-border)',
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className="h-4 rounded animate-pulse flex-1"
          style={{ backgroundColor: 'var(--admin-border)' }}
        />
        <div
          className="h-6 rounded-lg animate-pulse w-24"
          style={{ backgroundColor: 'var(--admin-border)' }}
        />
      </div>
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded animate-pulse"
          style={{ backgroundColor: 'var(--admin-border)' }}
        />
        <div className="flex-1 space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-2 rounded-full animate-pulse"
              style={{ backgroundColor: 'var(--admin-border)' }}
            />
          ))}
        </div>
      </div>
      <div
        className="h-10 rounded-xl animate-pulse"
        style={{ backgroundColor: 'var(--admin-border)' }}
      />
      <div
        className="h-8 rounded-xl animate-pulse"
        style={{ backgroundColor: 'var(--admin-border)' }}
      />
    </div>
  );
}

function SkeletonHistory() {
  return (
    <div
      className="flex items-center gap-3 px-5 py-3.5"
      style={{ borderBottom: '1px solid var(--admin-border)' }}
    >
      <div
        className="w-5 h-5 rounded animate-pulse"
        style={{ backgroundColor: 'var(--admin-border)' }}
      />
      <div className="flex-1 space-y-1.5">
        <div
          className="h-3.5 rounded animate-pulse w-2/3"
          style={{ backgroundColor: 'var(--admin-border)' }}
        />
        <div
          className="h-3 rounded animate-pulse w-1/3"
          style={{ backgroundColor: 'var(--admin-border)' }}
        />
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function MarketResearchPage() {
  const { toast } = useToast();

  // ── State ─────────────────────────────────────────────────────────────────

  const [sessions, setSessions] = useState<ResearchSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [activeSession, setActiveSession] = useState<ResearchSession | null>(null);

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string>('All');
  const [searchMode, setSearchMode] = useState<SearchMode>('free');
  const [searching, setSearching] = useState(false);

  const [tavilyConfigured, setTavilyConfigured] = useState(false);
  const [checkingSettings, setCheckingSettings] = useState(true);

  const [importingId, setImportingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [researchProgress, setResearchProgress] = useState(0);
  const [researchStep, setResearchStep] = useState('');

  // ── Check Tavily key status ────────────────────────────────────────────────

  useEffect(() => {
    async function checkSettings() {
      try {
        const res = await fetch('/api/admin/settings');
        if (!res.ok) return;
        const data = (await res.json()) as {
          apiKeyStatus?: { tavily?: { configured: boolean } };
        };
        setTavilyConfigured(data.apiKeyStatus?.tavily?.configured ?? false);
      } catch {
        // Settings not critical — fail silently
      } finally {
        setCheckingSettings(false);
      }
    }
    void checkSettings();
  }, []);

  // ── Fetch sessions ─────────────────────────────────────────────────────────

  const fetchSessions = useCallback(async () => {
    setLoadingSessions(true);
    try {
      const res = await fetch('/api/admin/market-research');
      const data = (await res.json()) as { sessions?: ResearchSession[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Failed to load sessions');
      setSessions(data.sessions ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load research history');
    } finally {
      setLoadingSessions(false);
    }
  }, [toast]);

  useEffect(() => {
    void fetchSessions();
  }, [fetchSessions]);

  // ── Run research ──────────────────────────────────────────────────────────

  async function handleAnalyze() {
    if (!query.trim() || searching) return;

    setSearching(true);
    setActiveSession(null);
    setResearchProgress(0);
    setResearchStep('Connecting to AI model...');

    let currentProgress = 0;
    function advanceTo(target: number, label: string) {
      if (target > currentProgress) {
        currentProgress = target;
        setResearchProgress(target);
        setResearchStep(label);
      }
    }

    const startTime = Date.now();
    const baselineInterval = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      const baseline = Math.round(85 * (1 - Math.exp(-elapsed / 40)));
      if (baseline > currentProgress) {
        const labels = [
          { at: 5, label: 'Preparing research...' },
          { at: 15, label: 'Searching for trends...' },
          { at: 25, label: 'Analyzing market data...' },
          { at: 35, label: 'Checking social media signals...' },
          { at: 45, label: 'Evaluating competition...' },
          { at: 55, label: 'Researching suppliers...' },
          { at: 65, label: 'Analyzing pricing data...' },
          { at: 75, label: 'Almost there — scoring products...' },
          { at: 82, label: 'Finalizing analysis...' },
        ];
        const step = [...labels].reverse().find((s) => baseline >= s.at);
        advanceTo(baseline, step?.label ?? 'Working...');
      }
    }, 1500);

    try {
      const res = await fetch('/api/admin/market-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: query.trim(),
          category: category !== 'All' ? category : undefined,
          searchMode,
        }),
      });

      const sessionId = res.headers.get('x-session-id');

      if (!res.ok) {
        let errorMsg = 'Research failed';
        try {
          const errData = (await res.json()) as { error?: string };
          errorMsg = errData.error ?? errorMsg;
        } catch {
          errorMsg = `Research failed (${res.status})`;
        }
        throw new Error(errorMsg);
      }

      advanceTo(10, 'AI is analyzing your query...');

      const reader = res.body?.getReader();
      if (reader) {
        const decoder = new TextDecoder();
        let done = false;
        while (!done) {
          const chunk = await reader.read();
          done = chunk.done;
          if (chunk.value) {
            const text = decoder.decode(chunk.value, { stream: true });
            if (text.includes('searchTrends')) advanceTo(15, '🔍 Searching general trends...');
            if (text.includes('searchTikTok')) advanceTo(28, '📱 Analyzing TikTok virality...');
            if (text.includes('searchCompetition')) advanceTo(40, '🏪 Assessing competition...');
            if (text.includes('searchSupplierPrices'))
              advanceTo(52, '💰 Finding products on AliExpress, Temu...');
            if (text.includes('searchRetailProducts'))
              advanceTo(65, '🛒 Finding products on Amazon, eBay, Walmart...');
            if (text.includes('searchReviews')) advanceTo(78, '⭐ Analyzing reviews & ratings...');
            if (text.includes('saveResearchResult'))
              advanceTo(88, '💾 Saving products with links...');
          }
        }
      }

      clearInterval(baselineInterval);
      advanceTo(92, '📊 Compiling final report...');

      if (sessionId) {
        advanceTo(95, '📥 Fetching results...');
        const sessionRes = await fetch(`/api/admin/market-research/${sessionId}`);
        const sessionData = (await sessionRes.json()) as { session?: ResearchSession };
        if (sessionData.session) {
          setActiveSession(sessionData.session);
          setSessions((prev) => [
            sessionData.session!,
            ...prev.filter((s) => s.id !== sessionData.session!.id),
          ]);
          advanceTo(100, '✅ Done!');
          toast.success(
            `Found ${sessionData.session.results.length} product${sessionData.session.results.length !== 1 ? 's' : ''}`,
          );
        }
      }

      void fetchSessions();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Research failed');
    } finally {
      clearInterval(baselineInterval);
      setSearching(false);
      setResearchProgress(0);
    }
  }

  // ── Import product ────────────────────────────────────────────────────────

  async function handleImport(result: ResearchResult) {
    setImportingId(result.id);
    try {
      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: result.title,
          description: result.reasoning,
          status: 'DRAFT',
          tags: ['market-research', 'dropshipping'],
        }),
      });
      const data = (await res.json()) as { product?: { title: string }; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Import failed');
      toast.success(`"${result.title}" imported as DRAFT`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setImportingId(null);
    }
  }

  // ── Delete session ────────────────────────────────────────────────────────

  async function handleDelete(id: string) {
    setDeletingId(id);
    const backup = sessions;

    setSessions((prev) => prev.filter((s) => s.id !== id));
    if (activeSession?.id === id) setActiveSession(null);

    try {
      const res = await fetch(`/api/admin/market-research/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success('Session deleted');
    } catch (err) {
      setSessions(backup);
      toast.error(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setDeletingId(null);
    }
  }

  // ── Displayed results ─────────────────────────────────────────────────────

  const displayedResults = activeSession?.results ?? [];

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="admin-h1 text-2xl">Market Intelligence</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--admin-text-muted)' }}>
            {loadingSessions
              ? 'Loading…'
              : `${sessions.length} research session${sessions.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        {sessions.length > 0 && (
          <button
            onClick={() => {
              setActiveSession(null);
              setQuery('');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all"
            style={{
              backgroundColor: 'var(--admin-bg-card)',
              border: '1px solid var(--admin-border)',
              color: 'var(--admin-text-secondary)',
            }}
          >
            <span className="material-symbols-outlined text-base">add</span>
            New Research
          </button>
        )}
      </div>

      {/* ── Search Section ────────────────────────────────────────────── */}
      <div
        className="rounded-2xl p-5 space-y-4"
        style={{
          backgroundColor: 'var(--admin-bg-card)',
          border: '1px solid var(--admin-border)',
        }}
      >
        {/* Query input */}
        <div className="relative">
          <span
            className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-xl pointer-events-none"
            style={{ color: 'var(--admin-text-disabled)' }}
          >
            search
          </span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && query.trim() && !searching) void handleAnalyze();
            }}
            placeholder="What product or niche do you want to research?"
            className="w-full rounded-xl pl-12 pr-4 py-3.5 text-sm outline-none transition-colors"
            style={{
              backgroundColor: 'var(--admin-bg)',
              border: '1px solid var(--admin-border)',
              color: 'var(--admin-text)',
            }}
          />
        </div>

        {/* Category quick-select pills */}
        <div className="flex items-center gap-2 flex-wrap">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
              style={{
                backgroundColor:
                  category === cat
                    ? 'color-mix(in srgb, var(--admin-brand) 10%, transparent)'
                    : 'var(--admin-bg)',
                border: `1px solid ${
                  category === cat
                    ? 'color-mix(in srgb, var(--admin-brand) 30%, transparent)'
                    : 'var(--admin-border)'
                }`,
                color: category === cat ? 'var(--admin-brand)' : 'var(--admin-text-muted)',
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search mode toggle + Analyze button */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Mode toggle */}
          <div
            className="flex items-center rounded-xl p-1 gap-1"
            style={{
              backgroundColor: 'var(--admin-bg)',
              border: '1px solid var(--admin-border)',
            }}
          >
            <button
              onClick={() => setSearchMode('free')}
              title="Uses AI knowledge to analyze products. Works with any configured AI key."
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                backgroundColor:
                  searchMode === 'free'
                    ? 'color-mix(in srgb, var(--admin-info) 10%, transparent)'
                    : 'transparent',
                border:
                  searchMode === 'free'
                    ? '1px solid color-mix(in srgb, var(--admin-info) 20%, transparent)'
                    : '1px solid transparent',
                color: searchMode === 'free' ? 'var(--admin-info)' : 'var(--admin-text-muted)',
              }}
            >
              🧠 AI Analysis
            </button>

            <div className="relative group">
              <button
                onClick={() => {
                  if (tavilyConfigured) {
                    setSearchMode('tavily');
                  }
                }}
                title="Real-time web search using Tavily API."
                disabled={checkingSettings || !tavilyConfigured}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  backgroundColor:
                    searchMode === 'tavily'
                      ? 'color-mix(in srgb, var(--admin-warning) 10%, transparent)'
                      : 'transparent',
                  border:
                    searchMode === 'tavily'
                      ? '1px solid color-mix(in srgb, var(--admin-warning) 20%, transparent)'
                      : '1px solid transparent',
                  color:
                    searchMode === 'tavily'
                      ? 'var(--admin-warning)'
                      : tavilyConfigured
                        ? 'var(--admin-text-muted)'
                        : 'var(--admin-text-disabled)',
                }}
              >
                🔍 Web Search (Tavily)
                {!tavilyConfigured && !checkingSettings && (
                  <span
                    className="material-symbols-outlined text-sm"
                    style={{ color: 'var(--admin-text-disabled)' }}
                  >
                    lock
                  </span>
                )}
              </button>
              {!tavilyConfigured && !checkingSettings && (
                <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-10 w-52 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                  <div
                    className="rounded-lg px-3 py-2 text-[10px] text-center shadow-xl"
                    style={{
                      backgroundColor: 'var(--admin-border)',
                      border: '1px solid var(--admin-border-hover)',
                      color: 'var(--admin-text-secondary)',
                    }}
                  >
                    Configure Tavily API key in Settings
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Analyze button */}
          <button
            onClick={() => void handleAnalyze()}
            disabled={!query.trim() || searching}
            className="flex items-center gap-2 font-semibold rounded-xl px-5 py-2.5 text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            style={{
              backgroundColor: 'var(--admin-brand)',
              color: 'var(--admin-bg)',
            }}
          >
            {searching ? (
              <span className="material-symbols-outlined text-base animate-spin">
                hourglass_empty
              </span>
            ) : (
              <span className="material-symbols-outlined text-base">rocket_launch</span>
            )}
            {searching ? 'Analyzing…' : '🚀 Analyze Market'}
          </button>
        </div>

        {/* Mode disclaimer */}
        {searchMode === 'free' && (
          <div
            className="flex items-start gap-2 rounded-xl px-4 py-2.5"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--admin-info) 5%, transparent)',
              border: '1px solid color-mix(in srgb, var(--admin-info) 20%, transparent)',
            }}
          >
            <span
              className="material-symbols-outlined text-sm flex-none mt-0.5"
              style={{ color: 'var(--admin-info)' }}
            >
              info
            </span>
            <p className="text-[11px] leading-relaxed" style={{ color: 'var(--admin-info)' }}>
              <strong>AI Analysis mode</strong> — Results are based on the AI model&apos;s training
              data, not real-time internet data. Prices and product links are estimates. For live
              web data with real links, switch to <strong>Web Search (Tavily)</strong>.
            </p>
          </div>
        )}
        {searchMode === 'tavily' && (
          <div
            className="flex items-start gap-2 rounded-xl px-4 py-2.5"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--admin-warning) 5%, transparent)',
              border: '1px solid color-mix(in srgb, var(--admin-warning) 20%, transparent)',
            }}
          >
            <span
              className="material-symbols-outlined text-sm flex-none mt-0.5"
              style={{ color: 'var(--admin-warning)' }}
            >
              bolt
            </span>
            <p className="text-[11px] leading-relaxed" style={{ color: 'var(--admin-warning)' }}>
              <strong>Web Search mode</strong> — Searches the real internet for current product
              data, prices, and direct marketplace links. Uses your Tavily API credits (1,000
              free/month).
            </p>
          </div>
        )}
      </div>

      {/* ── Loading State with Progress ─────────────────────────────── */}
      {searching && (
        <div
          className="rounded-2xl p-6"
          style={{
            backgroundColor: 'var(--admin-bg-card)',
            border: '1px solid var(--admin-border)',
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span
                className="material-symbols-outlined text-xl animate-spin"
                style={{ color: 'var(--admin-brand)' }}
              >
                query_stats
              </span>
              <h2 className="admin-h2 text-base">Researching market…</h2>
            </div>
            <span className="text-2xl font-bold font-mono" style={{ color: 'var(--admin-brand)' }}>
              {researchProgress}%
            </span>
          </div>

          {/* Progress bar */}
          <div
            className="w-full rounded-full h-3 mb-4 overflow-hidden"
            style={{ backgroundColor: 'var(--admin-border)' }}
          >
            <div
              className="h-full rounded-full transition-all duration-1000 ease-out"
              style={{
                width: `${researchProgress}%`,
                background: `linear-gradient(90deg, var(--admin-brand) 0%, var(--admin-warning) 50%, var(--admin-success) 100%)`,
              }}
            />
          </div>

          {/* Current step */}
          <div className="flex items-center gap-2 mb-4">
            <span
              className="material-symbols-outlined text-base animate-pulse"
              style={{ color: 'var(--admin-brand)' }}
            >
              arrow_forward
            </span>
            <span className="text-sm font-medium" style={{ color: 'var(--admin-text)' }}>
              {researchStep}
            </span>
          </div>

          {/* Elapsed time */}
          <p className="text-[10px] font-mono" style={{ color: 'var(--admin-text-disabled)' }}>
            Mode:{' '}
            {searchMode === 'tavily'
              ? '🔍 Web Search (Tavily) — real-time internet data'
              : '🧠 AI Analysis — uses AI knowledge, no extra cost'}{' '}
            · Takes 30-90 seconds
          </p>
        </div>
      )}

      {/* ── Skeleton preview while searching ─────────────────────────── */}
      {searching && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {/* ── Results Grid ──────────────────────────────────────────────── */}
      {!searching && displayedResults.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold" style={{ color: 'var(--admin-text-heading)' }}>
              Results for &ldquo;{activeSession?.query}&rdquo;
            </h2>
            <span className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>
              {displayedResults.length} product{displayedResults.length !== 1 ? 's' : ''} found
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {displayedResults.map((result) => (
              <ResultCard
                key={result.id}
                result={result}
                onImport={handleImport}
                importing={importingId === result.id}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Empty active session state ────────────────────────────────── */}
      {!searching && activeSession && displayedResults.length === 0 && (
        <div
          className="rounded-2xl flex flex-col items-center justify-center py-16 text-center px-6"
          style={{
            backgroundColor: 'var(--admin-bg-card)',
            border: '1px solid var(--admin-border)',
          }}
        >
          <span
            className="material-symbols-outlined text-5xl mb-4"
            style={{ color: 'var(--admin-border)' }}
          >
            search_off
          </span>
          <p className="text-sm font-medium" style={{ color: 'var(--admin-text-muted)' }}>
            No products found
          </p>
          <p className="text-xs mt-1 max-w-sm" style={{ color: 'var(--admin-text-disabled)' }}>
            The research completed but found no viable products for this query. Try a different
            niche or be more specific.
          </p>
        </div>
      )}

      {/* ── Research History ──────────────────────────────────────────── */}
      <div className="space-y-3">
        <h2 className="admin-h2 text-base">Research History</h2>

        <div
          className="rounded-2xl overflow-hidden"
          style={{
            backgroundColor: 'var(--admin-bg-card)',
            border: '1px solid var(--admin-border)',
          }}
        >
          {loadingSessions ? (
            Array.from({ length: 4 }).map((_, i) => <SkeletonHistory key={i} />)
          ) : sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-6">
              <span
                className="material-symbols-outlined text-5xl mb-4"
                style={{ color: 'var(--admin-border)' }}
              >
                query_stats
              </span>
              <p className="text-sm font-medium" style={{ color: 'var(--admin-text-muted)' }}>
                No research yet
              </p>
              <p className="text-xs mt-1 max-w-sm" style={{ color: 'var(--admin-text-disabled)' }}>
                Use the search above to analyze products and niches for your dropshipping store.
              </p>
            </div>
          ) : (
            sessions.map((session) => (
              <HistoryRow
                key={session.id}
                session={session}
                active={activeSession?.id === session.id}
                onSelect={(s) => {
                  setActiveSession(s);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                onDelete={handleDelete}
                deleting={deletingId === session.id}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
