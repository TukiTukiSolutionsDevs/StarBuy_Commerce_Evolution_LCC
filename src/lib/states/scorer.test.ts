/**
 * Unit tests — states/scorer.ts
 *
 * Pure functions — no I/O, no mocks needed.
 *
 * @vitest-environment node
 */

import { describe, it, expect } from 'vitest';
import {
  normalizeAcrossStates,
  computeOpportunityScore,
  computeAllScores,
  getTopStates,
  getOpportunityLabel,
} from './scorer';
import type { StateProfile, OpportunityScore } from './types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeProfile(overrides: Partial<StateProfile> = {}): StateProfile {
  return {
    code: 'CA',
    name: 'California',
    region: 'West',
    population: 39000000,
    medianIncome: 91000,
    urbanizationPct: 95,
    gdpBillions: 3900,
    ecommerceIndex: 88,
    ageDistribution: { under18: 22, age18to34: 23, age35to54: 26, age55plus: 29 },
    dataYear: 2023,
    ...overrides,
  };
}

// ─── normalizeAcrossStates ────────────────────────────────────────────────────

describe('normalizeAcrossStates', () => {
  it('returns empty array for empty input', () => {
    expect(normalizeAcrossStates([])).toEqual([]);
  });

  it('returns array of 50s when all values are identical', () => {
    expect(normalizeAcrossStates([100, 100, 100])).toEqual([50, 50, 50]);
  });

  it('normalizes [0, 50, 100] to [0, 50, 100]', () => {
    expect(normalizeAcrossStates([0, 50, 100])).toEqual([0, 50, 100]);
  });

  it('normalizes arbitrary range to 0-100', () => {
    const result = normalizeAcrossStates([200, 400, 600]);
    expect(result[0]).toBe(0);
    expect(result[1]).toBe(50);
    expect(result[2]).toBe(100);
  });

  it('handles single value → returns [50]', () => {
    expect(normalizeAcrossStates([42])).toEqual([50]);
  });

  it('handles negative values', () => {
    const result = normalizeAcrossStates([-100, 0, 100]);
    expect(result[0]).toBe(0);
    expect(result[1]).toBe(50);
    expect(result[2]).toBe(100);
  });

  it('rounds to integers', () => {
    const result = normalizeAcrossStates([0, 33, 100]);
    expect(Number.isInteger(result[1])).toBe(true);
  });
});

// ─── computeOpportunityScore ──────────────────────────────────────────────────

