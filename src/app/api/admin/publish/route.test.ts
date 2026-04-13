/**
 * Integration tests — GET + POST /api/admin/publish
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// ─── Hoist mock vars ──────────────────────────────────────────────────────────

const {
  mockGetAll,
  mockGetByStatus,
  mockAdd,
  mockGetByResearchId,
  mockExecutePipeline,
  mockGetResearchById,
  mockVerifyAdminToken,
} = vi.hoisted(() => ({
  mockGetAll: vi.fn(),
  mockGetByStatus: vi.fn(),
  mockAdd: vi.fn(),
  mockGetByResearchId: vi.fn(),
  mockExecutePipeline: vi.fn(),
  mockGetResearchById: vi.fn(),
  mockVerifyAdminToken: vi.fn(),
}));

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/lib/publish/store', () => ({
  getAll: mockGetAll,
  getByStatus: mockGetByStatus,
  add: mockAdd,
  getByResearchId: mockGetByResearchId,
}));

vi.mock('@/lib/publish/pipeline', () => ({
  executePipeline: mockExecutePipeline,
}));

vi.mock('@/lib/research/store', () => ({
  getById: mockGetResearchById,
}));

vi.mock('@/lib/admin-auth', () => ({
  verifyAdminToken: mockVerifyAdminToken,
  ADMIN_TOKEN_COOKIE: 'admin_token',
}));

// ─── Import AFTER mocking ─────────────────────────────────────────────────────

import { GET, POST } from './route';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeGetRequest(query = '', withCookie = true): NextRequest {
  return new NextRequest(`http://localhost/api/admin/publish${query}`, {
    method: 'GET',
    headers: withCookie ? { Cookie: 'admin_token=valid-token' } : {},
  });
}

function makePostRequest(body: unknown, withCookie = true): NextRequest {
  return new NextRequest('http://localhost/api/admin/publish', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
      ...(withCookie ? { Cookie: 'admin_token=valid-token' } : {}),
    },
  });
}

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
  title: 'wireless mouse',
  salePrice: 20,
  costPrice: 5,
  status: 'saved',
};

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockVerifyAdminToken.mockResolvedValue({ role: 'admin', iat: 0, exp: 9_999_999_999 });
  mockGetAll.mockReturnValue([MOCK_RECORD]);
  mockGetByStatus.mockReturnValue([MOCK_RECORD]);
  mockAdd.mockReturnValue(MOCK_RECORD);
  mockGetByResearchId.mockReturnValue(undefined);
  mockGetResearchById.mockReturnValue(MOCK_RESEARCH);
  mockExecutePipeline.mockResolvedValue({ success: true, recordId: 'rec-1' });
});

afterEach(() => {
  vi.clearAllMocks();
});

// ─── GET — Auth ───────────────────────────────────────────────────────────────

describe('GET /api/admin/publish — auth', () => {
  it('returns 401 when no cookie', async () => {
    const res = await GET(makeGetRequest('', false));
    expect(res.status).toBe(401);
  });

  it('returns 401 when token invalid', async () => {
    mockVerifyAdminToken.mockResolvedValue(null);
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('Unauthorized');
  });
});

// ─── GET — List ───────────────────────────────────────────────────────────────

describe('GET /api/admin/publish — list', () => {
  it('returns 200 with records array', async () => {
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(200);
    const body = (await res.json()) as { records: unknown[] };
    expect(body.records).toHaveLength(1);
  });

  it('calls getAll when no status filter', async () => {
    await GET(makeGetRequest());
    expect(mockGetAll).toHaveBeenCalled();
    expect(mockGetByStatus).not.toHaveBeenCalled();
  });

  it('calls getByStatus when ?status=published', async () => {
    await GET(makeGetRequest('?status=published'));
    expect(mockGetByStatus).toHaveBeenCalledWith('published');
    expect(mockGetAll).not.toHaveBeenCalled();
  });

  it('falls back to getAll for invalid status values', async () => {
    await GET(makeGetRequest('?status=unknown'));
    expect(mockGetAll).toHaveBeenCalled();
    expect(mockGetByStatus).not.toHaveBeenCalled();
  });

  it('returns 500 when store throws', async () => {
    mockGetAll.mockImplementation(() => {
      throw new Error('disk error');
    });
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(500);
  });
});

// ─── POST — Auth ──────────────────────────────────────────────────────────────

describe('POST /api/admin/publish — auth', () => {
  it('returns 401 when no cookie', async () => {
    const res = await POST(makePostRequest({ researchId: 'res-1' }, false));
    expect(res.status).toBe(401);
  });

  it('returns 401 when token invalid', async () => {
    mockVerifyAdminToken.mockResolvedValue(null);
    const res = await POST(makePostRequest({ researchId: 'res-1' }));
    expect(res.status).toBe(401);
  });
});

// ─── POST — Validation ────────────────────────────────────────────────────────

describe('POST /api/admin/publish — validation', () => {
  it('returns 400 when researchId is missing', async () => {
    const res = await POST(makePostRequest({}));
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/researchId/);
  });

  it('returns 400 when researchId is empty string', async () => {
    const res = await POST(makePostRequest({ researchId: '  ' }));
    expect(res.status).toBe(400);
  });

  it('returns 404 when research item not found', async () => {
    mockGetResearchById.mockReturnValue(undefined);
    const res = await POST(makePostRequest({ researchId: 'missing' }));
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/not found/);
  });

  it('returns 400 when research item already has active publish record', async () => {
    mockGetByResearchId.mockReturnValue({ ...MOCK_RECORD, status: 'published' });
    const res = await POST(makePostRequest({ researchId: 'res-1' }));
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/already published or in progress/);
  });

  it('allows publish when existing record is failed', async () => {
    mockGetByResearchId.mockReturnValue({ ...MOCK_RECORD, status: 'failed' });
    const res = await POST(makePostRequest({ researchId: 'res-1' }));
    expect(res.status).toBe(201);
  });

  it('allows publish when existing record is archived', async () => {
    mockGetByResearchId.mockReturnValue({ ...MOCK_RECORD, status: 'archived' });
    const res = await POST(makePostRequest({ researchId: 'res-1' }));
    expect(res.status).toBe(201);
  });
});

// ─── POST — Success ───────────────────────────────────────────────────────────

describe('POST /api/admin/publish — success', () => {
  it('returns 201 with the created record', async () => {
    const res = await POST(makePostRequest({ researchId: 'res-1' }));
    expect(res.status).toBe(201);
    const body = (await res.json()) as { record: typeof MOCK_RECORD };
    expect(body.record).toMatchObject({ id: 'rec-1', researchId: 'res-1' });
  });

  it('calls add with the researchId', async () => {
    await POST(makePostRequest({ researchId: 'res-1' }));
    expect(mockAdd).toHaveBeenCalledWith(expect.objectContaining({ researchId: 'res-1' }));
  });

  it('triggers executePipeline with the record id', async () => {
    await POST(makePostRequest({ researchId: 'res-1' }));
    await Promise.resolve();
    expect(mockExecutePipeline).toHaveBeenCalledWith('rec-1');
  });

  it('returns 500 when add throws', async () => {
    mockAdd.mockImplementation(() => {
      throw new Error('capacity');
    });
    const res = await POST(makePostRequest({ researchId: 'res-1' }));
    expect(res.status).toBe(500);
  });
});
