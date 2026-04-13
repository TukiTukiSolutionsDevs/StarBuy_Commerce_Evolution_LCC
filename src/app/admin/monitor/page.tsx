'use client';

/**
 * Monitor Dashboard — Sprint E Phase 2
 *
 * Fetches product metrics from GET /api/admin/monitor.
 * Renders MonitorDashboard with health filter tabs and manual refresh.
 */

import { useState, useEffect, useCallback } from 'react';
import { MonitorDashboard } from '@/components/admin/monitor/MonitorDashboard';
import type { ProductMetrics, HealthStatus } from '@/lib/monitor/types';

// ─── Types ────────────────────────────────────────────────────────────────────

type HealthFilter = 'all' | HealthStatus;

// ─── Constants ────────────────────────────────────────────────────────────────

const HEALTH_TABS: { id: HealthFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'healthy', label: 'Healthy' },
  { id: 'warning', label: 'Warning' },
  { id: 'critical', label: 'Critical' },
  { id: 'unknown', label: 'Unknown' },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MonitorPage() {
  const [metrics, setMetrics] = useState<ProductMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [lastUpdated, setLastUpdated] = useState('');
  const [healthFilter, setHealthFilter] = useState<HealthFilter>('all');

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    setFetchError('');
    try {
      const query = healthFilter !== 'all' ? `?health=${healthFilter}` : '';
      const res = await fetch(`/api/admin/monitor${query}`);
      const data = (await res.json()) as { metrics?: ProductMetrics[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Failed to load');
      setMetrics(data.metrics ?? []);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'Failed to load metrics');
    } finally {
      setLoading(false);
    }
  }, [healthFilter]);

  useEffect(() => {
    void fetchMetrics();
  }, [fetchMetrics]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6" data-testid="monitor-page">
      {/* ── Page header ── */}
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl bg-[#d4a843]/15 flex items-center justify-center flex-none">
          <span className="material-symbols-outlined text-[#d4a843]" style={{ fontSize: 24 }}>
            monitor_heart
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <h1
            className="text-2xl font-bold text-white"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Product Monitor
          </h1>
          <p className="text-[#6b7280] text-sm mt-0.5">
            Track health, views, orders, and revenue for published products
          </p>
        </div>
      </div>

      {/* ── Health filter tabs ── */}
      <div
        className="flex items-center gap-1 bg-[#0d1526] border border-[#1f2d4e] rounded-xl p-1 overflow-x-auto w-fit"
        data-testid="health-filter-tabs"
      >
        {HEALTH_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setHealthFilter(tab.id)}
            data-testid={`filter-tab-${tab.id}`}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              healthFilter === tab.id
                ? 'bg-[#d4a843]/15 text-[#d4a843] border border-[#d4a843]/30'
                : 'text-[#6b7280] hover:text-[#9ca3af]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Error state ── */}
      {!loading && fetchError && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <span className="material-symbols-outlined text-[#ef4444] text-5xl mb-3">error</span>
          <p className="text-[#ef4444] font-medium mb-1">Failed to load metrics</p>
          <p className="text-[#6b7280] text-sm mb-4">{fetchError}</p>
          <button
            type="button"
            onClick={() => void fetchMetrics()}
            className="flex items-center gap-2 bg-[#d4a843] hover:bg-[#c49833] text-[#0d1526] font-semibold rounded-xl px-5 py-2.5 text-sm transition-colors"
          >
            <span className="material-symbols-outlined text-base">refresh</span>
            Retry
          </button>
        </div>
      )}

      {/* ── Dashboard ── */}
      {!fetchError && (
        <MonitorDashboard
          metrics={metrics}
          isLoading={loading}
          onRefresh={() => void fetchMetrics()}
          lastUpdated={lastUpdated}
        />
      )}
    </div>
  );
}
