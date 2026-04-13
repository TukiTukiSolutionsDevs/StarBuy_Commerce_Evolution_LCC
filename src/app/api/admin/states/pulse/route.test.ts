/**
 * Integration tests — GET + PATCH /api/admin/states/pulse
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// ─── Hoist mock vars ──────────────────────────────────────────────────────────

const {
  mockLoadPulseEvents,
  mockMarkPulseEventsRead,
  mockGetUnreadPulseCount,
  mockVerifyAdminToken,
} = vi.hoisted(() => ({
  mockLoadPulseEvents: vi.fn(),
  mockMarkPulseEventsRead: vi.fn(),
  mockGetUnreadPulseCount: vi.fn(),
  mockVerifyAdminToken: vi.fn(),
}));

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/lib/states/store', () => ({
  loadPulseEvents: mockLoadPulseEvents,
  markPulseEventsRead: mockMarkPulseEventsRead,
  getUnreadPulseCount: mockGetUnreadPulseCount,
}));

vi.mock('@/lib/admin-auth', () => ({
  verifyAdminToken: mockVerifyAdminToken,
  ADMIN_TOKEN_COOKIE: 'admin_token',
}));

// ─── Import AFTER mocking ─────────────────────────────────────────────────────

import { GET, PATCH } from './route';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeGetRequest(query = '', withCookie = true): NextRequest {
  return new NextRequest(`http://localhost/api/admin/states/pulse${query}`, {
    method: 'GET',
    headers: withCookie ? { Cookie: 'admin_token=valid-token' } : {},
  });
}

function makePatchRequest(body: unknown, withCookie = true): NextRequest {
  return new NextRequest('http://localhost/api/admin/states/pulse', {
    method: 'PATCH',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
      ...(withCookie ? { Cookie: 'admin_token=valid-token' } : {}),
    },
  });
}

const MOCK_EVENT = {
  id: 'evt-1',
  stateCode: 'CA',
  stateName: 'California',
  category: 'electronics',
  categoryLabel: 'Electronics',
  severity: 'notable' as const,
  deltaPercent: 15.5,
  previousScore: 60,
  currentScore: 69,
  detectedAt: Date.now(),
  isRead: false,
};

const MOCK_EVENT_TX = { ...MOCK_EVENT, id: 'evt-2', stateCode: 'TX', stateName: 'Texas' };
const MOCK_EVENT_MAJOR = { ...MOCK_EVENT, id: 'evt-3', severity: 'major' as const };

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockVerifyAdminToken.mockResolvedValue({ role: 'admin', iat: 0, exp: 9_999_999_999 });
  mockLoadPulseEvents.mockReturnValue([MOCK_EVENT, MOCK_EVENT_TX, MOCK_EVENT_MAJOR]);
  mockGetUnreadPulseCount.mockReturnValue(3);
  mockMarkPulseEventsRead.mockReturnValue(1);
});

afterEach(() => {
  vi.clearAllMocks();
});

// ─── GET — Auth ───────────────────────────────────────────────────────────────

describe('GET /api/admin/states/pulse — auth', () => {
  it('returns 401 when no cookie', async () => {
    const res = await GET(makeGetRequest('', false));
    expect(res.status).toBe(401);
  });

  it('returns 401 when token invalid', async () => {
    mockVerifyAdminToken.mockResolvedValue(null);
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(401);
  });
});

// ─── GET — Filters ────────────────────────────────────────────────────────────

describe('GET /api/admin/states/pulse — filters', () => {
  it('returns all events by default', async () => {
    const res = await GET(makeGetRequest());
    const body = await res.json();
    expect(body.events).toHaveLength(3);
    expect(body.total).toBe(3);
  });

  it('filters by severity', async () => {
    const res = await GET(makeGetRequest('?severity=major'));
    const body = await res.json();
    expect(body.events).toHaveLength(1);
    expect(body.events[0].severity).toBe('major');
  });

  it('filters by state', async () => {
    const res = await GET(makeGetRequest('?state=TX'));
    const body = await res.json();
    expect(body.events).toHaveLength(1);
    expect(body.events[0].stateCode).toBe('TX');
  });

  it('filters by unread', async () => {
    mockLoadPulseEvents.mockReturnValue([MOCK_EVENT, { ...MOCK_EVENT_TX, isRead: true }]);
    const res = await GET(makeGetRequest('?unread=true'));
    const body = await res.json();
    expect(body.events).toHaveLength(1);
  });

  it('respects limit param', async () => {
    const res = await GET(makeGetRequest('?limit=1'));
    const body = await res.json();
    expect(body.events).toHaveLength(1);
    expect(body.total).toBe(3);
  });

  it('caps limit at 200', async () => {
    const many = Array.from({ length: 250 }, (_, i) => ({ ...MOCK_EVENT, id: `e-${i}` }));
    mockLoadPulseEvents.mockReturnValue(many);
    const res = await GET(makeGetRequest('?limit=999'));
    const body = await res.json();
    expect(body.events).toHaveLength(200);
  });

  it('returns 400 for invalid severity', async () => {
    const res = await GET(makeGetRequest('?severity=invalid'));
    expect(res.status).toBe(400);
  });

  it('includes unreadCount in response', async () => {
    const res = await GET(makeGetRequest());
    const body = await res.json();
    expect(body.unreadCount).toBe(3);
  });
});

// ─── PATCH — Auth ─────────────────────────────────────────────────────────────

describe('PATCH /api/admin/states/pulse — auth', () => {
  it('returns 401 when no cookie', async () => {
    const res = await PATCH(makePatchRequest({ eventIds: ['e1'] }, false));
    expect(res.status).toBe(401);
  });
});

// ─── PATCH — Validation ───────────────────────────────────────────────────────

describe('PATCH /api/admin/states/pulse — validation', () => {
  it('returns 400 for invalid JSON', async () => {
    const req = new NextRequest('http://localhost/api/admin/states/pulse', {
      method: 'PATCH',
      body: 'not-json',
      headers: { 'Content-Type': 'application/json', Cookie: 'admin_token=valid-token' },
    });
    const res = await PATCH(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 when eventIds is missing', async () => {
    const res = await PATCH(makePatchRequest({}));
    expect(res.status).toBe(400);
  });

  it('returns 400 when eventIds is empty', async () => {
    const res = await PATCH(makePatchRequest({ eventIds: [] }));
    expect(res.status).toBe(400);
  });
});

// ─── PATCH — Success ──────────────────────────────────────────────────────────

describe('PATCH /api/admin/states/pulse — success', () => {
  it('returns { marked } count', async () => {
    const res = await PATCH(makePatchRequest({ eventIds: ['evt-1'] }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.marked).toBe(1);
  });

  it('calls markPulseEventsRead with eventIds', async () => {
    await PATCH(makePatchRequest({ eventIds: ['evt-1', 'evt-2'] }));
    expect(mockMarkPulseEventsRead).toHaveBeenCalledWith(['evt-1', 'evt-2']);
  });
});
