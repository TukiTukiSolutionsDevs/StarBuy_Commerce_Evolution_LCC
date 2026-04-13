/**
 * Unit tests — research/scorer.ts
 *
 * Pure functions — no I/O, no mocks needed.
 *
 * @vitest-environment node
 */

import { describe, it, expect } from 'vitest';
import { computeMargin, computeAiScore, getAiScoreLabel } from './scorer';

// ─── computeMargin ────────────────────────────────────────────────────────────

describe('computeMargin', () => {
  it('computes a simple positive margin', () => {
    // (100 - 60) / 100 * 100 = 40.0
    expect(computeMargin(60, 100)).toBe(40);
  });

  it('rounds to 1 decimal place', () => {
    // (15 - 8) / 15 * 100 = 46.666... → 46.7
    expect(computeMargin(8, 15)).toBe(46.7);
  });

  it('returns 0 when salePrice is 0', () => {
    expect(computeMargin(10, 0)).toBe(0);
  });

  it('returns 0 when salePrice is negative', () => {
    expect(computeMargin(10, -5)).toBe(0);
  });

  it('returns 0% when costPrice equals salePrice', () => {
    expect(computeMargin(50, 50)).toBe(0);
  });

  it('returns negative margin when costPrice > salePrice', () => {
    // (50 - 80) / 50 * 100 = -60
    expect(computeMargin(80, 50)).toBe(-60);
  });

  it('returns 100% margin when costPrice is 0', () => {
    expect(computeMargin(0, 100)).toBe(100);
  });

  it('returns 50% margin for equal cost/sale split', () => {
    // (20 - 10) / 20 * 100 = 50.0
    expect(computeMargin(10, 20)).toBe(50);
  });
});

// ─── computeAiScore ───────────────────────────────────────────────────────────

describe('computeAiScore', () => {
  it('computes each breakdown component correctly with all signals present', () => {
    const result = computeAiScore({
      trendScore: 80, // trend   = min(40, round(80 × 0.4)) = 32
      marginPercent: 40, // margin  = min(30, round(40 × 0.6)) = 24
      adCount: 100, // comp    = max(0, 20 − floor(100/50)) = 18
      searchVolume: 5000, // volume  = min(10, floor(5000/1000)) = 5
    });

    expect(result.breakdown.trend).toBe(32);
    expect(result.breakdown.margin).toBe(24);
    expect(result.breakdown.competition).toBe(18);
    expect(result.breakdown.volume).toBe(5);
    expect(result.score).toBe(79);
    expect(result.label).toBe('Strong');
  });

  it('score equals sum of breakdown components', () => {
    const result = computeAiScore({
      trendScore: 50,
      marginPercent: 30,
      adCount: 200,
      searchVolume: 3000,
    });
    const { trend, margin, competition, volume } = result.breakdown;
    expect(result.score).toBe(trend + margin + competition + volume);
  });

  it('caps trend at 40 (trendScore = 100)', () => {
    const result = computeAiScore({ trendScore: 100, marginPercent: 0 });
    expect(result.breakdown.trend).toBe(40);
  });

  it('caps margin at 30 (marginPercent = 60 → 60 × 0.6 = 36, capped to 30)', () => {
    const result = computeAiScore({ trendScore: 0, marginPercent: 60 });
    expect(result.breakdown.margin).toBe(30);
  });

  it('uses neutral 10 for competition when adCount is undefined', () => {
    const result = computeAiScore({ trendScore: 0, marginPercent: 0 });
    expect(result.breakdown.competition).toBe(10);
  });

  it('uses neutral 5 for volume when searchVolume is undefined', () => {
    const result = computeAiScore({ trendScore: 0, marginPercent: 0 });
    expect(result.breakdown.volume).toBe(5);
  });

  it('clamps competition to 0 for very high adCount', () => {
    // 20 - floor(10000 / 50) = 20 - 200 → clamped to 0
    const result = computeAiScore({ trendScore: 0, marginPercent: 0, adCount: 10000 });
    expect(result.breakdown.competition).toBe(0);
  });

  it('caps volume at 10 for very high searchVolume', () => {
    const result = computeAiScore({ trendScore: 0, marginPercent: 0, searchVolume: 99999 });
    expect(result.breakdown.volume).toBe(10);
  });

  it('zero adCount gives full competition score (20)', () => {
    // max(0, 20 - floor(0/50)) = 20
    const result = computeAiScore({ trendScore: 0, marginPercent: 0, adCount: 0 });
    expect(result.breakdown.competition).toBe(20);
  });

  it('returns theoretical max score of 100', () => {
    // trend=40 + margin=30 + competition=20 (adCount=0) + volume=10 (searchVolume≥10000)
    const result = computeAiScore({
      trendScore: 100,
      marginPercent: 100,
      adCount: 0,
      searchVolume: 10000,
    });
    expect(result.score).toBe(100);
    expect(result.label).toBe('Strong');
  });

  it('includes correct label in the result', () => {
    // trendScore=0, marginPercent=0, no adCount/searchVolume → score = 0+0+10+5 = 15 → Weak
    const result = computeAiScore({ trendScore: 0, marginPercent: 0 });
    expect(result.score).toBe(15);
    expect(result.label).toBe('Weak');
  });
});

// ─── getAiScoreLabel ──────────────────────────────────────────────────────────

describe('getAiScoreLabel', () => {
  it('returns "Weak" for scores 0–30', () => {
    expect(getAiScoreLabel(0)).toBe('Weak');
    expect(getAiScoreLabel(15)).toBe('Weak');
    expect(getAiScoreLabel(30)).toBe('Weak');
  });

  it('returns "Fair" for scores 31–50', () => {
    expect(getAiScoreLabel(31)).toBe('Fair');
    expect(getAiScoreLabel(40)).toBe('Fair');
    expect(getAiScoreLabel(50)).toBe('Fair');
  });

  it('returns "Good" for scores 51–70', () => {
    expect(getAiScoreLabel(51)).toBe('Good');
    expect(getAiScoreLabel(60)).toBe('Good');
    expect(getAiScoreLabel(70)).toBe('Good');
  });

  it('returns "Strong" for scores 71–100', () => {
    expect(getAiScoreLabel(71)).toBe('Strong');
    expect(getAiScoreLabel(85)).toBe('Strong');
    expect(getAiScoreLabel(100)).toBe('Strong');
  });

  it('boundary 30 → Weak, 31 → Fair', () => {
    expect(getAiScoreLabel(30)).toBe('Weak');
    expect(getAiScoreLabel(31)).toBe('Fair');
  });

  it('boundary 50 → Fair, 51 → Good', () => {
    expect(getAiScoreLabel(50)).toBe('Fair');
    expect(getAiScoreLabel(51)).toBe('Good');
  });

  it('boundary 70 → Good, 71 → Strong', () => {
    expect(getAiScoreLabel(70)).toBe('Good');
    expect(getAiScoreLabel(71)).toBe('Strong');
  });
});
