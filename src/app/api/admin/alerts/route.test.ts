/**
 * Tests — GET+POST /api/admin/alerts
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

const { mockGetAlertsByFilter, mockAddAlert, mockVerifyAdminToken } = vi.hoisted(() => ({
  mockGetAlertsByFilter: vi.fn(),
  mockAddAlert: vi.fn(),
  mockVerifyAdminToken: vi.fn(),
}));

vi.mock('@/lib/alerts/store', () => ({
  getAlertsByFilter: mockGetAlertsByFilter,
  addAlert: mockAddAlert,
}));

vi.mock('@/lib/admin-auth', () => ({
  verifyAdminToken: mockVerifyAdminToken,
  ADMIN_TOKEN_COOKIE: 'admin_token',
}));

import { GET, POST } from './route';

const MOCK_ALERT = {
  id: 'abc123',
  type: 'zero_orders',
  severity: 'warning',
  status: 'unread',
  title: 'No orders',
  message: 'No orders in 7 days',
  sourceId: 'gid://shopify/Product/1',
  createdAt: '2024-01-01T00:00:00.000Z',
};

function makeRequest(method: string, query = '', body?: unknown, withCookie = true): NextRequest {
  return new NextRequest(`http://localhost/api/admin/alerts${query}`, {
    method,
    headers: {
      ...(withCookie ? { Cookie: 'admin_token=valid-token' } : {}),
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockVerifyAdminToken.mockResolvedValue({ role: 'admin', iat: 0, exp: 9_999_999_999 });
  mockGetAlertsByFilter.mockReturnValue([MOCK_ALERT]);
  mockAddAlert.mockReturnValue(MOCK_ALERT);
});

afterEach(() => vi.clearAllMocks());

// ─── Auth ─────────────────────────────────────────────────────────────────────

describe('GET /api/admin/alerts — auth', () => {
  it('returns 401 without cookie', async () => {
    const res = await GET(makeRequest('GET', '', undefined, false));
    expect(res.status).toBe(401);
  });

  it('returns 401 when token invalid', async () => {
    mockVerifyAdminToken.mockResolvedValue(null);
    const res = await GET(makeRequest('GET'));
    expect(res.status).toBe(401);
  });
});

// ─── GET ─────────────────────────────────────────────────────────────────────

describe('GET /api/admin/alerts', () => {
  it('returns 200 with alerts array', async () => {
    const res = await GET(makeRequest('GET'));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { alerts: unknown[] };
    expect(body.alerts).toHaveLength(1);
  });

  it('passes status filter to store', async () => {
    await GET(makeRequest('GET', '?status=unread'));
    expect(mockGetAlertsByFilter).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'unread' }),
    );
  });

  it('passes type filter to store', async () => {
    await GET(makeRequest('GET', '?type=zero_orders'));
    expect(mockGetAlertsByFilter).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'zero_orders' }),
    );
  });

  it('passes severity filter to store', async () => {
    await GET(makeRequest('GET', '?severity=critical'));
    expect(mockGetAlertsByFilter).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'critical' }),
    );
  });

  it('passes default limit=50 to store', async () => {
    await GET(makeRequest('GET'));
    expect(mockGetAlertsByFilter).toHaveBeenCalledWith(expect.objectContaining({ limit: 50 }));
  });
});

// ─── POST ─────────────────────────────────────────────────────────────────────

describe('POST /api/admin/alerts', () => {
  it('returns 201 with created alert', async () => {
    const body = { type: 'zero_orders', severity: 'warning', title: 'Test', message: 'Msg' };
    const res = await POST(makeRequest('POST', '', body));
    expect(res.status).toBe(201);
    const json = (await res.json()) as { alert: unknown };
    expect(json.alert).toBeDefined();
  });

  it('returns 400 when type is missing', async () => {
    const res = await POST(
      makeRequest('POST', '', { severity: 'warning', title: 'T', message: 'M' }),
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 when title is missing', async () => {
    const res = await POST(
      makeRequest('POST', '', { type: 'zero_orders', severity: 'warning', message: 'M' }),
    );
    expect(res.status).toBe(400);
  });

  it('returns 401 without auth', async () => {
    const res = await POST(makeRequest('POST', '', {}, false));
    expect(res.status).toBe(401);
  });
});
