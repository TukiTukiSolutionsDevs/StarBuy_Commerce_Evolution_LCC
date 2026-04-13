'use client';

import type { ProductMetrics } from '@/lib/monitor/types';
import { HealthBadge } from './HealthBadge';

interface ProductMetricCardProps {
  metrics: ProductMetrics;
  onClick?: (shopifyProductId: string) => void;
  className?: string;
}

export function ProductMetricCard({ metrics, onClick, className = '' }: ProductMetricCardProps) {
  const { shopifyProductId, title, health, healthReasons, views, orders, revenue, inventory } =
    metrics;

  return (
    <div
      data-testid="product-metric-card"
      onClick={() => onClick?.(shopifyProductId)}
      className={`bg-[#111827] border border-[#1f2d4e] rounded-2xl p-4 flex flex-col gap-3 ${
        onClick ? 'cursor-pointer hover:border-[#d4a843]/40 transition-colors' : ''
      } ${className}`}
    >
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-2">
        <p className="text-white font-semibold text-sm truncate flex-1">{title}</p>
        <HealthBadge health={health} reasons={healthReasons} size="sm" showTooltip />
      </div>

      {/* ── Stats grid ── */}
      <div className="grid grid-cols-3 gap-2">
        <div className="flex flex-col">
          <span className="text-[#6b7280] text-[10px] uppercase tracking-wide">Views</span>
          <span className="text-white text-sm font-semibold">{views.toLocaleString()}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[#6b7280] text-[10px] uppercase tracking-wide">Orders</span>
          <span className="text-white text-sm font-semibold">{orders.toLocaleString()}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[#6b7280] text-[10px] uppercase tracking-wide">Revenue</span>
          <span className="text-[#d4a843] text-sm font-semibold">${revenue.toFixed(2)}</span>
        </div>
      </div>

      {/* ── Inventory ── */}
      <div className="flex items-center gap-1.5 text-xs text-[#6b7280]">
        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
          inventory_2
        </span>
        <span data-testid="inventory-count">{inventory} in stock</span>
      </div>
    </div>
  );
}
