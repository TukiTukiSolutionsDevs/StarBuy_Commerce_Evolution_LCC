/**
 * Integration tests — POST /api/admin/publish/[id]/validate
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// ─── Hoist mock vars ──────────────────────────────────────────────────────────

const {
  mockGetPublishById,
  mockGetResearchById,
  mockValidateForPublish,
  mockIsReadyToPublish,
  mockVerifyAdminToken,
} = vi.hoisted(() => ({
  mockGetPublishById: vi.fn(),
  mockGetResearchById: vi.fn(),
  mockValidateForPublish: vi.fn(),
  mockIsReadyToPublish: vi.fn(),
  mockVerifyAdminToken: vi.fn(),
}));

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/lib/publish/store', () => ({ getById: mockGetPublishById }));
vi.mock('@/lib/research/store', () => ({ getById: mockGetResearchById }));
vi.mock('@/lib/publish/validator', () => ({
  validateForPublish: mockValidateForPublish,
  isReadyToPublish: mockIsReadyToPublish,
}));
vi.mock('@/lib/admin-auth', () => ({
  verifyAdminToken: mockVerifyAdminToken,
  ADMIN_TOKEN_COOKIE: 'admin_token',
}));

// ─── Import AFTER mocking ─────────────────────────────────────────────────────

import { POST } from './route';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ROUTE_PARAMS = { params: Promise.resolve({ id: 'rec-1' }) };

const makeRequest = (withCookie = true) =>
  new NextRequest('http://localhost/api/admin/publish/rec-1/validate', {
    method: 'POST',
    headers: withCookie ? { Cookie: 'admin_token=valid-token' } : {},
  });

const MOCK_RECORD = {
  id: 'rec-1',
  researchId: 'res-1',
  status: 'pending',
  validation: { title: false, description: false, price: false, images: false, errors: [] },
  retryCount: 0,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

const MOCK_RESEARCH = {
  id: 'res-1',
  keyword: 'wireless mouse',
  title: 'Wireless Mouse Pro',
  salePrice: 20,
  costPrice: 5,
  status: 'saved',
};

const MOCK_VALIDATION = { title: true, description: true, price: true, images: true, errors: [] };

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockVerifyAdminToken.mockResolvedValue({ role: 'admin', iat: 0, exp: 9_999_999_999 });
  mockGetPublishById.mockReturnValue(MOCK_RECORD);
  mockGetResearchById.mockReturnValue(MOCK_RESEARCH);
  mockValidateForPublish.mockReturnValue(MOCK_VALIDATION);
  mockIsReadyToPublish.mockReturnValue(true);
});

afterEach(() => vi.clearAllMocks());

// ─── Auth ─────────────────────────────────────────────────────────────────────

describe('POST /api/admin/publish/[id]/validate — auth', () => {
  it('returns 401 when no cookie', async () => {
    const res = await POST(makeRequest(false), ROUTE_PARAMS);
    expect(res.status).toBe(401);
  });

  it('returns 401 when token invalid', async () => {
    mockVerifyAdminToken.mockResolvedValue(null);
    const res = await POST(makeRequest(), ROUTE_PARAMS);
    expect(res.status).toBe(401);
  });
});

// ─── Not found ────────────────────────────────────────────────────────────────

describe('POST /api/admin/publish/[id]/validate — not found', () => {
  it('returns 404 when publish record not found', async () => {
    mockGetPublishById.mockReturnValue(undefined);
    const res = await POST(makeRequest(), ROUTE_PARAMS);
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/not found/);
  });

  it('returns 404 when research item not found', async () => {
    mockGetResearchById.mockReturnValue(undefined);
    const res = await POST(makeRequest(), ROUTE_PARAMS);
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/not found/);
  });
});

// ─── Success ──────────────────────────────────────────────────────────────────

describe('POST /api/admin/publish/[id]/validate — success', () => {
  it('returns 200 with validation and ready:true', async () => {
    const res = await POST(makeRequest(), ROUTE_PARAMS);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { validation: typeof MOCK_VALIDATION; ready: boolean };
    expect(body.validation).toMatchObject(MOCK_VALIDATION);
    expect(body.ready).toBe(true);
  });

  it('returns ready:false when validation fails', async () => {
    mockIsReadyToPublish.mockReturnValue(false);
    const res = await POST(makeRequest(), ROUTE_PARAMS);
    const body = (await res.json()) as { ready: boolean };
    expect(body.ready).toBe(false);
  });

  it('calls validateForPublish with the research item', async () => {
    await POST(makeRequest(), ROUTE_PARAMS);
    expect(mockValidateForPublish).toHaveBeenCalledWith(MOCK_RESEARCH);
  });

  it('calls isReadyToPublish with the validation result', async () => {
    await POST(makeRequest(), ROUTE_PARAMS);
    expect(mockIsReadyToPublish).toHaveBeenCalledWith(MOCK_VALIDATION);
  });

  it('returns 500 when validateForPublish throws', async () => {
    mockValidateForPublish.mockImplementation(() => {
      throw new Error('unexpected');
    });
    const res = await POST(makeRequest(), ROUTE_PARAMS);
    expect(res.status).toBe(500);
  });
});
