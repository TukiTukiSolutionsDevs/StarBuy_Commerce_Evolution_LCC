/**
 * Integration tests — GET /api/admin/states/compare
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

function makeRequest(query = '', withCookie = true): NextRequest {
  return new NextRequest(`http://localhost/api/admin/states/compare${query}`, {
    method: 'GET',
    headers: withCookie ? { Cookie: 'admin_token=valid-token' } : {},
  });
}

function makeProfile(code: string) {
  return {
    code,
    name: `State ${code}`,
    region: 'West',
    population: 1000000,
    medianIncome: 60000,
    urbanizationPct: 80,
    gdpBillions: 100,
    ecommerceIndex: 70,
    ageDistribution: { under18: 22, age18to34: 22, age35to54: 26, age55plus: 30 },
    dataYear: 2023,
  };
}

function makeScore(code: string) {
  return {
    stateCode: code,
    score: 75,
    breakdown: { demographics: 25, trendActivity: 25, ecommerceIndex: 15, incomeIndex: 10 },
    topCategories: ['electronics'],
    computedAt: 1000,
  };
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockVerifyAdminToken.mockResolvedValue({ role: 'admin', iat: 0, exp: 9_999_999_999 });
  mockGetStateProfile.mockImplementation((code: string) => makeProfile(code));
  mockGetScoreByState.mockImplementation((code: string) => makeScore(code));
});

afterEach(() => {
  vi.clearAllMocks();
});

// ─── Auth ─────────────────────────────────────────────────────────────────────

describe('GET /api/admin/states/compare — auth', () => {
  it('returns 401 when no cookie', async () => {
    const res = await GET(makeRequest('?codes=CA,TX', false));
    expect(res.status).toBe(401);
  });

  it('returns 401 when token invalid', async () => {
    mockVerifyAdminToken.mockResolvedValue(null);
    const res = await GET(makeRequest('?codes=CA,TX'));
    expect(res.status).toBe(401);
  });
});

// ─── Validation ───────────────────────────────────────────────────────────────

describe('GET /api/admin/states/compare — validation', () => {
  it('returns 400 when codes param is missing', async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/codes/i);
  });

  it('returns 400 when only 1 code', async () => {
    const res = await GET(makeRequest('?codes=CA'));
    expect(res.status).toBe(400);
  });

  it('returns 400 when more than 3 codes', async () => {
    const res = await GET(makeRequest('?codes=CA,TX,NY,FL'));
    expect(res.status).toBe(400);
  });

  it('returns 404 when a state code is invalid', async () => {
    mockGetStateProfile.mockImplementation((code: string) =>
      code === 'ZZ' ? undefined : makeProfile(code),
    );
    const res = await GET(makeRequest('?codes=CA,ZZ'));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toMatch(/ZZ/);
  });
});

// ─── Success ──────────────────────────────────────────────────────────────────

describe('GET /api/admin/states/compare — success', () => {
  it('returns 200 with 2 states', async () => {
    const res = await GET(makeRequest('?codes=CA,TX'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.states).toHaveLength(2);
  });

  it('returns 200 with 3 states', async () => {
    const res = await GET(makeRequest('?codes=CA,TX,NY'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.states).toHaveLength(3);
  });

  it('normalizes codes to uppercase', async () => {
    const res = await GET(makeRequest('?codes=ca,tx'));
    expect(res.status).toBe(200);
    expect(mockGetStateProfile).toHaveBeenCalledWith('CA');
    expect(mockGetStateProfile).toHaveBeenCalledWith('TX');
  });

  it('each state has profile and opportunityScore', async () => {
    const res = await GET(makeRequest('?codes=CA,TX'));
    const body = await res.json();
    for (const state of body.states) {
      expect(state.code).toBeDefined();
      expect(state.opportunityScore).toBeDefined();
      expect(state.opportunityScore.score).toBe(75);
    }
  });

  it('returns default score when no score exists', async () => {
    mockGetScoreByState.mockReturnValue(undefined);
    const res = await GET(makeRequest('?codes=CA,TX'));
    const body = await res.json();
    expect(body.states[0].opportunityScore.score).toBe(0);
  });
});
