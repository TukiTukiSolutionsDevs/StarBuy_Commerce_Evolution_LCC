'use client';

import type { Alert, AlertStatus, SnoozeDuration } from '@/lib/alerts/types';
import { AlertCard } from './AlertCard';

interface AlertFeedProps {
  alerts: Alert[];
  isLoading?: boolean;
  onStatusChange?: (id: string, status: AlertStatus) => void;
  emptyMessage?: string;
  className?: string;
}

export function AlertFeed({
  alerts,
  isLoading = false,
  onStatusChange,
  emptyMessage = 'No alerts',
  className = '',
}: AlertFeedProps) {
  if (isLoading) {
    return (
      <div data-testid="alert-feed-loading" className={`space-y-3 ${className}`}>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-24 rounded-xl bg-[#111827] border border-[#1f2d4e] animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center py-16 text-center ${className}`}>
        <span className="material-symbols-outlined text-4xl text-[#374151] mb-3">
          notifications_off
        </span>
        <p className="text-sm text-[#6b7280]">{emptyMessage}</p>
      </div>
    );
  }

  function handleRead(id: string) {
    onStatusChange?.(id, 'read');
  }

  function handleDismiss(id: string) {
    onStatusChange?.(id, 'dismissed');
  }

  function handleSnooze(id: string, _hours: SnoozeDuration) {
    onStatusChange?.(id, 'snoozed');
  }

  return (
    <div className={`space-y-2 overflow-y-auto ${className}`}>
      {alerts.map((alert) => (
        <AlertCard
          key={alert.id}
          alert={alert}
          onRead={handleRead}
          onDismiss={handleDismiss}
          onSnooze={handleSnooze}
        />
      ))}
    </div>
  );
}
