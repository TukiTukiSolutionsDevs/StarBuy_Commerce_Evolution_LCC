/**
 * Integration tests — GET /api/admin/monitor/[shopifyId]/snapshots
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// ─── Hoist mock vars ──────────────────────────────────────────────────────────

const { mockGetSnapshotsByProduct, mockVerifyAdminToken } = vi.hoisted(() => ({
  mockGetSnapshotsByProduct: vi.fn(),
  mockVerifyAdminToken: vi.fn(),
}));

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/lib/monitor/store', () => ({
  getSnapshotsByProduct: mockGetSnapshotsByProduct,
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

function makeRequest(query = '', withCookie = true): NextRequest {
  return new NextRequest(`http://localhost/api/admin/monitor/${ENCODED_ID}/snapshots${query}`, {
    method: 'GET',
    headers: withCookie ? { Cookie: 'admin_token=valid-token' } : {},
  });
}

const BASE_SNAP = {
  shopifyProductId: RAW_ID,
  views: 100,
  orders: 5,
  revenue: 250,
  conversionRate: 0.05,
  inventory: 20,
  createdAt: '2024-01-01T00:00:00.000Z',
};

const MOCK_SNAPSHOTS = [
  { ...BASE_SNAP, id: 'snap-1', weekStart: '2024-01-08T00:00:00.000Z' },
  { ...BASE_SNAP, id: 'snap-2', weekStart: '2024-01-01T00:00:00.000Z' },
];

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockVerifyAdminToken.mockResolvedValue({ role: 'admin', iat: 0, exp: 9_999_999_999 });
  mockGetSnapshotsByProduct.mockReturnValue(MOCK_SNAPSHOTS);
});

afterEach(() => {
  vi.clearAllMocks();
});

// ─── Auth ─────────────────────────────────────────────────────────────────────

describe('GET /api/admin/monitor/[shopifyId]/snapshots — auth', () => {
  it('returns 401 when no cookie', async () => {
    const res = await GET(makeRequest('', false), ROUTE_PARAMS);
    expect(res.status).toBe(401);
  });

  it('returns 401 when token invalid', async () => {
    mockVerifyAdminToken.mockResolvedValue(null);
    const res = await GET(makeRequest(), ROUTE_PARAMS);
    expect(res.status).toBe(401);
  });
});

// ─── GET — Snapshots ──────────────────────────────────────────────────────────

describe('GET /api/admin/monitor/[shopifyId]/snapshots — list', () => {
  it('returns 200 with snapshots sorted weekStart desc', async () => {
    const res = await GET(makeRequest(), ROUTE_PARAMS);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { snapshots: typeof MOCK_SNAPSHOTS };
    expect(body.snapshots[0].weekStart).toBe('2024-01-08T00:00:00.000Z');
    expect(body.snapshots[1].weekStart).toBe('2024-01-01T00:00:00.000Z');
  });

  it('applies default limit of 12', async () => {
    const many = Array.from({ length: 20 }, (_, i) => ({
      ...BASE_SNAP,
      id: `snap-${i}`,
      weekStart: `2024-${String(i + 1).padStart(2, '0')}-01T00:00:00.000Z`,
    }));
    mockGetSnapshotsByProduct.mockReturnValue(many);
    const res = await GET(makeRequest(), ROUTE_PARAMS);
    const body = (await res.json()) as { snapshots: unknown[] };
    expect(body.snapshots).toHaveLength(12);
  });

  it('applies custom ?limit=5', async () => {
    const many = Array.from({ length: 20 }, (_, i) => ({
      ...BASE_SNAP,
      id: `snap-${i}`,
      weekStart: `2024-${String(i + 1).padStart(2, '0')}-01T00:00:00.000Z`,
    }));
    mockGetSnapshotsByProduct.mockReturnValue(many);
    const res = await GET(makeRequest('?limit=5'), ROUTE_PARAMS);
    const body = (await res.json()) as { snapshots: unknown[] };
    expect(body.snapshots).toHaveLength(5);
  });

  it('caps limit at 52', async () => {
    const many = Array.from({ length: 60 }, (_, i) => ({
      ...BASE_SNAP,
      id: `snap-${i}`,
      weekStart: `202${Math.floor(i / 12) + 4}-${String((i % 12) + 1).padStart(2, '0')}-01T00:00:00.000Z`,
    }));
    mockGetSnapshotsByProduct.mockReturnValue(many);
    const res = await GET(makeRequest('?limit=100'), ROUTE_PARAMS);
    const body = (await res.json()) as { snapshots: unknown[] };
    expect(body.snapshots.length).toBeLessThanOrEqual(52);
  });

  it('URL-decodes shopifyId before querying store', async () => {
    await GET(makeRequest(), ROUTE_PARAMS);
    expect(mockGetSnapshotsByProduct).toHaveBeenCalledWith(RAW_ID);
  });
});
