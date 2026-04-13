'use client';

import type { ProductMetrics } from '@/lib/monitor/types';
import { ProductMetricCard } from './ProductMetricCard';

interface MonitorDashboardProps {
  metrics: ProductMetrics[];
  isLoading?: boolean;
  onRefresh?: () => void;
  lastUpdated?: string;
  className?: string;
}

export function MonitorDashboard({
  metrics,
  isLoading = false,
  onRefresh,
  lastUpdated,
  className = '',
}: MonitorDashboardProps) {
  return (
    <div data-testid="monitor-dashboard" className={`space-y-4 ${className}`}>
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2
            className="text-white font-bold text-lg"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Product Monitor
          </h2>
          {lastUpdated && (
            <p className="text-[#6b7280] text-xs mt-0.5">Last updated: {lastUpdated}</p>
          )}
        </div>

        {onRefresh && (
          <button
            data-testid="refresh-button"
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            className="flex items-center gap-2 bg-[#111827] hover:bg-[#1f2d4e] border border-[#1f2d4e] text-[#9ca3af] hover:text-white rounded-xl px-4 py-2 text-sm transition-colors disabled:opacity-50"
          >
            <span
              className={`material-symbols-outlined text-base ${isLoading ? 'animate-spin' : ''}`}
            >
              refresh
            </span>
            Refresh
          </button>
        )}
      </div>

      {/* ── Loading skeleton ── */}
      {isLoading && (
        <div
          data-testid="loading-skeleton"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
        >
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-36 bg-[#111827] border border-[#1f2d4e] rounded-2xl animate-pulse"
            />
          ))}
        </div>
      )}

      {/* ── Empty state ── */}
      {!isLoading && metrics.length === 0 && (
        <div
          data-testid="empty-state"
          className="flex flex-col items-center justify-center py-24 text-center border border-dashed border-[#1f2d4e] rounded-2xl"
        >
          <span className="material-symbols-outlined text-[#374151] text-5xl mb-4">
            monitor_heart
          </span>
          <p className="text-white font-semibold text-lg mb-2">No products to monitor</p>
          <p className="text-[#6b7280] text-sm">
            Publish products to Shopify to start tracking their metrics.
          </p>
        </div>
      )}

      {/* ── Metrics grid ── */}
      {!isLoading && metrics.length > 0 && (
        <div
          data-testid="metrics-grid"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
        >
          {metrics.map((m) => (
            <ProductMetricCard key={m.shopifyProductId} metrics={m} />
          ))}
        </div>
      )}
    </div>
  );
}
