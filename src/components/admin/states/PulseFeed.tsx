'use client';

/**
 * PulseFeed
 *
 * Scrollable feed of Market Pulse events with severity filter tabs.
 * Composes PulseEventCard for each event.
 */

import { useState } from 'react';
import type { MarketPulseEvent, PulseSeverity } from '@/lib/states/types';
import { PulseEventCard } from './PulseEventCard';

// ─── Props ────────────────────────────────────────────────────────────────────

interface PulseFeedProps {
  events: MarketPulseEvent[];
  onMarkRead?: (eventId: string) => void;
  onMarkAllRead?: () => void;
  maxHeight?: string;
}

// ─── Filter Tabs ──────────────────────────────────────────────────────────────

type FilterTab = 'all' | PulseSeverity;

const TABS: { value: FilterTab; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'anomaly', label: 'Anomaly' },
  { value: 'major', label: 'Major' },
  { value: 'notable', label: 'Notable' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function PulseFeed({
  events,
  onMarkRead,
  onMarkAllRead,
  maxHeight = '500px',
}: PulseFeedProps) {
  const [activeTab, setActiveTab] = useState<FilterTab>('all');

  const filtered =
    activeTab === 'all'
      ? events.filter((e) => e.severity !== 'minor')
      : events.filter((e) => e.severity === activeTab);

  const unreadCount = events.filter((e) => !e.isRead && e.severity !== 'minor').length;

  return (
    <div data-testid="pulse-feed" className="flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-white">Market Pulse</h3>
          {unreadCount > 0 && (
            <span
              data-testid="unread-badge"
              className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#3b82f6] text-[10px] font-bold text-white"
            >
              {unreadCount}
            </span>
          )}
        </div>
        {onMarkAllRead && unreadCount > 0 && (
          <button
            data-testid="mark-all-read-btn"
            onClick={onMarkAllRead}
            className="text-[10px] text-[#3b82f6] hover:text-[#60a5fa] transition-colors"
          >
            Mark all read
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div data-testid="filter-tabs" className="flex gap-1 mb-3">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            data-testid={`tab-${tab.value}`}
            onClick={() => setActiveTab(tab.value)}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all ${
              activeTab === tab.value
                ? 'bg-[#1b2a5e] text-white'
                : 'text-[#4b5563] hover:text-[#9ca3af] hover:bg-[#1f2d4e]/30'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Events list */}
      <div
        data-testid="events-list"
        className="space-y-2 overflow-y-auto pr-1"
        style={{ maxHeight }}
      >
        {filtered.length === 0 ? (
          <p data-testid="empty-state" className="text-xs text-[#4b5563] text-center py-8">
            No pulse events
          </p>
        ) : (
          filtered.map((event) => (
            <PulseEventCard key={event.id} event={event} onMarkRead={onMarkRead} />
          ))
        )}
      </div>
    </div>
  );
}

export default PulseFeed;
