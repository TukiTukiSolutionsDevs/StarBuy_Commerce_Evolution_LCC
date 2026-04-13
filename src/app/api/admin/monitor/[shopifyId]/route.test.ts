/**
 * Integration tests — GET /api/admin/monitor/[shopifyId]
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// ─── Hoist mock vars ──────────────────────────────────────────────────────────

const { mockGetMetricsByShopifyId, mockVerifyAdminToken } = vi.hoisted(() => ({
  mockGetMetricsByShopifyId: vi.fn(),
  mockVerifyAdminToken: vi.fn(),
}));

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/lib/monitor/store', () => ({
  getMetricsByShopifyId: mockGetMetricsByShopifyId,
}));

vi.mock('@/lib/admin-auth', () => ({
  verifyAdminToken: mockVerifyAdminToken,
  ADMIN_TOKEN_COOKIE: 'admin_token',
}));

// ─── Import AFTER mocking ─────────────────────────────────────────────────────

import { GET } from './route';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const RAW_ID = 'gid://shopify/Product/123';
const ENCODED_ID = encodeURIComponent(RAW_ID);
const ROUTE_PARAMS = { params: Promise.resolve({ shopifyId: ENCODED_ID }) };

function makeRequest(withCookie = true): NextRequest {
  return new NextRequest(`http://localhost/api/admin/monitor/${ENCODED_ID}`, {
    method: 'GET',
    headers: withCookie ? { Cookie: 'admin_token=valid-token' } : {},
  });
}

const MOCK_METRICS = {
  shopifyProductId: RAW_ID,
  title: 'Product A',
  fetchedAt: '2024-01-01T00:00:00.000Z',
  views: 100,
  orders: 5,
  revenue: 250,
  conversionRate: 0.05,
  inventory: 20,
  health: 'healthy' as const,
  healthReasons: [],
};

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockVerifyAdminToken.mockResolvedValue({ role: 'admin', iat: 0, exp: 9_999_999_999 });
  mockGetMetricsByShopifyId.mockReturnValue(MOCK_METRICS);
});

afterEach(() => {
  vi.clearAllMocks();
});

// ─── Auth ─────────────────────────────────────────────────────────────────────

describe('GET /api/admin/monitor/[shopifyId] — auth', () => {
  it('returns 401 when no cookie', async () => {
    const res = await GET(makeRequest(false), ROUTE_PARAMS);
    expect(res.status).toBe(401);
  });

  it('returns 401 when token invalid', async () => {
    mockVerifyAdminToken.mockResolvedValue(null);
    const res = await GET(makeRequest(), ROUTE_PARAMS);
    expect(res.status).toBe(401);
  });
});

// ─── GET — Fetch ──────────────────────────────────────────────────────────────

describe('GET /api/admin/monitor/[shopifyId] — fetch', () => {
  it('returns 200 with metrics', async () => {
    const res = await GET(makeRequest(), ROUTE_PARAMS);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { metrics: typeof MOCK_METRICS };
    expect(body.metrics).toMatchObject({ shopifyProductId: RAW_ID });
  });

  it('URL-decodes the shopifyId param before querying store', async () => {
    await GET(makeRequest(), ROUTE_PARAMS);
    expect(mockGetMetricsByShopifyId).toHaveBeenCalledWith(RAW_ID);
  });

  it('returns 404 when metrics not found', async () => {
    mockGetMetricsByShopifyId.mockReturnValue(undefined);
    const res = await GET(makeRequest(), ROUTE_PARAMS);
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/not found/);
  });

  it('returns 500 when store throws', async () => {
    mockGetMetricsByShopifyId.mockImplementation(() => {
      throw new Error('disk error');
    });
    const res = await GET(makeRequest(), ROUTE_PARAMS);
    expect(res.status).toBe(500);
  });
});
