'use client';

/**
 * /admin/states/[stateCode] — State Profile Page — Phase 4
 *
 * Migrated to use admin design tokens. Zero hardcoded hex colors.
 * Detailed view of a single state with demographics, trends,
 * opportunity score breakdown, and state comparison widget.
 */

import { useEffect, useState, use } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { StateStatCard } from '@/components/admin/states/StateStatCard';
import { StatCompare } from '@/components/admin/states/StatCompare';
import { PulseFeed } from '@/components/admin/states/PulseFeed';
import { getOpportunityLabel } from '@/lib/states/scorer';
import { scoreToQuintile, QUINTILE_BG_COLORS } from '@/lib/states/types';
import type { StateDetailResponse, StateWithScore, MarketPulseEvent } from '@/lib/states/types';

async function fetchStateDetail(code: string): Promise<StateDetailResponse> {
  const res = await fetch(`/api/admin/states/${code}`);
  if (!res.ok) throw new Error(`Failed to fetch state ${code}`);
  return res.json();
}

async function fetchCompare(codes: string[]): Promise<{ states: StateWithScore[] }> {
  const res = await fetch(`/api/admin/states/compare?codes=${codes.join(',')}`);
  if (!res.ok) throw new Error('Failed to fetch comparison');
  return res.json();
}

async function fetchStatePulse(code: string): Promise<{ events: MarketPulseEvent[] }> {
  const res = await fetch(`/api/admin/states/pulse?state=${code}`);
  if (!res.ok) throw new Error('Failed to fetch pulse');
  return res.json();
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

export default function StateProfilePage({ params }: { params: Promise<{ stateCode: string }> }) {
  const { stateCode } = use(params);
  const searchParams = useSearchParams();
  const code = stateCode.toUpperCase();

  const [detail, setDetail] = useState<StateDetailResponse | null>(null);
  const [compareStates, setCompareStates] = useState<StateWithScore[]>([]);
  const [pulseEvents, setPulseEvents] = useState<MarketPulseEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const compareCodes =
    searchParams
      .get('compare')
      ?.split(',')
      .map((c) => c.trim().toUpperCase())
      .filter(Boolean) ?? [];

  useEffect(() => {
    const load = async () => {
      try {
        const [detailData, pulseData] = await Promise.all([
          fetchStateDetail(code),
          fetchStatePulse(code),
        ]);
        setDetail(detailData);
        setPulseEvents(pulseData.events);
        if (compareCodes.length > 0) {
          const allCodes = [code, ...compareCodes].slice(0, 3);
          const compData = await fetchCompare(allCodes);
          setCompareStates(compData.states);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [code]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <span className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>
          Loading state profile...
        </span>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="p-6">
        <p style={{ color: 'var(--admin-error)' }}>State not found: {code}</p>
        <Link
          href="/admin/states"
          className="text-sm mt-2 inline-block"
          style={{ color: 'var(--admin-info)' }}
        >
          ← Back to map
        </Link>
      </div>
    );
  }

  const { profile, score } = detail;
  const label = getOpportunityLabel(score.score);
  const quintile = scoreToQuintile(score.score);

  return (
    <div data-testid="state-profile-page" className="p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/admin/states"
          className="transition-colors"
          style={{ color: 'var(--admin-text-muted)' }}
        >
          <span className="material-symbols-outlined text-xl">arrow_back</span>
        </Link>
        <div className="flex items-center gap-3">
          <span
            data-testid="profile-score-badge"
            className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${QUINTILE_BG_COLORS[quintile]}`}
            style={{ color: '#fff' }}
          >
            {score.score}
          </span>
          <div>
            <h1 className="admin-h1 text-xl">{profile.name}</h1>
            <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
              {profile.code} · {profile.region} · {label}
            </p>
          </div>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <StateStatCard label="Population" value={formatNumber(profile.population)} />
        <StateStatCard
          label="Median Income"
          value={`$${(profile.medianIncome / 1000).toFixed(0)}K`}
        />
        <StateStatCard label="Urbanization" value={`${profile.urbanizationPct}%`} />
        <StateStatCard label="E-Commerce Index" value={`${profile.ecommerceIndex}/100`} />
      </div>

      {/* Score Breakdown */}
      <div
        className="rounded-xl p-4 mb-6"
        style={{
          backgroundColor: 'var(--admin-bg-elevated)',
          border: '1px solid var(--admin-border)',
        }}
      >
        <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--admin-text)' }}>
          Score Breakdown
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StateStatCard
            label="Demographics"
            value={score.breakdown.demographics}
            subtitle="Weight: 35%"
          />
          <StateStatCard
            label="Trend Activity"
            value={score.breakdown.trendActivity}
            subtitle="Weight: 30%"
          />
          <StateStatCard
            label="E-Commerce"
            value={score.breakdown.ecommerceIndex}
            subtitle="Weight: 20%"
          />
          <StateStatCard
            label="Income Index"
            value={score.breakdown.incomeIndex}
            subtitle="Weight: 15%"
          />
        </div>
      </div>

      {/* Age Distribution */}
      <div
        className="rounded-xl p-4 mb-6"
        style={{
          backgroundColor: 'var(--admin-bg-elevated)',
          border: '1px solid var(--admin-border)',
        }}
      >
        <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--admin-text)' }}>
          Age Distribution
        </h2>
        <div className="grid grid-cols-4 gap-4">
          <StateStatCard label="Under 18" value={`${profile.ageDistribution.under18}%`} />
          <StateStatCard label="18-34" value={`${profile.ageDistribution.age18to34}%`} />
          <StateStatCard label="35-54" value={`${profile.ageDistribution.age35to54}%`} />
          <StateStatCard label="55+" value={`${profile.ageDistribution.age55plus}%`} />
        </div>
      </div>

      {/* State Pulse Events */}
      {pulseEvents.length > 0 && (
        <div
          className="rounded-xl p-4 mb-6"
          style={{
            backgroundColor: 'var(--admin-bg-elevated)',
            border: '1px solid var(--admin-border)',
          }}
        >
          <PulseFeed events={pulseEvents} maxHeight="300px" />
        </div>
      )}

      {/* State Comparison */}
      {compareStates.length >= 2 && (
        <div
          className="rounded-xl p-4 mb-6"
          style={{
            backgroundColor: 'var(--admin-bg-elevated)',
            border: '1px solid var(--admin-border)',
          }}
        >
          <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--admin-text)' }}>
            State Comparison
          </h2>
          <StatCompare states={compareStates} />
        </div>
      )}

      {/* Quick Compare Links */}
      {compareStates.length < 2 && (
        <div
          className="rounded-xl p-4"
          style={{
            backgroundColor: 'var(--admin-bg-elevated)',
            border: '1px solid var(--admin-border)',
          }}
        >
          <h2 className="text-sm font-semibold mb-2" style={{ color: 'var(--admin-text)' }}>
            Compare with...
          </h2>
          <div className="flex gap-2 flex-wrap">
            {['CA', 'TX', 'NY', 'FL', 'IL']
              .filter((c) => c !== code)
              .slice(0, 3)
              .map((c) => (
                <Link
                  key={c}
                  href={`/admin/states/${code}?compare=${c}`}
                  className="px-3 py-1.5 rounded-lg text-xs transition-all"
                  style={{
                    border: '1px solid var(--admin-border)',
                    color: 'var(--admin-text-secondary)',
                  }}
                >
                  vs {c}
                </Link>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
