/**
 * Tests — GET /api/admin/alerts/unread-count
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

const { mockGetUnreadCount, mockVerifyAdminToken } = vi.hoisted(() => ({
  mockGetUnreadCount: vi.fn(),
  mockVerifyAdminToken: vi.fn(),
}));

vi.mock('@/lib/alerts/store', () => ({ getUnreadCount: mockGetUnreadCount }));
vi.mock('@/lib/admin-auth', () => ({
  verifyAdminToken: mockVerifyAdminToken,
  ADMIN_TOKEN_COOKIE: 'admin_token',
}));

import { GET } from './route';

function makeReq(withCookie = true): NextRequest {
  return new NextRequest('http://localhost/api/admin/alerts/unread-count', {
    method: 'GET',
    headers: withCookie ? { Cookie: 'admin_token=valid-token' } : {},
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockVerifyAdminToken.mockResolvedValue({ role: 'admin', iat: 0, exp: 9_999_999_999 });
  mockGetUnreadCount.mockReturnValue(3);
});

afterEach(() => vi.clearAllMocks());

describe('GET /api/admin/alerts/unread-count', () => {
  it('returns 200 with count', async () => {
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = (await res.json()) as { count: number };
    expect(body.count).toBe(3);
  });

  it('returns 401 without auth', async () => {
    const res = await GET(makeReq(false));
    expect(res.status).toBe(401);
  });

  it('returns 401 when token invalid', async () => {
    mockVerifyAdminToken.mockResolvedValue(null);
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it('returns count=0 when no unread alerts', async () => {
    mockGetUnreadCount.mockReturnValue(0);
    const res = await GET(makeReq());
    const body = (await res.json()) as { count: number };
    expect(body.count).toBe(0);
  });
});
