/**
 * Integration tests — GET /api/admin/states/[stateCode]
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// ─── Hoist mock vars ──────────────────────────────────────────────────────────

const { mockGetStateProfile, mockGetScoreByState, mockVerifyAdminToken } = vi.hoisted(() => ({
  mockGetStateProfile: vi.fn(),
  mockGetScoreByState: vi.fn(),
  mockVerifyAdminToken: vi.fn(),
}));

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/lib/states', () => ({
  getStateProfile: mockGetStateProfile,
  getScoreByState: mockGetScoreByState,
}));

vi.mock('@/lib/admin-auth', () => ({
  verifyAdminToken: mockVerifyAdminToken,
  ADMIN_TOKEN_COOKIE: 'admin_token',
}));

// ─── Import AFTER mocking ─────────────────────────────────────────────────────

import { GET } from './route';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(withCookie = true): NextRequest {
  return new NextRequest('http://localhost/api/admin/states/CA', {
    method: 'GET',
    headers: withCookie ? { Cookie: 'admin_token=valid-token' } : {},
  });
}

function makeParams(stateCode = 'CA'): { params: Promise<{ stateCode: string }> } {
  return { params: Promise.resolve({ stateCode }) };
}

const MOCK_PROFILE = {
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
};

const MOCK_SCORE = {
  stateCode: 'CA',
  score: 85,
  breakdown: { demographics: 90, trendActivity: 80, ecommerceIndex: 88, incomeIndex: 90 },
  topCategories: ['electronics', 'fashion'],
  computedAt: 1000,
};

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockVerifyAdminToken.mockResolvedValue({ role: 'admin', iat: 0, exp: 9_999_999_999 });
  mockGetStateProfile.mockReturnValue(MOCK_PROFILE);
  mockGetScoreByState.mockReturnValue(MOCK_SCORE);
});

afterEach(() => {
  vi.clearAllMocks();
});

// ─── Auth ─────────────────────────────────────────────────────────────────────

describe('GET /api/admin/states/[stateCode] — auth', () => {
  it('returns 401 when no cookie', async () => {
    const res = await GET(makeRequest(false), makeParams());
    expect(res.status).toBe(401);
  });

  it('returns 401 when token invalid', async () => {
    mockVerifyAdminToken.mockResolvedValue(null);
    const res = await GET(makeRequest(), makeParams());
    expect(res.status).toBe(401);
  });
});

// ─── Not Found ────────────────────────────────────────────────────────────────

describe('GET /api/admin/states/[stateCode] — not found', () => {
  it('returns 404 for invalid state code', async () => {
    mockGetStateProfile.mockReturnValue(undefined);
    const res = await GET(makeRequest(), makeParams('ZZ'));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toMatch(/not found/i);
  });
});

// ─── Success ──────────────────────────────────────────────────────────────────

describe('GET /api/admin/states/[stateCode] — success', () => {
  it('returns 200 with profile and score', async () => {
    const res = await GET(makeRequest(), makeParams());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.profile.code).toBe('CA');
    expect(body.score.score).toBe(85);
  });

  it('awaits params correctly (Next.js 16 Promise)', async () => {
    const res = await GET(makeRequest(), makeParams('ca'));
    expect(res.status).toBe(200);
    expect(mockGetStateProfile).toHaveBeenCalledWith('CA');
  });

  it('returns topTrends from score topCategories', async () => {
    const res = await GET(makeRequest(), makeParams());
    const body = await res.json();
    expect(body.topTrends).toHaveLength(2);
    expect(body.topTrends[0].keyword).toBe('electronics');
  });

  it('returns empty researchCandidates', async () => {
    const res = await GET(makeRequest(), makeParams());
    const body = await res.json();
    expect(body.researchCandidates).toEqual([]);
  });

  it('returns default score when no score exists', async () => {
    mockGetScoreByState.mockReturnValue(undefined);
    const res = await GET(makeRequest(), makeParams());
    const body = await res.json();
    expect(body.score.score).toBe(0);
    expect(body.score.topCategories).toEqual([]);
  });

  it('returns 500 when getStateProfile throws', async () => {
    mockGetStateProfile.mockImplementation(() => {
      throw new Error('err');
    });
    const res = await GET(makeRequest(), makeParams());
    expect(res.status).toBe(500);
  });
});
