/**
 * Integration tests — POST /api/admin/monitor/poll
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// ─── Hoist mock vars ──────────────────────────────────────────────────────────

const { mockPollAllProducts, mockPollSingleProduct, mockVerifyAdminToken } = vi.hoisted(() => ({
  mockPollAllProducts: vi.fn(),
  mockPollSingleProduct: vi.fn(),
  mockVerifyAdminToken: vi.fn(),
}));

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/lib/monitor/poller', () => ({
  pollAllProducts: mockPollAllProducts,
  pollSingleProduct: mockPollSingleProduct,
}));

vi.mock('@/lib/admin-auth', () => ({
  verifyAdminToken: mockVerifyAdminToken,
  ADMIN_TOKEN_COOKIE: 'admin_token',
}));

// ─── Import AFTER mocking ─────────────────────────────────────────────────────

import { POST } from './route';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(body?: unknown, withCookie = true, withCronHeader = false): NextRequest {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (withCookie) headers['Cookie'] = 'admin_token=valid-token';
  if (withCronHeader) headers['x-vercel-cron'] = '1';
  return new NextRequest('http://localhost/api/admin/monitor/poll', {
    method: 'POST',
    body: body !== undefined ? JSON.stringify(body) : undefined,
    headers,
  });
}

const MOCK_POLL_RESULT = {
  polled: 2,
  updated: 2,
  errors: [],
  snapshotWritten: true,
  durationMs: 42,
};

const MOCK_SINGLE_METRICS = {
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
};

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockVerifyAdminToken.mockResolvedValue({ role: 'admin', iat: 0, exp: 9_999_999_999 });
  mockPollAllProducts.mockResolvedValue(MOCK_POLL_RESULT);
  mockPollSingleProduct.mockResolvedValue(MOCK_SINGLE_METRICS);
});

afterEach(() => {
  vi.clearAllMocks();
});

// ─── Auth ─────────────────────────────────────────────────────────────────────

describe('POST /api/admin/monitor/poll — auth', () => {
  it('returns 401 when no cookie and no cron header', async () => {
    mockVerifyAdminToken.mockResolvedValue(null);
    const res = await POST(makeRequest(undefined, false, false));
    expect(res.status).toBe(401);
  });

  it('allows request with valid JWT cookie', async () => {
    const res = await POST(makeRequest(undefined, true, false));
    expect(res.status).toBe(200);
  });

  it('allows request with x-vercel-cron header, bypassing JWT check', async () => {
    const res = await POST(makeRequest(undefined, false, true));
    expect(res.status).toBe(200);
  });

  it('returns 401 when cookie present but token invalid (no cron header)', async () => {
    mockVerifyAdminToken.mockResolvedValue(null);
    const res = await POST(makeRequest(undefined, true, false));
    expect(res.status).toBe(401);
  });
});

// ─── Poll All ─────────────────────────────────────────────────────────────────

describe('POST /api/admin/monitor/poll — poll all', () => {
  it('calls pollAllProducts when no body provided', async () => {
    const res = await POST(makeRequest(undefined, true));
    expect(res.status).toBe(200);
    expect(mockPollAllProducts).toHaveBeenCalled();
    expect(mockPollSingleProduct).not.toHaveBeenCalled();
  });

  it('calls pollAllProducts when body has no shopifyProductId', async () => {
    const res = await POST(makeRequest({}, true));
    expect(res.status).toBe(200);
    expect(mockPollAllProducts).toHaveBeenCalled();
  });

  it('returns 200 with PollResult shape', async () => {
    const res = await POST(makeRequest(undefined, true));
    const body = (await res.json()) as { result: typeof MOCK_POLL_RESULT };
    expect(body.result).toMatchObject({ polled: 2, updated: 2, errors: [] });
  });
});

// ─── Poll Single ──────────────────────────────────────────────────────────────

describe('POST /api/admin/monitor/poll — poll single', () => {
  it('calls pollSingleProduct when shopifyProductId is provided', async () => {
    await POST(makeRequest({ shopifyProductId: 'gid://shopify/Product/1' }, true));
    expect(mockPollSingleProduct).toHaveBeenCalledWith(
      'gid://shopify/Product/1',
      'gid://shopify/Product/1',
    );
    expect(mockPollAllProducts).not.toHaveBeenCalled();
  });

  it('returns 200 with PollResult wrapping single product result', async () => {
    const res = await POST(makeRequest({ shopifyProductId: 'gid://shopify/Product/1' }, true));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { result: { polled: number; updated: number } };
    expect(body.result.polled).toBe(1);
    expect(body.result.updated).toBe(1);
  });

  it('returns errors array when pollSingleProduct throws', async () => {
    mockPollSingleProduct.mockRejectedValue(new Error('Shopify timeout'));
    const res = await POST(makeRequest({ shopifyProductId: 'gid://shopify/Product/1' }, true));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { result: { errors: Array<{ error: string }> } };
    expect(body.result.errors[0].error).toContain('Shopify timeout');
  });
});
