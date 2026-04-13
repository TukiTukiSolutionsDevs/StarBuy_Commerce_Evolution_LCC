/**
 * Unit tests — rollbackPublish
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Hoist mock vars ──────────────────────────────────────────────────────────

const { mockGetById, mockUpdateRecord, mockUpdateResearch, mockAdminFetch } = vi.hoisted(() => ({
  mockGetById: vi.fn(),
  mockUpdateRecord: vi.fn(),
  mockUpdateResearch: vi.fn(),
  mockAdminFetch: vi.fn(),
}));

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('./store', () => ({
  getById: mockGetById,
  update: mockUpdateRecord,
}));

vi.mock('@/lib/research/store', () => ({
  update: mockUpdateResearch,
}));

vi.mock('@/lib/shopify/admin/client', () => ({
  adminFetch: mockAdminFetch,
}));

// ─── Import AFTER mocking ─────────────────────────────────────────────────────

import { rollbackPublish } from './rollback';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const PUBLISHED_RECORD = {
  id: 'rec-1',
  researchId: 'res-1',
  shopifyProductId: 'gid://shopify/Product/123',
  status: 'published' as const,
  validation: { title: true, description: true, price: true, images: true, errors: [] },
  retryCount: 0,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

const SUCCESS_RESPONSE = {
  productUpdate: {
    product: { id: 'gid://shopify/Product/123', status: 'DRAFT' },
    userErrors: [],
  },
};

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockGetById.mockReturnValue(PUBLISHED_RECORD);
  mockUpdateRecord.mockReturnValue({ ...PUBLISHED_RECORD, status: 'archived' });
  mockUpdateResearch.mockReturnValue(undefined);
  mockAdminFetch.mockResolvedValue(SUCCESS_RESPONSE);
});

// ─── Record not found ─────────────────────────────────────────────────────────

describe('rollbackPublish — record not found', () => {
  it('returns failure when record does not exist', async () => {
    mockGetById.mockReturnValue(undefined);
    const result = await rollbackPublish('missing-id');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not found/);
  });

  it('returns the recordId in result', async () => {
    mockGetById.mockReturnValue(undefined);
    const result = await rollbackPublish('missing-id');
    expect(result.recordId).toBe('missing-id');
  });
});

// ─── Status guard ─────────────────────────────────────────────────────────────

describe('rollbackPublish — status guard', () => {
  it('returns failure when status is pending', async () => {
    mockGetById.mockReturnValue({ ...PUBLISHED_RECORD, status: 'pending' });
    const result = await rollbackPublish('rec-1');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Cannot rollback/);
  });

  it('returns failure when status is failed', async () => {
    mockGetById.mockReturnValue({ ...PUBLISHED_RECORD, status: 'failed' });
    const result = await rollbackPublish('rec-1');
    expect(result.success).toBe(false);
  });

  it('returns failure when status is archived', async () => {
    mockGetById.mockReturnValue({ ...PUBLISHED_RECORD, status: 'archived' });
    const result = await rollbackPublish('rec-1');
    expect(result.success).toBe(false);
  });

  it('returns failure when no shopifyProductId', async () => {
    mockGetById.mockReturnValue({ ...PUBLISHED_RECORD, shopifyProductId: undefined });
    const result = await rollbackPublish('rec-1');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/No Shopify product ID/);
  });
});

// ─── Shopify call ─────────────────────────────────────────────────────────────

describe('rollbackPublish — Shopify deactivate', () => {
  it('calls adminFetch to set product to DRAFT', async () => {
    await rollbackPublish('rec-1');
    expect(mockAdminFetch).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: expect.objectContaining({
          input: expect.objectContaining({ status: 'DRAFT' }),
        }),
      }),
    );
  });

  it('returns failure when Shopify returns userErrors', async () => {
    mockAdminFetch.mockResolvedValue({
      productUpdate: {
        product: null,
        userErrors: [{ field: null, message: 'Product not found on Shopify' }],
      },
    });
    const result = await rollbackPublish('rec-1');
    expect(result.success).toBe(false);
  });

  it('reverts record status to published when Shopify fails', async () => {
    mockAdminFetch.mockResolvedValue({
      productUpdate: {
        product: null,
        userErrors: [{ field: null, message: 'Shopify error' }],
      },
    });
    await rollbackPublish('rec-1');
    expect(mockUpdateRecord).toHaveBeenCalledWith(
      'rec-1',
      expect.objectContaining({ status: 'published' }),
    );
  });
});

// ─── Success ──────────────────────────────────────────────────────────────────

describe('rollbackPublish — success', () => {
  it('returns success: true', async () => {
    const result = await rollbackPublish('rec-1');
    expect(result.success).toBe(true);
  });

  it('returns the recordId', async () => {
    const result = await rollbackPublish('rec-1');
    expect(result.recordId).toBe('rec-1');
  });

  it('updates record status to archived', async () => {
    await rollbackPublish('rec-1');
    expect(mockUpdateRecord).toHaveBeenCalledWith(
      'rec-1',
      expect.objectContaining({ status: 'archived' }),
    );
  });

  it('sets archivedAt timestamp on the record', async () => {
    await rollbackPublish('rec-1');
    expect(mockUpdateRecord).toHaveBeenCalledWith(
      'rec-1',
      expect.objectContaining({ archivedAt: expect.any(String) }),
    );
  });

  it('updates research item status back to saved', async () => {
    await rollbackPublish('rec-1');
    expect(mockUpdateResearch).toHaveBeenCalledWith('res-1', { status: 'saved' });
  });
});
