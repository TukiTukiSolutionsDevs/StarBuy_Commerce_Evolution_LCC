'use client';

import type { Alert, AlertSeverity, SnoozeDuration } from '@/lib/alerts/types';
import { SnoozeMenu } from './SnoozeMenu';

interface AlertCardProps {
  alert: Alert;
  onRead?: (id: string) => void;
  onDismiss?: (id: string) => void;
  onSnooze?: (id: string, hours: SnoozeDuration) => void;
  className?: string;
}

const SEVERITY_STYLES: Record<AlertSeverity, { border: string; dot: string; badge: string }> = {
  info: {
    border: 'border-blue-500/30',
    dot: 'bg-blue-400',
    badge: 'bg-blue-500/10 text-blue-400',
  },
  warning: {
    border: 'border-amber-500/30',
    dot: 'bg-amber-400',
    badge: 'bg-amber-500/10 text-amber-400',
  },
  critical: {
    border: 'border-red-500/30',
    dot: 'bg-red-400',
    badge: 'bg-red-500/10 text-red-400',
  },
};

const TYPE_LABELS: Record<Alert['type'], string> = {
  pulse_shift: 'Pulse Shift',
  low_conversion: 'Low Conversion',
  zero_orders: 'Zero Orders',
  price_change: 'Price Change',
  stock_low: 'Stock Low',
};

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return 'just now';
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function AlertCard({ alert, onRead, onDismiss, onSnooze, className = '' }: AlertCardProps) {
  const s = SEVERITY_STYLES[alert.severity];

  return (
    <div
      data-testid="alert-card"
      data-severity={alert.severity}
      className={`relative rounded-xl border bg-[#111827] p-4 ${s.border} ${className}`}
    >
      {/* Unread indicator */}
      {alert.status === 'unread' && (
        <span className={`absolute top-4 right-4 w-2 h-2 rounded-full ${s.dot}`} />
      )}

      {/* Header */}
      <div className="flex items-start gap-3 pr-6">
        <span className={`mt-0.5 flex-none w-2 h-2 rounded-full ${s.dot}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span
              className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${s.badge}`}
            >
              {TYPE_LABELS[alert.type]}
            </span>
            <span className="text-[#4b5563] text-xs">{formatRelativeTime(alert.createdAt)}</span>
          </div>
          <p className="text-sm font-medium text-white leading-snug">{alert.title}</p>
          <p className="text-xs text-[#9ca3af] mt-0.5 leading-relaxed">{alert.message}</p>
          {alert.sourceLabel && (
            <p className="text-[10px] text-[#4b5563] mt-1">Source: {alert.sourceLabel}</p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 mt-3 pl-5">
        {alert.status === 'unread' && onRead && (
          <button
            data-testid="alert-read-btn"
            onClick={() => onRead(alert.id)}
            className="text-xs text-[#9ca3af] hover:text-white px-2 py-1 rounded-lg hover:bg-[#1f2d4e]/60 transition-colors"
          >
            Mark read
          </button>
        )}
        {onSnooze && <SnoozeMenu onSnooze={(hours) => onSnooze(alert.id, hours)} />}
        {onDismiss && (
          <button
            data-testid="alert-dismiss-btn"
            onClick={() => onDismiss(alert.id)}
            className="text-xs text-[#6b7280] hover:text-[#ef4444] px-2 py-1 rounded-lg hover:bg-[#ef4444]/5 transition-colors"
          >
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
}
