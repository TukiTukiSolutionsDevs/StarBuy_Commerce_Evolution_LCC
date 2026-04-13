/**
 * Unit tests — states/index.ts
 *
 * Validates public API re-exports and the buildStatesWithScores helper.
 *
 * @vitest-environment node
 */

import { describe, it, expect } from 'vitest';
import {
  // Types re-exported (verify they exist as values/functions)
  scoreToQuintile,
  QUINTILE_COLORS,
  QUINTILE_BG_COLORS,
  STATE_PROFILES,
  ALL_STATE_CODES,
  STATE_COUNT,
  getStateProfile,
  getAllStateProfiles,
  normalizeAcrossStates,
  computeAllScores,
  getTopStates,
  getOpportunityLabel,
  classifySeverity,
  getWeekStart,
  calculateDelta,
  detectPulseEvents,
  filterSignificantEvents,
  buildStatesWithScores,
} from './index';
import type { OpportunityScore } from './types';

// ─── Re-exports smoke test ────────────────────────────────────────────────────

describe('public API re-exports', () => {
  it('exports scoreToQuintile function', () => {
    expect(typeof scoreToQuintile).toBe('function');
    expect(scoreToQuintile(50)).toBe(3);
  });

  it('exports QUINTILE_COLORS record', () => {
    expect(QUINTILE_COLORS[1]).toBe('fill-red-400');
    expect(QUINTILE_COLORS[5]).toBe('fill-emerald-500');
  });

  it('exports QUINTILE_BG_COLORS record', () => {
    expect(QUINTILE_BG_COLORS[1]).toBe('bg-red-400');
  });

  it('exports data functions', () => {
    expect(typeof getStateProfile).toBe('function');
    expect(typeof getAllStateProfiles).toBe('function');
    expect(STATE_COUNT).toBe(51);
    expect(ALL_STATE_CODES).toHaveLength(51);
    expect(STATE_PROFILES.CA).toBeDefined();
  });

  it('exports scorer functions', () => {
    expect(typeof normalizeAcrossStates).toBe('function');
    expect(typeof computeAllScores).toBe('function');
    expect(typeof getTopStates).toBe('function');
    expect(typeof getOpportunityLabel).toBe('function');
  });

  it('exports pulse functions', () => {
    expect(typeof classifySeverity).toBe('function');
    expect(typeof getWeekStart).toBe('function');
    expect(typeof calculateDelta).toBe('function');
    expect(typeof detectPulseEvents).toBe('function');
    expect(typeof filterSignificantEvents).toBe('function');
  });
});

// ─── buildStatesWithScores ────────────────────────────────────────────────────

describe('buildStatesWithScores', () => {
  function makeScore(code: string, score: number): OpportunityScore {
    return {
      stateCode: code,
      score,
      breakdown: { demographics: 25, trendActivity: 25, ecommerceIndex: 25, incomeIndex: 25 },
      topCategories: ['electronics'],
      computedAt: Date.now(),
    };
  }

  it('returns 51 entries (one per state)', () => {
    const result = buildStatesWithScores([makeScore('CA', 90)]);
    expect(result).toHaveLength(51);
  });

  it('merges score into matching state profile', () => {
    const result = buildStatesWithScores([makeScore('CA', 90)]);
    const ca = result.find((s) => s.code === 'CA');
    expect(ca).toBeDefined();
    expect(ca!.opportunityScore.score).toBe(90);
    expect(ca!.name).toBe('California');
  });

  it('provides zero-score default for states without scores', () => {
    const result = buildStatesWithScores([makeScore('CA', 90)]);
    const tx = result.find((s) => s.code === 'TX');
    expect(tx).toBeDefined();
    expect(tx!.opportunityScore.score).toBe(0);
    expect(tx!.opportunityScore.computedAt).toBe(0);
  });

  it('returns empty scores for all states when no scores provided', () => {
    const result = buildStatesWithScores([]);
    expect(result).toHaveLength(51);
    expect(result.every((s) => s.opportunityScore.score === 0)).toBe(true);
  });

  it('each entry has both profile and score fields', () => {
    const result = buildStatesWithScores([makeScore('CA', 90)]);
    const ca = result.find((s) => s.code === 'CA')!;
    // Profile fields
    expect(ca.population).toBeGreaterThan(0);
    expect(ca.region).toBe('West');
    expect(ca.ecommerceIndex).toBeGreaterThan(0);
    // Score fields
    expect(ca.opportunityScore.stateCode).toBe('CA');
    expect(ca.opportunityScore.breakdown).toBeDefined();
  });
});
