'use client';

import { useState } from 'react';
import type { ProductMetrics, MetricsSnapshot } from '@/lib/monitor/types';
import { MetricsSparkline } from './MetricsSparkline';

interface PerformanceHistoryProps {
  shopifyProductId: string;
  snapshots: MetricsSnapshot[];
  currentMetrics: ProductMetrics;
  view?: 'table' | 'chart';
  className?: string;
}

export function PerformanceHistory({
  snapshots,
  currentMetrics: _currentMetrics,
  view: initialView = 'table',
  className = '',
}: PerformanceHistoryProps) {
  const [view, setView] = useState(initialView);

  const sorted = [...snapshots].sort(
    (a, b) => new Date(b.weekStart).getTime() - new Date(a.weekStart).getTime(),
  );

  return (
    <div
      data-testid="performance-history"
      className={`rounded-xl border border-[var(--admin-border)] bg-[var(--admin-bg-card)] p-5 ${className}`}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[var(--admin-text-heading)]">
          Performance History
        </h3>
        <div className="flex rounded-lg border border-[var(--admin-border)] overflow-hidden">
          <button
            data-testid="view-toggle-table"
            onClick={() => setView('table')}
            className={`px-3 py-1 text-xs transition-colors ${
              view === 'table'
                ? 'bg-[var(--admin-brand)]/10 text-[var(--admin-brand)]'
                : 'text-[var(--admin-text-muted)] hover:text-[var(--admin-text)]'
            }`}
          >
            Table
          </button>
          <button
            data-testid="view-toggle-chart"
            onClick={() => setView('chart')}
            className={`px-3 py-1 text-xs transition-colors ${
              view === 'chart'
                ? 'bg-[var(--admin-brand)]/10 text-[var(--admin-brand)]'
                : 'text-[var(--admin-text-muted)] hover:text-[var(--admin-text)]'
            }`}
          >
            Chart
          </button>
        </div>
      </div>

      {snapshots.length === 0 ? (
        <p
          data-testid="history-empty"
          className="text-sm text-[var(--admin-text-disabled)] text-center py-8"
        >
          No historical data yet. Snapshots are created weekly.
        </p>
      ) : view === 'table' ? (
        <div className="overflow-x-auto">
          <table data-testid="history-table" className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--admin-border)] text-[var(--admin-text-muted)]">
                <th className="text-left py-2 px-2 font-medium">Week</th>
                <th className="text-right py-2 px-2 font-medium">Views</th>
                <th className="text-right py-2 px-2 font-medium">Orders</th>
                <th className="text-right py-2 px-2 font-medium">Revenue</th>
                <th className="text-right py-2 px-2 font-medium">Conv.</th>
                <th className="text-right py-2 px-2 font-medium">Stock</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((s) => (
                <tr
                  key={s.id}
                  className="border-b border-[var(--admin-border)]/50 text-[var(--admin-text-secondary)]"
                >
                  <td className="py-2 px-2 text-[var(--admin-text)]">{s.weekStart}</td>
                  <td className="py-2 px-2 text-right">{s.views.toLocaleString()}</td>
                  <td className="py-2 px-2 text-right">{s.orders}</td>
                  <td className="py-2 px-2 text-right">${s.revenue.toFixed(2)}</td>
                  <td className="py-2 px-2 text-right">{(s.conversionRate * 100).toFixed(1)}%</td>
                  <td className="py-2 px-2 text-right">{s.inventory}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div data-testid="history-charts" className="grid grid-cols-2 gap-4">
          {(['orders', 'revenue', 'views', 'conversionRate'] as const).map((metric) => (
            <div key={metric} className="space-y-1">
              <p className="text-[10px] text-[var(--admin-text-muted)] uppercase tracking-wider">
                {metric}
              </p>
              <MetricsSparkline snapshots={snapshots} metric={metric} width={200} height={60} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
