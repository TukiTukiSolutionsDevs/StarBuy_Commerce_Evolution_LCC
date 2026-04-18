/**
 * AdminStatCard — Phase 1
 *
 * KPI card with icon, value, label, and optional change indicator.
 * Replaces the hardcoded KpiCard in the dashboard and similar patterns.
 */

import { AdminCard } from './Card';

interface AdminStatCardProps {
  label: string;
  value: string;
  icon: string;
  /** Semantic color for the icon badge */
  color?: string;
  /** Sub-text below the value (e.g. "Last 30 days") */
  subtitle?: string;
  /** Change indicator (e.g. "+12.5%") */
  change?: string;
  /** Whether the change is positive, negative, or neutral */
  trend?: 'up' | 'down' | 'neutral';
}

const trendColors: Record<string, string> = {
  up: 'var(--admin-success)',
  down: 'var(--admin-error)',
  neutral: 'var(--admin-text-muted)',
};

const trendIcons: Record<string, string> = {
  up: 'trending_up',
  down: 'trending_down',
  neutral: 'trending_flat',
};

export function AdminStatCard({
  label,
  value,
  icon,
  color = 'var(--admin-brand)',
  subtitle,
  change,
  trend = 'neutral',
}: AdminStatCardProps) {
  return (
    <AdminCard>
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium" style={{ color: 'var(--admin-text-muted)' }}>
          {label}
        </span>
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-none"
          style={{ backgroundColor: `color-mix(in srgb, ${color} 10%, transparent)` }}
        >
          <span className="material-symbols-outlined text-xl" style={{ color }}>
            {icon}
          </span>
        </div>
      </div>
      <p className="admin-h1 mb-0">{value}</p>
      <div className="flex items-center gap-2 mt-1">
        {change && (
          <span
            className="inline-flex items-center gap-0.5 text-xs font-medium"
            style={{ color: trendColors[trend] }}
          >
            <span className="material-symbols-outlined text-sm">{trendIcons[trend]}</span>
            {change}
          </span>
        )}
        {subtitle && (
          <span className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
            {subtitle}
          </span>
        )}
      </div>
    </AdminCard>
  );
}
