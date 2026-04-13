/**
 * Unit tests — publish/pipeline.ts
 *
 * Mocks adminFetch and research/store to test the 6-step pipeline.
 *
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// ─── Hoist mock vars ──────────────────────────────────────────────────────────

const { mockAdminFetch, mockGetResearchItem, mockUpdateResearch } = vi.hoisted(() => ({
  mockAdminFetch: vi.fn(),
  mockGetResearchItem: vi.fn(),
  mockUpdateResearch: vi.fn(),
}));

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/lib/shopify/admin/client', () => ({
  adminFetch: mockAdminFetch,
}));

vi.mock('@/lib/research/store', () => ({
  getById: mockGetResearchItem,
  update: mockUpdateResearch,
}));

// ─── Import AFTER mocking ─────────────────────────────────────────────────────

import { executePipeline } from './pipeline';
import { add, getById } from './store';

// ─── Setup ────────────────────────────────────────────────────────────────────

let tmpDir: string;

const MOCK_RESEARCH_ITEM = {
  id: 'r1',
  keyword: 'wireless mouse',
  title: 'Premium Wireless Mouse',
  description: 'A great mouse',
  trendScore: 75,
  trendState: 'rising',
  sources: ['serpapi'],
  relatedKeywords: ['bluetooth'],
  costPrice: 10,
  salePrice: 30,
  marginPercent: 66.7,
  aiScore: 70,
  aiScoreBreakdown: { trend: 30, margin: 22, competition: 10, volume: 8 },
  aiScoreLabel: 'Good',
  status: 'saved',
  addedAt: Date.now(),
  updatedAt: Date.now(),
};

function setupSuccessfulAdminFetch() {
  mockAdminFetch
    // Step 2: create draft
    .mockResolvedValueOnce({
      productCreate: {
        product: {
          id: 'gid://shopify/Product/123',
          handle: 'premium-wireless-mouse',
          status: 'DRAFT',
          variants: {
            edges: [
              {
                node: {
                  id: 'gid://shopify/ProductVariant/456',
                  inventoryItem: { id: 'gid://shopify/InventoryItem/789' },
                },
              },
            ],
          },
        },
        userErrors: [],
      },
    })
    // Step 3: set price
    .mockResolvedValueOnce({
      productVariantUpdate: { productVariant: { id: 'v1', price: '30.00' }, userErrors: [] },
    })
    // Step 4: publish channel
    .mockResolvedValueOnce({
      publishablePublish: { userErrors: [] },
    })
    // Step 5: set inventory
    .mockResolvedValueOnce({
      inventorySetQuantities: { inventoryAdjustmentGroup: { id: 'adj1' }, userErrors: [] },
    })
    // Step 6: activate
    .mockResolvedValueOnce({
      productUpdate: {
        product: {
          id: 'gid://shopify/Product/123',
          status: 'ACTIVE',
          handle: 'premium-wireless-mouse',
        },
        userErrors: [],
      },
    });
}

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'starbuy-pipeline-test-'));
  vi.stubEnv('STARBUY_DATA_DIR', tmpDir);
  vi.clearAllMocks();
  mockGetResearchItem.mockReturnValue(MOCK_RESEARCH_ITEM);
  mockUpdateResearch.mockReturnValue(MOCK_RESEARCH_ITEM);
});

afterEach(() => {
  vi.unstubAllEnvs();
  rmSync(tmpDir, { recursive: true, force: true });
});

// ─── Success Path ─────────────────────────────────────────────────────────────

describe('executePipeline — success', () => {
  it('returns success with shopifyProductId', async () => {
    setupSuccessfulAdminFetch();
    const record = add({ researchId: 'r1' });
    const result = await executePipeline(record.id);

    expect(result.success).toBe(true);
    expect(result.shopifyProductId).toBe('gid://shopify/Product/123');
    expect(result.shopifyHandle).toBe('premium-wireless-mouse');
  });

  it('updates record status to published', async () => {
    setupSuccessfulAdminFetch();
    const record = add({ researchId: 'r1' });
    await executePipeline(record.id);

    const updated = getById(record.id);
    expect(updated?.status).toBe('published');
    expect(updated?.shopifyProductId).toBe('gid://shopify/Product/123');
    expect(updated?.publishedAt).toBeTruthy();
  });

  it('calls adminFetch 5 times (create, price, channel, inventory, activate)', async () => {
    setupSuccessfulAdminFetch();
    const record = add({ researchId: 'r1' });
    await executePipeline(record.id);

    expect(mockAdminFetch).toHaveBeenCalledTimes(5);
  });

  it('updates research item to imported', async () => {
    setupSuccessfulAdminFetch();
    const record = add({ researchId: 'r1' });
    await executePipeline(record.id);

    expect(mockUpdateResearch).toHaveBeenCalledWith('r1', { status: 'imported' });
  });
});

// ─── Validation Failure ───────────────────────────────────────────────────────

describe('executePipeline — validation failure', () => {
  it('fails when title is too short', async () => {
    mockGetResearchItem.mockReturnValue({ ...MOCK_RESEARCH_ITEM, title: 'Ab' });
    const record = add({ researchId: 'r1' });
    const result = await executePipeline(record.id);

    expect(result.success).toBe(false);
    expect(result.failedStep).toBe('validate');
  });

  it('sets record status to failed on validation error', async () => {
    mockGetResearchItem.mockReturnValue({ ...MOCK_RESEARCH_ITEM, salePrice: 0 });
    const record = add({ researchId: 'r1' });
    await executePipeline(record.id);

    expect(getById(record.id)?.status).toBe('failed');
  });

  it('does not call adminFetch when validation fails', async () => {
    mockGetResearchItem.mockReturnValue({ ...MOCK_RESEARCH_ITEM, title: '' });
    const record = add({ researchId: 'r1' });
    await executePipeline(record.id);

    expect(mockAdminFetch).not.toHaveBeenCalled();
  });
});

// ─── Shopify Errors ───────────────────────────────────────────────────────────

describe('executePipeline — Shopify errors', () => {
  it('fails on create_draft userErrors', async () => {
    mockAdminFetch.mockResolvedValueOnce({
      productCreate: { product: null, userErrors: [{ field: ['title'], message: 'Title taken' }] },
    });
    const record = add({ researchId: 'r1' });
    const result = await executePipeline(record.id);

    expect(result.success).toBe(false);
    expect(result.failedStep).toBe('create_draft');
    expect(getById(record.id)?.status).toBe('failed');
  });

  it('fails on activate userErrors', async () => {
    mockAdminFetch
      .mockResolvedValueOnce({
        productCreate: {
          product: {
            id: 'gid://shopify/Product/123',
            handle: 'test',
            status: 'DRAFT',
            variants: { edges: [{ node: { id: 'v1', inventoryItem: { id: 'inv1' } } }] },
          },
          userErrors: [],
        },
      })
      .mockResolvedValueOnce({ productVariantUpdate: { userErrors: [] } })
      .mockResolvedValueOnce({ publishablePublish: { userErrors: [] } })
      .mockResolvedValueOnce({ inventorySetQuantities: { userErrors: [] } })
      .mockResolvedValueOnce({
        productUpdate: { product: null, userErrors: [{ field: null, message: 'Cannot activate' }] },
      });

    const record = add({ researchId: 'r1' });
    const result = await executePipeline(record.id);

    expect(result.success).toBe(false);
    expect(result.failedStep).toBe('activate');
  });

  it('increments retryCount on failure', async () => {
    mockAdminFetch.mockRejectedValueOnce(new Error('Network error'));
    // Need to mock the create step to fail since validation passes
    mockGetResearchItem.mockReturnValue(MOCK_RESEARCH_ITEM);

    const record = add({ researchId: 'r1' });
    await executePipeline(record.id);

    expect(getById(record.id)?.retryCount).toBe(1);
  });
});

// ─── Missing Data ─────────────────────────────────────────────────────────────

describe('executePipeline — missing data', () => {
  it('fails when research item not found', async () => {
    mockGetResearchItem.mockReturnValue(undefined);
    const record = add({ researchId: 'r1' });
    const result = await executePipeline(record.id);

    expect(result.success).toBe(false);
    expect(result.failedStep).toBe('validate');
    expect(result.error).toMatch(/not found/);
  });
});