describe('computeOpportunityScore', () => {
  it('computes a score within 0-100 range', () => {
    const result = computeOpportunityScore(makeProfile(), 80, 90);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it('returns correct stateCode', () => {
    const result = computeOpportunityScore(makeProfile({ code: 'TX' }), 70, 60);
    expect(result.stateCode).toBe('TX');
  });

  it('breakdown demographics reflects urbanization weighting', () => {
    // normalizedPop=100, urbanization=50% → demographics=50
    const result = computeOpportunityScore(makeProfile({ urbanizationPct: 50 }), 100, 50);
    expect(result.breakdown.demographics).toBe(50);
  });

  it('breakdown demographics = 0 when urbanization is 0', () => {
    const result = computeOpportunityScore(makeProfile({ urbanizationPct: 0 }), 100, 50);
    expect(result.breakdown.demographics).toBe(0);
  });

  it('uses default trendActivity of 50 when no trend data', () => {
    const result = computeOpportunityScore(makeProfile(), 50, 50);
    expect(result.breakdown.trendActivity).toBe(50);
  });

  it('uses provided avgCategoryScore for trendActivity', () => {
    const result = computeOpportunityScore(makeProfile(), 50, 50, {
      avgCategoryScore: 85,
    });
    expect(result.breakdown.trendActivity).toBe(85);
  });

  it('clamps trendActivity to 0-100', () => {
    const over = computeOpportunityScore(makeProfile(), 50, 50, { avgCategoryScore: 150 });
    expect(over.breakdown.trendActivity).toBe(100);

    const under = computeOpportunityScore(makeProfile(), 50, 50, { avgCategoryScore: -20 });
    expect(under.breakdown.trendActivity).toBe(0);
  });

  it('ecommerceIndex comes directly from profile', () => {
    const result = computeOpportunityScore(makeProfile({ ecommerceIndex: 72 }), 50, 50);
    expect(result.breakdown.ecommerceIndex).toBe(72);
  });

  it('incomeIndex equals normalizedIncome input', () => {
    const result = computeOpportunityScore(makeProfile(), 50, 85);
    expect(result.breakdown.incomeIndex).toBe(85);
  });

  it('topCategories are sliced to max 3', () => {
    const result = computeOpportunityScore(makeProfile(), 50, 50, {
      topCategories: ['a', 'b', 'c', 'd', 'e'],
    });
    expect(result.topCategories).toHaveLength(3);
  });

  it('includes computedAt timestamp', () => {
    const before = Date.now();
    const result = computeOpportunityScore(makeProfile(), 50, 50);
    expect(result.computedAt).toBeGreaterThanOrEqual(before);
  });

  it('score follows weighted formula', () => {
    // demographics=95 (100 * 0.95), trend=50, ecommerce=88, income=90
    // raw = 95*0.35 + 50*0.30 + 88*0.20 + 90*0.15
    //     = 33.25  + 15.00  + 17.60  + 13.50 = 79.35 → 79
    const result = computeOpportunityScore(
      makeProfile({ urbanizationPct: 95, ecommerceIndex: 88 }),
      100,
      90,
      { avgCategoryScore: 50 },
    );
    expect(result.score).toBe(79);
  });

  it('max possible score is 100', () => {
    const result = computeOpportunityScore(
      makeProfile({ urbanizationPct: 100, ecommerceIndex: 100 }),
      100,
      100,
      { avgCategoryScore: 100 },
    );
    expect(result.score).toBe(100);
  });

  it('min possible score is 0', () => {
    const result = computeOpportunityScore(
      makeProfile({ urbanizationPct: 0, ecommerceIndex: 0 }),
      0,
      0,
      { avgCategoryScore: 0 },
    );
    expect(result.score).toBe(0);
  });
});

// ─── computeAllScores ─────────────────────────────────────────────────────────

describe('computeAllScores', () => {
  it('returns empty array for empty profiles', () => {
    expect(computeAllScores([])).toEqual([]);
  });

  it('returns one score per profile', () => {
    const profiles = [
      makeProfile({ code: 'CA', population: 39000000, medianIncome: 91000 }),
      makeProfile({ code: 'TX', population: 30000000, medianIncome: 67000 }),
    ];
    const scores = computeAllScores(profiles);
    expect(scores).toHaveLength(2);
    expect(scores[0].stateCode).toBe('CA');
    expect(scores[1].stateCode).toBe('TX');
  });

  it('higher population + income + ecommerce → higher score', () => {
    const profiles = [
      makeProfile({
        code: 'CA',
        population: 39000000,
        medianIncome: 91000,
        ecommerceIndex: 88,
        urbanizationPct: 95,
      }),
      makeProfile({
        code: 'WV',
        population: 1770000,
        medianIncome: 50000,
        ecommerceIndex: 42,
        urbanizationPct: 49,
      }),
    ];
    const scores = computeAllScores(profiles);
    expect(scores[0].score).toBeGreaterThan(scores[1].score);
  });

  it('uses trendDataMap when provided', () => {
    const profiles = [makeProfile({ code: 'CA' }), makeProfile({ code: 'TX' })];
    const scores = computeAllScores(profiles, {
      CA: { avgCategoryScore: 90, topCategories: ['electronics'] },
      TX: { avgCategoryScore: 30, topCategories: ['fashion'] },
    });
    // CA should benefit from higher trend activity
    expect(scores[0].breakdown.trendActivity).toBe(90);
    expect(scores[1].breakdown.trendActivity).toBe(30);
  });

  it('defaults to neutral 50 trendActivity when state missing from map', () => {
    const profiles = [makeProfile({ code: 'CA' })];
    const scores = computeAllScores(profiles, {});
    expect(scores[0].breakdown.trendActivity).toBe(50);
  });
});

// ─── getTopStates ─────────────────────────────────────────────────────────────

describe('getTopStates', () => {
  function makeOppScore(code: string, score: number): OpportunityScore {
    return {
      stateCode: code,
      score,
      breakdown: { demographics: 0, trendActivity: 0, ecommerceIndex: 0, incomeIndex: 0 },
      topCategories: [],
      computedAt: Date.now(),
    };
  }

  it('returns top N sorted descending', () => {
    const scores = [makeOppScore('A', 50), makeOppScore('B', 90), makeOppScore('C', 70)];
    const top2 = getTopStates(scores, 2);
    expect(top2).toHaveLength(2);
    expect(top2[0].stateCode).toBe('B');
    expect(top2[1].stateCode).toBe('C');
  });

  it('returns all if n > length', () => {
    const scores = [makeOppScore('A', 50)];
    expect(getTopStates(scores, 10)).toHaveLength(1);
  });

  it('does not mutate original array', () => {
    const scores = [makeOppScore('A', 50), makeOppScore('B', 90)];
    getTopStates(scores, 1);
    expect(scores[0].stateCode).toBe('A');
  });
});

// ─── getOpportunityLabel ──────────────────────────────────────────────────────

describe('getOpportunityLabel', () => {
  it('0-20 → Low', () => {
    expect(getOpportunityLabel(0)).toBe('Low');
    expect(getOpportunityLabel(20)).toBe('Low');
  });

  it('21-40 → Below Avg', () => {
    expect(getOpportunityLabel(21)).toBe('Below Avg');
    expect(getOpportunityLabel(40)).toBe('Below Avg');
  });

  it('41-60 → Average', () => {
    expect(getOpportunityLabel(41)).toBe('Average');
    expect(getOpportunityLabel(60)).toBe('Average');
  });

  it('61-80 → Above Avg', () => {
    expect(getOpportunityLabel(61)).toBe('Above Avg');
    expect(getOpportunityLabel(80)).toBe('Above Avg');
  });

  it('81-100 → High', () => {
    expect(getOpportunityLabel(81)).toBe('High');
    expect(getOpportunityLabel(100)).toBe('High');
  });

  it('boundary 20 → Low, 21 → Below Avg', () => {
    expect(getOpportunityLabel(20)).toBe('Low');
    expect(getOpportunityLabel(21)).toBe('Below Avg');
  });

  it('boundary 60 → Average, 61 → Above Avg', () => {
    expect(getOpportunityLabel(60)).toBe('Average');
    expect(getOpportunityLabel(61)).toBe('Above Avg');
  });
});
