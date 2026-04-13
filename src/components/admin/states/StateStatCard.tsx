'use client';

/**
 * StateStatCard
 *
 * KPI card showing a label, value, and optional trend direction arrow.
 * Used on state profile pages and the map dashboard.
 */

// ─── Props ────────────────────────────────────────────────────────────────────

export type TrendDirection = 'up' | 'down' | 'neutral';

interface StateStatCardProps {
  label: string;
  value: string | number;
  trend?: TrendDirection;
  subtitle?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTrendConfig(trend: TrendDirection) {
  switch (trend) {
    case 'up':
      return { icon: 'trending_up', color: 'text-emerald-400' };
    case 'down':
      return { icon: 'trending_down', color: 'text-red-400' };
    default:
      return { icon: 'trending_flat', color: 'text-gray-400' };
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function StateStatCard({ label, value, trend, subtitle }: StateStatCardProps) {
  const trendConfig = trend ? getTrendConfig(trend) : null;

  return (
    <div
      data-testid="state-stat-card"
      className="rounded-xl border border-[#1f2d4e] bg-[#0d1526] p-4"
    >
      <p className="text-[10px] font-semibold uppercase tracking-widest text-[#4b5563] mb-1">
        {label}
      </p>
      <div className="flex items-end gap-2">
        <span data-testid="stat-value" className="text-2xl font-bold text-white">
          {value}
        </span>
        {trendConfig && (
          <span
            data-testid="stat-trend"
            className={`material-symbols-outlined text-lg ${trendConfig.color}`}
          >
            {trendConfig.icon}
          </span>
        )}
      </div>
      {subtitle && (
        <p data-testid="stat-subtitle" className="text-xs text-[#6b7280] mt-1">
          {subtitle}
        </p>
      )}
    </div>
  );
}

export default StateStatCard;
