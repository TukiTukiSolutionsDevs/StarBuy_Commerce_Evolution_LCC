'use client';

/**
 * PulseEventCard
 *
 * Displays a single Market Pulse event with severity badge,
 * category, state, delta %, and mark-as-read action.
 */

import type { MarketPulseEvent, PulseSeverity } from '@/lib/states/types';

// ─── Props ────────────────────────────────────────────────────────────────────

interface PulseEventCardProps {
  event: MarketPulseEvent;
  onMarkRead?: (eventId: string) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getSeverityConfig(severity: PulseSeverity) {
  switch (severity) {
    case 'anomaly':
      return {
        label: 'Anomaly',
        color: 'var(--admin-error)',
        bg: 'color-mix(in srgb, var(--admin-error) 12%, transparent)',
        border: 'color-mix(in srgb, var(--admin-error) 25%, transparent)',
      };
    case 'major':
      return {
        label: 'Major',
        color: 'var(--admin-warning)',
        bg: 'color-mix(in srgb, var(--admin-warning) 12%, transparent)',
        border: 'color-mix(in srgb, var(--admin-warning) 25%, transparent)',
      };
    case 'notable':
      return {
        label: 'Notable',
        color: 'var(--admin-info)',
        bg: 'color-mix(in srgb, var(--admin-info) 12%, transparent)',
        border: 'color-mix(in srgb, var(--admin-info) 25%, transparent)',
      };
    default:
      return {
        label: 'Minor',
        color: '#6b7280',
        bg: 'color-mix(in srgb, #6b7280 12%, transparent)',
        border: 'color-mix(in srgb, #6b7280 25%, transparent)',
      };
  }
}

function formatDelta(delta: number): string {
  const sign = delta > 0 ? '+' : '';
  return `${sign}${delta.toFixed(1)}%`;
}

function formatTimeAgo(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PulseEventCard({ event, onMarkRead }: PulseEventCardProps) {
  const severity = getSeverityConfig(event.severity);
  const isPositive = event.deltaPercent > 0;

  return (
    <div
      data-testid="pulse-event-card"
      className={`rounded-lg p-3 transition-all ${event.isRead ? 'opacity-60' : ''}`}
      style={{
        backgroundColor: 'var(--admin-bg-card)',
        border: '1px solid var(--admin-border)',
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {/* Severity badge */}
          <span
            data-testid="severity-badge"
            className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase border mb-1.5"
            style={{
              color: severity.color,
              backgroundColor: severity.bg,
              borderColor: severity.border,
            }}
          >
            {severity.label}
          </span>

          {/* Category + State */}
          <p className="text-sm font-medium truncate" style={{ color: 'var(--admin-text)' }}>
            {event.categoryLabel}
          </p>
          <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
            {event.stateName} ({event.stateCode})
          </p>
        </div>

        {/* Delta */}
        <div className="text-right flex-shrink-0">
          <p
            data-testid="delta-value"
            className="text-lg font-bold"
            style={{ color: isPositive ? 'var(--admin-success)' : 'var(--admin-error)' }}
          >
            {formatDelta(event.deltaPercent)}
          </p>
          <p className="text-[10px]" style={{ color: 'var(--admin-text-muted)' }}>
            {event.previousScore} → {event.currentScore}
          </p>
        </div>
      </div>

      {/* Footer */}
      <div
        className="flex items-center justify-between mt-2 pt-2 border-t"
        style={{ borderColor: 'var(--admin-border)' }}
      >
        <span
          data-testid="time-ago"
          className="text-[10px]"
          style={{ color: 'var(--admin-text-muted)' }}
        >
          {formatTimeAgo(event.detectedAt)}
        </span>
        {!event.isRead && onMarkRead && (
          <button
            data-testid="mark-read-btn"
            onClick={() => onMarkRead(event.id)}
            className="text-[10px] transition-colors"
            style={{ color: 'var(--admin-brand)' }}
          >
            Mark read
          </button>
        )}
      </div>
    </div>
  );
}

export default PulseEventCard;
