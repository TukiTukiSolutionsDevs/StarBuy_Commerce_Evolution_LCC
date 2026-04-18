'use client';

/**
 * MarginBadge
 *
 * Shows margin % with color coding:
 *   - Red    < 20%
 *   - Yellow  20–40%
 *   - Green  > 40%
 */

// ─── Props ────────────────────────────────────────────────────────────────────

interface MarginBadgeProps {
  margin: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export const MARGIN_COLORS = {
  low: 'var(--admin-error)',
  medium: '#d4a843',
  high: 'var(--admin-success)',
} as const;

function mkConfig(color: string) {
  return {
    color,
    bg: `color-mix(in srgb, ${color} 15%, transparent)`,
    border: `color-mix(in srgb, ${color} 30%, transparent)`,
  };
}

function getMarginConfig(margin: number): { color: string; bg: string; border: string } {
  if (margin < 20) return mkConfig(MARGIN_COLORS.low);
  if (margin <= 40) return mkConfig(MARGIN_COLORS.medium);
  return mkConfig(MARGIN_COLORS.high);
}

// ─── Component ───────────────────────────────────────────────────────────────

export function MarginBadge({ margin }: MarginBadgeProps) {
  const { color, bg, border } = getMarginConfig(margin);
  const display = isFinite(margin) ? `${Math.round(margin)}%` : '—';

  return (
    <span
      data-testid="margin-badge"
      className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium border"
      style={{ color, backgroundColor: bg, borderColor: border }}
    >
      {display}
    </span>
  );
}

export default MarginBadge;
