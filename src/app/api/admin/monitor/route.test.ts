/**
 * Integration tests — GET /api/admin/monitor
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// ─── Hoist mock vars ──────────────────────────────────────────────────────────

const { mockLoadAllMetrics, mockVerifyAdminToken } = vi.hoisted(() => ({
  mockLoadAllMetrics: vi.fn(),
  mockVerifyAdminToken: vi.fn(),
}));

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/lib/monitor/store', () => ({
  loadAllMetrics: mockLoadAllMetrics,
}));

vi.mock('@/lib/admin-auth', () => ({
  verifyAdminToken: mockVerifyAdminToken,
  ADMIN_TOKEN_COOKIE: 'admin_token',
}));

// ─── Import AFTER mocking ─────────────────────────────────────────────────────

import { GET } from './route';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(query = '', withCookie = true): NextRequest {
  return new NextRequest(`http://localhost/api/admin/monitor${query}`, {
    method: 'GET',
    headers: withCookie ? { Cookie: 'admin_token=valid-token' } : {},
  });
}

const MOCK_METRICS = [
  {
    shopifyProductId: 'gid://shopify/Product/1',
    title: 'Product A',
    fetchedAt: '2024-01-01T00:00:00.000Z',
    views: 100,
    orders: 5,
    revenue: 250,
    conversionRate: 0.05,
    inventory: 20,
    health: 'healthy',
    healthReasons: [],
  },
  {
    shopifyProductId: 'gid://shopify/Product/2',
    title: 'Product B',
    fetchedAt: '2024-01-01T00:00:00.000Z',
    views: 50,
    orders: 0,
    revenue: 0,
    conversionRate: 0,
    inventory: 2,
    health: 'critical',
    healthReasons: ['zero orders for 5 days', 'stock critical'],
  },
];

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockVerifyAdminToken.mockResolvedValue({ role: 'admin', iat: 0, exp: 9_999_999_999 });
  mockLoadAllMetrics.mockReturnValue(MOCK_METRICS);
});

afterEach(() => {
  vi.clearAllMocks();
});

// ─── Auth ─────────────────────────────────────────────────────────────────────

describe('GET /api/admin/monitor — auth', () => {
  it('returns 401 when no cookie', async () => {
    const res = await GET(makeRequest('', false));
    expect(res.status).toBe(401);
  });

  it('returns 401 when token invalid', async () => {
    mockVerifyAdminToken.mockResolvedValue(null);
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('Unauthorized');
  });
});

// ─── GET — List ───────────────────────────────────────────────────────────────

describe('GET /api/admin/monitor — list', () => {
  it('returns 200 with all metrics when no filter', async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = (await res.json()) as { metrics: unknown[] };
    expect(body.metrics).toHaveLength(2);
  });

  it('filters metrics by ?health=healthy', async () => {
    const res = await GET(makeRequest('?health=healthy'));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { metrics: typeof MOCK_METRICS };
    expect(body.metrics).toHaveLength(1);
    expect(body.metrics[0].health).toBe('healthy');
  });

  it('filters metrics by ?health=critical', async () => {
    const res = await GET(makeRequest('?health=critical'));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { metrics: typeof MOCK_METRICS };
    expect(body.metrics).toHaveLength(1);
    expect(body.metrics[0].health).toBe('critical');
  });

  it('returns all metrics when ?health= is invalid', async () => {
    const res = await GET(makeRequest('?health=bogus'));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { metrics: unknown[] };
    expect(body.metrics).toHaveLength(2);
  });

  it('returns 500 when store throws', async () => {
    mockLoadAllMetrics.mockImplementation(() => {
      throw new Error('disk error');
    });
    const res = await GET(makeRequest());
    expect(res.status).toBe(500);
  });
});
