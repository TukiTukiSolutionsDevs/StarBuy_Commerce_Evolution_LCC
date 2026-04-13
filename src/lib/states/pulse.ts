/**
 * State Intelligence — Market Pulse Engine
 *
 * Detects week-over-week shifts in category popularity per state.
 * Pure functions for severity classification and event detection.
 * No side effects, no I/O — depends only on snapshot data passed in.
 *
 * Severity thresholds:
 *   |Δ%| < 10  → minor (not surfaced by default)
 *   |Δ%| 10-25 → notable
 *   |Δ%| 25-50 → major
 *   |Δ%| > 50  → anomaly
 */

import { randomUUID } from 'crypto';
import type { PulseSeverity, MarketPulseEvent, StateTrendSnapshot } from './types';
import { getStateProfile } from './data';

// ─── Severity Classification ──────────────────────────────────────────────────

export function classifySeverity(deltaPercent: number): PulseSeverity {
  const abs = Math.abs(deltaPercent);
  if (abs < 10) return 'minor';
  if (abs <= 25) return 'notable';
  if (abs <= 50) return 'major';
  return 'anomaly';
}

// ─── Week Helpers ─────────────────────────────────────────────────────────────

/**
 * Get the Monday of the current week (ISO 8601).
 * Returns 'YYYY-MM-DD' string.
 */
export function getWeekStart(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getUTCDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const diff = day === 0 ? -6 : 1 - day; // adjust to Monday
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().split('T')[0];
}

/**
 * Get the Monday of the previous week.
 */
export function getPreviousWeekStart(date: Date = new Date()): string {
  const d = new Date(date);
  d.setDate(d.getDate() - 7);
  return getWeekStart(d);
}

// ─── Delta Calculation ────────────────────────────────────────────────────────

/**
 * Calculate percentage change between two scores.
 * Returns signed delta (positive = growth, negative = decline).
 * If previous is 0, treats as emergence: returns +100 if current > 0, 0 otherwise.
 */
export function calculateDelta(current: number, previous: number): number {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }
  const raw = ((current - previous) / previous) * 100;
  return Math.round(raw * 10) / 10; // 1 decimal place
}

// ─── Event Detection ──────────────────────────────────────────────────────────

/**
 * Category label resolver. Falls back to the category ID itself.
 */
export type CategoryLabelResolver = (categoryId: string) => string;

const defaultLabelResolver: CategoryLabelResolver = (id) => id;

/**
 * Detect pulse events by comparing two sets of snapshots (current week vs previous week).
 * Returns events for all severity levels (caller can filter).
 */
export function detectPulseEvents(
  currentSnapshots: StateTrendSnapshot[],
  previousSnapshots: StateTrendSnapshot[],
  resolveCategoryLabel: CategoryLabelResolver = defaultLabelResolver,
): MarketPulseEvent[] {
  const events: MarketPulseEvent[] = [];

  // Index previous snapshots by stateCode for O(1) lookup
  const previousMap = new Map<string, StateTrendSnapshot>();
  for (const snap of previousSnapshots) {
    previousMap.set(snap.stateCode, snap);
  }

  for (const current of currentSnapshots) {
    const previous = previousMap.get(current.stateCode);
    const profile = getStateProfile(current.stateCode);
    const stateName = profile?.name ?? current.stateCode;

    // Get all categories from current snapshot
    for (const [categoryId, currentScore] of Object.entries(current.categoryScores)) {
      const previousScore = previous?.categoryScores[categoryId] ?? 0;
      const deltaPercent = calculateDelta(currentScore, previousScore);
      const severity = classifySeverity(deltaPercent);

      events.push({
        id: randomUUID(),
        stateCode: current.stateCode,
        stateName,
        category: categoryId,
        categoryLabel: resolveCategoryLabel(categoryId),
        severity,
        deltaPercent,
        previousScore,
        currentScore,
        detectedAt: Date.now(),
        isRead: false,
      });
    }

    // Check for categories that disappeared (were in previous but not current)
    if (previous) {
      for (const [categoryId, previousScore] of Object.entries(previous.categoryScores)) {
        if (!(categoryId in current.categoryScores) && previousScore > 0) {
          const deltaPercent = -100;
          const severity = classifySeverity(deltaPercent);

          events.push({
            id: randomUUID(),
            stateCode: current.stateCode,
            stateName,
            category: categoryId,
            categoryLabel: resolveCategoryLabel(categoryId),
            severity,
            deltaPercent,
            previousScore,
            currentScore: 0,
            detectedAt: Date.now(),
            isRead: false,
          });
        }
      }
    }
  }

  return events;
}

/**
 * Filter events to only those worth surfacing (exclude 'minor').
 */
export function filterSignificantEvents(events: MarketPulseEvent[]): MarketPulseEvent[] {
  return events.filter((e) => e.severity !== 'minor');
}
