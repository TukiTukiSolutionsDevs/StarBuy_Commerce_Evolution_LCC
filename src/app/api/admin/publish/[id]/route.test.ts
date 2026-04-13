/**
 * Integration tests — GET + DELETE /api/admin/publish/[id]
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// ─── Hoist mock vars ──────────────────────────────────────────────────────────

const { mockGetById, mockRollbackPublish, mockVerifyAdminToken } = vi.hoisted(() => ({
  mockGetById: vi.fn(),
  mockRollbackPublish: vi.fn(),
  mockVerifyAdminToken: vi.fn(),
}));

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/lib/publish/store', () => ({
  getById: mockGetById,
}));

vi.mock('@/lib/publish/rollback', () => ({
  rollbackPublish: mockRollbackPublish,
}));

vi.mock('@/lib/admin-auth', () => ({
  verifyAdminToken: mockVerifyAdminToken,
  ADMIN_TOKEN_COOKIE: 'admin_token',
}));

// ─── Import AFTER mocking ─────────────────────────────────────────────────────

import { GET, DELETE } from './route';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ROUTE_PARAMS = { params: Promise.resolve({ id: 'rec-1' }) };

function makeRequest(method: string, withCookie = true): NextRequest {
  return new NextRequest('http://localhost/api/admin/publish/rec-1', {
    method,
    headers: withCookie ? { Cookie: 'admin_token=valid-token' } : {},
  });
}

const MOCK_PUBLISHED_RECORD = {
  id: 'rec-1',
  researchId: 'res-1',
  status: 'published',
  shopifyProductId: 'gid://shopify/Product/123',
  validation: { title: true, description: true, price: true, images: true, errors: [] },
  retryCount: 0,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

const MOCK_ARCHIVED_RECORD = { ...MOCK_PUBLISHED_RECORD, status: 'archived' };

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockVerifyAdminToken.mockResolvedValue({ role: 'admin', iat: 0, exp: 9_999_999_999 });
  mockGetById.mockReturnValue(MOCK_PUBLISHED_RECORD);
  mockRollbackPublish.mockResolvedValue({ success: true, recordId: 'rec-1' });
});

afterEach(() => {
  vi.clearAllMocks();
});

// ─── GET — Auth ───────────────────────────────────────────────────────────────

describe('GET /api/admin/publish/[id] — auth', () => {
  it('returns 401 when no cookie', async () => {
    const res = await GET(makeRequest('GET', false), ROUTE_PARAMS);
    expect(res.status).toBe(401);
  });

  it('returns 401 when token invalid', async () => {
    mockVerifyAdminToken.mockResolvedValue(null);
    const res = await GET(makeRequest('GET'), ROUTE_PARAMS);
    expect(res.status).toBe(401);
  });
});

// ─── GET — Fetch record ───────────────────────────────────────────────────────

describe('GET /api/admin/publish/[id] — fetch', () => {
  it('returns 200 with the record', async () => {
    const res = await GET(makeRequest('GET'), ROUTE_PARAMS);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { record: typeof MOCK_PUBLISHED_RECORD };
    expect(body.record).toMatchObject({ id: 'rec-1' });
  });

  it('returns 404 when record not found', async () => {
    mockGetById.mockReturnValue(undefined);
    const res = await GET(makeRequest('GET'), ROUTE_PARAMS);
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/not found/);
  });
});

// ─── DELETE — Auth ────────────────────────────────────────────────────────────

describe('DELETE /api/admin/publish/[id] — auth', () => {
  it('returns 401 when no cookie', async () => {
    const res = await DELETE(makeRequest('DELETE', false), ROUTE_PARAMS);
    expect(res.status).toBe(401);
  });

  it('returns 401 when token invalid', async () => {
    mockVerifyAdminToken.mockResolvedValue(null);
    const res = await DELETE(makeRequest('DELETE'), ROUTE_PARAMS);
    expect(res.status).toBe(401);
  });
});

// ─── DELETE — Guard ───────────────────────────────────────────────────────────

describe('DELETE /api/admin/publish/[id] — guard', () => {
  it('returns 404 when record not found', async () => {
    mockGetById.mockReturnValue(undefined);
    const res = await DELETE(makeRequest('DELETE'), ROUTE_PARAMS);
    expect(res.status).toBe(404);
  });

  it('returns 400 when record is not published (pending)', async () => {
    mockGetById.mockReturnValue({ ...MOCK_PUBLISHED_RECORD, status: 'pending' });
    const res = await DELETE(makeRequest('DELETE'), ROUTE_PARAMS);
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/Cannot rollback/);
  });

  it('returns 400 when record is already archived', async () => {
    mockGetById.mockReturnValue(MOCK_ARCHIVED_RECORD);
    const res = await DELETE(makeRequest('DELETE'), ROUTE_PARAMS);
    expect(res.status).toBe(400);
  });
});

// ─── DELETE — Success ─────────────────────────────────────────────────────────

describe('DELETE /api/admin/publish/[id] — rollback success', () => {
  it('returns 200 with the updated record', async () => {
    mockGetById
      .mockReturnValueOnce(MOCK_PUBLISHED_RECORD) // guard check
      .mockReturnValueOnce(MOCK_ARCHIVED_RECORD); // after rollback
    const res = await DELETE(makeRequest('DELETE'), ROUTE_PARAMS);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { record: typeof MOCK_ARCHIVED_RECORD };
    expect(body.record).toMatchObject({ status: 'archived' });
  });

  it('calls rollbackPublish with the record id', async () => {
    mockGetById
      .mockReturnValueOnce(MOCK_PUBLISHED_RECORD)
      .mockReturnValueOnce(MOCK_ARCHIVED_RECORD);
    await DELETE(makeRequest('DELETE'), ROUTE_PARAMS);
    expect(mockRollbackPublish).toHaveBeenCalledWith('rec-1');
  });

  it('returns 400 when rollbackPublish fails', async () => {
    mockRollbackPublish.mockResolvedValue({
      success: false,
      recordId: 'rec-1',
      error: 'Shopify error',
    });
    const res = await DELETE(makeRequest('DELETE'), ROUTE_PARAMS);
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/Shopify error/);
  });
});
