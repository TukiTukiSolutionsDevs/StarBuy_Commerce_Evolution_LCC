'use client';

/**
 * StatCompare
 *
 * Side-by-side comparison table for 2-3 US states.
 * Shows key metrics in a grid for easy visual comparison.
 */

import type { StateWithScore } from '@/lib/states/types';
import { getOpportunityLabel } from '@/lib/states/scorer';
import { scoreToQuintile, QUINTILE_BG_COLORS } from '@/lib/states/types';

// ─── Props ────────────────────────────────────────────────────────────────────

interface StatCompareProps {
  states: StateWithScore[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPop(pop: number): string {
  if (pop >= 1_000_000) return `${(pop / 1_000_000).toFixed(1)}M`;
  return `${(pop / 1_000).toFixed(0)}K`;
}

function formatIncome(income: number): string {
  return `$${(income / 1_000).toFixed(0)}K`;
}

type Row = {
  label: string;
  values: string[];
  highlight?: boolean;
};

function buildRows(states: StateWithScore[]): Row[] {
  return [
    {
      label: 'Opportunity Score',
      values: states.map(
        (s) => `${s.opportunityScore.score} (${getOpportunityLabel(s.opportunityScore.score)})`,
      ),
      highlight: true,
    },
    { label: 'Population', values: states.map((s) => formatPop(s.population)) },
    { label: 'Median Income', values: states.map((s) => formatIncome(s.medianIncome)) },
    { label: 'Urbanization', values: states.map((s) => `${s.urbanizationPct}%`) },
    { label: 'E-Commerce Index', values: states.map((s) => `${s.ecommerceIndex}/100`) },
    { label: 'GDP', values: states.map((s) => `$${s.gdpBillions.toFixed(0)}B`) },
    { label: 'Region', values: states.map((s) => s.region) },
  ];
}

// ─── Component ────────────────────────────────────────────────────────────────

export function StatCompare({ states }: StatCompareProps) {
  if (states.length < 2) return null;

  const rows = buildRows(states);

  return (
    <div data-testid="stat-compare" className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr>
            <th
              className="text-left text-[10px] uppercase tracking-widest pb-3 pr-4"
              style={{ color: 'var(--admin-text-muted)' }}
            >
              Metric
            </th>
            {states.map((s) => (
              <th key={s.code} className="text-center pb-3 px-4">
                <div className="flex flex-col items-center gap-1">
                  <span
                    data-testid={`compare-score-badge-${s.code}`}
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                      QUINTILE_BG_COLORS[scoreToQuintile(s.opportunityScore.score)]
                    }`}
                    style={{ color: '#fff' }}
                  >
                    {s.opportunityScore.score}
                  </span>
                  <span className="font-semibold text-sm" style={{ color: 'var(--admin-text)' }}>
                    {s.name}
                  </span>
                  <span className="text-[10px]" style={{ color: 'var(--admin-text-muted)' }}>
                    {s.code}
                  </span>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.label}
              data-testid={`compare-row-${row.label.replace(/\s+/g, '-').toLowerCase()}`}
              className={`border-t ${row.highlight ? '' : ''}`}
              style={{
                borderColor: 'var(--admin-border)',
                ...(row.highlight ? { backgroundColor: 'var(--admin-bg-elevated)' } : {}),
              }}
            >
              <td
                className="py-2.5 pr-4 text-xs whitespace-nowrap"
                style={{ color: 'var(--admin-text-muted)' }}
              >
                {row.label}
              </td>
              {row.values.map((val, i) => (
                <td
                  key={i}
                  className={`py-2.5 px-4 text-center ${row.highlight ? 'font-semibold' : ''}`}
                  style={{ color: 'var(--admin-text)' }}
                >
                  {val}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default StatCompare;
