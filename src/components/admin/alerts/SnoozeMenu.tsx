'use client';

import { useState } from 'react';
import type { SnoozeDuration } from '@/lib/alerts/types';

interface SnoozeMenuProps {
  onSnooze: (hours: SnoozeDuration) => void;
  className?: string;
}

const OPTIONS: { label: string; hours: SnoozeDuration }[] = [
  { label: '1 hour', hours: 1 },
  { label: '24 hours', hours: 24 },
  { label: '7 days', hours: 168 },
];

export function SnoozeMenu({ onSnooze, className = '' }: SnoozeMenuProps) {
  const [open, setOpen] = useState(false);

  function handleSelect(hours: SnoozeDuration) {
    onSnooze(hours);
    setOpen(false);
  }

  return (
    <div className={`relative ${className}`}>
      <button
        data-testid="snooze-trigger"
        onClick={() => setOpen((v) => !v)}
        className="text-xs text-[var(--admin-text-secondary)] hover:text-[var(--admin-text)] px-2 py-1 rounded-lg hover:bg-[var(--admin-border)]/60 transition-colors flex items-center gap-1"
      >
        <span className="material-symbols-outlined text-sm">schedule</span>
        Snooze
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 z-20 bg-[var(--admin-bg-sidebar)] border border-[var(--admin-border)] rounded-xl shadow-xl min-w-[130px] py-1">
          {OPTIONS.map((opt) => (
            <button
              key={opt.hours}
              data-testid={`snooze-option-${opt.hours}`}
              onClick={() => handleSelect(opt.hours)}
              className="w-full text-left px-3 py-2 text-xs text-[var(--admin-text-secondary)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-border)]/60 transition-colors"
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
