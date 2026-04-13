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

function getMarginConfig(margin: number): { color: string; bg: string; border: string } {
  if (margin < 20) {
    return { color: '#ef4444', bg: '#ef444426', border: '#ef44444d' };
  }
  if (margin <= 40) {
    return { color: '#d4a843', bg: '#d4a84326', border: '#d4a8434d' };
  }
  return { color: '#10b981', bg: '#10b98126', border: '#10b9814d' };
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
