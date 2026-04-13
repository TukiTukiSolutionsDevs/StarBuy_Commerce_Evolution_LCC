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
      className={`rounded-xl border border-[#1f2d4e] bg-[#111827] p-5 ${className}`}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white">Performance History</h3>
        <div className="flex rounded-lg border border-[#1f2d4e] overflow-hidden">
          <button
            data-testid="view-toggle-table"
            onClick={() => setView('table')}
            className={`px-3 py-1 text-xs transition-colors ${
              view === 'table'
                ? 'bg-[#d4a843]/10 text-[#d4a843]'
                : 'text-[#6b7280] hover:text-white'
            }`}
          >
            Table
          </button>
          <button
            data-testid="view-toggle-chart"
            onClick={() => setView('chart')}
            className={`px-3 py-1 text-xs transition-colors ${
              view === 'chart'
                ? 'bg-[#d4a843]/10 text-[#d4a843]'
                : 'text-[#6b7280] hover:text-white'
            }`}
          >
            Chart
          </button>
        </div>
      </div>

      {snapshots.length === 0 ? (
        <p data-testid="history-empty" className="text-sm text-[#4b5563] text-center py-8">
          No historical data yet. Snapshots are created weekly.
        </p>
      ) : view === 'table' ? (
        <div className="overflow-x-auto">
          <table data-testid="history-table" className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#1f2d4e] text-[#6b7280]">
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
                <tr key={s.id} className="border-b border-[#1f2d4e]/50 text-[#9ca3af]">
                  <td className="py-2 px-2 text-white">{s.weekStart}</td>
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
              <p className="text-[10px] text-[#6b7280] uppercase tracking-wider">{metric}</p>
              <MetricsSparkline snapshots={snapshots} metric={metric} width={200} height={60} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
