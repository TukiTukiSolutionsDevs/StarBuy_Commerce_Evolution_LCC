/**
 * Unit tests — monitor/store.ts
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';
import {
  loadAllMetrics,
  getMetricsByShopifyId,
  upsertMetrics,
  removeMetrics,
  loadAllSnapshots,
  getSnapshotsByProduct,
  addSnapshot,
  pruneSnapshots,
} from './store';
import type { ProductMetrics, MetricsSnapshot } from './types';

let tmpDir: string;

function makeMetrics(overrides: Partial<ProductMetrics> = {}): ProductMetrics {
  return {
    shopifyProductId: 'gid://shopify/Product/1',
    title: 'Test Product',
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

function makeSnapshot(overrides: Partial<MetricsSnapshot> = {}): MetricsSnapshot {
  return {
    id: randomUUID(),
    shopifyProductId: 'gid://shopify/Product/1',
    weekStart: '2024-01-01T00:00:00.000Z',
    views: 100,
    orders: 5,
    revenue: 250,
    conversionRate: 0.05,
    inventory: 20,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'starbuy-monitor-test-'));
  vi.stubEnv('STARBUY_DATA_DIR', tmpDir);
});

afterEach(() => {
  vi.unstubAllEnvs();
  rmSync(tmpDir, { recursive: true, force: true });
});

describe('loadAllMetrics', () => {
  it('returns empty array when no metrics exist', () => {
    expect(loadAllMetrics()).toEqual([]);
  });
  it('returns all stored metrics', () => {
    upsertMetrics(makeMetrics({ shopifyProductId: 'gid://shopify/Product/1' }));
    upsertMetrics(makeMetrics({ shopifyProductId: 'gid://shopify/Product/2' }));
    expect(loadAllMetrics()).toHaveLength(2);
  });
});

describe('getMetricsByShopifyId', () => {
  it('returns metrics for known id', () => {
    upsertMetrics(makeMetrics());
    expect(getMetricsByShopifyId('gid://shopify/Product/1')).toBeDefined();
  });
  it('returns undefined for unknown id', () => {
    expect(getMetricsByShopifyId('ghost')).toBeUndefined();
  });
});

describe('upsertMetrics', () => {
  it('inserts new metrics', () => {
    upsertMetrics(makeMetrics());
    expect(loadAllMetrics()).toHaveLength(1);
  });
  it('replaces existing metrics for same shopifyProductId', () => {
    const id = 'gid://shopify/Product/1';
    upsertMetrics(makeMetrics({ shopifyProductId: id, views: 100 }));
    upsertMetrics(makeMetrics({ shopifyProductId: id, views: 999 }));
    expect(loadAllMetrics()).toHaveLength(1);
    expect(loadAllMetrics()[0].views).toBe(999);
  });
  it('does not affect other products when upserting', () => {
    upsertMetrics(makeMetrics({ shopifyProductId: 'gid://shopify/Product/1' }));
    upsertMetrics(makeMetrics({ shopifyProductId: 'gid://shopify/Product/2' }));
    upsertMetrics(makeMetrics({ shopifyProductId: 'gid://shopify/Product/1', views: 777 }));
    expect(loadAllMetrics()).toHaveLength(2);
    expect(getMetricsByShopifyId('gid://shopify/Product/2')).toBeDefined();
  });
  it('persists updated fields', () => {
    const id = 'gid://shopify/Product/1';
    upsertMetrics(makeMetrics({ shopifyProductId: id, health: 'warning' }));
    expect(getMetricsByShopifyId(id)?.health).toBe('warning');
  });
});

describe('removeMetrics', () => {
  it('removes existing metrics', () => {
    const id = 'gid://shopify/Product/1';
    upsertMetrics(makeMetrics({ shopifyProductId: id }));
    removeMetrics(id);
    expect(getMetricsByShopifyId(id)).toBeUndefined();
  });
  it('is a no-op when id not found', () => {
    upsertMetrics(makeMetrics());
    expect(() => removeMetrics('ghost')).not.toThrow();
    expect(loadAllMetrics()).toHaveLength(1);
  });
  it('does not remove other products', () => {
    upsertMetrics(makeMetrics({ shopifyProductId: 'gid://shopify/Product/1' }));
    upsertMetrics(makeMetrics({ shopifyProductId: 'gid://shopify/Product/2' }));
    removeMetrics('gid://shopify/Product/1');
    expect(loadAllMetrics()).toHaveLength(1);
    expect(getMetricsByShopifyId('gid://shopify/Product/2')).toBeDefined();
  });
});

describe('loadAllSnapshots', () => {
  it('returns empty array when no snapshots exist', () => {
    expect(loadAllSnapshots()).toEqual([]);
  });
  it('returns all stored snapshots', () => {
    addSnapshot(makeSnapshot());
    addSnapshot(makeSnapshot({ id: randomUUID(), shopifyProductId: 'gid://shopify/Product/2' }));
    expect(loadAllSnapshots()).toHaveLength(2);
  });
});

describe('getSnapshotsByProduct', () => {
  it('returns only snapshots for the given product', () => {
    addSnapshot(makeSnapshot({ shopifyProductId: 'gid://shopify/Product/1' }));
    addSnapshot(makeSnapshot({ id: randomUUID(), shopifyProductId: 'gid://shopify/Product/2' }));
    expect(getSnapshotsByProduct('gid://shopify/Product/1')).toHaveLength(1);
  });
  it('returns empty array when no snapshots for product', () => {
    expect(getSnapshotsByProduct('ghost')).toEqual([]);
  });
});

describe('addSnapshot', () => {
  it('stores the snapshot', () => {
    addSnapshot(makeSnapshot());
    expect(loadAllSnapshots()).toHaveLength(1);
  });
  it('persists all snapshot fields', () => {
    addSnapshot(makeSnapshot({ views: 42, orders: 3 }));
    const stored = loadAllSnapshots()[0];
    expect(stored.views).toBe(42);
    expect(stored.orders).toBe(3);
  });
});

describe('pruneSnapshots', () => {
  it('keeps up to maxWeeks snapshots per product', () => {
    const id = 'gid://shopify/Product/1';
    for (let i = 0; i < 14; i++) {
      addSnapshot(
        makeSnapshot({
          id: randomUUID(),
          shopifyProductId: id,
          weekStart: new Date(Date.UTC(2024, 0, 1 + i * 7)).toISOString(),
        }),
      );
    }
    pruneSnapshots(12);
    expect(getSnapshotsByProduct(id)).toHaveLength(12);
  });
  it('does not prune when under the limit', () => {
    const id = 'gid://shopify/Product/1';
    for (let i = 0; i < 5; i++) {
      addSnapshot(
        makeSnapshot({
          id: randomUUID(),
          shopifyProductId: id,
          weekStart: new Date(Date.UTC(2024, 0, 1 + i * 7)).toISOString(),
        }),
      );
    }
    pruneSnapshots(12);
    expect(getSnapshotsByProduct(id)).toHaveLength(5);
  });
  it('prunes independently per product', () => {
    const id1 = 'gid://shopify/Product/1';
    const id2 = 'gid://shopify/Product/2';
    for (let i = 0; i < 14; i++) {
      addSnapshot(
        makeSnapshot({
          id: randomUUID(),
          shopifyProductId: id1,
          weekStart: new Date(Date.UTC(2024, 0, 1 + i * 7)).toISOString(),
        }),
      );
    }
    for (let i = 0; i < 3; i++) {
      addSnapshot(
        makeSnapshot({
          id: randomUUID(),
          shopifyProductId: id2,
          weekStart: new Date(Date.UTC(2024, 0, 1 + i * 7)).toISOString(),
        }),
      );
    }
    pruneSnapshots(12);
    expect(getSnapshotsByProduct(id1)).toHaveLength(12);
    expect(getSnapshotsByProduct(id2)).toHaveLength(3);
  });
  it('keeps newest snapshots (drops oldest)', () => {
    const id = 'gid://shopify/Product/1';
    for (let i = 0; i < 14; i++) {
      addSnapshot(
        makeSnapshot({
          id: randomUUID(),
          shopifyProductId: id,
          weekStart: new Date(Date.UTC(2024, 0, 1 + i * 7)).toISOString(),
        }),
      );
    }
    pruneSnapshots(12);
    const remaining = getSnapshotsByProduct(id);
    expect(remaining[0].weekStart).toBe(new Date(Date.UTC(2024, 0, 1 + 2 * 7)).toISOString());
  });
  it('defaults to 12 weeks', () => {
    const id = 'gid://shopify/Product/1';
    for (let i = 0; i < 15; i++) {
      addSnapshot(
        makeSnapshot({
          id: randomUUID(),
          shopifyProductId: id,
          weekStart: new Date(Date.UTC(2024, 0, 1 + i * 7)).toISOString(),
        }),
      );
    }
    pruneSnapshots();
    expect(getSnapshotsByProduct(id)).toHaveLength(12);
  });
});
