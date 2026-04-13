/**
 * Integration tests — GET + POST /api/admin/research
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// ─── Hoist mock vars ──────────────────────────────────────────────────────────

const { mockGetAll, mockGetByStatus, mockAdd, mockVerifyAdminToken } = vi.hoisted(() => ({
  mockGetAll: vi.fn(),
  mockGetByStatus: vi.fn(),
  mockAdd: vi.fn(),
  mockVerifyAdminToken: vi.fn(),
}));

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/lib/research/store', () => ({
  getAll: mockGetAll,
  getByStatus: mockGetByStatus,
  add: mockAdd,
}));

vi.mock('@/lib/admin-auth', () => ({
  verifyAdminToken: mockVerifyAdminToken,
  ADMIN_TOKEN_COOKIE: 'admin_token',
}));

// ─── Import AFTER mocking ─────────────────────────────────────────────────────

import { GET, POST } from './route';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeGetRequest(query = '', withCookie = true): NextRequest {
  return new NextRequest(`http://localhost/api/admin/research${query}`, {
    method: 'GET',
    headers: withCookie ? { Cookie: 'admin_token=valid-token' } : {},
  });
}

function makePostRequest(body: unknown, withCookie = true): NextRequest {
  return new NextRequest('http://localhost/api/admin/research', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
      ...(withCookie ? { Cookie: 'admin_token=valid-token' } : {}),
    },
  });
}

const MOCK_ITEM = {
  id: 'abc-123',
  keyword: 'wireless mouse',
  title: 'wireless mouse',
  trendScore: 75,
  trendState: 'rising',
  sources: ['serpapi'],
  relatedKeywords: ['bluetooth mouse'],
  costPrice: 5,
  salePrice: 20,
  marginPercent: 75,
  aiScore: 70,
  aiScoreBreakdown: { trend: 30, margin: 22, competition: 10, volume: 8 },
  aiScoreLabel: 'Good',
  status: 'candidate',
  addedAt: 1000,
  updatedAt: 1000,
};

const VALID_INPUT = {
  keyword: 'wireless mouse',
  trendScore: 75,
  trendState: 'rising',
  sources: ['serpapi'],
  relatedKeywords: ['bluetooth mouse'],
  costPrice: 5,
  salePrice: 20,
};

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockVerifyAdminToken.mockResolvedValue({ role: 'admin', iat: 0, exp: 9_999_999_999 });
  mockGetAll.mockReturnValue([MOCK_ITEM]);
  mockGetByStatus.mockReturnValue([MOCK_ITEM]);
  mockAdd.mockReturnValue(MOCK_ITEM);
});

afterEach(() => {
  vi.clearAllMocks();
});

// ─── GET — Auth ───────────────────────────────────────────────────────────────

describe('GET /api/admin/research — auth', () => {
  it('returns 401 when no cookie', async () => {
    const res = await GET(makeGetRequest('', false));
    expect(res.status).toBe(401);
  });

  it('returns 401 when token invalid', async () => {
    mockVerifyAdminToken.mockResolvedValue(null);
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(401);
  });

  it('returns { error: "Unauthorized" }', async () => {
    mockVerifyAdminToken.mockResolvedValue(null);
    const res = await GET(makeGetRequest());
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('Unauthorized');
  });
});

// ─── GET — List ───────────────────────────────────────────────────────────────

describe('GET /api/admin/research — list', () => {
  it('returns 200 with items array', async () => {
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(200);
    const body = (await res.json()) as { items: unknown[] };
    expect(body.items).toHaveLength(1);
  });

  it('calls getAll when no status filter', async () => {
    await GET(makeGetRequest());
    expect(mockGetAll).toHaveBeenCalled();
    expect(mockGetByStatus).not.toHaveBeenCalled();
  });

  it('calls getByStatus when ?status=candidate', async () => {
    await GET(makeGetRequest('?status=candidate'));
    expect(mockGetByStatus).toHaveBeenCalledWith('candidate');
    expect(mockGetAll).not.toHaveBeenCalled();
  });

  it('calls getByStatus when ?status=saved', async () => {
    await GET(makeGetRequest('?status=saved'));
    expect(mockGetByStatus).toHaveBeenCalledWith('saved');
  });

  it('falls back to getAll for invalid status values', async () => {
    await GET(makeGetRequest('?status=invalid'));
    expect(mockGetAll).toHaveBeenCalled();
    expect(mockGetByStatus).not.toHaveBeenCalled();
  });

  it('sorts by aiScore desc when ?sort=aiScore&order=desc', async () => {
    const items = [
      { ...MOCK_ITEM, id: '1', aiScore: 40 },
      { ...MOCK_ITEM, id: '2', aiScore: 80 },
      { ...MOCK_ITEM, id: '3', aiScore: 60 },
    ];
    mockGetAll.mockReturnValue(items);
    const res = await GET(makeGetRequest('?sort=aiScore&order=desc'));
    const body = (await res.json()) as { items: Array<{ aiScore: number }> };
    expect(body.items[0].aiScore).toBe(80);
    expect(body.items[2].aiScore).toBe(40);
  });

  it('sorts by aiScore asc when ?sort=aiScore&order=asc', async () => {
    const items = [
      { ...MOCK_ITEM, id: '1', aiScore: 80 },
      { ...MOCK_ITEM, id: '2', aiScore: 40 },
    ];
    mockGetAll.mockReturnValue(items);
    const res = await GET(makeGetRequest('?sort=aiScore&order=asc'));
    const body = (await res.json()) as { items: Array<{ aiScore: number }> };
    expect(body.items[0].aiScore).toBe(40);
  });

  it('returns 500 when getAll throws', async () => {
    mockGetAll.mockImplementation(() => {
      throw new Error('disk error');
    });
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(500);
  });
});

// ─── POST — Auth ──────────────────────────────────────────────────────────────

describe('POST /api/admin/research — auth', () => {
  it('returns 401 when no cookie', async () => {
    const res = await POST(makePostRequest(VALID_INPUT, false));
    expect(res.status).toBe(401);
  });

  it('returns 401 when token invalid', async () => {
    mockVerifyAdminToken.mockResolvedValue(null);
    const res = await POST(makePostRequest(VALID_INPUT));
    expect(res.status).toBe(401);
  });
});

// ─── POST — Validation ────────────────────────────────────────────────────────

describe('POST /api/admin/research — validation', () => {
  it('returns 400 for invalid JSON', async () => {
    const req = new NextRequest('http://localhost/api/admin/research', {
      method: 'POST',
      body: 'not-json',
      headers: { 'Content-Type': 'application/json', Cookie: 'admin_token=valid-token' },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 when keyword is missing', async () => {
    const res = await POST(makePostRequest({ ...VALID_INPUT, keyword: undefined }));
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/keyword/);
  });

  it('returns 400 when costPrice is 0', async () => {
    const res = await POST(makePostRequest({ ...VALID_INPUT, costPrice: 0 }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when costPrice is negative', async () => {
    const res = await POST(makePostRequest({ ...VALID_INPUT, costPrice: -5 }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when salePrice is 0', async () => {
    const res = await POST(makePostRequest({ ...VALID_INPUT, salePrice: 0 }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when salePrice <= costPrice', async () => {
    const res = await POST(makePostRequest({ ...VALID_INPUT, costPrice: 20, salePrice: 10 }));
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/salePrice/);
  });

  it('returns 400 when salePrice equals costPrice', async () => {
    const res = await POST(makePostRequest({ ...VALID_INPUT, costPrice: 10, salePrice: 10 }));
    expect(res.status).toBe(400);
  });
});

// ─── POST — Success ───────────────────────────────────────────────────────────

describe('POST /api/admin/research — success', () => {
  it('returns 201 on valid input', async () => {
    const res = await POST(makePostRequest(VALID_INPUT));
    expect(res.status).toBe(201);
  });

  it('returns { item } with the created item', async () => {
    const res = await POST(makePostRequest(VALID_INPUT));
    const body = (await res.json()) as { item: typeof MOCK_ITEM };
    expect(body.item).toMatchObject({ id: 'abc-123', keyword: 'wireless mouse' });
  });

  it('calls add with the request body', async () => {
    await POST(makePostRequest(VALID_INPUT));
    expect(mockAdd).toHaveBeenCalledWith(expect.objectContaining({ keyword: 'wireless mouse' }));
  });

  it('returns 500 when add throws', async () => {
    mockAdd.mockImplementation(() => {
      throw new Error('capacity');
    });
    const res = await POST(makePostRequest(VALID_INPUT));
    expect(res.status).toBe(500);
  });
});
