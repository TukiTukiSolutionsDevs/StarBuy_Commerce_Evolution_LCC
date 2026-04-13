'use client';

/**
 * /admin/states — State Intelligence Dashboard
 *
 * Interactive USA map with opportunity scores + Market Pulse feed sidebar.
 */

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { UsaMap } from '@/components/admin/states/UsaMap';
import { StateTooltip } from '@/components/admin/states/StateTooltip';
import { PulseFeed } from '@/components/admin/states/PulseFeed';
import { StateStatCard } from '@/components/admin/states/StateStatCard';
import { QUINTILE_BG_COLORS } from '@/lib/states/types';
import type {
  StateWithScore,
  StateScoreMap,
  StateProfile,
  OpportunityScore,
  MarketPulseEvent,
} from '@/lib/states/types';

// ─── Data Fetching ────────────────────────────────────────────────────────────

async function fetchStates(): Promise<{ states: StateWithScore[]; computedAt: number }> {
  const res = await fetch('/api/admin/states');
  if (!res.ok) throw new Error('Failed to fetch states');
  return res.json();
}

async function fetchPulse(): Promise<{ events: MarketPulseEvent[]; unreadCount: number }> {
  const res = await fetch('/api/admin/states/pulse');
  if (!res.ok) throw new Error('Failed to fetch pulse');
  return res.json();
}

// ─── Page Component ───────────────────────────────────────────────────────────

export default function StatesPage() {
  const router = useRouter();
  const [states, setStates] = useState<StateWithScore[]>([]);
  const [scoreMap, setScoreMap] = useState<StateScoreMap>({});
  const [pulseEvents, setPulseEvents] = useState<MarketPulseEvent[]>([]);
  const [hoveredState, setHoveredState] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchStates(), fetchPulse()])
      .then(([statesData, pulseData]) => {
        setStates(statesData.states);
        const map: StateScoreMap = {};
        for (const s of statesData.states) {
          map[s.code] = s.opportunityScore;
        }
        setScoreMap(map);
        setPulseEvents(pulseData.events);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleStateClick = useCallback(
    (code: string) => {
      router.push(`/admin/states/${code}`);
    },
    [router],
  );

  const handleStateHover = useCallback((code: string | null) => {
    setHoveredState(code);
  }, []);

  const handleMarkRead = useCallback(async (eventId: string) => {
    await fetch('/api/admin/states/pulse', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventIds: [eventId] }),
    });
    setPulseEvents((prev) => prev.map((e) => (e.id === eventId ? { ...e, isRead: true } : e)));
  }, []);

  const handleMarkAllRead = useCallback(async () => {
    const unreadIds = pulseEvents.filter((e) => !e.isRead).map((e) => e.id);
    if (unreadIds.length === 0) return;
    await fetch('/api/admin/states/pulse', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventIds: unreadIds }),
    });
    setPulseEvents((prev) => prev.map((e) => ({ ...e, isRead: true })));
  }, [pulseEvents]);

  // Tooltip data
  const hoveredProfile: StateProfile | null = hoveredState
    ? (states.find((s) => s.code === hoveredState) ?? null)
    : null;
  const hoveredScore: OpportunityScore | null = hoveredState
    ? (scoreMap[hoveredState] ?? null)
    : null;

  // Stats
  const avgScore =
    states.length > 0
      ? Math.round(states.reduce((sum, s) => sum + s.opportunityScore.score, 0) / states.length)
      : 0;
  const topState =
    states.length > 0
      ? [...states].sort((a, b) => b.opportunityScore.score - a.opportunityScore.score)[0]
      : null;
  const unreadPulse = pulseEvents.filter((e) => !e.isRead && e.severity !== 'minor').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <span className="text-[#4b5563] text-sm">Loading state intelligence...</span>
      </div>
    );
  }

  return (
    <div data-testid="states-page" className="p-6">
      <h1 className="text-xl font-bold text-white mb-6">State Intelligence</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StateStatCard label="Avg Opportunity Score" value={avgScore} />
        <StateStatCard
          label="Top State"
          value={topState ? topState.name : '—'}
          subtitle={topState ? `Score: ${topState.opportunityScore.score}` : undefined}
        />
        <StateStatCard
          label="Active Pulse Events"
          value={unreadPulse}
          trend={unreadPulse > 5 ? 'up' : 'neutral'}
        />
      </div>

      {/* Map + Pulse Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map */}
        <div className="lg:col-span-2 relative rounded-xl border border-[#1f2d4e] bg-[#0d1526] p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-white">Market Opportunity Map</h2>
            {/* Color legend */}
            <div className="flex items-center gap-2 text-[10px]">
              {([1, 2, 3, 4, 5] as const).map((q) => (
                <div key={q} className="flex items-center gap-1">
                  <span className={`w-3 h-3 rounded-sm ${QUINTILE_BG_COLORS[q]}`} />
                  <span className="text-[#6b7280]">
                    {q === 1
                      ? '0-20'
                      : q === 2
                        ? '21-40'
                        : q === 3
                          ? '41-60'
                          : q === 4
                            ? '61-80'
                            : '81-100'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div
            className="relative"
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
            }}
          >
            <UsaMap
              scores={scoreMap}
              onStateClick={handleStateClick}
              onStateHover={handleStateHover}
              selectedState={hoveredState}
            />
            <StateTooltip
              profile={hoveredProfile}
              score={hoveredScore}
              position={tooltipPos}
              visible={!!hoveredState}
            />
          </div>
        </div>

        {/* Pulse Feed */}
        <div className="rounded-xl border border-[#1f2d4e] bg-[#0d1526] p-4">
          <PulseFeed
            events={pulseEvents}
            onMarkRead={handleMarkRead}
            onMarkAllRead={handleMarkAllRead}
            maxHeight="480px"
          />
        </div>
      </div>
    </div>
  );
}
