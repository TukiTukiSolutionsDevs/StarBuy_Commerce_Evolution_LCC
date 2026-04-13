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
      return { label: 'Anomaly', color: '#ef4444', bg: '#ef444420', border: '#ef444440' };
    case 'major':
      return { label: 'Major', color: '#f59e0b', bg: '#f59e0b20', border: '#f59e0b40' };
    case 'notable':
      return { label: 'Notable', color: '#3b82f6', bg: '#3b82f620', border: '#3b82f640' };
    default:
      return { label: 'Minor', color: '#6b7280', bg: '#6b728020', border: '#6b728040' };
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
      className={`rounded-lg border p-3 transition-all ${
        event.isRead
          ? 'border-[#1f2d4e]/50 bg-[#0d1526]/50 opacity-60'
          : 'border-[#1f2d4e] bg-[#0d1526]'
      }`}
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
          <p className="text-sm font-medium text-white truncate">{event.categoryLabel}</p>
          <p className="text-xs text-[#6b7280]">
            {event.stateName} ({event.stateCode})
          </p>
        </div>

        {/* Delta */}
        <div className="text-right flex-shrink-0">
          <p
            data-testid="delta-value"
            className={`text-lg font-bold ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}
          >
            {formatDelta(event.deltaPercent)}
          </p>
          <p className="text-[10px] text-[#4b5563]">
            {event.previousScore} → {event.currentScore}
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#1f2d4e]/50">
        <span data-testid="time-ago" className="text-[10px] text-[#4b5563]">
          {formatTimeAgo(event.detectedAt)}
        </span>
        {!event.isRead && onMarkRead && (
          <button
            data-testid="mark-read-btn"
            onClick={() => onMarkRead(event.id)}
            className="text-[10px] text-[#3b82f6] hover:text-[#60a5fa] transition-colors"
          >
            Mark read
          </button>
        )}
      </div>
    </div>
  );
}

export default PulseEventCard;
