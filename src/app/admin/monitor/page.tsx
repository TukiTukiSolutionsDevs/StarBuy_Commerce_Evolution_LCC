'use client';

/**
 * Monitor Dashboard — Phase 4
 *
 * Migrated to use admin design tokens. Zero hardcoded hex colors.
 * Fetches product metrics from GET /api/admin/monitor.
 */

import { useState, useEffect, useCallback } from 'react';
import { MonitorDashboard } from '@/components/admin/monitor/MonitorDashboard';
import type { ProductMetrics, HealthStatus } from '@/lib/monitor/types';

type HealthFilter = 'all' | HealthStatus;

const HEALTH_TABS: { id: HealthFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'healthy', label: 'Healthy' },
  { id: 'warning', label: 'Warning' },
  { id: 'critical', label: 'Critical' },
  { id: 'unknown', label: 'Unknown' },
];

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
      {/* Page header */}
      <div className="flex items-start gap-4">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center flex-none"
          style={{ backgroundColor: 'color-mix(in srgb, var(--admin-brand) 15%, transparent)' }}
        >
          <span
            className="material-symbols-outlined"
            style={{ fontSize: 24, color: 'var(--admin-brand)' }}
          >
            monitor_heart
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="admin-h1 text-2xl">Product Monitor</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>
            Track health, views, orders, and revenue for published products
          </p>
        </div>
      </div>

      {/* Health filter tabs */}
      <div
        className="flex items-center gap-1 rounded-xl p-1 overflow-x-auto w-fit"
        style={{
          backgroundColor: 'var(--admin-bg-elevated)',
          border: '1px solid var(--admin-border)',
        }}
        data-testid="health-filter-tabs"
      >
        {HEALTH_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setHealthFilter(tab.id)}
            data-testid={`filter-tab-${tab.id}`}
            className="px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all"
            style={{
              backgroundColor:
                healthFilter === tab.id
                  ? 'color-mix(in srgb, var(--admin-brand) 15%, transparent)'
                  : 'transparent',
              border:
                healthFilter === tab.id
                  ? '1px solid color-mix(in srgb, var(--admin-brand) 30%, transparent)'
                  : '1px solid transparent',
              color: healthFilter === tab.id ? 'var(--admin-brand)' : 'var(--admin-text-muted)',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Error state */}
      {!loading && fetchError && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <span
            className="material-symbols-outlined text-5xl mb-3"
            style={{ color: 'var(--admin-error)' }}
          >
            error
          </span>
          <p className="font-medium mb-1" style={{ color: 'var(--admin-error)' }}>
            Failed to load metrics
          </p>
          <p className="text-sm mb-4" style={{ color: 'var(--admin-text-muted)' }}>
            {fetchError}
          </p>
          <button
            type="button"
            onClick={() => void fetchMetrics()}
            className="flex items-center gap-2 font-semibold rounded-xl px-5 py-2.5 text-sm transition-colors"
            style={{ backgroundColor: 'var(--admin-brand)', color: 'var(--admin-bg)' }}
          >
            <span className="material-symbols-outlined text-base">refresh</span>
            Retry
          </button>
        </div>
      )}

      {/* Dashboard */}
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
