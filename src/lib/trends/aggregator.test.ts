/**
 * Aggregator Tests
 *
 * Tests all 3 aggregation strategies using mock providers.
 * No real network calls, no file I/O — all deps mocked.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { searchTrends } from './aggregator';
import { AggregationStrategy } from './types';
import type { TrendProvider, TrendResult, ProviderId } from './types';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('./config', () => ({
  readConfig: vi.fn(),
}));

vi.mock('./store', () => ({
  buildCacheKey: vi.fn(
    (provider: string, keyword: string, region = 'US') => `${provider}:${keyword}:${region}`,
  ),
  getCached: vi.fn(() => null),
  setCached: vi.fn(),
}));

vi.mock('./providers/index', () => ({
  createProvider: vi.fn(),
  getAllProviderIds: vi.fn(() => ['serpapi', 'amazon', 'pytrends', 'tavily', 'meta']),
  PROVIDER_META: {
    serpapi: {
      id: 'serpapi',
      reliability: 'HIGH',
      name: 'SerpAPI',
      requiresKey: true,
      cost: 'paid',
      description: '',
    },
    amazon: {
      id: 'amazon',
      reliability: 'HIGH',
      name: 'Amazon',
      requiresKey: true,
      cost: 'freemium',
      description: '',
    },
    pytrends: {
      id: 'pytrends',
      reliability: 'MEDIUM',
      name: 'PyTrends',
      requiresKey: false,
      cost: 'free',
      description: '',
    },
    tavily: {
      id: 'tavily',
      reliability: 'MEDIUM',
      name: 'Tavily',
      requiresKey: true,
      cost: 'freemium',
      description: '',
    },
    meta: {
      id: 'meta',
      reliability: 'MEDIUM',
      name: 'Meta',
      requiresKey: true,
      cost: 'free',
      description: '',
    },
  },
}));

import { readConfig } from './config';
import { getCached, setCached, buildCacheKey } from './store';
import { createProvider } from './providers/index';

const mockReadConfig = vi.mocked(readConfig);
const mockGetCached = vi.mocked(getCached);
const mockSetCached = vi.mocked(setCached);
const mockBuildCacheKey = vi.mocked(buildCacheKey);
const mockCreateProvider = vi.mocked(createProvider);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeTrendResult(keyword: string, score: number, source: ProviderId): TrendResult {
  return {
    keyword,
    score,
    state: 'stable',
    timestamp: Date.now(),
    source,
    relatedKeywords: [`${keyword}-related`],
    metadata: { confidence: 0.8 },
  };
}

function makeMockProvider(id: ProviderId, results: TrendResult[]): TrendProvider {
  return {
    id,
    name: id,
    reliability: id === 'serpapi' || id === 'amazon' ? 'HIGH' : 'MEDIUM',
    searchTrend: vi.fn().mockResolvedValue(results),
    getCategoryTrends: vi.fn().mockResolvedValue([]),
    getRelatedKeywords: vi.fn().mockResolvedValue([]),
    testConnection: vi.fn().mockResolvedValue({ provider: id, ok: true, latencyMs: 50 }),
  };
}

function makeFailingProvider(id: ProviderId): TrendProvider {
  return {
    id,
    name: id,
    reliability: id === 'serpapi' || id === 'amazon' ? 'HIGH' : 'MEDIUM',
    searchTrend: vi.fn().mockRejectedValue(new Error(`${id} unavailable`)),
    getCategoryTrends: vi.fn().mockRejectedValue(new Error()),
    getRelatedKeywords: vi.fn().mockRejectedValue(new Error()),
    testConnection: vi
      .fn()
      .mockResolvedValue({ provider: id, ok: false, latencyMs: 0, error: 'unavailable' }),
  };
}

const BASE_CONFIG = {
  activeStrategy: AggregationStrategy.SMART_MERGE,
  enabledProviders: ['serpapi', 'pytrends'] as ProviderId[],
  cacheEnabled: false,
  cacheTTL: 3_600_000,
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('searchTrends — SMART_MERGE', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCached.mockReturnValue(null);
    mockBuildCacheKey.mockImplementation(
      (provider: string, keyword: string, region = 'US') => `${provider}:${keyword}:${region}`,
    );
  });

  it('merges results from 2 providers with weighted-average score', async () => {
    // serpapi (HIGH=3): shoes=90 | pytrends (MEDIUM=2): shoes=60
    // expected: (90*3 + 60*2) / 5 = 78
    mockReadConfig.mockReturnValue({ ...BASE_CONFIG });

    const serpapiProvider = makeMockProvider('serpapi', [makeTrendResult('shoes', 90, 'serpapi')]);
    const pytrendsProvider = makeMockProvider('pytrends', [
      makeTrendResult('shoes', 60, 'pytrends'),
    ]);

    mockCreateProvider.mockImplementation((id) => {
      if (id === 'serpapi') return serpapiProvider;
      if (id === 'pytrends') return pytrendsProvider;
      throw new Error(`unexpected: ${id}`);
    });

    const results = await searchTrends(['shoes']);

    expect(results).toHaveLength(1);
    expect(results[0].keyword).toBe('shoes');
    expect(results[0].score).toBe(78); // (90*3 + 60*2) / 5
    expect(results[0].sources).toContain('serpapi');
    expect(results[0].sources).toContain('pytrends');
  });

  it('returns results from the surviving provider when one fails', async () => {
    mockReadConfig.mockReturnValue({ ...BASE_CONFIG });

    const serpapiProvider = makeFailingProvider('serpapi');
    const pytrendsProvider = makeMockProvider('pytrends', [
      makeTrendResult('shoes', 70, 'pytrends'),
    ]);

    mockCreateProvider.mockImplementation((id) => {
      if (id === 'serpapi') return serpapiProvider;
      if (id === 'pytrends') return pytrendsProvider;
      throw new Error(`unexpected: ${id}`);
    });

    const results = await searchTrends(['shoes']);

    expect(results).toHaveLength(1);
    expect(results[0].score).toBe(70);
    expect(results[0].sources).toEqual(['pytrends']);
  });

  it('returns empty array when ALL providers fail', async () => {
    mockReadConfig.mockReturnValue({ ...BASE_CONFIG });

    mockCreateProvider.mockImplementation((id) => makeFailingProvider(id));

    const results = await searchTrends(['shoes']);

    expect(results).toEqual([]);
  });

  it('returns empty array for empty keywords input', async () => {
    mockReadConfig.mockReturnValue({ ...BASE_CONFIG });

    const results = await searchTrends([]);

    expect(results).toEqual([]);
    expect(mockCreateProvider).not.toHaveBeenCalled();
  });

  it('returns empty array when no providers are enabled', async () => {
    mockReadConfig.mockReturnValue({ ...BASE_CONFIG, enabledProviders: [] });

    const results = await searchTrends(['shoes']);

    expect(results).toEqual([]);
    expect(mockCreateProvider).not.toHaveBeenCalled();
  });

  it('deduplicates and merges relatedKeywords across providers (max 10)', async () => {
    mockReadConfig.mockReturnValue({ ...BASE_CONFIG });

    const serpapiResult = makeTrendResult('shoes', 80, 'serpapi');
    serpapiResult.relatedKeywords = ['sneakers', 'boots', 'heels'];

    const pytrendsResult = makeTrendResult('shoes', 70, 'pytrends');
    pytrendsResult.relatedKeywords = ['boots', 'sandals', 'loafers'];

    mockCreateProvider.mockImplementation((id) => {
      if (id === 'serpapi') return makeMockProvider('serpapi', [serpapiResult]);
      return makeMockProvider('pytrends', [pytrendsResult]);
    });

    const results = await searchTrends(['shoes']);

    expect(results[0].relatedKeywords).toContain('sneakers');
    expect(results[0].relatedKeywords).toContain('boots'); // deduplicated
    expect(results[0].relatedKeywords).toContain('sandals');
    // 'boots' appears only once
    expect(results[0].relatedKeywords.filter((k) => k === 'boots')).toHaveLength(1);
  });
});

describe('searchTrends — PRIMARY_ONLY', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCached.mockReturnValue(null);
  });

  it('picks the highest-reliability enabled provider', async () => {
    // enabled: ['pytrends', 'serpapi'] — out of order
    // getAllProviderIds returns HIGH-first order: ['serpapi', 'amazon', ...]
    // → serpapi should be picked as primary
    mockReadConfig.mockReturnValue({
      ...BASE_CONFIG,
      activeStrategy: AggregationStrategy.PRIMARY_ONLY,
      enabledProviders: ['pytrends', 'serpapi'] as ProviderId[],
    });

    const serpapiProvider = makeMockProvider('serpapi', [makeTrendResult('shoes', 85, 'serpapi')]);
    const pytrendsProvider = makeMockProvider('pytrends', [
      makeTrendResult('shoes', 60, 'pytrends'),
    ]);

    mockCreateProvider.mockImplementation((id) => {
      if (id === 'serpapi') return serpapiProvider;
      return pytrendsProvider;
    });

    const results = await searchTrends(['shoes']);

    expect(results).toHaveLength(1);
    expect(results[0].sources).toEqual(['serpapi']);
    expect(vi.mocked(pytrendsProvider.searchTrend)).not.toHaveBeenCalled();
  });

  it('returns single-source results (sources array has one entry)', async () => {
    mockReadConfig.mockReturnValue({
      ...BASE_CONFIG,
      activeStrategy: AggregationStrategy.PRIMARY_ONLY,
      enabledProviders: ['pytrends'] as ProviderId[],
    });

    mockCreateProvider.mockImplementation(() =>
      makeMockProvider('pytrends', [makeTrendResult('shoes', 75, 'pytrends')]),
    );

    const results = await searchTrends(['shoes']);

    expect(results[0].sources).toHaveLength(1);
    expect(results[0].sources[0]).toBe('pytrends');
  });
});

describe('searchTrends — FALLBACK_CHAIN', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCached.mockReturnValue(null);
  });

  it('returns first provider results and does NOT call subsequent providers', async () => {
    mockReadConfig.mockReturnValue({
      ...BASE_CONFIG,
      activeStrategy: AggregationStrategy.FALLBACK_CHAIN,
      enabledProviders: ['serpapi', 'pytrends'] as ProviderId[],
    });

    const serpapiProvider = makeMockProvider('serpapi', [makeTrendResult('shoes', 90, 'serpapi')]);
    const pytrendsProvider = makeMockProvider('pytrends', [
      makeTrendResult('shoes', 60, 'pytrends'),
    ]);

    mockCreateProvider.mockImplementation((id) => {
      if (id === 'serpapi') return serpapiProvider;
      return pytrendsProvider;
    });

    const results = await searchTrends(['shoes']);

    expect(results).toHaveLength(1);
    expect(results[0].sources).toEqual(['serpapi']);
    expect(vi.mocked(pytrendsProvider.searchTrend)).not.toHaveBeenCalled();
  });

  it('falls through to next provider when first fails', async () => {
    mockReadConfig.mockReturnValue({
      ...BASE_CONFIG,
      activeStrategy: AggregationStrategy.FALLBACK_CHAIN,
      enabledProviders: ['serpapi', 'pytrends'] as ProviderId[],
    });

    const serpapiProvider = makeFailingProvider('serpapi');
    const pytrendsProvider = makeMockProvider('pytrends', [
      makeTrendResult('shoes', 65, 'pytrends'),
    ]);

    mockCreateProvider.mockImplementation((id) => {
      if (id === 'serpapi') return serpapiProvider;
      return pytrendsProvider;
    });

    const results = await searchTrends(['shoes']);

    expect(results).toHaveLength(1);
    expect(results[0].sources).toEqual(['pytrends']);
    expect(results[0].score).toBe(65);
  });

  it('returns empty when all providers fail in chain', async () => {
    mockReadConfig.mockReturnValue({
      ...BASE_CONFIG,
      activeStrategy: AggregationStrategy.FALLBACK_CHAIN,
      enabledProviders: ['serpapi', 'pytrends'] as ProviderId[],
    });

    mockCreateProvider.mockImplementation((id) => makeFailingProvider(id));

    const results = await searchTrends(['shoes']);

    expect(results).toEqual([]);
  });
});

describe('searchTrends — Cache', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns cached results without calling the provider', async () => {
    const cachedResult = makeTrendResult('shoes', 75, 'pytrends');

    mockReadConfig.mockReturnValue({
      ...BASE_CONFIG,
      activeStrategy: AggregationStrategy.SMART_MERGE,
      enabledProviders: ['pytrends'] as ProviderId[],
      cacheEnabled: true,
      cacheTTL: 3_600_000,
    });

    mockBuildCacheKey.mockReturnValue('pytrends:shoes:US');
    mockGetCached.mockReturnValue([cachedResult]);

    const results = await searchTrends(['shoes']);

    expect(results).toHaveLength(1);
    expect(results[0].score).toBe(75);
    // Provider was never instantiated
    expect(mockCreateProvider).not.toHaveBeenCalled();
  });

  it('writes fresh results to cache after provider call', async () => {
    mockReadConfig.mockReturnValue({
      ...BASE_CONFIG,
      enabledProviders: ['pytrends'] as ProviderId[],
      cacheEnabled: true,
      cacheTTL: 3_600_000,
    });

    mockGetCached.mockReturnValue(null); // cache miss
    mockBuildCacheKey.mockReturnValue('pytrends:shoes:US');

    const freshResult = makeTrendResult('shoes', 80, 'pytrends');
    mockCreateProvider.mockReturnValue(makeMockProvider('pytrends', [freshResult]));

    await searchTrends(['shoes']);

    expect(mockSetCached).toHaveBeenCalledWith('pytrends:shoes:US', [freshResult], 3_600_000);
  });

  it('does NOT write to cache when cacheEnabled is false', async () => {
    mockReadConfig.mockReturnValue({
      ...BASE_CONFIG,
      enabledProviders: ['pytrends'] as ProviderId[],
      cacheEnabled: false,
    });

    mockCreateProvider.mockReturnValue(
      makeMockProvider('pytrends', [makeTrendResult('shoes', 80, 'pytrends')]),
    );

    await searchTrends(['shoes']);

    expect(mockSetCached).not.toHaveBeenCalled();
  });
});
