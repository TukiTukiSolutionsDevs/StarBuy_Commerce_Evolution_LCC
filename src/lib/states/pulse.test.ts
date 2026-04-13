/**
 * Unit tests — states/pulse.ts
 *
 * Pure functions for severity classification and event detection.
 * No I/O — snapshots are passed in as data.
 *
 * @vitest-environment node
 */

import { describe, it, expect } from 'vitest';
import {
  classifySeverity,
  getWeekStart,
  getPreviousWeekStart,
  calculateDelta,
  detectPulseEvents,
  filterSignificantEvents,
} from './pulse';
import type { StateTrendSnapshot, MarketPulseEvent } from './types';

// ─── classifySeverity ─────────────────────────────────────────────────────────

describe('classifySeverity', () => {
  it('|Δ| < 10 → minor', () => {
    expect(classifySeverity(0)).toBe('minor');
    expect(classifySeverity(5)).toBe('minor');
    expect(classifySeverity(-9.9)).toBe('minor');
  });

  it('|Δ| 10-25 → notable', () => {
    expect(classifySeverity(10)).toBe('notable');
    expect(classifySeverity(25)).toBe('notable');
    expect(classifySeverity(-15)).toBe('notable');
  });

  it('|Δ| 25.1-50 → major', () => {
    expect(classifySeverity(25.1)).toBe('major');
    expect(classifySeverity(50)).toBe('major');
    expect(classifySeverity(-40)).toBe('major');
  });

  it('|Δ| > 50 → anomaly', () => {
    expect(classifySeverity(50.1)).toBe('anomaly');
    expect(classifySeverity(100)).toBe('anomaly');
    expect(classifySeverity(-75)).toBe('anomaly');
  });

  it('boundary 9.9 → minor, 10 → notable', () => {
    expect(classifySeverity(9.9)).toBe('minor');
    expect(classifySeverity(10)).toBe('notable');
  });

  it('boundary 25 → notable, 25.1 → major', () => {
    expect(classifySeverity(25)).toBe('notable');
    expect(classifySeverity(25.1)).toBe('major');
  });

  it('boundary 50 → major, 50.1 → anomaly', () => {
    expect(classifySeverity(50)).toBe('major');
    expect(classifySeverity(50.1)).toBe('anomaly');
  });
});

// ─── getWeekStart ─────────────────────────────────────────────────────────────

