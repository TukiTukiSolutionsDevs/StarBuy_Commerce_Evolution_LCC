'use client';

import type { HealthStatus } from '@/lib/monitor/types';

interface HealthBadgeProps {
  health: HealthStatus;
  reasons?: string[];
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
  className?: string;
}

const HEALTH_CONFIG: Record<HealthStatus, { badge: string; dot: string; label: string }> = {
  healthy: {
    badge: 'bg-green-500/20 text-green-400 border-green-500/30',
    dot: 'bg-green-400',
    label: 'Healthy',
  },
  warning: {
    badge: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    dot: 'bg-amber-400',
    label: 'Warning',
  },
  critical: {
    badge: 'bg-red-500/20 text-red-400 border-red-500/30',
    dot: 'bg-red-400',
    label: 'Critical',
  },
  unknown: {
    badge: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    dot: 'bg-gray-400',
    label: 'Unknown',
  },
};

const SIZE_CLASSES: Record<NonNullable<HealthBadgeProps['size']>, string> = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-2.5 py-1',
  lg: 'text-base px-3 py-1.5',
};

export function HealthBadge({
  health,
  reasons,
  size = 'md',
  showTooltip = false,
  className = '',
}: HealthBadgeProps) {
  const config = HEALTH_CONFIG[health];

  const badge = (
    <span
      data-testid="health-badge"
      data-health={health}
      className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${config.badge} ${SIZE_CLASSES[size]} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full flex-none ${config.dot}`} />
      {config.label}
    </span>
  );

  if (showTooltip && reasons && reasons.length > 0) {
    return (
      <div className="relative group/tooltip inline-flex">
        {badge}
        <div
          data-testid="health-badge-tooltip"
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/tooltip:block z-10 bg-[var(--admin-bg-sidebar)] border border-[var(--admin-border)] rounded-xl px-3 py-2 min-w-max max-w-xs shadow-xl"
        >
          <ul className="space-y-1">
            {reasons.map((r, i) => (
              <li
                key={i}
                className="text-xs text-[var(--admin-text-secondary)] flex items-start gap-1.5"
              >
                <span className={`w-1.5 h-1.5 rounded-full flex-none mt-0.5 ${config.dot}`} />
                {r}
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  return badge;
}
