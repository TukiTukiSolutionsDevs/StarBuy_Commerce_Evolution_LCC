'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { HealthBadge } from '@/components/admin/monitor/HealthBadge';
import { PerformanceHistory } from '@/components/admin/monitor/PerformanceHistory';
import type { ProductMetrics, MetricsSnapshot } from '@/lib/monitor/types';

export default function MonitorDetailPage() {
  const { shopifyId } = useParams<{ shopifyId: string }>();
  const router = useRouter();

  const [metrics, setMetrics] = useState<ProductMetrics | null>(null);
  const [snapshots, setSnapshots] = useState<MetricsSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!shopifyId) return;
    async function load() {
      setLoading(true);
      try {
        const [metricsRes, snapshotsRes] = await Promise.all([
          fetch(`/api/admin/monitor/${shopifyId}`),
          fetch(`/api/admin/monitor/${shopifyId}/snapshots`),
        ]);
        if (!metricsRes.ok) throw new Error('Failed to load metrics');
        const metricsData = (await metricsRes.json()) as { metrics: ProductMetrics };
        const snapshotsData = snapshotsRes.ok
          ? ((await snapshotsRes.json()) as { snapshots: MetricsSnapshot[] })
          : { snapshots: [] };
        setMetrics(metricsData.metrics);
        setSnapshots(snapshotsData.snapshots);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [shopifyId]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-[#4b5563]">Loading…</p>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-red-400">{error ?? 'Metrics not found'}</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <button
        onClick={() => router.push('/admin/monitor')}
        className="mb-6 flex items-center gap-1 text-sm text-[#6b7280] hover:text-white transition-colors"
      >
        ← Back to Monitor
      </button>

      <div className="mb-6 flex items-center gap-3">
        <h1 className="text-xl font-semibold text-white">{metrics.title}</h1>
        <HealthBadge health={metrics.health} reasons={metrics.healthReasons} showTooltip />
      </div>

      {/* Current Metrics Grid */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <MetricCard label="Views" value={metrics.views.toLocaleString()} />
        <MetricCard label="Orders" value={String(metrics.orders)} />
        <MetricCard label="Revenue" value={`$${metrics.revenue.toFixed(2)}`} />
        <MetricCard label="Conversion" value={`${(metrics.conversionRate * 100).toFixed(1)}%`} />
        <MetricCard label="Inventory" value={String(metrics.inventory)} />
      </div>

      {/* Performance History */}
      <PerformanceHistory
        shopifyProductId={shopifyId}
        snapshots={snapshots}
        currentMetrics={metrics}
      />
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#1f2d4e] bg-[#111827] px-4 py-3">
      <p className="text-xs text-[#6b7280]">{label}</p>
      <p className="mt-1 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}
