/**
 * Tests — GET+PUT /api/admin/alerts/preferences
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

const { mockLoadPreferences, mockSavePreferences, mockMergeWithDefaults, mockVerifyAdminToken } =
  vi.hoisted(() => ({
    mockLoadPreferences: vi.fn(),
    mockSavePreferences: vi.fn(),
    mockMergeWithDefaults: vi.fn(),
    mockVerifyAdminToken: vi.fn(),
  }));

vi.mock('@/lib/alerts/preferences', () => ({
  loadPreferences: mockLoadPreferences,
  savePreferences: mockSavePreferences,
  mergeWithDefaults: mockMergeWithDefaults,
}));

vi.mock('@/lib/admin-auth', () => ({
  verifyAdminToken: mockVerifyAdminToken,
  ADMIN_TOKEN_COOKIE: 'admin_token',
}));

import { GET, PUT } from './route';

const MOCK_PREFS = {
  thresholds: {
    lowConversionRate: 0.02,
    zeroOrdersDays: 7,
    stockLowUnits: 10,
    pulseShiftMinScore: 15,
  },
  enabledTypes: ['zero_orders', 'stock_low'],
  mutedSeverities: [],
};

function makeReq(method: string, body?: unknown, withCookie = true): NextRequest {
  return new NextRequest('http://localhost/api/admin/alerts/preferences', {
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
  mockLoadPreferences.mockReturnValue(MOCK_PREFS);
  mockMergeWithDefaults.mockImplementation((partial: unknown) => ({
    ...MOCK_PREFS,
    ...(partial as object),
  }));
});

afterEach(() => vi.clearAllMocks());

// ─── Auth ─────────────────────────────────────────────────────────────────────

describe('GET /api/admin/alerts/preferences — auth', () => {
  it('returns 401 without cookie', async () => {
    const res = await GET(makeReq('GET', undefined, false));
    expect(res.status).toBe(401);
  });
});

// ─── GET ─────────────────────────────────────────────────────────────────────

describe('GET /api/admin/alerts/preferences', () => {
  it('returns 200 with current preferences', async () => {
    const res = await GET(makeReq('GET'));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { preferences: unknown };
    expect(body.preferences).toBeDefined();
  });

  it('calls loadPreferences', async () => {
    await GET(makeReq('GET'));
    expect(mockLoadPreferences).toHaveBeenCalled();
  });
});

// ─── PUT ─────────────────────────────────────────────────────────────────────

describe('PUT /api/admin/alerts/preferences', () => {
  it('returns 200 with updated preferences', async () => {
    const partial = { enabledTypes: ['zero_orders'] };
    const res = await PUT(makeReq('PUT', partial));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { preferences: unknown };
    expect(body.preferences).toBeDefined();
  });

  it('calls mergeWithDefaults with body', async () => {
    const partial = { enabledTypes: ['stock_low'] };
    await PUT(makeReq('PUT', partial));
    expect(mockMergeWithDefaults).toHaveBeenCalledWith(
      expect.objectContaining({ enabledTypes: ['stock_low'] }),
    );
  });

  it('calls savePreferences', async () => {
    await PUT(makeReq('PUT', {}));
    expect(mockSavePreferences).toHaveBeenCalled();
  });

  it('returns 401 without auth', async () => {
    const res = await PUT(makeReq('PUT', {}, false));
    expect(res.status).toBe(401);
  });
});
