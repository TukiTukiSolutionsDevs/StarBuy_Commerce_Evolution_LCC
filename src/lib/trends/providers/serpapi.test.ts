// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SerpApiProvider } from './serpapi';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('../api-keys', () => ({
  getApiKey: vi.fn(() => 'test-serpapi-key-12345'),
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

function makeTimeseriesResponse(values: number[] = [40, 55, 60, 70, 75]) {
  return {
    interest_over_time: {
      timeline_data: values.map((v) => ({
        values: [{ extracted_value: v }],
      })),
    },
  };
}

function makeRelatedQueriesResponse(queries: string[] = ['related product', 'trending item']) {
  return {
    related_queries: {
      rising: queries.map((q) => ({ query: q })),
      top: [],
    },
  };
}

function mockFetchError(status: number) {
  return Promise.resolve({
    ok: false,
    status,
    json: () => Promise.resolve({}),
  } as Response);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('SerpApiProvider', () => {
  let provider: SerpApiProvider;

  beforeEach(() => {
    provider = new SerpApiProvider();
    mockFetch.mockReset();
  });

  // Identity
  describe('identity', () => {
    it('has correct id', () => expect(provider.id).toBe('serpapi'));
    it('has correct reliability', () => expect(provider.reliability).toBe('HIGH'));
    it('has a name', () => expect(provider.name.length).toBeGreaterThan(0));
  });

  // searchTrend
  describe('searchTrend', () => {
    it('returns TrendResult[] with correct shape for a single keyword', async () => {
      // First call: TIMESERIES, second call: RELATED_QUERIES
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(makeTimeseriesResponse([50, 60, 70, 80, 90])),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve(makeRelatedQueriesResponse(['wireless earbuds', 'smart speaker'])),
        } as Response);

      const results = await provider.searchTrend(['smartwatch']);

      expect(results).toHaveLength(1);
      const r = results[0];
      expect(r.keyword).toBe('smartwatch');
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(r.score).toBeLessThanOrEqual(100);
      expect(r.source).toBe('serpapi');
      expect(r.timestamp).toBeGreaterThan(0);
      expect(Array.isArray(r.relatedKeywords)).toBe(true);
      expect(r.metadata.confidence).toBe(0.9);
      expect(r.metadata.searchVolume).toBeDefined();
    });

    it('returns results for multiple keywords', async () => {
      // 2 keywords × 2 calls each = 4 fetch calls
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(makeTimeseriesResponse()),
      } as Response);

      const results = await provider.searchTrend(['yoga mat', 'resistance bands']);
      expect(results).toHaveLength(2);
      expect(results[0].keyword).toBe('yoga mat');
      expect(results[1].keyword).toBe('resistance bands');
    });

    it('derives state from time series delta — rising', async () => {
      // Last value much higher than previous → rising
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(makeTimeseriesResponse([40, 40, 40, 40, 90])),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(makeRelatedQueriesResponse()),
        } as Response);

      const results = await provider.searchTrend(['trending item']);
      expect(['rising', 'peak']).toContain(results[0].state);
    });

    it('derives state — declining when last value drops sharply', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(makeTimeseriesResponse([90, 90, 90, 90, 10])),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(makeRelatedQueriesResponse()),
        } as Response);

      const results = await provider.searchTrend(['fading item']);
      expect(results[0].state).toBe('declining');
    });

    it('returns empty array on HTTP error — does not throw', async () => {
      mockFetch.mockResolvedValue(mockFetchError(500));
      const results = await provider.searchTrend(['error keyword']);
      expect(results).toEqual([]);
    });

    it('returns empty array on network error — does not throw', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));
      const results = await provider.searchTrend(['fail']);
      expect(results).toEqual([]);
    });

    it('returns partial results if one keyword fails', async () => {
      let callCount = 0;
      mockFetch.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // First keyword TIMESERIES → success
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve(makeTimeseriesResponse()),
          } as Response);
        } else if (callCount === 2) {
          // First keyword RELATED_QUERIES → success
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve(makeRelatedQueriesResponse()),
          } as Response);
        }
        // Second keyword → fail
        return Promise.reject(new Error('fail'));
      });

      const results = await provider.searchTrend(['ok keyword', 'bad keyword']);
      expect(results).toHaveLength(1);
      expect(results[0].keyword).toBe('ok keyword');
    });

    it('returns cached results without calling fetch', async () => {
      const { getCached } = await import('../store');
      vi.mocked(getCached).mockReturnValueOnce([
        {
          keyword: 'cached kw',
          score: 77,
          state: 'stable',
          timestamp: Date.now(),
          source: 'serpapi',
          relatedKeywords: [],
          metadata: { confidence: 0.9 },
        },
      ]);

      const results = await provider.searchTrend(['cached kw']);
      expect(results).toHaveLength(1);
      expect(results[0].score).toBe(77);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('handles missing interest_over_time — returns score 50', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({}), // no interest_over_time
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(makeRelatedQueriesResponse()),
        } as Response);

      const results = await provider.searchTrend(['no data keyword']);
      expect(results).toHaveLength(1);
      expect(results[0].score).toBe(50);
      expect(results[0].state).toBe('unknown');
    });

    it('related keywords are limited to 10', async () => {
      const manyQueries = Array.from({ length: 20 }, (_, i) => `query ${i}`);
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(makeTimeseriesResponse()),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(makeRelatedQueriesResponse(manyQueries)),
        } as Response);

      const results = await provider.searchTrend(['keyword']);
      expect(results[0].relatedKeywords.length).toBeLessThanOrEqual(10);
    });

    it('related queries failure does not break searchTrend', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(makeTimeseriesResponse()),
        } as Response)
        .mockRejectedValueOnce(new Error('related queries failed'));

      const results = await provider.searchTrend(['keyword']);
      expect(results).toHaveLength(1);
      expect(results[0].relatedKeywords).toEqual([]);
    });
  });

  // getCategoryTrends
  describe('getCategoryTrends', () => {
    it('returns results for a known category', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(makeTimeseriesResponse()),
      } as Response);

      const results = await provider.getCategoryTrends('electronics');
      expect(Array.isArray(results)).toBe(true);
      // At most 5 keywords → at most 5 results
      expect(results.length).toBeLessThanOrEqual(5);
    });

    it('returns empty array for unknown category', async () => {
      const results = await provider.getCategoryTrends('nonexistent-category');
      expect(results).toEqual([]);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  // getRelatedKeywords
  describe('getRelatedKeywords', () => {
    it('returns combined rising + top queries deduped', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            related_queries: {
              rising: [{ query: 'rising kw' }, { query: 'shared kw' }],
              top: [{ query: 'top kw' }, { query: 'shared kw' }],
            },
          }),
      } as Response);

      const keywords = await provider.getRelatedKeywords('test');
      expect(keywords).toContain('rising kw');
      expect(keywords).toContain('top kw');
      expect(keywords).toContain('shared kw');
      // deduped — 'shared kw' appears once
      expect(keywords.filter((k) => k === 'shared kw')).toHaveLength(1);
    });

    it('returns empty array on error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('network fail'));
      const keywords = await provider.getRelatedKeywords('fail');
      expect(keywords).toEqual([]);
    });
  });

  // testConnection
  describe('testConnection', () => {
    it('returns ok=true when interest_over_time is present', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ interest_over_time: { timeline_data: [] } }),
      } as Response);

      const result = await provider.testConnection();
      expect(result.provider).toBe('serpapi');
      expect(result.ok).toBe(true);
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it('returns ok=false when interest_over_time is missing', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ some_other_field: true }),
      } as Response);

      const result = await provider.testConnection();
      expect(result.ok).toBe(false);
    });

    it('returns ok=false on HTTP error', async () => {
      mockFetch.mockResolvedValueOnce(mockFetchError(401));
      const result = await provider.testConnection();
      expect(result.ok).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('returns ok=false on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('timeout'));
      const result = await provider.testConnection();
      expect(result.ok).toBe(false);
      expect(result.error).toBe('timeout');
    });

    it('populates latencyMs', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ interest_over_time: {} }),
      } as Response);

      const result = await provider.testConnection();
      expect(typeof result.latencyMs).toBe('number');
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    });
  });
});
