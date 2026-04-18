'use client';

/**
 * StateTooltip
 *
 * Floating tooltip shown on state hover displaying key metrics.
 */

import type { StateProfile, OpportunityScore } from '@/lib/states/types';
import { getOpportunityLabel } from '@/lib/states/scorer';

// ─── Props ────────────────────────────────────────────────────────────────────

interface StateTooltipProps {
  profile: StateProfile | null;
  score: OpportunityScore | null;
  position: { x: number; y: number };
  visible: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPopulation(pop: number): string {
  if (pop >= 1_000_000) return `${(pop / 1_000_000).toFixed(1)}M`;
  if (pop >= 1_000) return `${(pop / 1_000).toFixed(0)}K`;
  return String(pop);
}

function formatIncome(income: number): string {
  return `$${(income / 1_000).toFixed(0)}K`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function StateTooltip({ profile, score, position, visible }: StateTooltipProps) {
  if (!visible || !profile) return null;

  const opportunityScore = score?.score ?? 0;
  const label = getOpportunityLabel(opportunityScore);

  return (
    <div
      data-testid="state-tooltip"
      className="absolute z-50 pointer-events-none rounded-lg shadow-xl p-3 min-w-[180px]"
      style={{
        left: position.x,
        top: position.y,
        transform: 'translate(-50%, -110%)',
        backgroundColor: 'var(--admin-bg-card)',
        border: '1px solid var(--admin-border)',
      }}
    >
      <p className="text-sm font-semibold mb-1" style={{ color: 'var(--admin-text)' }}>
        {profile.name}
      </p>
      <div className="space-y-1 text-[11px]">
        <div className="flex justify-between">
          <span style={{ color: 'var(--admin-text-muted)' }}>Opportunity</span>
          <span
            data-testid="tooltip-score"
            className="font-medium"
            style={{ color: 'var(--admin-text)' }}
          >
            {opportunityScore} ({label})
          </span>
        </div>
        <div className="flex justify-between">
          <span style={{ color: 'var(--admin-text-muted)' }}>Population</span>
          <span data-testid="tooltip-population" style={{ color: 'var(--admin-text)' }}>
            {formatPopulation(profile.population)}
          </span>
        </div>
        <div className="flex justify-between">
          <span style={{ color: 'var(--admin-text-muted)' }}>Income</span>
          <span data-testid="tooltip-income" style={{ color: 'var(--admin-text)' }}>
            {formatIncome(profile.medianIncome)}
          </span>
        </div>
        <div className="flex justify-between">
          <span style={{ color: 'var(--admin-text-muted)' }}>E-Commerce</span>
          <span style={{ color: 'var(--admin-text)' }}>{profile.ecommerceIndex}/100</span>
        </div>
        {score && score.topCategories.length > 0 && (
          <div className="pt-1 border-t" style={{ borderColor: 'var(--admin-border)' }}>
            <span style={{ color: 'var(--admin-text-muted)' }}>Top: </span>
            <span style={{ color: 'var(--admin-accent)' }}>{score.topCategories.join(', ')}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default StateTooltip;
