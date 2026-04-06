'use client';

/**
 * Admin Activity Feed Page
 *
 * Real-time log of all webhook events, user actions, automations, and system events.
 * Auto-refreshes every 30s. Events are expandable for JSON details.
 */

import { useCallback, useEffect, useState } from 'react';
import { useToast } from '@/components/ui/useToast';
import type { ActivityEvent } from '@/lib/webhooks/activity-log';

// ─── Constants ─────────────────────────────────────────────────────────────────

const SEVERITY_COLORS: Record<string, string> = {
  info: '#6b8cff',
  success: '#10b981',
  warning: '#d4a843',
  error: '#ef4444',
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

function EventRow({ event }: { event: ActivityEvent }) {
  const [expanded, setExpanded] = useState(false);
  const color = SEVERITY_COLORS[event.severity] ?? '#6b7280';

  return (
    <div className="border-b border-[#1f2d4e] last:border-b-0">
      {/* Main row */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-start gap-4 px-5 py-4 hover:bg-[#1f2d4e]/20 transition-colors text-left group"
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
          <p className="text-[#e5e7eb] text-sm leading-snug">{event.summary}</p>
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
              className="text-[#6b7280] text-xs"
              title={new Date(event.timestamp).toLocaleString()}
            >
              {relativeDate(event.timestamp)}
            </span>
          </div>
        </div>

        {/* Expand toggle */}
        <span
          className={`material-symbols-outlined text-lg flex-none text-[#374151] group-hover:text-[#6b7280] transition-all ${
            expanded ? 'rotate-180' : ''
          }`}
        >
          expand_more
        </span>
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="px-5 pb-4">
          <div className="bg-[#0a0f1e] border border-[#1f2d4e] rounded-xl p-4 overflow-x-auto">
            <pre className="text-[#9ca3af] text-xs font-mono whitespace-pre-wrap break-words leading-relaxed">
              {JSON.stringify(event.details, null, 2)}
            </pre>
          </div>
          <div className="flex items-center gap-4 mt-2 text-[10px] text-[#374151] font-mono">
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
    <div className="flex items-start gap-4 px-5 py-4 border-b border-[#1f2d4e]">
      <div className="flex-none mt-1 w-2.5 h-2.5 rounded-full bg-[#1f2d4e] animate-pulse" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-[#1f2d4e] rounded animate-pulse w-3/4" />
        <div className="h-3 bg-[#1f2d4e] rounded animate-pulse w-1/3" />
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

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1
            className="text-2xl font-bold text-white"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Activity Feed
          </h1>
          <p className="text-[#6b7280] text-sm mt-1">
            {loading ? 'Loading…' : `${events.length} event${events.length !== 1 ? 's' : ''}`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Refresh */}
          <button
            onClick={() => void fetchEvents()}
            disabled={loading}
            className="flex items-center gap-2 bg-[#111827] border border-[#1f2d4e] hover:border-[#374151] text-[#9ca3af] hover:text-white rounded-xl px-4 py-2.5 text-sm font-medium transition-all disabled:opacity-50"
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
              className="flex items-center gap-2 bg-[#111827] border border-[#ef4444]/30 hover:border-[#ef4444]/60 text-[#ef4444]/70 hover:text-[#ef4444] rounded-xl px-4 py-2.5 text-sm font-medium transition-all disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-base">
                {clearing ? 'hourglass_empty' : 'delete_sweep'}
              </span>
              Clear
            </button>
          )}
        </div>
      </div>

      {/* ── Filter bar ───────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap">
        {FILTER_TABS.map(({ value, label, icon }) => (
          <button
            key={value}
            onClick={() => setActiveType(value)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeType === value
                ? 'bg-[#d4a843]/10 text-[#d4a843] border border-[#d4a843]/30'
                : 'bg-[#111827] border border-[#1f2d4e] text-[#6b7280] hover:text-[#9ca3af] hover:border-[#374151]'
            }`}
          >
            <span className="material-symbols-outlined text-base">{icon}</span>
            {label}
          </button>
        ))}
      </div>

      {/* ── Event list ───────────────────────────────────────────────── */}
      <div className="bg-[#111827] border border-[#1f2d4e] rounded-2xl overflow-hidden">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => <SkeletonEvent key={i} />)
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-6">
            <span className="material-symbols-outlined text-[#1f2d4e] text-5xl mb-4">
              notifications_active
            </span>
            <p className="text-[#6b7280] text-sm font-medium">No activity yet</p>
            <p className="text-[#374151] text-xs mt-1 max-w-sm">
              Events will appear here when webhooks arrive or actions are performed in the admin.
            </p>
          </div>
        ) : (
          events.map((event) => <EventRow key={event.id} event={event} />)
        )}
      </div>

      {/* ── Auto-refresh note ─────────────────────────────────────────── */}
      {!loading && events.length > 0 && (
        <p className="text-[#374151] text-xs text-center">Auto-refreshes every 30 seconds</p>
      )}
    </div>
  );
}
