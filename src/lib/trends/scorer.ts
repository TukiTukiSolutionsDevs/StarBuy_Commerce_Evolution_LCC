/**
 * Trend Engine — Score Normalization
 *
 * Pure functions to normalize raw provider scores into the 0-100 range
 * and derive trend state from score deltas.
 * No side effects, no I/O — safe to call anywhere.
 */

import type { TrendState } from './types';

// ─── Normalization ────────────────────────────────────────────────────────────

/**
 * Normalize a raw score from [min, max] to [0, 100].
 * Returns 50 when min === max (no variation to measure).
 * Clamps output to [0, 100].
 */
export function normalizeScore(raw: number, min: number, max: number): number {
  if (max === min) return 50;
  return Math.round(Math.min(100, Math.max(0, ((raw - min) / (max - min)) * 100)));
}

// ─── State Derivation ─────────────────────────────────────────────────────────

/**
 * Derive a TrendState from the current score and an optional previous score.
 *
 * Rules:
 *   - No previous → 'unknown'
 *   - delta > 10 AND current >= 85 → 'peak'
 *   - delta > 10 → 'rising'
 *   - delta < -10 → 'declining'
 *   - Otherwise → 'stable'
 */
export function deriveState(current: number, previous?: number): TrendState {
  if (previous === undefined) return 'unknown';
  const delta = current - previous;
  if (delta > 10) return current >= 85 ? 'peak' : 'rising';
  if (delta < -10) return 'declining';
  return 'stable';
}
