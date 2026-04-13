/**
 * Integration tests — POST /api/admin/publish/batch
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// ─── Hoist mock vars ──────────────────────────────────────────────────────────

const { mockBatchPublish, mockVerifyAdminToken } = vi.hoisted(() => ({
  mockBatchPublish: vi.fn(),
  mockVerifyAdminToken: vi.fn(),
}));

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/lib/publish/batch', () => ({ batchPublish: mockBatchPublish }));
vi.mock('@/lib/admin-auth', () => ({
  verifyAdminToken: mockVerifyAdminToken,
  ADMIN_TOKEN_COOKIE: 'admin_token',
}));

// ─── Import AFTER mocking ─────────────────────────────────────────────────────

import { POST } from './route';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const makeRequest = (body: unknown, withCookie = true) =>
  new NextRequest('http://localhost/api/admin/publish/batch', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
      ...(withCookie ? { Cookie: 'admin_token=valid-token' } : {}),
    },
  });

const MOCK_RESULT = { batchId: 'batch-uuid', total: 2, succeeded: 2, failed: 0, results: [] };

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockVerifyAdminToken.mockResolvedValue({ role: 'admin', iat: 0, exp: 9_999_999_999 });
  mockBatchPublish.mockResolvedValue(MOCK_RESULT);
});

afterEach(() => vi.clearAllMocks());

// ─── Auth ─────────────────────────────────────────────────────────────────────

describe('POST /api/admin/publish/batch — auth', () => {
  it('returns 401 when no cookie', async () => {
    const res = await POST(makeRequest({ ids: ['res-1'] }, false));
    expect(res.status).toBe(401);
  });

  it('returns 401 when token invalid', async () => {
    mockVerifyAdminToken.mockResolvedValue(null);
    const res = await POST(makeRequest({ ids: ['res-1'] }));
    expect(res.status).toBe(401);
  });
});

// ─── Validation ───────────────────────────────────────────────────────────────

describe('POST /api/admin/publish/batch — validation', () => {
  it('returns 400 when ids is missing', async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/ids/);
  });

  it('returns 400 when ids is not an array', async () => {
    const res = await POST(makeRequest({ ids: 'res-1' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when ids is an empty array', async () => {
    const res = await POST(makeRequest({ ids: [] }));
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/empty/);
  });

  it('returns 400 when ids exceeds 20 items', async () => {
    const ids = Array.from({ length: 21 }, (_, i) => `res-${i}`);
    const res = await POST(makeRequest({ ids }));
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/exceed/);
  });

  it('allows exactly 20 items', async () => {
    const ids = Array.from({ length: 20 }, (_, i) => `res-${i}`);
    const res = await POST(makeRequest({ ids }));
    expect(res.status).toBe(202);
  });
});

// ─── Success ──────────────────────────────────────────────────────────────────

describe('POST /api/admin/publish/batch — success', () => {
  it('returns 202 with batch result', async () => {
    const res = await POST(makeRequest({ ids: ['res-1', 'res-2'] }));
    expect(res.status).toBe(202);
    const body = (await res.json()) as { result: typeof MOCK_RESULT };
    expect(body.result).toMatchObject({ batchId: 'batch-uuid', total: 2 });
  });

  it('calls batchPublish with the ids array', async () => {
    await POST(makeRequest({ ids: ['res-1', 'res-2'] }));
    expect(mockBatchPublish).toHaveBeenCalledWith(['res-1', 'res-2']);
  });

  it('returns 500 when batchPublish throws', async () => {
    mockBatchPublish.mockRejectedValue(new Error('capacity error'));
    const res = await POST(makeRequest({ ids: ['res-1'] }));
    expect(res.status).toBe(500);
  });
});
