/**
 * Integration tests — POST /api/admin/trends/search
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// ─── Hoist mock vars ─────────────────────────────────────────────────────────

const { mockSearchTrends, mockReadConfig, mockVerifyAdminToken } = vi.hoisted(() => ({
  mockSearchTrends: vi.fn(),
  mockReadConfig: vi.fn(),
  mockVerifyAdminToken: vi.fn(),
}));

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('@/lib/trends', () => ({
  searchTrends: mockSearchTrends,
  readConfig: mockReadConfig,
}));

vi.mock('@/lib/admin-auth', () => ({
  verifyAdminToken: mockVerifyAdminToken,
  ADMIN_TOKEN_COOKIE: 'admin_token',
}));

// ─── Import AFTER mocking ─────────────────────────────────────────────────────

import { POST } from './route';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeRequest(body: unknown, withCookie = true): NextRequest {
  return new NextRequest('http://localhost/api/admin/trends/search', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
      ...(withCookie ? { Cookie: 'admin_token=valid-token' } : {}),
    },
  });
}

const MOCK_RESULT = {
  keyword: 'wireless headphones',
  score: 78,
  state: 'rising' as const,
  timestamp: Date.now(),
  sources: ['serpapi', 'pytrends'],
  relatedKeywords: ['bluetooth headphones', 'noise cancelling'],
  metadata: { confidence: 0.85 },
};

// ─── Setup ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockVerifyAdminToken.mockResolvedValue({ role: 'admin', iat: 0, exp: 9_999_999_999 });
  mockSearchTrends.mockResolvedValue([MOCK_RESULT]);
  mockReadConfig.mockReturnValue({
    activeStrategy: 'smart-merge',
    enabledProviders: ['serpapi', 'pytrends'],
    cacheEnabled: true,
    cacheTTL: 21_600_000,
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

// ─── Auth ────────────────────────────────────────────────────────────────────

describe('POST /api/admin/trends/search — auth', () => {
  it('returns 401 when no cookie', async () => {
    const res = await POST(
      makeRequest({ keywords: ['test'] }, false) as Parameters<typeof POST>[0],
    );
    expect(res.status).toBe(401);
  });

  it('returns 401 when token invalid', async () => {
    mockVerifyAdminToken.mockResolvedValue(null);
    const res = await POST(makeRequest({ keywords: ['test'] }) as Parameters<typeof POST>[0]);
    expect(res.status).toBe(401);
  });

  it('returns { error: "Unauthorized" }', async () => {
    mockVerifyAdminToken.mockResolvedValue(null);
    const res = await POST(makeRequest({ keywords: ['test'] }) as Parameters<typeof POST>[0]);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('Unauthorized');
  });
});

// ─── Validation ──────────────────────────────────────────────────────────────

describe('POST /api/admin/trends/search — validation', () => {
  it('returns 400 when keywords missing', async () => {
    const res = await POST(makeRequest({}) as Parameters<typeof POST>[0]);
    expect(res.status).toBe(400);
  });

  it('returns 400 when keywords is empty array', async () => {
    const res = await POST(makeRequest({ keywords: [] }) as Parameters<typeof POST>[0]);
    expect(res.status).toBe(400);
  });

  it('returns 400 when keywords contains non-strings', async () => {
    const res = await POST(makeRequest({ keywords: [1, 2, 3] }) as Parameters<typeof POST>[0]);
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid JSON', async () => {
    const req = new NextRequest('http://localhost/api/admin/trends/search', {
      method: 'POST',
      body: 'not-json',
      headers: { 'Content-Type': 'application/json', Cookie: 'admin_token=valid-token' },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns an error message on bad input', async () => {
    const res = await POST(makeRequest({ keywords: [] }) as Parameters<typeof POST>[0]);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBeTruthy();
  });
});

// ─── Success ─────────────────────────────────────────────────────────────────

describe('POST /api/admin/trends/search — success', () => {
  it('returns 200', async () => {
    const res = await POST(
      makeRequest({ keywords: ['wireless headphones'] }) as Parameters<typeof POST>[0],
    );
    expect(res.status).toBe(200);
  });

  it('returns results, strategy, and providers', async () => {
    const res = await POST(
      makeRequest({ keywords: ['wireless headphones'] }) as Parameters<typeof POST>[0],
    );
    const body = (await res.json()) as {
      results: unknown[];
      strategy: string;
      providers: string[];
    };
    expect(body.results).toHaveLength(1);
    expect(body.strategy).toBe('smart-merge');
    expect(body.providers).toContain('serpapi');
    expect(body.providers).toContain('pytrends');
  });

  it('calls searchTrends with provided keywords', async () => {
    await POST(makeRequest({ keywords: ['test1', 'test2'] }) as Parameters<typeof POST>[0]);
    expect(mockSearchTrends).toHaveBeenCalledWith(['test1', 'test2'], expect.objectContaining({}));
  });

  it('maps state → region', async () => {
    await POST(makeRequest({ keywords: ['shoes'], state: 'CA' }) as Parameters<typeof POST>[0]);
    expect(mockSearchTrends).toHaveBeenCalledWith(
      ['shoes'],
      expect.objectContaining({ region: 'CA' }),
    );
  });

  it('maps category → categoryId', async () => {
    await POST(
      makeRequest({ keywords: ['shoes'], category: 'footwear' }) as Parameters<typeof POST>[0],
    );
    expect(mockSearchTrends).toHaveBeenCalledWith(
      ['shoes'],
      expect.objectContaining({ categoryId: 'footwear' }),
    );
  });

  it('deduplicates providers across results', async () => {
    mockSearchTrends.mockResolvedValue([
      { ...MOCK_RESULT, keyword: 'a', sources: ['serpapi', 'pytrends'] },
      { ...MOCK_RESULT, keyword: 'b', sources: ['serpapi'] },
    ]);
    const res = await POST(makeRequest({ keywords: ['a', 'b'] }) as Parameters<typeof POST>[0]);
    const body = (await res.json()) as { providers: string[] };
    expect(new Set(body.providers).size).toBe(body.providers.length);
  });

  it('returns empty results when searchTrends returns []', async () => {
    mockSearchTrends.mockResolvedValue([]);
    const res = await POST(makeRequest({ keywords: ['x'] }) as Parameters<typeof POST>[0]);
    const body = (await res.json()) as { results: unknown[]; providers: string[] };
    expect(res.status).toBe(200);
    expect(body.results).toHaveLength(0);
    expect(body.providers).toHaveLength(0);
  });

  it('ignores non-string state/category', async () => {
    const res = await POST(
      makeRequest({ keywords: ['test'], state: 123, category: null }) as Parameters<typeof POST>[0],
    );
    expect(res.status).toBe(200);
    expect(mockSearchTrends).toHaveBeenCalledWith(
      ['test'],
      expect.objectContaining({ region: undefined, categoryId: undefined }),
    );
  });
});

// ─── Error ───────────────────────────────────────────────────────────────────

describe('POST /api/admin/trends/search — error', () => {
  it('returns 500 when searchTrends throws', async () => {
    mockSearchTrends.mockRejectedValue(new Error('down'));
    const res = await POST(makeRequest({ keywords: ['test'] }) as Parameters<typeof POST>[0]);
    expect(res.status).toBe(500);
  });

  it('returns { error } body on 500', async () => {
    mockSearchTrends.mockRejectedValue(new Error('network failure'));
    const res = await POST(makeRequest({ keywords: ['test'] }) as Parameters<typeof POST>[0]);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBeTruthy();
  });
});
