/**
 * Unit tests — research/store.ts
 *
 * File-based CRUD with max capacity enforcement and computed fields.
 * Uses a temp STARBUY_DATA_DIR so no real files are touched.
 *
 * Paths in store.ts are computed lazily (on each call), so stubbing the env
 * var before calling is sufficient — no module reset needed.
 *
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { getAll, getById, getByStatus, add, update, remove, getStats } from './store';
import type { AddResearchItemInput, ResearchItem } from './types';

// ─── Setup ────────────────────────────────────────────────────────────────────

let tmpDir: string;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'starbuy-research-test-'));
  vi.stubEnv('STARBUY_DATA_DIR', tmpDir);
});

afterEach(() => {
  vi.unstubAllEnvs();
  rmSync(tmpDir, { recursive: true, force: true });
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeInput(overrides: Partial<AddResearchItemInput> = {}): AddResearchItemInput {
  return {
    keyword: 'air fryer',
    trendScore: 75,
    trendState: 'rising',
    sources: ['pytrends'],
    relatedKeywords: ['kitchen', 'cooking'],
    costPrice: 25,
    salePrice: 60,
    ...overrides,
  };
}

/** Directly write boards.json — bypasses add() logic, for capacity/edge tests */
function writeBoardsFile(items: ResearchItem[]): void {
  const dir = join(tmpDir, '.starbuy-research');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'boards.json'), JSON.stringify(items, null, 2), 'utf-8');
}

function makeFakeItem(i: number): ResearchItem {
  return {
    id: `id-${i}`,
    keyword: `item-${i}`,
    title: `item-${i}`,
    trendScore: 50,
    trendState: 'stable',
    sources: ['pytrends'],
    relatedKeywords: [],
    costPrice: 10,
    salePrice: 20,
    marginPercent: 50,
    aiScore: 30,
    aiScoreBreakdown: { trend: 10, margin: 10, competition: 5, volume: 5 },
    aiScoreLabel: 'Weak',
    status: 'candidate',
    addedAt: Date.now(),
    updatedAt: Date.now(),
  };
}

// ─── getAll ───────────────────────────────────────────────────────────────────

describe('getAll', () => {
  it('returns empty array when no items exist', () => {
    expect(getAll()).toEqual([]);
  });

  it('returns all stored items', () => {
    add(makeInput({ keyword: 'yoga mat' }));
    add(makeInput({ keyword: 'resistance band' }));
    expect(getAll()).toHaveLength(2);
  });
});

// ─── getById ──────────────────────────────────────────────────────────────────

describe('getById', () => {
  it('returns the item when found', () => {
    const item = add(makeInput());
    expect(getById(item.id)).toMatchObject({ id: item.id, keyword: 'air fryer' });
  });

  it('returns undefined for unknown id', () => {
    expect(getById('nonexistent-id')).toBeUndefined();
  });
});

// ─── getByStatus ──────────────────────────────────────────────────────────────

describe('getByStatus', () => {
  it('returns only items matching the given status', () => {
    const a = add(makeInput({ keyword: 'a' }));
    add(makeInput({ keyword: 'b' }));
    update(a.id, { status: 'saved' });

    expect(getByStatus('candidate')).toHaveLength(1);
    const saved = getByStatus('saved');
    expect(saved).toHaveLength(1);
    expect(saved[0].keyword).toBe('a');
  });

  it('returns empty array when no items match', () => {
    add(makeInput());
    expect(getByStatus('imported')).toEqual([]);
  });
});

// ─── add ──────────────────────────────────────────────────────────────────────

describe('add', () => {
  it('creates item with a generated UUID', () => {
    const item = add(makeInput());
    expect(item.id).toBeTruthy();
    expect(item.id).toHaveLength(36);
  });

  it('sets status to "candidate" by default', () => {
    expect(add(makeInput()).status).toBe('candidate');
  });

  it('defaults title to keyword when not provided', () => {
    expect(add(makeInput()).title).toBe('air fryer');
  });

  it('uses provided title when given', () => {
    expect(add(makeInput({ title: 'Premium Air Fryer' })).title).toBe('Premium Air Fryer');
  });

  it('computes marginPercent correctly', () => {
    // (60 - 25) / 60 * 100 = 58.3
    expect(add(makeInput({ costPrice: 25, salePrice: 60 })).marginPercent).toBe(58.3);
  });

  it('computes aiScore and breakdown at write time', () => {
    const item = add(makeInput());
    expect(item.aiScore).toBeGreaterThan(0);
    expect(item.aiScoreBreakdown).toMatchObject({
      trend: expect.any(Number),
      margin: expect.any(Number),
      competition: expect.any(Number),
      volume: expect.any(Number),
    });
  });

  it('sets aiScoreLabel consistent with aiScore', () => {
    const item = add(makeInput());
    const expected =
      item.aiScore <= 30
        ? 'Weak'
        : item.aiScore <= 50
          ? 'Fair'
          : item.aiScore <= 70
            ? 'Good'
            : 'Strong';
    expect(item.aiScoreLabel).toBe(expected);
  });

  it('sets addedAt and updatedAt as current timestamps', () => {
    const before = Date.now();
    const item = add(makeInput());
    const after = Date.now();
    expect(item.addedAt).toBeGreaterThanOrEqual(before);
    expect(item.addedAt).toBeLessThanOrEqual(after);
    expect(item.updatedAt).toBe(item.addedAt);
  });

  it('persists item retrievable by id', () => {
    const added = add(makeInput());
    expect(getById(added.id)).toMatchObject({ id: added.id });
  });

  it('throws when at capacity (500 items)', () => {
    writeBoardsFile(Array.from({ length: 500 }, (_, i) => makeFakeItem(i)));
    expect(() => add(makeInput({ keyword: 'overflow' }))).toThrow('capacity');
  });
});

