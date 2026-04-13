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
      className="absolute z-50 pointer-events-none bg-[#0d1526] border border-[#1f2d4e] rounded-lg shadow-xl p-3 min-w-[180px]"
      style={{
        left: position.x,
        top: position.y,
        transform: 'translate(-50%, -110%)',
      }}
    >
      <p className="text-sm font-semibold text-white mb-1">{profile.name}</p>
      <div className="space-y-1 text-[11px]">
        <div className="flex justify-between">
          <span className="text-[#6b7280]">Opportunity</span>
          <span data-testid="tooltip-score" className="text-white font-medium">
            {opportunityScore} ({label})
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#6b7280]">Population</span>
          <span data-testid="tooltip-population" className="text-white">
            {formatPopulation(profile.population)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#6b7280]">Income</span>
          <span data-testid="tooltip-income" className="text-white">
            {formatIncome(profile.medianIncome)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#6b7280]">E-Commerce</span>
          <span className="text-white">{profile.ecommerceIndex}/100</span>
        </div>
        {score && score.topCategories.length > 0 && (
          <div className="pt-1 border-t border-[#1f2d4e]">
            <span className="text-[#6b7280]">Top: </span>
            <span className="text-[#d4a843]">{score.topCategories.join(', ')}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default StateTooltip;
