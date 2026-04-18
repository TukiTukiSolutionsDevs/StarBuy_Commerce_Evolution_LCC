'use client';

/**
 * Admin Activity Feed Page
 *
 * Real-time log of all webhook events, user actions, automations, and system events.
 * Auto-refreshes every 30s. Events are expandable for JSON details.
 * Features: search, date range filter, per-type stats, clear.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useToast } from '@/components/ui/useToast';
import type { ActivityEvent } from '@/lib/webhooks/activity-log';

// ─── Constants ─────────────────────────────────────────────────────────────────

const SEVERITY_COLORS: Record<string, string> = {
  info: 'var(--admin-info)',
  success: 'var(--admin-success)',
  warning: 'var(--admin-brand)',
  error: 'var(--admin-error)',
};

const FILTER_TABS: { value: string; label: string; icon: string }[] = [
  { value: '', label: 'All', icon: 'all_inbox' },
  { value: 'webhook', label: 'Webhooks', icon: 'webhook' },
  { value: 'user_action', label: 'User Actions', icon: 'person' },
  { value: 'automation', label: 'Automations', icon: 'smart_toy' },
  { value: 'system', label: 'System', icon: 'settings_suggest' },
];

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

function formatTopicBadge(topic: string): string {
  return topic.replace(/\//g, ' › ');
}

// ─── Event Row ─────────────────────────────────────────────────────────────────

function EventRow({ event, query }: { event: ActivityEvent; query: string }) {
  const [expanded, setExpanded] = useState(false);
  const color = SEVERITY_COLORS[event.severity] ?? 'var(--admin-text-muted)';

  // Highlight matching text in summary
  function highlightText(text: string) {
    if (!query.trim()) return <span>{text}</span>;
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return (
      <>
        {parts.map((part, i) =>
          regex.test(part) ? (
            <mark
              key={i}
              className="rounded px-0.5"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--admin-brand) 25%, transparent)',
                color: 'var(--admin-brand)',
              }}
            >
              {part}
            </mark>
          ) : (
            <span key={i}>{part}</span>
          ),
        )}
      </>
    );
  }

  return (
    <div style={{ borderBottom: '1px solid var(--admin-border)' }} className="last:border-b-0">
      {/* Main row */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-start gap-4 px-5 py-4 transition-colors text-left group hover:bg-[color-mix(in_srgb,var(--admin-border)_20%,transparent)]"
      >
        {/* Severity dot */}
        <div className="flex-none mt-1">
          <span
            className="block w-2.5 h-2.5 rounded-full ring-2 ring-current/20"
            style={{ backgroundColor: color, color }}
            title={event.severity}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm leading-snug" style={{ color: 'var(--admin-text-body)' }}>
            {highlightText(event.summary)}
          </p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {/* Topic badge */}
            <span
              className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-medium"
              style={{
                backgroundColor: `${color}15`,
                color,
              }}
            >
              {formatTopicBadge(event.topic)}
            </span>
            {/* Timestamp */}
            <span
              className="text-xs"
              style={{ color: 'var(--admin-text-muted)' }}
              title={new Date(event.timestamp).toLocaleString()}
            >
              {relativeDate(event.timestamp)}
            </span>
          </div>
        </div>

        {/* Expand toggle */}
        <span
          className={`material-symbols-outlined text-lg flex-none transition-all ${
            expanded ? 'rotate-180' : ''
          }`}
          style={{ color: 'var(--admin-text-disabled)' }}
        >
          expand_more
        </span>
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="px-5 pb-4">
          <div
            className="rounded-xl p-4 overflow-x-auto"
            style={{
              backgroundColor: 'var(--admin-bg)',
              borderWidth: 1,
              borderStyle: 'solid',
              borderColor: 'var(--admin-border)',
            }}
          >
            <pre
              className="text-xs font-mono whitespace-pre-wrap break-words leading-relaxed"
              style={{ color: 'var(--admin-text-secondary)' }}
            >
              {JSON.stringify(event.details, null, 2)}
            </pre>
          </div>
          <div
            className="flex items-center gap-4 mt-2 text-[10px] font-mono"
            style={{ color: 'var(--admin-text-disabled)' }}
          >
            <span>id: {event.id}</span>
            <span>type: {event.type}</span>
            <span>{new Date(event.timestamp).toLocaleString()}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonEvent() {
  return (
    <div
      className="flex items-start gap-4 px-5 py-4"
      style={{ borderBottom: '1px solid var(--admin-border)' }}
    >
      <div
        className="flex-none mt-1 w-2.5 h-2.5 rounded-full animate-pulse"
        style={{ backgroundColor: 'var(--admin-border)' }}
      />
      <div className="flex-1 space-y-2">
        <div
          className="h-4 rounded animate-pulse w-3/4"
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

export default function ActivityPage() {
  const { toast } = useToast();

  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const [activeType, setActiveType] = useState<string>('');

  // ── Search & date filter state ─────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // ── Fetch ─────────────────────────────────────────────────────────────────

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '200' });
      if (activeType) params.set('type', activeType);

      const res = await fetch(`/api/admin/activity?${params}`);
      const data = (await res.json()) as { events?: ActivityEvent[]; error?: string };

      if (!res.ok) throw new Error(data.error ?? 'Failed to load activity');
      setEvents(data.events ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load activity');
    } finally {
      setLoading(false);
    }
  }, [activeType, toast]);

  useEffect(() => {
    void fetchEvents();
  }, [fetchEvents]);

  // Auto-refresh every 30s
  useEffect(() => {
    const interval = setInterval(() => void fetchEvents(), 30_000);
    return () => clearInterval(interval);
  }, [fetchEvents]);

  // ── Clear ─────────────────────────────────────────────────────────────────

  async function handleClear() {
    if (!confirm('Clear all activity events? This cannot be undone.')) return;

    setClearing(true);
    try {
      const res = await fetch('/api/admin/activity', { method: 'DELETE' });
      const data = (await res.json()) as { success?: boolean; error?: string };

      if (!res.ok) throw new Error(data.error ?? 'Failed to clear');
      setEvents([]);
      toast.success('Activity log cleared');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to clear activity');
    } finally {
      setClearing(false);
    }
  }

  // ── Client-side filtering (search + date) ─────────────────────────────────

  const filtered = useMemo(() => {
    let result = events;

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (e) =>
          e.summary.toLowerCase().includes(q) ||
          e.topic.toLowerCase().includes(q) ||
          e.type.toLowerCase().includes(q),
      );
    }

    // Date from
    if (dateFrom) {
      const from = new Date(dateFrom).getTime();
      result = result.filter((e) => e.timestamp >= from);
    }

    // Date to — include the whole "to" day
    if (dateTo) {
      const to = new Date(dateTo).getTime() + 86_400_000 - 1;
      result = result.filter((e) => e.timestamp <= to);
    }

    return result;
  }, [events, search, dateFrom, dateTo]);

  // ── Per-type counts for stats ──────────────────────────────────────────────

  const stats = useMemo(() => {
    const all = events;
    return [
      {
        label: 'Total',
        value: all.length,
        icon: 'all_inbox',
        color: 'var(--admin-text-secondary)',
      },
      {
        label: 'Webhooks',
        value: all.filter((e) => e.type === 'webhook').length,
        icon: 'webhook',
        color: 'var(--admin-info)',
      },
      {
        label: 'User Actions',
        value: all.filter((e) => e.type === 'user_action').length,
        icon: 'person',
        color: 'var(--admin-success)',
      },
      {
        label: 'Automations',
        value: all.filter((e) => e.type === 'automation').length,
        icon: 'smart_toy',
        color: 'var(--admin-brand)',
      },
      {
        label: 'Errors',
        value: all.filter((e) => e.severity === 'error').length,
        icon: 'error',
        color: 'var(--admin-error)',
      },
    ];
  }, [events]);

  const hasFilters = search.trim() || dateFrom || dateTo;

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ fontFamily: 'var(--font-heading)', color: 'var(--admin-text)' }}
          >
            Activity Feed
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--admin-text-muted)' }}>
            {loading
              ? 'Loading…'
              : hasFilters
                ? `${filtered.length} of ${events.length} event${events.length !== 1 ? 's' : ''}`
                : `${events.length} event${events.length !== 1 ? 's' : ''}`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Refresh */}
          <button
            onClick={() => void fetchEvents()}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all disabled:opacity-50"
            style={{
              backgroundColor: 'var(--admin-bg-card)',
              borderWidth: 1,
              borderStyle: 'solid',
              borderColor: 'var(--admin-border)',
              color: 'var(--admin-text-secondary)',
            }}
          >
            <span
              className={`material-symbols-outlined text-base ${loading ? 'animate-spin' : ''}`}
            >
              refresh
            </span>
            Refresh
          </button>

          {/* Clear */}
          {events.length > 0 && (
            <button
              onClick={() => void handleClear()}
              disabled={clearing}
              className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all disabled:opacity-50"
              style={{
                backgroundColor: 'var(--admin-bg-card)',
                borderWidth: 1,
                borderStyle: 'solid',
                borderColor: 'color-mix(in srgb, var(--admin-error) 30%, transparent)',
                color: 'var(--admin-error)',
              }}
            >
              <span className="material-symbols-outlined text-base">
                {clearing ? 'hourglass_empty' : 'delete_sweep'}
              </span>
              Clear
            </button>
          )}
        </div>
      </div>

      {/* ── Stats row ────────────────────────────────────────────────── */}
      {!loading && events.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl px-3 py-2.5 flex items-center gap-2.5"
              style={{
                backgroundColor: 'var(--admin-bg-card)',
                borderWidth: 1,
                borderStyle: 'solid',
                borderColor: 'var(--admin-border)',
              }}
            >
              <span className="material-symbols-outlined text-lg" style={{ color: stat.color }}>
                {stat.icon}
              </span>
              <div>
                <p
                  className="text-base font-bold leading-none"
                  style={{ color: 'var(--admin-text)' }}
                >
                  {stat.value}
                </p>
                <p
                  className="text-[10px] font-medium mt-0.5"
                  style={{ color: 'var(--admin-text-muted)' }}
                >
                  {stat.label}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Filter bar ───────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap">
        {FILTER_TABS.map(({ value, label, icon }) => (
          <button
            key={value}
            onClick={() => setActiveType(value)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
            style={
              activeType === value
                ? {
                    backgroundColor: 'color-mix(in srgb, var(--admin-brand) 10%, transparent)',
                    color: 'var(--admin-brand)',
                    borderWidth: 1,
                    borderStyle: 'solid',
                    borderColor: 'color-mix(in srgb, var(--admin-brand) 30%, transparent)',
                  }
                : {
                    backgroundColor: 'var(--admin-bg-card)',
                    borderWidth: 1,
                    borderStyle: 'solid',
                    borderColor: 'var(--admin-border)',
                    color: 'var(--admin-text-muted)',
                  }
            }
          >
            <span className="material-symbols-outlined text-base">{icon}</span>
            {label}
          </button>
        ))}
      </div>

      {/* ── Search + Date range ──────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-2">
        {/* Search */}
        <div className="relative flex-1">
          <span
            className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-lg pointer-events-none"
            style={{ color: 'var(--admin-text-disabled)' }}
          >
            search
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search events, topics…"
            className="w-full rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none transition-colors"
            style={{
              backgroundColor: 'var(--admin-bg-card)',
              borderWidth: 1,
              borderStyle: 'solid',
              borderColor: 'var(--admin-border)',
              color: 'var(--admin-text)',
            }}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
              style={{ color: 'var(--admin-text-disabled)' }}
            >
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          )}
        </div>

        {/* Date from */}
        <div className="relative">
          <span
            className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-base pointer-events-none"
            style={{ color: 'var(--admin-text-disabled)' }}
          >
            calendar_today
          </span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            title="From date"
            className="rounded-xl pl-9 pr-3 py-2.5 text-sm focus:outline-none transition-colors w-40 [color-scheme:dark]"
            style={{
              backgroundColor: 'var(--admin-bg-card)',
              borderWidth: 1,
              borderStyle: 'solid',
              borderColor: 'var(--admin-border)',
              color: 'var(--admin-text-secondary)',
            }}
          />
        </div>

        {/* Date to */}
        <div className="relative">
          <span
            className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-base pointer-events-none"
            style={{ color: 'var(--admin-text-disabled)' }}
          >
            event
          </span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            title="To date"
            className="rounded-xl pl-9 pr-3 py-2.5 text-sm focus:outline-none transition-colors w-40 [color-scheme:dark]"
            style={{
              backgroundColor: 'var(--admin-bg-card)',
              borderWidth: 1,
              borderStyle: 'solid',
              borderColor: 'var(--admin-border)',
              color: 'var(--admin-text-secondary)',
            }}
          />
        </div>

        {/* Clear filters */}
        {hasFilters && (
          <button
            onClick={() => {
              setSearch('');
              setDateFrom('');
              setDateTo('');
            }}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm transition-all"
            style={{
              backgroundColor: 'var(--admin-bg-card)',
              borderWidth: 1,
              borderStyle: 'solid',
              borderColor: 'var(--admin-border)',
              color: 'var(--admin-text-muted)',
            }}
          >
            <span className="material-symbols-outlined text-base">filter_alt_off</span>
            Clear
          </button>
        )}
      </div>

      {/* ── Event list ───────────────────────────────────────────────── */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          backgroundColor: 'var(--admin-bg-card)',
          borderWidth: 1,
          borderStyle: 'solid',
          borderColor: 'var(--admin-border)',
        }}
      >
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => <SkeletonEvent key={i} />)
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-6">
            <span
              className="material-symbols-outlined text-5xl mb-4"
              style={{ color: 'var(--admin-border)' }}
            >
              {hasFilters ? 'search_off' : 'notifications_active'}
            </span>
            <p className="text-sm font-medium" style={{ color: 'var(--admin-text-muted)' }}>
              {hasFilters ? 'No events match your filters' : 'No activity yet'}
            </p>
            <p className="text-xs mt-1 max-w-sm" style={{ color: 'var(--admin-text-disabled)' }}>
              {hasFilters
                ? 'Try adjusting your search or date range.'
                : 'Events will appear here when webhooks arrive or actions are performed in the admin.'}
            </p>
            {hasFilters && (
              <button
                onClick={() => {
                  setSearch('');
                  setDateFrom('');
                  setDateTo('');
                }}
                className="mt-4 text-xs hover:underline"
                style={{ color: 'var(--admin-brand)' }}
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          filtered.map((event) => <EventRow key={event.id} event={event} query={search} />)
        )}
      </div>

      {/* ── Auto-refresh note ─────────────────────────────────────────── */}
      {!loading && events.length > 0 && (
        <p className="text-xs text-center" style={{ color: 'var(--admin-text-disabled)' }}>
          Auto-refreshes every 30 seconds
        </p>
      )}
    </div>
  );
}