// ─── update ───────────────────────────────────────────────────────────────────

describe('update', () => {
  it('updates non-price fields without recomputing scores', () => {
    const item = add(makeInput());
    const updated = update(item.id, { status: 'saved', notes: 'looks good' });

    expect(updated.status).toBe('saved');
    expect(updated.notes).toBe('looks good');
    expect(updated.aiScore).toBe(item.aiScore);
    expect(updated.marginPercent).toBe(item.marginPercent);
  });

  it('recomputes marginPercent and aiScore when costPrice changes', () => {
    // costPrice=50 salePrice=60 → margin=16.7 → margin component=10 → score=55
    // after costPrice=10 → margin=83.3 → margin component=30 → score=75
    const item = add(makeInput({ costPrice: 50, salePrice: 60 }));
    const updated = update(item.id, { costPrice: 10 });

    // (60 - 10) / 60 * 100 = 83.3
    expect(updated.marginPercent).toBe(83.3);
    expect(updated.aiScore).not.toBe(item.aiScore);
  });

  it('recomputes marginPercent and aiScore when salePrice changes', () => {
    const item = add(makeInput({ costPrice: 25, salePrice: 60 }));
    const updated = update(item.id, { salePrice: 100 });

    // (100 - 25) / 100 * 100 = 75.0
    expect(updated.marginPercent).toBe(75);
  });

  it('does NOT recompute when only status changes', () => {
    const item = add(makeInput());
    const updated = update(item.id, { status: 'discarded' });

    expect(updated.aiScore).toBe(item.aiScore);
    expect(updated.marginPercent).toBe(item.marginPercent);
  });

  it('updates aiScoreLabel to match new score after price change', () => {
    const item = add(makeInput({ costPrice: 25, salePrice: 60 }));
    const updated = update(item.id, { costPrice: 10 });

    const expected =
      updated.aiScore <= 30
        ? 'Weak'
        : updated.aiScore <= 50
          ? 'Fair'
          : updated.aiScore <= 70
            ? 'Good'
            : 'Strong';
    expect(updated.aiScoreLabel).toBe(expected);
  });

  it('sets updatedAt to current time', () => {
    const item = add(makeInput());
    const before = Date.now();
    const updated = update(item.id, { notes: 'test' });
    const after = Date.now();

    expect(updated.updatedAt).toBeGreaterThanOrEqual(before);
    expect(updated.updatedAt).toBeLessThanOrEqual(after);
  });

  it('throws when item is not found', () => {
    expect(() => update('ghost-id', { status: 'saved' })).toThrow('not found');
  });

  it('persists the update', () => {
    const item = add(makeInput());
    update(item.id, { status: 'saved' });
    expect(getById(item.id)?.status).toBe('saved');
  });
});

// ─── remove ───────────────────────────────────────────────────────────────────

describe('remove', () => {
  it('removes the item from storage', () => {
    const item = add(makeInput());
    remove(item.id);
    expect(getById(item.id)).toBeUndefined();
    expect(getAll()).toHaveLength(0);
  });

  it('throws when item is not found', () => {
    expect(() => remove('ghost-id')).toThrow('not found');
  });

  it('only removes the target item, leaves others intact', () => {
    const a = add(makeInput({ keyword: 'a' }));
    const b = add(makeInput({ keyword: 'b' }));
    remove(a.id);
    expect(getAll()).toHaveLength(1);
    expect(getById(b.id)).toBeDefined();
  });
});

// ─── getStats ─────────────────────────────────────────────────────────────────

describe('getStats', () => {
  it('returns zeros for empty store', () => {
    const stats = getStats();
    expect(stats.total).toBe(0);
    expect(stats.candidates).toBe(0);
    expect(stats.saved).toBe(0);
    expect(stats.imported).toBe(0);
    expect(stats.discarded).toBe(0);
    expect(stats.avgMargin).toBe(0);
  });

  it('counts items by status correctly', () => {
    add(makeInput({ keyword: 'a' }));
    const b = add(makeInput({ keyword: 'b' }));
    const c = add(makeInput({ keyword: 'c' }));
    update(b.id, { status: 'saved' });
    update(c.id, { status: 'discarded' });

    const stats = getStats();
    expect(stats.total).toBe(3);
    expect(stats.candidates).toBe(1);
    expect(stats.saved).toBe(1);
    expect(stats.discarded).toBe(1);
    expect(stats.imported).toBe(0);
  });

  it('computes avgMargin excluding discarded items', () => {
    // Both active items have 50% margin → avg = 50.0
    add(makeInput({ costPrice: 50, salePrice: 100 }));
    add(makeInput({ costPrice: 50, salePrice: 100 }));
    const d = add(makeInput({ costPrice: 1, salePrice: 2 }));
    update(d.id, { status: 'discarded' });

    expect(getStats().avgMargin).toBe(50);
  });

  it('avgMargin is 0 when all items are discarded', () => {
    const item = add(makeInput());
    update(item.id, { status: 'discarded' });
    expect(getStats().avgMargin).toBe(0);
  });
});
