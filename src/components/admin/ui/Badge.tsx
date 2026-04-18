/**
 * AdminBadge — Phase 1
 *
 * Status badge with semantic color variants and optional dot indicator.
 * Replaces the per-page StatusBadge implementations with hardcoded colors.
 */

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'brand';

interface AdminBadgeProps {
  children: string;
  variant?: BadgeVariant;
  /** Show a small colored dot before the text */
  dot?: boolean;
}

const colorMap: Record<BadgeVariant, { color: string; bg: string }> = {
  success: { color: 'var(--admin-success)', bg: 'var(--admin-success-bg)' },
  warning: { color: 'var(--admin-warning)', bg: 'var(--admin-warning-bg)' },
  error: { color: 'var(--admin-error)', bg: 'var(--admin-error-bg)' },
  info: { color: 'var(--admin-info)', bg: 'var(--admin-info-bg)' },
  neutral: {
    color: 'var(--admin-text-muted)',
    bg: 'color-mix(in srgb, var(--admin-text-muted) 10%, transparent)',
  },
  brand: { color: 'var(--admin-brand)', bg: 'var(--admin-brand-bg)' },
};

export function AdminBadge({ children, variant = 'neutral', dot = true }: AdminBadgeProps) {
  const { color, bg } = colorMap[variant];

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
      style={{ backgroundColor: bg, color }}
    >
      {dot && (
        <span
          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: color }}
        />
      )}
      {children}
    </span>
  );
}
