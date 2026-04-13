/**
 * Unit tests — trends/scorer.ts
 *
 * Pure functions — no I/O, no mocks needed.
 *
 * @vitest-environment node
 */

import { describe, it, expect } from 'vitest';
import { normalizeScore, deriveState } from './scorer';

// ─── normalizeScore ───────────────────────────────────────────────────────────

describe('normalizeScore', () => {
  it('maps min to 0', () => {
    expect(normalizeScore(0, 0, 100)).toBe(0);
  });

  it('maps max to 100', () => {
    expect(normalizeScore(100, 0, 100)).toBe(100);
  });

  it('maps midpoint correctly', () => {
    expect(normalizeScore(50, 0, 100)).toBe(50);
  });

  it('returns 50 when min === max (no variation)', () => {
    expect(normalizeScore(50, 50, 50)).toBe(50);
    expect(normalizeScore(0, 0, 0)).toBe(50);
  });

  it('clamps values below min to 0', () => {
    expect(normalizeScore(-10, 0, 100)).toBe(0);
  });

  it('clamps values above max to 100', () => {
    expect(normalizeScore(150, 0, 100)).toBe(100);
  });

  it('handles non-zero min correctly', () => {
    // raw=150, min=100, max=200 → 50%
    expect(normalizeScore(150, 100, 200)).toBe(50);
  });

  it('returns integer (rounds)', () => {
    // raw=1, min=0, max=3 → 33.333... → 33
    expect(normalizeScore(1, 0, 3)).toBe(33);
  });
});

// ─── deriveState ──────────────────────────────────────────────────────────────

describe('deriveState', () => {
  it('returns "unknown" when no previous score is provided', () => {
    expect(deriveState(50)).toBe('unknown');
    expect(deriveState(0)).toBe('unknown');
  });

  it('returns "rising" when delta > 10 and score < 85', () => {
    expect(deriveState(70, 50)).toBe('rising'); // delta=20
    expect(deriveState(84, 70)).toBe('rising'); // delta=14, score just below peak
  });

  it('returns "peak" when delta > 10 and score >= 85', () => {
    expect(deriveState(90, 75)).toBe('peak'); // delta=15, score=90
    expect(deriveState(85, 70)).toBe('peak'); // delta=15, score exactly 85
    expect(deriveState(100, 80)).toBe('peak'); // delta=20, score=100
  });

  it('returns "declining" when delta < -10', () => {
    expect(deriveState(30, 60)).toBe('declining'); // delta=-30
    expect(deriveState(20, 35)).toBe('declining'); // delta=-15
  });

  it('returns "stable" for deltas in [-10, 10]', () => {
    expect(deriveState(50, 45)).toBe('stable'); // delta=5
    expect(deriveState(45, 50)).toBe('stable'); // delta=-5
    expect(deriveState(60, 50)).toBe('stable'); // delta exactly 10 → stable (not > 10)
    expect(deriveState(40, 50)).toBe('stable'); // delta exactly -10 → stable (not < -10)
  });

  it('returns "stable" when score did not change', () => {
    expect(deriveState(50, 50)).toBe('stable');
  });
});