describe('getWeekStart', () => {
  it('returns Monday for a Wednesday', () => {
    // 2026-04-08 is a Wednesday
    expect(getWeekStart(new Date('2026-04-08'))).toBe('2026-04-06');
  });

  it('returns Monday for a Monday', () => {
    expect(getWeekStart(new Date('2026-04-06'))).toBe('2026-04-06');
  });

  it('returns Monday for a Sunday', () => {
    // Sunday should go back to the previous Monday
    expect(getWeekStart(new Date('2026-04-12'))).toBe('2026-04-06');
  });

  it('returns Monday for a Saturday', () => {
    expect(getWeekStart(new Date('2026-04-11'))).toBe('2026-04-06');
  });

  it('returns YYYY-MM-DD format', () => {
    expect(getWeekStart(new Date('2026-04-08'))).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

// ─── getPreviousWeekStart ─────────────────────────────────────────────────────

describe('getPreviousWeekStart', () => {
  it('returns Monday of the previous week', () => {
    // Wednesday 2026-04-08 → current Monday = 2026-04-06 → prev Monday = 2026-03-30
    expect(getPreviousWeekStart(new Date('2026-04-08'))).toBe('2026-03-30');
  });

  it('works from a Monday', () => {
    expect(getPreviousWeekStart(new Date('2026-04-06'))).toBe('2026-03-30');
  });
});

// ─── calculateDelta ───────────────────────────────────────────────────────────

describe('calculateDelta', () => {
  it('computes positive growth', () => {
    // (80 - 60) / 60 * 100 = 33.3
    expect(calculateDelta(80, 60)).toBe(33.3);
  });

  it('computes negative decline', () => {
    // (40 - 60) / 60 * 100 = -33.3
    expect(calculateDelta(40, 60)).toBe(-33.3);
  });

  it('returns 0 when no change', () => {
    expect(calculateDelta(50, 50)).toBe(0);
  });

  it('handles previous=0 with current>0 → emergence (+100)', () => {
    expect(calculateDelta(50, 0)).toBe(100);
  });

  it('handles previous=0 with current=0 → 0', () => {
    expect(calculateDelta(0, 0)).toBe(0);
  });

  it('rounds to 1 decimal place', () => {
    // (70 - 60) / 60 * 100 = 16.666... → 16.7
    expect(calculateDelta(70, 60)).toBe(16.7);
  });
});

// ─── detectPulseEvents ────────────────────────────────────────────────────────

describe('detectPulseEvents', () => {
  function makeSnapshot(
    stateCode: string,
    weekOf: string,
    scores: Record<string, number>,
  ): StateTrendSnapshot {
    return { stateCode, weekOf, categoryScores: scores, updatedAt: Date.now() };
  }

  it('returns empty array when no snapshots', () => {
    expect(detectPulseEvents([], [])).toEqual([]);
  });

  it('detects growth event when category score increases', () => {
    const current = [makeSnapshot('CA', '2026-04-07', { electronics: 80 })];
    const previous = [makeSnapshot('CA', '2026-03-31', { electronics: 60 })];
    const events = detectPulseEvents(current, previous);

    expect(events).toHaveLength(1);
    expect(events[0].stateCode).toBe('CA');
    expect(events[0].category).toBe('electronics');
    expect(events[0].deltaPercent).toBe(33.3);
    expect(events[0].severity).toBe('major');
    expect(events[0].currentScore).toBe(80);
    expect(events[0].previousScore).toBe(60);
  });

  it('detects decline event', () => {
    const current = [makeSnapshot('TX', '2026-04-07', { fashion: 30 })];
    const previous = [makeSnapshot('TX', '2026-03-31', { fashion: 60 })];
    const events = detectPulseEvents(current, previous);

    expect(events[0].deltaPercent).toBe(-50);
    expect(events[0].severity).toBe('major');
  });

  it('treats new category (no previous) as emergence', () => {
    const current = [makeSnapshot('CA', '2026-04-07', { newcat: 50 })];
    const previous = [makeSnapshot('CA', '2026-03-31', {})];
    const events = detectPulseEvents(current, previous);

    expect(events[0].deltaPercent).toBe(100);
    expect(events[0].severity).toBe('anomaly');
  });

  it('detects disappeared categories', () => {
    const current = [makeSnapshot('CA', '2026-04-07', {})];
    const previous = [makeSnapshot('CA', '2026-03-31', { electronics: 70 })];
    const events = detectPulseEvents(current, previous);

    expect(events).toHaveLength(1);
    expect(events[0].deltaPercent).toBe(-100);
    expect(events[0].severity).toBe('anomaly');
    expect(events[0].currentScore).toBe(0);
  });

  it('handles first run (no previous snapshots)', () => {
    const current = [makeSnapshot('CA', '2026-04-07', { electronics: 80 })];
    const events = detectPulseEvents(current, []);

    expect(events).toHaveLength(1);
    expect(events[0].deltaPercent).toBe(100); // emergence
  });

  it('handles multiple states and categories', () => {
    const current = [
      makeSnapshot('CA', '2026-04-07', { electronics: 80, fashion: 50 }),
      makeSnapshot('TX', '2026-04-07', { electronics: 70 }),
    ];
    const previous = [
      makeSnapshot('CA', '2026-03-31', { electronics: 60, fashion: 45 }),
      makeSnapshot('TX', '2026-03-31', { electronics: 65 }),
    ];
    const events = detectPulseEvents(current, previous);

    expect(events).toHaveLength(3);
    expect(events.filter((e) => e.stateCode === 'CA')).toHaveLength(2);
    expect(events.filter((e) => e.stateCode === 'TX')).toHaveLength(1);
  });

  it('uses custom category label resolver', () => {
    const current = [makeSnapshot('CA', '2026-04-07', { elec: 80 })];
    const previous = [makeSnapshot('CA', '2026-03-31', { elec: 60 })];
    const resolver = (id: string) => (id === 'elec' ? 'Electronics' : id);
    const events = detectPulseEvents(current, previous, resolver);

    expect(events[0].categoryLabel).toBe('Electronics');
  });

  it('resolves state name from data module', () => {
    const current = [makeSnapshot('CA', '2026-04-07', { electronics: 80 })];
    const events = detectPulseEvents(current, []);

    expect(events[0].stateName).toBe('California');
  });

  it('all events have unique IDs', () => {
    const current = [makeSnapshot('CA', '2026-04-07', { a: 80, b: 60, c: 40 })];
    const events = detectPulseEvents(current, []);
    const ids = new Set(events.map((e) => e.id));
    expect(ids.size).toBe(3);
  });

  it('all events default to isRead=false', () => {
    const current = [makeSnapshot('CA', '2026-04-07', { electronics: 80 })];
    const events = detectPulseEvents(current, []);
    expect(events.every((e) => e.isRead === false)).toBe(true);
  });
});

// ─── filterSignificantEvents ──────────────────────────────────────────────────

describe('filterSignificantEvents', () => {
  function makeFakeEvent(severity: MarketPulseEvent['severity']): MarketPulseEvent {
    return {
      id: 'test',
      stateCode: 'CA',
      stateName: 'California',
      category: 'electronics',
      categoryLabel: 'Electronics',
      severity,
      deltaPercent: 0,
      previousScore: 0,
      currentScore: 0,
      detectedAt: Date.now(),
      isRead: false,
    };
  }

  it('excludes minor events', () => {
    const events = [
      makeFakeEvent('minor'),
      makeFakeEvent('notable'),
      makeFakeEvent('major'),
      makeFakeEvent('anomaly'),
    ];
    const significant = filterSignificantEvents(events);
    expect(significant).toHaveLength(3);
    expect(significant.every((e) => e.severity !== 'minor')).toBe(true);
  });

  it('returns empty array when all events are minor', () => {
    expect(filterSignificantEvents([makeFakeEvent('minor')])).toEqual([]);
  });
});
