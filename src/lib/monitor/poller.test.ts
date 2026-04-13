/**
 * Unit tests — monitor/poller.ts
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

vi.mock('./fetcher');
vi.mock('@/lib/publish/store');

import { fetchProductMetrics } from './fetcher';
import { getAll as getAllPublished } from '@/lib/publish/store';
import { pollSingleProduct, pollAllProducts } from './poller';
import { getMetricsByShopifyId } from './store';

const mockFetchMetrics = vi.mocked(fetchProductMetrics);
const mockGetAllPublished = vi.mocked(getAllPublished);

let tmpDir: string;

const baseRaw = {
  shopifyProductId: 'gid://shopify/Product/1',
  title: 'Widget',
  fetchedAt: new Date().toISOString(),
  views: 100,
  orders: 5,
  revenue: 250,
  conversionRate: 0.05,
  inventory: 20,
};

function makePublishRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: 'r1',
    researchId: 'res1',
    shopifyProductId: 'gid://shopify/Product/1',
    status: 'published',
    validation: { title: true, description: true, price: true, images: true, errors: [] },
    retryCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'starbuy-poller-test-'));
  vi.stubEnv('STARBUY_DATA_DIR', tmpDir);
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllEnvs();
  rmSync(tmpDir, { recursive: true, force: true });
});

// ─── pollSingleProduct ────────────────────────────────────────────────────────

describe('pollSingleProduct', () => {
  it('fetches, computes health, and persists metrics', async () => {
    mockFetchMetrics.mockResolvedValueOnce(baseRaw);
    const result = await pollSingleProduct('gid://shopify/Product/1', 'Widget');

    expect(result.shopifyProductId).toBe('gid://shopify/Product/1');
    expect(['healthy', 'warning', 'critical', 'unknown']).toContain(result.health);
    expect(Array.isArray(result.healthReasons)).toBe(true);
  });

  it('stores metrics in the store after polling', async () => {
    mockFetchMetrics.mockResolvedValueOnce(baseRaw);
    await pollSingleProduct('gid://shopify/Product/1', 'Widget');
    expect(getMetricsByShopifyId('gid://shopify/Product/1')).toBeDefined();
  });

  it('sets health based on computed thresholds', async () => {
    mockFetchMetrics.mockResolvedValueOnce({ ...baseRaw, inventory: 20, conversionRate: 0.05 });
    const result = await pollSingleProduct('gid://shopify/Product/1', 'Widget');
    expect(result.health).toBe('healthy');
  });
});

// ─── pollAllProducts ──────────────────────────────────────────────────────────

describe('pollAllProducts', () => {
  it('only polls published records with a shopifyProductId', async () => {
    mockGetAllPublished.mockReturnValue([
      makePublishRecord({ shopifyProductId: 'gid://shopify/Product/1', status: 'published' }),
      makePublishRecord({
        id: 'r2',
        researchId: 'res2',
        shopifyProductId: 'gid://shopify/Product/2',
        status: 'published',
      }),
      makePublishRecord({
        id: 'r3',
        researchId: 'res3',
        shopifyProductId: undefined,
        status: 'pending',
      }),
    ] as any);

    mockFetchMetrics.mockResolvedValue(baseRaw);

    const result = await pollAllProducts();
    expect(result.polled).toBe(2);
    expect(result.updated).toBe(2);
    expect(result.errors).toHaveLength(0);
  });

  it('isolates per-product errors without failing the whole poll', async () => {
    mockGetAllPublished.mockReturnValue([
      makePublishRecord({ shopifyProductId: 'gid://shopify/Product/1', status: 'published' }),
    ] as any);

    mockFetchMetrics.mockRejectedValueOnce(new Error('network timeout'));

    const result = await pollAllProducts();
    expect(result.polled).toBe(1);
    expect(result.updated).toBe(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].shopifyProductId).toBe('gid://shopify/Product/1');
    expect(result.errors[0].error).toBe('network timeout');
  });

  it('returns durationMs >= 0', async () => {
    mockGetAllPublished.mockReturnValue([]);
    const result = await pollAllProducts();
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('returns snapshotWritten as boolean', async () => {
    mockGetAllPublished.mockReturnValue([]);
    const result = await pollAllProducts();
    expect(typeof result.snapshotWritten).toBe('boolean');
  });

  it('skips records with no shopifyProductId', async () => {
    mockGetAllPublished.mockReturnValue([
      makePublishRecord({ shopifyProductId: undefined, status: 'published' }),
    ] as any);
    const result = await pollAllProducts();
    expect(result.polled).toBe(0);
  });
});
