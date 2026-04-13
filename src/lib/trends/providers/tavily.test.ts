// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TavilyProvider } from './tavily';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/lib/ai/api-keys', () => ({
  getApiKey: vi.fn((key: string) => (key === 'tavily' ? 'test-tavily-key-12345' : undefined)),
}));

vi.mock('../config', () => ({
  readConfig: vi.fn(() => ({
    activeStrategy: 'smart-merge',
    enabledProviders: ['pytrends', 'tavily'],
    cacheEnabled: false,
    cacheTTL: 21_600_000,
  })),
}));

vi.mock('../store', () => ({
  buildCacheKey: vi.fn(() => 'mock-cache-key'),
  getCached: vi.fn(() => null),
  setCached: vi.fn(),
}));

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// ─── Fixture helpers ─────────────────────────────────────────────────────────

function makeTavilyResponse(answer: string, contents: string[] = []) {
  return {
    answer,
    results: contents.map((content) => ({ content, url: 'https://example.com' })),
  };
}

function mockJsonResponse(data: unknown) {
  return Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve(data),
  } as Response);
}

function mockErrorResponse(status: number) {
  return Promise.resolve({
    ok: false,
    status,
    json: () => Promise.resolve({}),
  } as Response);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('TavilyProvider', () => {
  let provider: TavilyProvider;

  beforeEach(() => {
    provider = new TavilyProvider();
    mockFetch.mockReset();
  });

  // Identity
  describe('identity', () => {
    it('has correct id', () => expect(provider.id).toBe('tavily'));
    it('has correct reliability', () => expect(provider.reliability).toBe('MEDIUM'));
    it('has a name', () => expect(provider.name.length).toBeGreaterThan(0));
  });

  // searchTrend
  describe('searchTrend', () => {
    it('returns TrendResult[] with correct shape', async () => {
      mockFetch.mockResolvedValueOnce(
        mockJsonResponse(
          makeTavilyResponse('This product is rising in popularity and trending up in 2025', [
            'Great demand for this product is growing',
          ]),
        ),
      );

      const results = await provider.searchTrend(['smartwatch']);

      expect(results).toHaveLength(1);
      const r = results[0];
      expect(r.keyword).toBe('smartwatch');
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(r.score).toBeLessThanOrEqual(100);
      expect(r.source).toBe('tavily');
      expect(r.timestamp).toBeGreaterThan(0);
      expect(Array.isArray(r.relatedKeywords)).toBe(true);
      expect(r.metadata.confidence).toBe(0.4);
    });

    it('parses "rising" signal → score 75 and state rising', async () => {
      mockFetch.mockResolvedValueOnce(
        mockJsonResponse(makeTavilyResponse('This item is rising in popularity')),
      );

      const results = await provider.searchTrend(['hot product']);
      expect(results[0].score).toBe(75);
      expect(results[0].state).toBe('rising');
    });

    it('parses "declining" signal → score 28 and state declining', async () => {
      mockFetch.mockResolvedValueOnce(
        mockJsonResponse(makeTavilyResponse('This category is declining and saturated')),
      );

      const results = await provider.searchTrend(['old product']);
      expect(results[0].score).toBe(28);
      expect(results[0].state).toBe('declining');
    });

    it('parses "stable" signal → score 52 and state stable', async () => {
      mockFetch.mockResolvedValueOnce(
        mockJsonResponse(makeTavilyResponse('Sales have been stable and consistent')),
      );

      const results = await provider.searchTrend(['steady product']);
      expect(results[0].score).toBe(52);
      expect(results[0].state).toBe('stable');
    });

    it('defaults to score 50 and state unknown when no signal detected', async () => {
      mockFetch.mockResolvedValueOnce(
        mockJsonResponse(makeTavilyResponse('Some neutral text about a product')),
      );

      const results = await provider.searchTrend(['neutral product']);
      expect(results[0].score).toBe(50);
      expect(results[0].state).toBe('unknown');
    });

    it('extracts related keywords from answer and result content', async () => {
      mockFetch.mockResolvedValueOnce(
        mockJsonResponse(
          makeTavilyResponse(
            'Smartwatch devices are rising with fitness tracking wearable technology',
            ['Fitness tracking devices smartwatch technology growing demand wearables'],
          ),
        ),
      );

      const results = await provider.searchTrend(['smartwatch']);
      expect(results[0].relatedKeywords.length).toBeGreaterThan(0);
      expect(results[0].relatedKeywords.length).toBeLessThanOrEqual(10);
    });

    it('returns [] when no API key configured', async () => {
      const { getApiKey } = await import('@/lib/ai/api-keys');
      vi.mocked(getApiKey).mockReturnValueOnce(undefined);

      const results = await provider.searchTrend(['keyword']);
      expect(results).toEqual([]);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('returns empty array on HTTP error — does not throw', async () => {
      mockFetch.mockResolvedValueOnce(mockErrorResponse(500));
      const results = await provider.searchTrend(['error kw']);
      expect(results).toEqual([]);
    });

    it('returns empty array on network error — does not throw', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      const results = await provider.searchTrend(['fail']);
      expect(results).toEqual([]);
    });

    it('returns partial results if one keyword fails', async () => {
      mockFetch
        .mockResolvedValueOnce(mockJsonResponse(makeTavilyResponse('rising and trending')))
        .mockRejectedValueOnce(new Error('fail'));

      const results = await provider.searchTrend(['ok kw', 'bad kw']);
      expect(results).toHaveLength(1);
      expect(results[0].keyword).toBe('ok kw');
    });

    it('uses cache hit without calling fetch', async () => {
      const { getCached } = await import('../store');
      vi.mocked(getCached).mockReturnValueOnce([
        {
          keyword: 'cached',
          score: 60,
          state: 'stable',
          timestamp: Date.now(),
          source: 'tavily',
          relatedKeywords: [],
          metadata: { confidence: 0.4 },
        },
      ]);

      const results = await provider.searchTrend(['cached']);
      expect(results[0].score).toBe(60);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('sends correct POST body to Tavily API', async () => {
      mockFetch.mockResolvedValueOnce(mockJsonResponse(makeTavilyResponse('rising')));

      await provider.searchTrend(['yoga mat']);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.tavily.com/search',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-tavily-key-12345',
          }),
        }),
      );

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body as string);
      expect(callBody.query).toContain('yoga mat');
      expect(callBody.include_answer).toBe(true);
    });
  });

  // getCategoryTrends
  describe('getCategoryTrends', () => {
    it('returns results for a known category', async () => {
      mockFetch.mockResolvedValueOnce(
        mockJsonResponse(makeTavilyResponse('rising demand for electronics')),
      );

      const results = await provider.getCategoryTrends('electronics');
      expect(results).toHaveLength(1);
      expect(results[0].source).toBe('tavily');
    });

    it('returns [] for unknown category', async () => {
      const results = await provider.getCategoryTrends('nonexistent');
      expect(results).toEqual([]);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('returns [] when no API key', async () => {
      const { getApiKey } = await import('@/lib/ai/api-keys');
      vi.mocked(getApiKey).mockReturnValueOnce(undefined);

      const results = await provider.getCategoryTrends('electronics');
      expect(results).toEqual([]);
    });

    it('uses category label in search query', async () => {
      mockFetch.mockResolvedValueOnce(mockJsonResponse(makeTavilyResponse('stable')));

      await provider.getCategoryTrends('health');

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body as string);
      expect(callBody.query).toContain('Health & Wellness');
    });
  });

  // getRelatedKeywords
  describe('getRelatedKeywords', () => {
    it('extracts keywords from result content', async () => {
      mockFetch.mockResolvedValueOnce(
        mockJsonResponse({
          results: [
            { content: 'Fitness tracker smartwatch wearable technology health monitoring devices' },
            { content: 'Sleep tracking heart rate monitoring workout sports activity tracker' },
          ],
        }),
      );

      const keywords = await provider.getRelatedKeywords('smartwatch');
      expect(Array.isArray(keywords)).toBe(true);
      expect(keywords.length).toBeLessThanOrEqual(10);
    });

    it('returns [] when no API key', async () => {
      const { getApiKey } = await import('@/lib/ai/api-keys');
      vi.mocked(getApiKey).mockReturnValueOnce(undefined);

      const keywords = await provider.getRelatedKeywords('test');
      expect(keywords).toEqual([]);
    });

    it('returns [] on error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('fail'));
      const keywords = await provider.getRelatedKeywords('test');
      expect(keywords).toEqual([]);
    });
  });

  // testConnection
  describe('testConnection', () => {
    it('returns ok=true when results array is present', async () => {
      mockFetch.mockResolvedValueOnce(mockJsonResponse({ results: [{ content: 'test result' }] }));

      const result = await provider.testConnection();
      expect(result.provider).toBe('tavily');
      expect(result.ok).toBe(true);
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it('returns ok=false when results is not an array', async () => {
      mockFetch.mockResolvedValueOnce(mockJsonResponse({ results: null }));

      const result = await provider.testConnection();
      expect(result.ok).toBe(false);
    });

    it('returns ok=false with error when no API key', async () => {
      const { getApiKey } = await import('@/lib/ai/api-keys');
      vi.mocked(getApiKey).mockReturnValueOnce(undefined);

      const result = await provider.testConnection();
      expect(result.ok).toBe(false);
      expect(result.error).toMatch(/no api key/i);
      expect(result.latencyMs).toBe(0);
    });

    it('returns ok=false on HTTP error', async () => {
      mockFetch.mockResolvedValueOnce(mockErrorResponse(401));
      const result = await provider.testConnection();
      expect(result.ok).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('returns ok=false on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('request timeout'));
      const result = await provider.testConnection();
      expect(result.ok).toBe(false);
      expect(result.error).toBe('request timeout');
    });

    it('populates latencyMs', async () => {
      mockFetch.mockResolvedValueOnce(mockJsonResponse({ results: [] }));
      const result = await provider.testConnection();
      expect(typeof result.latencyMs).toBe('number');
    });
  });
});
