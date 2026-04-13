/**
 * Integration tests — POST /api/admin/research/[id]/import
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// ─── Hoist mock vars ──────────────────────────────────────────────────────────

const { mockGetById, mockUpdate, mockCreateProduct, mockVerifyAdminToken } = vi.hoisted(() => ({
  mockGetById: vi.fn(),
  mockUpdate: vi.fn(),
  mockCreateProduct: vi.fn(),
  mockVerifyAdminToken: vi.fn(),
}));

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/lib/research/store', () => ({
  getById: mockGetById,
  update: mockUpdate,
}));

vi.mock('@/lib/admin-auth', () => ({
  verifyAdminToken: mockVerifyAdminToken,
  ADMIN_TOKEN_COOKIE: 'admin_token',
}));

vi.mock('@/lib/shopify/admin/tools/products', () => ({
  createProduct: mockCreateProduct,
}));

// ─── Import AFTER mocking ─────────────────────────────────────────────────────

import { POST } from './route';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ITEM_ID = 'item-001';
const SHOPIFY_GID = 'gid://shopify/Product/12345';

const MOCK_ITEM = {
  id: ITEM_ID,
  keyword: 'wireless mouse',
  relatedKeywords: ['bluetooth mouse', 'usb mouse'],
  costPrice: 5,
  salePrice: 20,
  marginPercent: 75,
  aiScore: 70,
  aiScoreLabel: 'Good',
  status: 'candidate',
  shopifyProductId: undefined as string | undefined,
  addedAt: 1000,
  updatedAt: 1000,
};

const MOCK_SHOPIFY_PRODUCT = {
  id: SHOPIFY_GID,
  title: 'wireless mouse',
  status: 'DRAFT',
};

function makePostRequest(id: string, withCookie = true): NextRequest {
  return new NextRequest(`http://localhost/api/admin/research/${id}/import`, {
    method: 'POST',
    headers: withCookie ? { Cookie: 'admin_token=valid-token' } : {},
  });
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockVerifyAdminToken.mockResolvedValue({ role: 'admin', iat: 0, exp: 9_999_999_999 });
  mockGetById.mockReturnValue({ ...MOCK_ITEM });
  mockCreateProduct.mockResolvedValue({ product: MOCK_SHOPIFY_PRODUCT, userErrors: [] });
  mockUpdate.mockReturnValue({ ...MOCK_ITEM, shopifyProductId: SHOPIFY_GID, status: 'imported' });
});

afterEach(() => {
  vi.clearAllMocks();
});

// ─── Auth ─────────────────────────────────────────────────────────────────────

describe('POST /api/admin/research/[id]/import — auth', () => {
  it('returns 401 when no cookie', async () => {
    const res = await POST(makePostRequest(ITEM_ID, false), makeParams(ITEM_ID));
    expect(res.status).toBe(401);
  });

  it('returns 401 when token invalid', async () => {
    mockVerifyAdminToken.mockResolvedValue(null);
    const res = await POST(makePostRequest(ITEM_ID), makeParams(ITEM_ID));
    expect(res.status).toBe(401);
  });
});

// ─── 404 ─────────────────────────────────────────────────────────────────────

describe('POST /api/admin/research/[id]/import — 404', () => {
  it('returns 404 when item not found', async () => {
    mockGetById.mockReturnValue(undefined);
    const res = await POST(makePostRequest('missing'), makeParams('missing'));
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('Not found');
  });
});

// ─── 409 already imported ─────────────────────────────────────────────────────

describe('POST /api/admin/research/[id]/import — 409', () => {
  it('returns 409 when item already has shopifyProductId', async () => {
    mockGetById.mockReturnValue({
      ...MOCK_ITEM,
      shopifyProductId: SHOPIFY_GID,
      status: 'imported',
    });
    const res = await POST(makePostRequest(ITEM_ID), makeParams(ITEM_ID));
    expect(res.status).toBe(409);
    const body = (await res.json()) as { error: string; shopifyProductId: string };
    expect(body.error).toBe('Already imported');
    expect(body.shopifyProductId).toBe(SHOPIFY_GID);
  });

  it('does NOT call createProduct when already imported', async () => {
    mockGetById.mockReturnValue({ ...MOCK_ITEM, shopifyProductId: SHOPIFY_GID });
    await POST(makePostRequest(ITEM_ID), makeParams(ITEM_ID));
    expect(mockCreateProduct).not.toHaveBeenCalled();
  });
});

// ─── Success ─────────────────────────────────────────────────────────────────

describe('POST /api/admin/research/[id]/import — success', () => {
  it('returns 200 with updated item', async () => {
    const res = await POST(makePostRequest(ITEM_ID), makeParams(ITEM_ID));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { item: typeof MOCK_ITEM };
    expect(body.item).toBeDefined();
  });

  it('calls createProduct with correct fields', async () => {
    await POST(makePostRequest(ITEM_ID), makeParams(ITEM_ID));
    expect(mockCreateProduct).toHaveBeenCalledWith({
      title: 'wireless mouse',
      price: '20',
      status: 'DRAFT',
      tags: ['bluetooth mouse', 'usb mouse'],
    });
  });

  it('calls createProduct with empty tags when relatedKeywords is undefined', async () => {
    mockGetById.mockReturnValue({ ...MOCK_ITEM, relatedKeywords: undefined });
    await POST(makePostRequest(ITEM_ID), makeParams(ITEM_ID));
    expect(mockCreateProduct).toHaveBeenCalledWith(expect.objectContaining({ tags: [] }));
  });

  it('saves shopifyProductId and sets status to imported', async () => {
    await POST(makePostRequest(ITEM_ID), makeParams(ITEM_ID));
    expect(mockUpdate).toHaveBeenCalledWith(
      ITEM_ID,
      expect.objectContaining({
        shopifyProductId: SHOPIFY_GID,
        status: 'imported',
      }),
    );
  });

  it('returns item with shopifyProductId from updated result', async () => {
    const res = await POST(makePostRequest(ITEM_ID), makeParams(ITEM_ID));
    const body = (await res.json()) as { item: { shopifyProductId: string; status: string } };
    expect(body.item.shopifyProductId).toBe(SHOPIFY_GID);
    expect(body.item.status).toBe('imported');
  });
});

// ─── Shopify errors ───────────────────────────────────────────────────────────

describe('POST /api/admin/research/[id]/import — Shopify errors', () => {
  it('returns 500 when Shopify returns userErrors', async () => {
    mockCreateProduct.mockResolvedValue({
      product: null,
      userErrors: [{ field: ['title'], message: 'Title already taken' }],
    });
    const res = await POST(makePostRequest(ITEM_ID), makeParams(ITEM_ID));
    expect(res.status).toBe(500);
    const body = (await res.json()) as { error: string; details: unknown[] };
    expect(body.error).toBe('Failed to create Shopify product');
    expect(body.details).toHaveLength(1);
  });

  it('returns 500 when Shopify returns null product with no userErrors', async () => {
    mockCreateProduct.mockResolvedValue({ product: null, userErrors: [] });
    const res = await POST(makePostRequest(ITEM_ID), makeParams(ITEM_ID));
    expect(res.status).toBe(500);
  });

  it('returns 500 when createProduct throws', async () => {
    mockCreateProduct.mockRejectedValue(new Error('network error'));
    const res = await POST(makePostRequest(ITEM_ID), makeParams(ITEM_ID));
    expect(res.status).toBe(500);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('Internal server error');
  });

  it('does NOT update the item when Shopify fails', async () => {
    mockCreateProduct.mockRejectedValue(new Error('network'));
    await POST(makePostRequest(ITEM_ID), makeParams(ITEM_ID));
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});
