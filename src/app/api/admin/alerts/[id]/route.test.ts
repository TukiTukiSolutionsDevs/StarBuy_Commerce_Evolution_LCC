/**
 * Tests — GET /api/admin/alerts/[id]
 *       + POST /api/admin/alerts/[id]/read
 *       + POST /api/admin/alerts/[id]/dismiss
 *       + POST /api/admin/alerts/[id]/snooze
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

const {
  mockGetAlertById,
  mockMarkAlertRead,
  mockDismissAlert,
  mockSnoozeAlert,
  mockVerifyAdminToken,
} = vi.hoisted(() => ({
  mockGetAlertById: vi.fn(),
  mockMarkAlertRead: vi.fn(),
  mockDismissAlert: vi.fn(),
  mockSnoozeAlert: vi.fn(),
  mockVerifyAdminToken: vi.fn(),
}));

vi.mock('@/lib/alerts/store', () => ({
  getAlertById: mockGetAlertById,
  markAlertRead: mockMarkAlertRead,
  dismissAlert: mockDismissAlert,
  snoozeAlert: mockSnoozeAlert,
}));

vi.mock('@/lib/admin-auth', () => ({
  verifyAdminToken: mockVerifyAdminToken,
  ADMIN_TOKEN_COOKIE: 'admin_token',
}));

import { GET } from './route';
import { POST as POSTRead } from './read/route';
import { POST as POSTDismiss } from './dismiss/route';
import { POST as POSTSnooze } from './snooze/route';

const MOCK_ALERT = {
  id: 'abc123',
  type: 'zero_orders',
  severity: 'warning',
  status: 'unread',
  title: 'No orders',
  message: 'No orders in 7 days',
  createdAt: '2024-01-01T00:00:00.000Z',
};

function makeReq(method: string, path: string, body?: unknown, withCookie = true): NextRequest {
  return new NextRequest(`http://localhost${path}`, {
    method,
    headers: {
      ...(withCookie ? { Cookie: 'admin_token=valid-token' } : {}),
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

const params = Promise.resolve({ id: 'abc123' });

beforeEach(() => {
  vi.clearAllMocks();
  mockVerifyAdminToken.mockResolvedValue({ role: 'admin', iat: 0, exp: 9_999_999_999 });
  mockGetAlertById.mockReturnValue(MOCK_ALERT);
  mockMarkAlertRead.mockReturnValue({
    ...MOCK_ALERT,
    status: 'read',
    readAt: new Date().toISOString(),
  });
  mockDismissAlert.mockReturnValue({
    ...MOCK_ALERT,
    status: 'dismissed',
    dismissedAt: new Date().toISOString(),
  });
  mockSnoozeAlert.mockReturnValue({
    ...MOCK_ALERT,
    status: 'snoozed',
    snoozedUntil: new Date().toISOString(),
  });
});

afterEach(() => vi.clearAllMocks());

// ─── GET /[id] ────────────────────────────────────────────────────────────────

describe('GET /api/admin/alerts/[id]', () => {
  it('returns 200 with alert', async () => {
    const res = await GET(makeReq('GET', '/api/admin/alerts/abc123'), { params });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { alert: unknown };
    expect(body.alert).toBeDefined();
  });

  it('returns 404 when alert not found', async () => {
    mockGetAlertById.mockReturnValue(undefined);
    const res = await GET(makeReq('GET', '/api/admin/alerts/ghost'), { params });
    expect(res.status).toBe(404);
  });

  it('returns 401 without auth', async () => {
    const res = await GET(makeReq('GET', '/api/admin/alerts/abc123', undefined, false), { params });
    expect(res.status).toBe(401);
  });
});

// ─── POST /[id]/read ──────────────────────────────────────────────────────────

describe('POST /api/admin/alerts/[id]/read', () => {
  it('returns 200 with updated alert', async () => {
    const res = await POSTRead(makeReq('POST', '/api/admin/alerts/abc123/read'), { params });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { alert: { status: string } };
    expect(body.alert.status).toBe('read');
  });

  it('returns 404 when alert not found', async () => {
    mockMarkAlertRead.mockImplementation(() => {
      throw new Error('Alert not found: ghost');
    });
    const res = await POSTRead(makeReq('POST', '/api/admin/alerts/ghost/read'), { params });
    expect(res.status).toBe(404);
  });

  it('returns 401 without auth', async () => {
    const res = await POSTRead(makeReq('POST', '/api/admin/alerts/abc123/read', undefined, false), {
      params,
    });
    expect(res.status).toBe(401);
  });
});

// ─── POST /[id]/dismiss ───────────────────────────────────────────────────────

describe('POST /api/admin/alerts/[id]/dismiss', () => {
  it('returns 200 with dismissed alert', async () => {
    const res = await POSTDismiss(makeReq('POST', '/api/admin/alerts/abc123/dismiss'), { params });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { alert: { status: string } };
    expect(body.alert.status).toBe('dismissed');
  });

  it('returns 404 when alert not found', async () => {
    mockDismissAlert.mockImplementation(() => {
      throw new Error('Alert not found: ghost');
    });
    const res = await POSTDismiss(makeReq('POST', '/api/admin/alerts/ghost/dismiss'), { params });
    expect(res.status).toBe(404);
  });
});

// ─── POST /[id]/snooze ────────────────────────────────────────────────────────

describe('POST /api/admin/alerts/[id]/snooze', () => {
  it('returns 200 with snoozed alert for valid hours', async () => {
    const res = await POSTSnooze(
      makeReq('POST', '/api/admin/alerts/abc123/snooze', { hours: 24 }),
      { params },
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { alert: { status: string } };
    expect(body.alert.status).toBe('snoozed');
  });

  it('returns 400 for invalid hours value', async () => {
    const res = await POSTSnooze(
      makeReq('POST', '/api/admin/alerts/abc123/snooze', { hours: 99 }),
      { params },
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 when hours is missing', async () => {
    const res = await POSTSnooze(makeReq('POST', '/api/admin/alerts/abc123/snooze', {}), {
      params,
    });
    expect(res.status).toBe(400);
  });

  it('returns 404 when alert not found', async () => {
    mockSnoozeAlert.mockImplementation(() => {
      throw new Error('Alert not found: ghost');
    });
    const res = await POSTSnooze(makeReq('POST', '/api/admin/alerts/ghost/snooze', { hours: 1 }), {
      params,
    });
    expect(res.status).toBe(404);
  });
});
