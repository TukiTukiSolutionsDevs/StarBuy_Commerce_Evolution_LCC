/**
 * Research Board — AI Score & Margin Calculator
 *
 * Pure functions — no side effects, no I/O.
 * Safe to call anywhere.
 */

import type { AiScoreBreakdown, AiScoreLabel } from './types';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ScoreInput = {
  trendScore: number;
  marginPercent: number;
  adCount?: number;
  searchVolume?: number;
};

export type ComputedAiScore = {
  score: number;
  breakdown: AiScoreBreakdown;
  label: AiScoreLabel;
};

// ─── Margin Calculator ────────────────────────────────────────────────────────

/**
 * Compute margin percentage rounded to 1 decimal place.
 * Returns 0 if salePrice <= 0.
 */
export function computeMargin(costPrice: number, salePrice: number): number {
  if (salePrice <= 0) return 0;
  return Math.round(((salePrice - costPrice) / salePrice) * 100 * 10) / 10;
}

// ─── AI Score ─────────────────────────────────────────────────────────────────

/**
 * Compute composite AI score (0–100).
 *
 * Formula:
 *   trend:       trendScore × 0.4, capped at 40
 *   margin:      marginPercent × 0.6, capped at 30  (50% margin = 30 pts)
 *   competition: inverse of adCount; neutral 10 if unavailable
 *                each 50 ads reduces 1 point, minimum 0
 *   volume:      searchVolume / 1000, capped at 10; neutral 5 if unavailable
 */
export function computeAiScore(input: ScoreInput): ComputedAiScore {
  const trend = Math.min(40, Math.round(input.trendScore * 0.4));
  const margin = Math.min(30, Math.round(input.marginPercent * 0.6));
  const competition = input.adCount != null ? Math.max(0, 20 - Math.floor(input.adCount / 50)) : 10;
  const volume =
    input.searchVolume != null ? Math.min(10, Math.floor(input.searchVolume / 1000)) : 5;

  const score = trend + margin + competition + volume;
  const breakdown: AiScoreBreakdown = { trend, margin, competition, volume };

  return { score, breakdown, label: getAiScoreLabel(score) };
}

/**
 * Map a composite score to its human-readable label.
 */
export function getAiScoreLabel(score: number): AiScoreLabel {
  if (score <= 30) return 'Weak';
  if (score <= 50) return 'Fair';
  if (score <= 70) return 'Good';
  return 'Strong';
}
