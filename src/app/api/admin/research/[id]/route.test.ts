/**
 * Integration tests — PATCH + DELETE /api/admin/research/[id]
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// ─── Hoist mock vars ──────────────────────────────────────────────────────────

const { mockGetById, mockUpdate, mockRemove, mockVerifyAdminToken } = vi.hoisted(() => ({
  mockGetById: vi.fn(),
  mockUpdate: vi.fn(),
  mockRemove: vi.fn(),
  mockVerifyAdminToken: vi.fn(),
}));

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/lib/research/store', () => ({
  getById: mockGetById,
  update: mockUpdate,
  remove: mockRemove,
}));

vi.mock('@/lib/admin-auth', () => ({
  verifyAdminToken: mockVerifyAdminToken,
  ADMIN_TOKEN_COOKIE: 'admin_token',
}));

// ─── Import AFTER mocking ─────────────────────────────────────────────────────

import { PATCH, DELETE } from './route';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ITEM_ID = 'item-001';

const MOCK_ITEM = {
  id: ITEM_ID,
  keyword: 'wireless mouse',
  trendScore: 75,
  trendState: 'rising',
  sources: ['serpapi'],
  relatedKeywords: ['bluetooth mouse'],
  costPrice: 5,
  salePrice: 20,
  marginPercent: 75,
  aiScore: 70,
  aiScoreBreakdown: { trend: 30, margin: 22, competition: 10, volume: 8 },
  aiScoreLabel: 'Good',
  status: 'candidate',
  addedAt: 1000,
  updatedAt: 1000,
};

function makePatchRequest(id: string, body: unknown, withCookie = true): NextRequest {
  return new NextRequest(`http://localhost/api/admin/research/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
      ...(withCookie ? { Cookie: 'admin_token=valid-token' } : {}),
    },
  });
}

function makeDeleteRequest(id: string, withCookie = true): NextRequest {
  return new NextRequest(`http://localhost/api/admin/research/${id}`, {
    method: 'DELETE',
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
  mockGetById.mockReturnValue(MOCK_ITEM);
  mockUpdate.mockReturnValue({ ...MOCK_ITEM, status: 'saved' });
  mockRemove.mockReturnValue(true);
});

afterEach(() => {
  vi.clearAllMocks();
});

// ─── PATCH — Auth ─────────────────────────────────────────────────────────────

describe('PATCH /api/admin/research/[id] — auth', () => {
  it('returns 401 when no cookie', async () => {
    const res = await PATCH(
      makePatchRequest(ITEM_ID, { status: 'saved' }, false),
      makeParams(ITEM_ID),
    );
    expect(res.status).toBe(401);
  });

  it('returns 401 when token invalid', async () => {
    mockVerifyAdminToken.mockResolvedValue(null);
    const res = await PATCH(makePatchRequest(ITEM_ID, { status: 'saved' }), makeParams(ITEM_ID));
    expect(res.status).toBe(401);
  });
});

// ─── PATCH — 404 ─────────────────────────────────────────────────────────────

describe('PATCH /api/admin/research/[id] — 404', () => {
  it('returns 404 when item not found', async () => {
    mockGetById.mockReturnValue(undefined);
    const res = await PATCH(
      makePatchRequest('missing-id', { status: 'saved' }),
      makeParams('missing-id'),
    );
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('Not found');
  });

  it('calls getById with the correct id', async () => {
    await PATCH(makePatchRequest(ITEM_ID, { status: 'saved' }), makeParams(ITEM_ID));
    expect(mockGetById).toHaveBeenCalledWith(ITEM_ID);
  });
});

// ─── PATCH — Validation ───────────────────────────────────────────────────────

describe('PATCH /api/admin/research/[id] — validation', () => {
  it('returns 400 for invalid JSON', async () => {
    const req = new NextRequest(`http://localhost/api/admin/research/${ITEM_ID}`, {
      method: 'PATCH',
      body: 'not-json',
      headers: { 'Content-Type': 'application/json', Cookie: 'admin_token=valid-token' },
    });
    const res = await PATCH(req, makeParams(ITEM_ID));
    expect(res.status).toBe(400);
  });

  it('returns 400 when costPrice is 0', async () => {
    const res = await PATCH(makePatchRequest(ITEM_ID, { costPrice: 0 }), makeParams(ITEM_ID));
    expect(res.status).toBe(400);
  });

  it('returns 400 when costPrice is negative', async () => {
    const res = await PATCH(makePatchRequest(ITEM_ID, { costPrice: -1 }), makeParams(ITEM_ID));
    expect(res.status).toBe(400);
  });

  it('returns 400 when salePrice <= costPrice (same)', async () => {
    const res = await PATCH(
      makePatchRequest(ITEM_ID, { salePrice: 5, costPrice: 5 }),
      makeParams(ITEM_ID),
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 when new salePrice <= existing costPrice', async () => {
    // existing costPrice = 5, new salePrice = 3 → 3 <= 5
    const res = await PATCH(makePatchRequest(ITEM_ID, { salePrice: 3 }), makeParams(ITEM_ID));
    expect(res.status).toBe(400);
  });

  it('returns 400 when new costPrice >= existing salePrice', async () => {
    // existing salePrice = 20, new costPrice = 25 → 20 <= 25
    const res = await PATCH(makePatchRequest(ITEM_ID, { costPrice: 25 }), makeParams(ITEM_ID));
    expect(res.status).toBe(400);
  });
});

// ─── PATCH — Success ──────────────────────────────────────────────────────────

describe('PATCH /api/admin/research/[id] — success', () => {
  it('returns 200 with updated item', async () => {
    const res = await PATCH(makePatchRequest(ITEM_ID, { status: 'saved' }), makeParams(ITEM_ID));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { item: typeof MOCK_ITEM };
    expect(body.item).toBeDefined();
  });

  it('calls update with id and patch body', async () => {
    const patch = { status: 'rejected' };
    await PATCH(makePatchRequest(ITEM_ID, patch), makeParams(ITEM_ID));
    expect(mockUpdate).toHaveBeenCalledWith(
      ITEM_ID,
      expect.objectContaining({ status: 'rejected' }),
    );
  });

  it('recomputes prices correctly — accepts valid new prices', async () => {
    // new costPrice=8 and new salePrice=25 → 25 > 8 → valid
    const updatedItem = {
      ...MOCK_ITEM,
      costPrice: 8,
      salePrice: 25,
      marginPercent: 68,
      aiScore: 80,
    };
    mockUpdate.mockReturnValue(updatedItem);
    const res = await PATCH(
      makePatchRequest(ITEM_ID, { costPrice: 8, salePrice: 25 }),
      makeParams(ITEM_ID),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { item: typeof updatedItem };
    expect(body.item.costPrice).toBe(8);
    expect(body.item.salePrice).toBe(25);
  });

  it('accepts patch with only salePrice when > existing costPrice', async () => {
    // existing costPrice=5, new salePrice=30 → valid
    const res = await PATCH(makePatchRequest(ITEM_ID, { salePrice: 30 }), makeParams(ITEM_ID));
    expect(res.status).toBe(200);
  });

  it('returns 500 when update throws', async () => {
    mockUpdate.mockImplementation(() => {
      throw new Error('disk error');
    });
    const res = await PATCH(makePatchRequest(ITEM_ID, { status: 'saved' }), makeParams(ITEM_ID));
    expect(res.status).toBe(500);
  });
});

// ─── DELETE — Auth ────────────────────────────────────────────────────────────

describe('DELETE /api/admin/research/[id] — auth', () => {
  it('returns 401 when no cookie', async () => {
    const res = await DELETE(makeDeleteRequest(ITEM_ID, false), makeParams(ITEM_ID));
    expect(res.status).toBe(401);
  });

  it('returns 401 when token invalid', async () => {
    mockVerifyAdminToken.mockResolvedValue(null);
    const res = await DELETE(makeDeleteRequest(ITEM_ID), makeParams(ITEM_ID));
    expect(res.status).toBe(401);
  });
});

// ─── DELETE — 404 ────────────────────────────────────────────────────────────

describe('DELETE /api/admin/research/[id] — 404', () => {
  it('returns 404 when item not found', async () => {
    mockGetById.mockReturnValue(undefined);
    const res = await DELETE(makeDeleteRequest('missing-id'), makeParams('missing-id'));
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('Not found');
  });
});

// ─── DELETE — Success ─────────────────────────────────────────────────────────

describe('DELETE /api/admin/research/[id] — success', () => {
  it('returns 204 with no body', async () => {
    const res = await DELETE(makeDeleteRequest(ITEM_ID), makeParams(ITEM_ID));
    expect(res.status).toBe(204);
    expect(res.body).toBeNull();
  });

  it('calls remove with the correct id', async () => {
    await DELETE(makeDeleteRequest(ITEM_ID), makeParams(ITEM_ID));
    expect(mockRemove).toHaveBeenCalledWith(ITEM_ID);
  });

  it('returns 500 when remove throws', async () => {
    mockRemove.mockImplementation(() => {
      throw new Error('io error');
    });
    const res = await DELETE(makeDeleteRequest(ITEM_ID), makeParams(ITEM_ID));
    expect(res.status).toBe(500);
  });
});
