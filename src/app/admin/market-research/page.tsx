'use client';

/**
 * Admin Market Intelligence Page
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

const RECOMMENDATION_BADGE: Record<
  ResearchResult['recommendation'],
  { label: string; bg: string; text: string }
> = {
  hot: { label: '🔥 HOT', bg: 'bg-[#ef4444]/10', text: 'text-[#ef4444]' },
  promising: { label: '✨ Promising', bg: 'bg-[#10b981]/10', text: 'text-[#10b981]' },
  saturated: { label: '⚠️ Saturated', bg: 'bg-[#d4a843]/10', text: 'text-[#d4a843]' },
  pass: { label: '❌ Pass', bg: 'bg-[#6b7280]/10', text: 'text-[#6b7280]' },
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

function scoreColor(score: number): string {
  if (score >= 70) return 'bg-[#10b981]';
  if (score >= 40) return 'bg-[#d4a843]';
  return 'bg-[#ef4444]';
}

function scoreTextColor(score: number): string {
  if (score >= 70) return 'text-[#10b981]';
  if (score >= 40) return 'text-[#d4a843]';
  return 'text-[#ef4444]';
}

function strengthDot(strength: 'strong' | 'moderate' | 'weak'): string {
  if (strength === 'strong') return 'bg-[#10b981]';
  if (strength === 'moderate') return 'bg-[#d4a843]';
  return 'bg-[#6b7280]';
}

// ─── Score Bar ──────────────────────────────────────────────────────────────────

function ScoreBar({ label, score }: { label: string; score: number }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[#6b7280] text-[10px] font-medium uppercase tracking-wider">
          {label}
        </span>
        <span className={`text-[11px] font-bold ${scoreTextColor(score)}`}>{score}</span>
      </div>
      <div className="h-1.5 bg-[#1f2d4e] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${scoreColor(score)}`}
          style={{ width: `${score}%` }}
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
  const badge = RECOMMENDATION_BADGE[result.recommendation];

  return (
    <div className="bg-[#111827] border border-[#1f2d4e] rounded-2xl p-5 space-y-4 hover:border-[#374151] transition-colors">
      {/* Title row */}
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-bold leading-snug flex-1" style={{ color: '#f9fafb' }}>
          {result.title}
        </h3>
        <span
          className={`flex-none inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap ${badge.bg} ${badge.text}`}
        >
          {badge.label}
        </span>
      </div>

      {/* Overall score */}
      <div className="flex items-center gap-4">
        <div className="flex flex-col items-center gap-0.5">
          <div
            className="text-4xl font-black"
            style={{
              color:
                result.scores.overall >= 70
                  ? '#10b981'
                  : result.scores.overall >= 40
                    ? '#d4a843'
                    : '#ef4444',
            }}
          >
            {Math.round(result.scores.overall)}
          </div>
          <span className="text-[8px] text-[#6b7280] uppercase tracking-widest font-semibold">
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
          <p className="text-[#374151] text-[10px] font-semibold uppercase tracking-wider">
            Signals
          </p>
          {result.signals.map((signal, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className={`flex-none w-2 h-2 rounded-full ${strengthDot(signal.strength)}`} />
              <span className="text-[#9ca3af] text-[11px] font-medium">{signal.source}</span>
              <span className="text-[#6b7280] text-[11px]">{signal.indicator}</span>
            </div>
          ))}
        </div>
      )}

      {/* Price range */}
      <div className="bg-[#0a0f1e] border border-[#1f2d4e] rounded-xl px-4 py-2.5">
        <p className="text-[#6b7280] text-[10px] font-semibold uppercase tracking-wider mb-1">
          Price Range
        </p>
        <p className="text-[#e5e7eb] text-xs font-mono">
          Supplier: {result.priceRange.supplier} → Retail: {result.priceRange.retail}
          <span className="text-[#10b981] ml-2">→ Margin: ~{result.priceRange.marginPercent}</span>
        </p>
      </div>

      {/* Reasoning */}
      <p className="text-[#9ca3af] text-xs leading-relaxed">{result.reasoning}</p>

      {/* Sources collapsible */}
      {result.sources.length > 0 && (
        <div>
          <button
            onClick={() => setShowSources((v) => !v)}
            className="flex items-center gap-1.5 text-[#374151] hover:text-[#6b7280] text-[11px] transition-colors"
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
                  className="block bg-[#0a0f1e] border border-[#1f2d4e] rounded-lg px-3 py-2 hover:border-[#374151] transition-colors"
                >
                  <p className="text-[#d4a843] text-[11px] font-medium truncate">{src.title}</p>
                  <p className="text-[#6b7280] text-[10px] mt-0.5 line-clamp-2">{src.snippet}</p>
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
        className="w-full flex items-center justify-center gap-2 bg-[#d4a843] hover:bg-[#b8922e] disabled:bg-[#d4a843]/40 text-[#0a0f1e] font-semibold text-sm rounded-xl px-4 py-2.5 transition-all disabled:opacity-50"
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
      className={`border-b border-[#1f2d4e] last:border-b-0 transition-colors ${
        active ? 'bg-[#d4a843]/5' : 'hover:bg-[#1f2d4e]/20'
      }`}
    >
      <div className="flex items-center gap-3 px-5 py-3.5">
        <button
          onClick={() => onSelect(session)}
          className="flex-1 flex items-start gap-3 text-left min-w-0"
        >
          <span
            className={`material-symbols-outlined text-lg flex-none mt-0.5 ${
              active ? 'text-[#d4a843]' : 'text-[#374151]'
            }`}
          >
            {session.status === 'running' ? 'pending' : 'query_stats'}
          </span>
          <div className="min-w-0">
            <p
              className={`text-sm font-medium truncate ${active ? 'text-[#d4a843]' : 'text-[#e5e7eb]'}`}
            >
              {session.query}
            </p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {session.category && session.category !== 'All' && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-[#1f2d4e] text-[#9ca3af]">
                  {session.category}
                </span>
              )}
              <span
                className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
                  session.searchMode === 'tavily'
                    ? 'bg-[#f59e0b]/10 text-[#f59e0b]'
                    : 'bg-[#6b8cff]/10 text-[#6b8cff]'
                }`}
              >
                {session.searchMode === 'tavily' ? '⚡ Tavily' : '🆓 Free'}
              </span>
              <span className="text-[#374151] text-[10px]">{relativeDate(session.createdAt)}</span>
              {session.results.length > 0 && (
                <span className="text-[#374151] text-[10px]">
                  {session.results.length} result{session.results.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
        </button>

        <button
          onClick={() => onDelete(session.id)}
          disabled={deleting}
          className="flex-none p-1.5 rounded-lg text-[#374151] hover:text-[#ef4444] hover:bg-[#ef4444]/10 transition-all disabled:opacity-50"
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
    <div className="bg-[#111827] border border-[#1f2d4e] rounded-2xl p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="h-4 bg-[#1f2d4e] rounded animate-pulse flex-1" />
        <div className="h-6 bg-[#1f2d4e] rounded-lg animate-pulse w-24" />
      </div>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-[#1f2d4e] rounded animate-pulse" />
        <div className="flex-1 space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-2 bg-[#1f2d4e] rounded-full animate-pulse" />
          ))}
        </div>
      </div>
      <div className="h-10 bg-[#1f2d4e] rounded-xl animate-pulse" />
      <div className="h-8 bg-[#1f2d4e] rounded-xl animate-pulse" />
    </div>
  );
}

function SkeletonHistory() {
  return (
    <div className="flex items-center gap-3 px-5 py-3.5 border-b border-[#1f2d4e]">
      <div className="w-5 h-5 bg-[#1f2d4e] rounded animate-pulse" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3.5 bg-[#1f2d4e] rounded animate-pulse w-2/3" />
        <div className="h-3 bg-[#1f2d4e] rounded animate-pulse w-1/3" />
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
    setResearchStep('Starting research...');

    const STEPS = [
      { at: 5, label: 'Connecting to AI model...' },
      { at: 15, label: 'Searching general trends...' },
      { at: 30, label: 'Analyzing TikTok virality...' },
      { at: 45, label: 'Checking competition landscape...' },
      { at: 60, label: 'Researching supplier prices...' },
      { at: 75, label: 'Analyzing reviews & ratings...' },
      { at: 85, label: 'Scoring and ranking products...' },
      { at: 95, label: 'Generating final report...' },
    ];

    // Simulate progress while the stream runs
    let stepIdx = 0;
    const progressInterval = setInterval(() => {
      if (stepIdx < STEPS.length) {
        setResearchProgress(STEPS[stepIdx].at);
        setResearchStep(STEPS[stepIdx].label);
        stepIdx++;
      }
    }, 4000);

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
        // Try to read error as JSON
        let errorMsg = 'Research failed';
        try {
          const errData = (await res.json()) as { error?: string };
          errorMsg = errData.error ?? errorMsg;
        } catch {
          errorMsg = `Research failed (${res.status})`;
        }
        throw new Error(errorMsg);
      }

      // Consume the stream (we don't render it — the AI saves results via tools)
      setResearchProgress(50);
      setResearchStep('AI is analyzing data...');

      const reader = res.body?.getReader();
      if (reader) {
        const decoder = new TextDecoder();
        let done = false;
        while (!done) {
          const chunk = await reader.read();
          done = chunk.done;
          if (chunk.value) {
            const text = decoder.decode(chunk.value, { stream: true });
            // Look for tool call patterns in the stream to update progress
            if (text.includes('searchTrends')) {
              setResearchProgress(25);
              setResearchStep('Analyzing market trends...');
            } else if (text.includes('searchTikTok')) {
              setResearchProgress(40);
              setResearchStep('Checking TikTok virality...');
            } else if (text.includes('searchCompetition')) {
              setResearchProgress(55);
              setResearchStep('Assessing competition...');
            } else if (text.includes('searchSupplierPrices')) {
              setResearchProgress(65);
              setResearchStep('Researching supplier prices...');
            } else if (text.includes('searchReviews')) {
              setResearchProgress(78);
              setResearchStep('Analyzing reviews & ratings...');
            } else if (text.includes('saveResearchResult')) {
              setResearchProgress(90);
              setResearchStep('Saving scored results...');
            }
          }
        }
      }

      clearInterval(progressInterval);
      setResearchProgress(98);
      setResearchStep('Fetching final results...');

      // Fetch the completed session
      if (sessionId) {
        const sessionRes = await fetch(`/api/admin/market-research/${sessionId}`);
        const sessionData = (await sessionRes.json()) as { session?: ResearchSession };
        if (sessionData.session) {
          setActiveSession(sessionData.session);
          setSessions((prev) => [
            sessionData.session!,
            ...prev.filter((s) => s.id !== sessionData.session!.id),
          ]);
          setResearchProgress(100);
          setResearchStep('Done!');
          toast.success(
            `Found ${sessionData.session.results.length} product${sessionData.session.results.length !== 1 ? 's' : ''}`,
          );
        }
      }

      // Also refresh sessions list
      void fetchSessions();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Research failed');
    } finally {
      clearInterval(progressInterval);
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
          <h1
            className="text-2xl font-bold"
            style={{ fontFamily: 'var(--font-heading)', color: '#ffffff' }}
          >
            Market Intelligence
          </h1>
          <p className="text-[#6b7280] text-sm mt-1">
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
            className="flex items-center gap-2 bg-[#111827] border border-[#1f2d4e] hover:border-[#374151] text-[#9ca3af] hover:text-white rounded-xl px-4 py-2.5 text-sm font-medium transition-all"
          >
            <span className="material-symbols-outlined text-base">add</span>
            New Research
          </button>
        )}
      </div>

      {/* ── Search Section ────────────────────────────────────────────── */}
      <div className="bg-[#111827] border border-[#1f2d4e] rounded-2xl p-5 space-y-4">
        {/* Query input */}
        <div className="relative">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#374151] text-xl pointer-events-none">
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
            className="w-full bg-[#0a0f1e] border border-[#1f2d4e] rounded-xl pl-12 pr-4 py-3.5 text-white placeholder:text-[#374151] focus:outline-none focus:border-[#d4a843]/50 transition-colors text-sm"
          />
        </div>

        {/* Category quick-select pills */}
        <div className="flex items-center gap-2 flex-wrap">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                category === cat
                  ? 'bg-[#d4a843]/10 text-[#d4a843] border border-[#d4a843]/30'
                  : 'bg-[#0a0f1e] border border-[#1f2d4e] text-[#6b7280] hover:text-[#9ca3af] hover:border-[#374151]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search mode toggle + Analyze button */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Mode toggle */}
          <div className="flex items-center bg-[#0a0f1e] border border-[#1f2d4e] rounded-xl p-1 gap-1">
            <button
              onClick={() => setSearchMode('free')}
              title="Uses AI knowledge to analyze products. Works with any configured AI key (Gemini, Claude, OpenAI). No extra cost."
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                searchMode === 'free'
                  ? 'bg-[#6b8cff]/10 text-[#6b8cff] border border-[#6b8cff]/20'
                  : 'text-[#6b7280] hover:text-[#9ca3af]'
              }`}
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
                title="Real-time web search using Tavily API. Searches Google, Amazon, TikTok, and more for current data. Requires Tavily API key (1,000 free searches/month)."
                disabled={checkingSettings || !tavilyConfigured}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  searchMode === 'tavily'
                    ? 'bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/20'
                    : tavilyConfigured
                      ? 'text-[#6b7280] hover:text-[#9ca3af]'
                      : 'text-[#374151] opacity-50 cursor-not-allowed'
                }`}
              >
                🔍 Web Search (Tavily)
                {!tavilyConfigured && !checkingSettings && (
                  <span className="material-symbols-outlined text-sm text-[#374151]">lock</span>
                )}
              </button>
              {/* Tooltip for unconfigured Tavily */}
              {!tavilyConfigured && !checkingSettings && (
                <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-10 w-52 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="bg-[#1f2d4e] border border-[#374151] rounded-lg px-3 py-2 text-[10px] text-[#9ca3af] text-center shadow-xl">
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
            className="flex items-center gap-2 bg-[#d4a843] hover:bg-[#b8922e] disabled:bg-[#d4a843]/30 disabled:cursor-not-allowed text-[#0a0f1e] font-semibold rounded-xl px-5 py-2.5 text-sm transition-all"
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
      </div>

      {/* ── Loading State with Progress ─────────────────────────────── */}
      {searching && (
        <div className="bg-[#111827] border border-[#1f2d4e] rounded-2xl p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[#d4a843] text-xl animate-spin">
                query_stats
              </span>
              <h2
                className="text-base font-semibold"
                style={{ fontFamily: 'var(--font-heading)', color: '#ffffff' }}
              >
                Researching market…
              </h2>
            </div>
            <span className="text-[#d4a843] text-2xl font-bold font-mono">{researchProgress}%</span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-[#1f2d4e] rounded-full h-3 mb-4 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-1000 ease-out"
              style={{
                width: `${researchProgress}%`,
                background: 'linear-gradient(90deg, #d4a843 0%, #f59e0b 50%, #10b981 100%)',
              }}
            />
          </div>

          {/* Current step */}
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-base text-[#d4a843] animate-pulse">
              arrow_forward
            </span>
            <span className="text-white text-sm font-medium">{researchStep}</span>
          </div>

          {/* Elapsed time */}
          <p className="text-[#374151] text-[10px] font-mono">
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
            <h2 className="text-lg font-bold" style={{ color: '#f9fafb' }}>
              Results for &ldquo;{activeSession?.query}&rdquo;
            </h2>
            <span className="text-[#6b7280] text-sm">
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
        <div className="bg-[#111827] border border-[#1f2d4e] rounded-2xl flex flex-col items-center justify-center py-16 text-center px-6">
          <span className="material-symbols-outlined text-[#1f2d4e] text-5xl mb-4">search_off</span>
          <p className="text-[#6b7280] text-sm font-medium">No products found</p>
          <p className="text-[#374151] text-xs mt-1 max-w-sm">
            The research completed but found no viable products for this query. Try a different
            niche or be more specific.
          </p>
        </div>
      )}

      {/* ── Research History ──────────────────────────────────────────── */}
      <div className="space-y-3">
        <h2
          className="text-base font-semibold"
          style={{ fontFamily: 'var(--font-heading)', color: '#ffffff' }}
        >
          Research History
        </h2>

        <div className="bg-[#111827] border border-[#1f2d4e] rounded-2xl overflow-hidden">
          {loadingSessions ? (
            Array.from({ length: 4 }).map((_, i) => <SkeletonHistory key={i} />)
          ) : sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-6">
              <span className="material-symbols-outlined text-[#1f2d4e] text-5xl mb-4">
                query_stats
              </span>
              <p className="text-[#6b7280] text-sm font-medium">No research yet</p>
              <p className="text-[#374151] text-xs mt-1 max-w-sm">
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
