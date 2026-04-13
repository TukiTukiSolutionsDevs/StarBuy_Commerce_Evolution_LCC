/**
 * Integration tests — GET /api/admin/states
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// ─── Hoist mock vars ──────────────────────────────────────────────────────────

const { mockLoadScores, mockBuildStatesWithScores, mockVerifyAdminToken } = vi.hoisted(() => ({
  mockLoadScores: vi.fn(),
  mockBuildStatesWithScores: vi.fn(),
  mockVerifyAdminToken: vi.fn(),
}));

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/lib/states/store', () => ({
  loadScores: mockLoadScores,
}));

vi.mock('@/lib/states', () => ({
  buildStatesWithScores: mockBuildStatesWithScores,
}));

vi.mock('@/lib/admin-auth', () => ({
  verifyAdminToken: mockVerifyAdminToken,
  ADMIN_TOKEN_COOKIE: 'admin_token',
}));

// ─── Import AFTER mocking ─────────────────────────────────────────────────────

import { GET } from './route';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(withCookie = true): NextRequest {
  return new NextRequest('http://localhost/api/admin/states', {
    method: 'GET',
    headers: withCookie ? { Cookie: 'admin_token=valid-token' } : {},
  });
}

const MOCK_SCORE = {
  stateCode: 'CA',
  score: 85,
  breakdown: { demographics: 90, trendActivity: 80, ecommerceIndex: 88, incomeIndex: 90 },
  topCategories: ['electronics'],
  computedAt: 1000,
};

const MOCK_STATE = {
  code: 'CA',
  name: 'California',
  region: 'West',
  population: 39000000,
  medianIncome: 91000,
  urbanizationPct: 95,
  gdpBillions: 3900,
  ecommerceIndex: 88,
  ageDistribution: { under18: 22, age18to34: 23, age35to54: 26, age55plus: 29 },
  dataYear: 2023,
  opportunityScore: MOCK_SCORE,
};

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockVerifyAdminToken.mockResolvedValue({ role: 'admin', iat: 0, exp: 9_999_999_999 });
  mockLoadScores.mockReturnValue([MOCK_SCORE]);
  mockBuildStatesWithScores.mockReturnValue([MOCK_STATE]);
});

afterEach(() => {
  vi.clearAllMocks();
});

// ─── Auth ─────────────────────────────────────────────────────────────────────

describe('GET /api/admin/states — auth', () => {
  it('returns 401 when no cookie', async () => {
    const res = await GET(makeRequest(false));
    expect(res.status).toBe(401);
  });

  it('returns 401 when token invalid', async () => {
    mockVerifyAdminToken.mockResolvedValue(null);
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
  });

  it('returns { error: "Unauthorized" }', async () => {
    mockVerifyAdminToken.mockResolvedValue(null);
    const body = await (await GET(makeRequest())).json();
    expect(body.error).toBe('Unauthorized');
  });
});

// ─── Success ──────────────────────────────────────────────────────────────────

describe('GET /api/admin/states — success', () => {
  it('returns 200 with states array', async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.states).toHaveLength(1);
  });

  it('returns computedAt from latest score', async () => {
    const res = await GET(makeRequest());
    const body = await res.json();
    expect(body.computedAt).toBe(1000);
  });

  it('returns computedAt=0 when no scores exist', async () => {
    mockLoadScores.mockReturnValue([]);
    mockBuildStatesWithScores.mockReturnValue([]);
    const res = await GET(makeRequest());
    const body = await res.json();
    expect(body.computedAt).toBe(0);
  });

  it('calls buildStatesWithScores with loaded scores', async () => {
    await GET(makeRequest());
    expect(mockBuildStatesWithScores).toHaveBeenCalledWith([MOCK_SCORE]);
  });

  it('returns 500 when loadScores throws', async () => {
    mockLoadScores.mockImplementation(() => {
      throw new Error('disk');
    });
    const res = await GET(makeRequest());
    expect(res.status).toBe(500);
  });
});
