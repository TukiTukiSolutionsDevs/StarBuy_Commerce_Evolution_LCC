/**
 * Unit tests — states/store.ts
 *
 * File-based CRUD for scores, snapshots, and pulse events.
 * Uses a temp STARBUY_DATA_DIR so no real files are touched.
 *
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  loadScores,
  saveScores,
  getScoreByState,
  loadSnapshots,
  saveSnapshot,
  getSnapshotsByState,
  getSnapshotsByWeek,
  getLatestWeek,
  getPreviousWeek,
  loadPulseEvents,
  savePulseEvents,
  addPulseEvents,
  markPulseEventsRead,
  getUnreadPulseCount,
  getPulseEventsByState,
  getPulseEventsBySeverity,
} from './store';
import type { OpportunityScore, StateTrendSnapshot, MarketPulseEvent } from './types';

// ─── Setup ────────────────────────────────────────────────────────────────────

let tmpDir: string;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'starbuy-states-test-'));
  vi.stubEnv('STARBUY_DATA_DIR', tmpDir);
});

afterEach(() => {
  vi.unstubAllEnvs();
  rmSync(tmpDir, { recursive: true, force: true });
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeScore(code: string, score = 75): OpportunityScore {
  return {
    stateCode: code,
    score,
    breakdown: { demographics: 30, trendActivity: 25, ecommerceIndex: 15, incomeIndex: 5 },
    topCategories: ['electronics', 'fashion', 'home'],
    computedAt: Date.now(),
  };
}

function makeSnapshot(code: string, weekOf: string): StateTrendSnapshot {
  return {
    stateCode: code,
    weekOf,
    categoryScores: { electronics: 80, fashion: 60 },
    updatedAt: Date.now(),
  };
}

function makePulseEvent(
  id: string,
  stateCode = 'CA',
  overrides: Partial<MarketPulseEvent> = {},
): MarketPulseEvent {
  return {
    id,
    stateCode,
    stateName: 'California',
    category: 'electronics',
    categoryLabel: 'Electronics',
    severity: 'notable',
    deltaPercent: 15.5,
    previousScore: 60,
    currentScore: 69,
    detectedAt: Date.now(),
    isRead: false,
    ...overrides,
  };
}

// ─── Scores ───────────────────────────────────────────────────────────────────

describe('scores', () => {
  it('returns empty array when no scores exist', () => {
    expect(loadScores()).toEqual([]);
  });

  it('saves and loads scores', () => {
    const scores = [makeScore('CA', 90), makeScore('TX', 70)];
    saveScores(scores);
    expect(loadScores()).toHaveLength(2);
  });

  it('overwrites previous scores on save', () => {
    saveScores([makeScore('CA', 90)]);
    saveScores([makeScore('NY', 60)]);
    const loaded = loadScores();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].stateCode).toBe('NY');
  });

  it('getScoreByState returns matching score', () => {
    saveScores([makeScore('CA', 90), makeScore('TX', 70)]);
    expect(getScoreByState('CA')?.score).toBe(90);
  });

  it('getScoreByState returns undefined for missing state', () => {
    saveScores([makeScore('CA')]);
    expect(getScoreByState('ZZ')).toBeUndefined();
  });
});

// ─── Snapshots ────────────────────────────────────────────────────────────────

describe('snapshots', () => {
  it('returns empty array when no snapshots exist', () => {
    expect(loadSnapshots()).toEqual([]);
  });

  it('saves and retrieves a snapshot', () => {
    saveSnapshot(makeSnapshot('CA', '2026-04-07'));
    expect(loadSnapshots()).toHaveLength(1);
  });

  it('upserts snapshot with same stateCode + weekOf', () => {
    saveSnapshot(makeSnapshot('CA', '2026-04-07'));
    saveSnapshot({ ...makeSnapshot('CA', '2026-04-07'), categoryScores: { electronics: 99 } });
    const snaps = loadSnapshots();
    expect(snaps).toHaveLength(1);
    expect(snaps[0].categoryScores.electronics).toBe(99);
  });

  it('prunes snapshots older than 4 weeks', () => {
    // 5 distinct weeks — oldest should be pruned
    saveSnapshot(makeSnapshot('CA', '2026-03-03'));
    saveSnapshot(makeSnapshot('CA', '2026-03-10'));
    saveSnapshot(makeSnapshot('CA', '2026-03-17'));
    saveSnapshot(makeSnapshot('CA', '2026-03-24'));
    saveSnapshot(makeSnapshot('CA', '2026-03-31'));

    const snaps = loadSnapshots();
    expect(snaps).toHaveLength(4);
    expect(snaps.find((s) => s.weekOf === '2026-03-03')).toBeUndefined();
  });

  it('getSnapshotsByState filters correctly', () => {
    saveSnapshot(makeSnapshot('CA', '2026-04-07'));
    saveSnapshot(makeSnapshot('TX', '2026-04-07'));
    expect(getSnapshotsByState('CA')).toHaveLength(1);
  });

  it('getSnapshotsByWeek filters correctly', () => {
    saveSnapshot(makeSnapshot('CA', '2026-04-07'));
    saveSnapshot(makeSnapshot('TX', '2026-04-07'));
    saveSnapshot(makeSnapshot('CA', '2026-03-31'));
    expect(getSnapshotsByWeek('2026-04-07')).toHaveLength(2);
  });

  it('getLatestWeek returns most recent week', () => {
    saveSnapshot(makeSnapshot('CA', '2026-03-31'));
    saveSnapshot(makeSnapshot('CA', '2026-04-07'));
    expect(getLatestWeek()).toBe('2026-04-07');
  });

  it('getLatestWeek returns null when empty', () => {
    expect(getLatestWeek()).toBeNull();
  });

  it('getPreviousWeek returns second-most-recent week', () => {
    saveSnapshot(makeSnapshot('CA', '2026-03-31'));
    saveSnapshot(makeSnapshot('CA', '2026-04-07'));
    expect(getPreviousWeek()).toBe('2026-03-31');
  });

  it('getPreviousWeek returns null when only one week exists', () => {
    saveSnapshot(makeSnapshot('CA', '2026-04-07'));
    expect(getPreviousWeek()).toBeNull();
  });
});

// ─── Pulse Events ─────────────────────────────────────────────────────────────

describe('pulse events', () => {
  it('returns empty array when no events exist', () => {
    expect(loadPulseEvents()).toEqual([]);
  });

  it('saves and loads pulse events', () => {
    savePulseEvents([makePulseEvent('e1'), makePulseEvent('e2')]);
    expect(loadPulseEvents()).toHaveLength(2);
  });

  it('addPulseEvents merges with existing events', () => {
    savePulseEvents([makePulseEvent('e1')]);
    addPulseEvents([makePulseEvent('e2'), makePulseEvent('e3')]);
    expect(loadPulseEvents()).toHaveLength(3);
  });

  it('prunes events older than 30 days on save', () => {
    const old = makePulseEvent('old', 'CA', {
      detectedAt: Date.now() - 31 * 24 * 60 * 60 * 1000,
    });
    const recent = makePulseEvent('recent');
    savePulseEvents([old, recent]);
    const events = loadPulseEvents();
    expect(events).toHaveLength(1);
    expect(events[0].id).toBe('recent');
  });

  it('caps events at 500 on save', () => {
    const events = Array.from({ length: 600 }, (_, i) =>
      makePulseEvent(`e-${i}`, 'CA', { detectedAt: Date.now() - i * 1000 }),
    );
    savePulseEvents(events);
    expect(loadPulseEvents()).toHaveLength(500);
  });

  it('markPulseEventsRead marks specified events', () => {
    savePulseEvents([makePulseEvent('e1'), makePulseEvent('e2'), makePulseEvent('e3')]);
    const marked = markPulseEventsRead(['e1', 'e3']);
    expect(marked).toBe(2);
    const events = loadPulseEvents();
    expect(events.find((e) => e.id === 'e1')?.isRead).toBe(true);
    expect(events.find((e) => e.id === 'e2')?.isRead).toBe(false);
    expect(events.find((e) => e.id === 'e3')?.isRead).toBe(true);
  });

  it('markPulseEventsRead returns 0 for already-read events', () => {
    savePulseEvents([makePulseEvent('e1', 'CA', { isRead: true })]);
    expect(markPulseEventsRead(['e1'])).toBe(0);
  });

  it('markPulseEventsRead returns 0 for non-existent ids', () => {
    savePulseEvents([makePulseEvent('e1')]);
    expect(markPulseEventsRead(['ghost'])).toBe(0);
  });

  it('getUnreadPulseCount returns correct count', () => {
    savePulseEvents([
      makePulseEvent('e1', 'CA', { isRead: false }),
      makePulseEvent('e2', 'CA', { isRead: true }),
      makePulseEvent('e3', 'CA', { isRead: false }),
    ]);
    expect(getUnreadPulseCount()).toBe(2);
  });

  it('getPulseEventsByState filters correctly', () => {
    savePulseEvents([
      makePulseEvent('e1', 'CA'),
      makePulseEvent('e2', 'TX'),
      makePulseEvent('e3', 'CA'),
    ]);
    expect(getPulseEventsByState('CA')).toHaveLength(2);
    expect(getPulseEventsByState('TX')).toHaveLength(1);
  });

  it('getPulseEventsBySeverity filters correctly', () => {
    savePulseEvents([
      makePulseEvent('e1', 'CA', { severity: 'major' }),
      makePulseEvent('e2', 'CA', { severity: 'notable' }),
      makePulseEvent('e3', 'CA', { severity: 'major' }),
    ]);
    expect(getPulseEventsBySeverity('major')).toHaveLength(2);
    expect(getPulseEventsBySeverity('anomaly')).toHaveLength(0);
  });
});

// ─── Edge cases ───────────────────────────────────────────────────────────────

describe('edge cases', () => {
  it('handles corrupt JSON gracefully for scores', () => {
    const dir = join(tmpDir, '.starbuy-states');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'scores.json'), '{not valid json', 'utf-8');
    expect(loadScores()).toEqual([]);
  });

  it('handles corrupt JSON gracefully for snapshots', () => {
    const dir = join(tmpDir, '.starbuy-states');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'snapshots.json'), 'broken', 'utf-8');
    expect(loadSnapshots()).toEqual([]);
  });

  it('handles corrupt JSON gracefully for pulse events', () => {
    const dir = join(tmpDir, '.starbuy-states');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'pulse-events.json'), '---', 'utf-8');
    expect(loadPulseEvents()).toEqual([]);
  });
});
