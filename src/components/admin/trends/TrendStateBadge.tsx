'use client';

/**
 * TrendStateBadge
 *
 * Colored pill badge for a TrendState value.
 * Shows material-symbol icon + capitalized state label.
 */

import type { TrendState } from '@/lib/trends/types';

// ─── State config (canonical — re-exported for ScoreRing + others) ────────────

export const STATE_CONFIG: Record<TrendState, { color: string; icon: string; label: string }> = {
  rising: { color: '#10b981', icon: 'trending_up', label: 'Rising' },
  peak: { color: '#d4a843', icon: 'rocket_launch', label: 'Peak' },
  stable: { color: '#6b8cff', icon: 'trending_flat', label: 'Stable' },
  declining: { color: '#ef4444', icon: 'trending_down', label: 'Declining' },
  unknown: { color: '#4b5563', icon: 'help', label: 'Unknown' },
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface TrendStateBadgeProps {
  state: TrendState;
  size?: 'sm' | 'md';
}

// ─── Component ───────────────────────────────────────────────────────────────

export function TrendStateBadge({ state, size = 'md' }: TrendStateBadgeProps) {
  const { color, icon, label } = STATE_CONFIG[state] ?? STATE_CONFIG.unknown;

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs font-medium';

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border ${sizeClasses}`}
      style={{
        backgroundColor: `${color}26`, // ~15% opacity
        borderColor: `${color}4d`, // ~30% opacity
        color,
      }}
    >
      <span
        className="material-symbols-outlined"
        style={{ fontSize: size === 'sm' ? 10 : 12, lineHeight: 1 }}
      >
        {icon}
      </span>
      {label}
    </span>
  );
}

export default TrendStateBadge;
