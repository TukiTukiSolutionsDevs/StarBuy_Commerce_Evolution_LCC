/**
 * State Intelligence — Opportunity Score Engine
 *
 * Pure functions to compute Market Opportunity Scores for US states.
 * No side effects, no I/O — safe to call anywhere.
 *
 * Formula:
 *   score = round(
 *     demographics   × 0.35  (normalize(population) × urbanizationPct / 100)
 *     trendActivity  × 0.30  (avg top-5 category trend scores)
 *     ecommerceIndex × 0.20  (static from StateProfile)
 *     incomeIndex    × 0.15  (normalize(medianIncome))
 *   )
 */

import type { StateProfile, OpportunityScore, ScoreBreakdown } from './types';

// ─── Weights ──────────────────────────────────────────────────────────────────

const W_DEMOGRAPHICS = 0.35;
const W_TREND = 0.3;
const W_ECOMMERCE = 0.2;
const W_INCOME = 0.15;

// ─── Normalization ────────────────────────────────────────────────────────────

/**
 * Min-max normalization across an array of values → 0-100.
 * Returns array of 50s when all values are identical (no variance).
 */
export function normalizeAcrossStates(values: number[]): number[] {
  if (values.length === 0) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max === min) return values.map(() => 50);
  return values.map((v) => Math.round(((v - min) / (max - min)) * 100));
}

// ─── Single State Score ───────────────────────────────────────────────────────

export interface TrendDataForScoring {
  /** Average score of top categories for this state (0-100). Default 50. */
  avgCategoryScore?: number;
  /** Top 3 category IDs by score */
  topCategories?: string[];
}

/**
 * Compute opportunity score for a single state.
 * Requires pre-normalized demographic and income indices (0-100).
 */
export function computeOpportunityScore(
  profile: StateProfile,
  normalizedPopulation: number,
  normalizedIncome: number,
  trendData: TrendDataForScoring = {},
): OpportunityScore {
  const { avgCategoryScore = 50, topCategories = [] } = trendData;

  // Demographics sub-score: normalized population weighted by urbanization
  const demographics = Math.round(normalizedPopulation * (profile.urbanizationPct / 100));

  // Trend activity: avg category score (already 0-100)
  const trendActivity = Math.round(Math.min(100, Math.max(0, avgCategoryScore)));

  // Ecommerce index: directly from profile (already 0-100)
  const ecommerceIndex = profile.ecommerceIndex;

  // Income index: pre-normalized (0-100)
  const incomeIndex = normalizedIncome;

  const breakdown: ScoreBreakdown = {
    demographics,
    trendActivity,
    ecommerceIndex,
    incomeIndex,
  };

  const raw =
    breakdown.demographics * W_DEMOGRAPHICS +
    breakdown.trendActivity * W_TREND +
    breakdown.ecommerceIndex * W_ECOMMERCE +
    breakdown.incomeIndex * W_INCOME;

  const score = Math.round(Math.min(100, Math.max(0, raw)));

  return {
    stateCode: profile.code,
    score,
    breakdown,
    topCategories: topCategories.slice(0, 3),
    computedAt: Date.now(),
  };
}

// ─── Batch Scoring ────────────────────────────────────────────────────────────

/**
 * Compute opportunity scores for all states.
 * Normalizes population and income across the full dataset.
 * trendDataMap: stateCode → TrendDataForScoring (optional, defaults to neutral 50)
 */
export function computeAllScores(
  profiles: StateProfile[],
  trendDataMap: Record<string, TrendDataForScoring> = {},
): OpportunityScore[] {
  if (profiles.length === 0) return [];

  const populations = profiles.map((p) => p.population);
  const incomes = profiles.map((p) => p.medianIncome);

  const normalizedPop = normalizeAcrossStates(populations);
  const normalizedInc = normalizeAcrossStates(incomes);

  return profiles.map((profile, i) =>
    computeOpportunityScore(
      profile,
      normalizedPop[i],
      normalizedInc[i],
      trendDataMap[profile.code] ?? {},
    ),
  );
}

/**
 * Sort scores descending and return top N.
 */
export function getTopStates(scores: OpportunityScore[], n = 10): OpportunityScore[] {
  return [...scores].sort((a, b) => b.score - a.score).slice(0, n);
}

/**
 * Get the score label for UI display.
 */
export type OpportunityLabel = 'Low' | 'Below Avg' | 'Average' | 'Above Avg' | 'High';

export function getOpportunityLabel(score: number): OpportunityLabel {
  if (score <= 20) return 'Low';
  if (score <= 40) return 'Below Avg';
  if (score <= 60) return 'Average';
  if (score <= 80) return 'Above Avg';
  return 'High';
}
