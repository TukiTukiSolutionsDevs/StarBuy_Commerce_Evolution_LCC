/**
 * Unit tests — monitor/snapshotter.ts
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';
import { getWeekStart, shouldWriteSnapshot, writeWeeklySnapshot } from './snapshotter';
import { addSnapshot, getSnapshotsByProduct } from './store';
import type { ProductMetrics } from './types';

let tmpDir: string;

function makeMetrics(overrides: Partial<ProductMetrics> = {}): ProductMetrics {
  return {
    shopifyProductId: 'gid://shopify/Product/1',
    title: 'Test',
    fetchedAt: new Date().toISOString(),
    views: 100,
    orders: 5,
    revenue: 250,
    conversionRate: 0.05,
    inventory: 20,
    health: 'healthy',
    healthReasons: ['healthy'],
    ...overrides,
  };
}

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'starbuy-snapshotter-test-'));
  vi.stubEnv('STARBUY_DATA_DIR', tmpDir);
});

afterEach(() => {
  vi.unstubAllEnvs();
  rmSync(tmpDir, { recursive: true, force: true });
});

describe('getWeekStart', () => {
  it('returns the Monday at 00:00 UTC for a Wednesday', () => {
    expect(getWeekStart(new Date('2024-01-10T14:30:00.000Z'))).toBe('2024-01-08T00:00:00.000Z');
  });
  it('returns same day when given a Monday', () => {
    expect(getWeekStart(new Date('2024-01-08T09:00:00.000Z'))).toBe('2024-01-08T00:00:00.000Z');
  });
  it('defaults to current week when no date given', () => {
    const d = new Date(getWeekStart());
    expect(d.getUTCDay()).toBe(1); // Monday = 1
  });
});

describe('shouldWriteSnapshot', () => {
  it('returns true when no snapshot exists for this week', () => {
    expect(shouldWriteSnapshot('gid://shopify/Product/1', '2024-01-08T00:00:00.000Z')).toBe(true);
  });
  it('returns false when snapshot already exists for this week', () => {
    addSnapshot({
      id: randomUUID(),
      shopifyProductId: 'gid://shopify/Product/1',
      weekStart: '2024-01-08T00:00:00.000Z',
      views: 100,
      orders: 5,
      revenue: 250,
      conversionRate: 0.05,
      inventory: 20,
      createdAt: new Date().toISOString(),
    });
    expect(shouldWriteSnapshot('gid://shopify/Product/1', '2024-01-08T00:00:00.000Z')).toBe(false);
  });
});

describe('writeWeeklySnapshot', () => {
  it('creates and returns a snapshot', () => {
    const snap = writeWeeklySnapshot(makeMetrics());
    expect(snap).not.toBeNull();
    expect(snap?.shopifyProductId).toBe('gid://shopify/Product/1');
    expect(snap?.views).toBe(100);
  });
  it('is idempotent — returns null on second call same week', () => {
    const m = makeMetrics();
    writeWeeklySnapshot(m);
    expect(writeWeeklySnapshot(m)).toBeNull();
  });
  it('persists snapshot to store', () => {
    writeWeeklySnapshot(makeMetrics());
    expect(getSnapshotsByProduct('gid://shopify/Product/1')).toHaveLength(1);
  });
  it('prunes to 12 after write', () => {
    const id = 'gid://shopify/Product/1';
    for (let i = 0; i < 12; i++) {
      addSnapshot({
        id: randomUUID(),
        shopifyProductId: id,
        weekStart: new Date(Date.UTC(2023, 0, 2 + i * 7)).toISOString(),
        views: 10,
        orders: 1,
        revenue: 50,
        conversionRate: 0.1,
        inventory: 5,
        createdAt: new Date().toISOString(),
      });
    }
    writeWeeklySnapshot(makeMetrics({ shopifyProductId: id }));
    expect(getSnapshotsByProduct(id)).toHaveLength(12);
  });
});
