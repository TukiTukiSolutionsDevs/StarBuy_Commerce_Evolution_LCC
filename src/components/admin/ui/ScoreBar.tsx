/**
 * AdminScoreBar — Phase 1
 *
 * Reusable horizontal score/progress bar with label and value.
 * Replaces 3+ different score bar implementations across admin pages.
 */

type ScoreBarVariant = 'brand' | 'success' | 'warning' | 'error' | 'info' | 'accent';

interface AdminScoreBarProps {
  /** Value between 0 and max */
  value: number;
  max?: number;
  label?: string;
  /** Display value text (e.g. "85%", "4.2/5") — defaults to `value` */
  displayValue?: string;
  variant?: ScoreBarVariant;
  /** Bar height */
  size?: 'sm' | 'md';
}

const colorMap: Record<ScoreBarVariant, string> = {
  brand: 'var(--admin-brand)',
  success: 'var(--admin-success)',
  warning: 'var(--admin-warning)',
  error: 'var(--admin-error)',
  info: 'var(--admin-info)',
  accent: 'var(--admin-accent)',
};

const sizeStyles: Record<string, string> = {
  sm: 'h-1.5',
  md: 'h-2.5',
};

export function AdminScoreBar({
  value,
  max = 100,
  label,
  displayValue,
  variant = 'brand',
  size = 'md',
}: AdminScoreBarProps) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  const color = colorMap[variant];

  return (
    <div className="w-full">
      {(label || displayValue) && (
        <div className="flex items-center justify-between mb-1.5">
          {label && (
            <span className="text-xs font-medium" style={{ color: 'var(--admin-text-secondary)' }}>
              {label}
            </span>
          )}
          <span className="text-xs font-semibold" style={{ color }}>
            {displayValue ?? value}
          </span>
        </div>
      )}
      <div
        className={`w-full rounded-full overflow-hidden ${sizeStyles[size]}`}
        style={{ backgroundColor: 'color-mix(in srgb, var(--admin-border) 50%, transparent)' }}
      >
        <div
          className={`${sizeStyles[size]} rounded-full transition-all duration-500 ease-out`}
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}
