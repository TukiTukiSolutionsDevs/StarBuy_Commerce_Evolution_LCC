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
      return { icon: 'trending_up', token: 'var(--admin-success)' };
    case 'down':
      return { icon: 'trending_down', token: 'var(--admin-error)' };
    default:
      return { icon: 'trending_flat', token: 'var(--admin-text-muted)' };
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function StateStatCard({ label, value, trend, subtitle }: StateStatCardProps) {
  const trendConfig = trend ? getTrendConfig(trend) : null;

  return (
    <div
      data-testid="state-stat-card"
      className="rounded-xl p-4"
      style={{
        backgroundColor: 'var(--admin-bg-card)',
        border: '1px solid var(--admin-border)',
      }}
    >
      <p
        className="text-[10px] font-semibold uppercase tracking-widest mb-1"
        style={{ color: 'var(--admin-text-muted)' }}
      >
        {label}
      </p>
      <div className="flex items-end gap-2">
        <span
          data-testid="stat-value"
          className="text-2xl font-bold"
          style={{ color: 'var(--admin-text)' }}
        >
          {value}
        </span>
        {trendConfig && (
          <span
            data-testid="stat-trend"
            className="material-symbols-outlined text-lg"
            style={{ color: trendConfig.token }}
          >
            {trendConfig.icon}
          </span>
        )}
      </div>
      {subtitle && (
        <p
          data-testid="stat-subtitle"
          className="text-xs mt-1"
          style={{ color: 'var(--admin-text-muted)' }}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}

export default StateStatCard;
