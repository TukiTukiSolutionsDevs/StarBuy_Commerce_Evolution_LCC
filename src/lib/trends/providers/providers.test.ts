// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';

// ─── Mocks (must be before imports) ──────────────────────────────────────────

vi.mock('../api-keys', () => ({
  getApiKey: vi.fn(() => undefined),
}));

vi.mock('@/lib/ai/api-keys', () => ({
  getApiKey: vi.fn(() => undefined),
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

// ─── Imports ──────────────────────────────────────────────────────────────────

import {
  createProvider,
  getAllProviderIds,
  getProviderInfo,
  createAllProviders,
  PROVIDER_META,
  SerpApiProvider,
  PyTrendsProvider,
  TavilyProvider,
  AmazonProvider,
  MetaProvider,
} from './index';
import type { ProviderId } from '../types';

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Provider Registry — createProvider', () => {
  it('creates a SerpApiProvider for serpapi', () => {
    const p = createProvider('serpapi');
    expect(p).toBeInstanceOf(SerpApiProvider);
    expect(p.id).toBe('serpapi');
  });

  it('creates a PyTrendsProvider for pytrends', () => {
    const p = createProvider('pytrends');
    expect(p).toBeInstanceOf(PyTrendsProvider);
    expect(p.id).toBe('pytrends');
  });

  it('creates a TavilyProvider for tavily', () => {
    const p = createProvider('tavily');
    expect(p).toBeInstanceOf(TavilyProvider);
    expect(p.id).toBe('tavily');
  });

  it('creates an AmazonProvider for amazon', () => {
    const p = createProvider('amazon');
    expect(p).toBeInstanceOf(AmazonProvider);
    expect(p.id).toBe('amazon');
  });

  it('creates a MetaProvider for meta', () => {
    const p = createProvider('meta');
    expect(p).toBeInstanceOf(MetaProvider);
    expect(p.id).toBe('meta');
  });

  it('returns a fresh instance on each call (no shared state)', () => {
    const a = createProvider('serpapi');
    const b = createProvider('serpapi');
    expect(a).not.toBe(b);
  });

  it('throws for an unknown provider id', () => {
    expect(() => createProvider('unknown' as ProviderId)).toThrow(/unknown provider/i);
  });
});

describe('Provider Registry — getAllProviderIds', () => {
  it('returns all 5 provider IDs', () => {
    const ids = getAllProviderIds();
    expect(ids).toHaveLength(5);
    expect(ids).toContain('serpapi');
    expect(ids).toContain('amazon');
    expect(ids).toContain('pytrends');
    expect(ids).toContain('tavily');
    expect(ids).toContain('meta');
  });

  it('HIGH reliability providers come before MEDIUM', () => {
    const ids = getAllProviderIds();
    const serpIdx = ids.indexOf('serpapi');
    const amazonIdx = ids.indexOf('amazon');
    const pytrendsIdx = ids.indexOf('pytrends');
    const tavilyIdx = ids.indexOf('tavily');
    const metaIdx = ids.indexOf('meta');

    // HIGH providers first
    expect(serpIdx).toBeLessThan(pytrendsIdx);
    expect(amazonIdx).toBeLessThan(pytrendsIdx);
    expect(serpIdx).toBeLessThan(tavilyIdx);
    expect(amazonIdx).toBeLessThan(tavilyIdx);
    expect(serpIdx).toBeLessThan(metaIdx);
    expect(amazonIdx).toBeLessThan(metaIdx);
  });

  it('returns a copy — mutating does not affect registry', () => {
    const ids = getAllProviderIds();
    ids.push('serpapi'); // mutate
    expect(getAllProviderIds()).toHaveLength(5);
  });
});

describe('Provider Registry — getProviderInfo', () => {
  it('returns correct metadata for serpapi', () => {
    const info = getProviderInfo('serpapi');
    expect(info.id).toBe('serpapi');
    expect(info.reliability).toBe('HIGH');
    expect(info.requiresKey).toBe(true);
    expect(info.cost).toBe('paid');
    expect(info.name.length).toBeGreaterThan(0);
    expect(info.description.length).toBeGreaterThan(0);
  });

  it('returns correct metadata for pytrends', () => {
    const info = getProviderInfo('pytrends');
    expect(info.id).toBe('pytrends');
    expect(info.reliability).toBe('MEDIUM');
    expect(info.requiresKey).toBe(false);
    expect(info.cost).toBe('free');
  });

  it('returns correct metadata for tavily', () => {
    const info = getProviderInfo('tavily');
    expect(info.id).toBe('tavily');
    expect(info.reliability).toBe('MEDIUM');
    expect(info.requiresKey).toBe(true);
    expect(info.cost).toBe('freemium');
  });

  it('returns correct metadata for amazon', () => {
    const info = getProviderInfo('amazon');
    expect(info.id).toBe('amazon');
    expect(info.reliability).toBe('HIGH');
    expect(info.requiresKey).toBe(true);
  });

  it('returns correct metadata for meta', () => {
    const info = getProviderInfo('meta');
    expect(info.id).toBe('meta');
    expect(info.reliability).toBe('MEDIUM');
    expect(info.requiresKey).toBe(true);
    expect(info.cost).toBe('free');
  });
});

describe('Provider Registry — PROVIDER_META', () => {
  it('has entries for all 5 providers', () => {
    const keys = Object.keys(PROVIDER_META) as ProviderId[];
    expect(keys).toHaveLength(5);
  });

  it('every entry has required fields', () => {
    for (const [id, info] of Object.entries(PROVIDER_META)) {
      expect(info.id).toBe(id);
      expect(['HIGH', 'MEDIUM', 'LOW']).toContain(info.reliability);
      expect(typeof info.requiresKey).toBe('boolean');
      expect(['paid', 'free', 'freemium']).toContain(info.cost);
      expect(info.name.length).toBeGreaterThan(0);
      expect(info.description.length).toBeGreaterThan(0);
    }
  });
});

describe('Provider Registry — createAllProviders', () => {
  it('creates all 5 providers', () => {
    const providers = createAllProviders();
    expect(providers).toHaveLength(5);
  });

  it('each provider implements the TrendProvider interface', () => {
    const providers = createAllProviders();
    for (const p of providers) {
      expect(typeof p.id).toBe('string');
      expect(typeof p.name).toBe('string');
      expect(typeof p.reliability).toBe('string');
      expect(typeof p.searchTrend).toBe('function');
      expect(typeof p.getCategoryTrends).toBe('function');
      expect(typeof p.getRelatedKeywords).toBe('function');
      expect(typeof p.testConnection).toBe('function');
    }
  });

  it('providers are in reliability order (HIGH before MEDIUM)', () => {
    const providers = createAllProviders();
    const order = providers.map((p) => p.id);
    expect(order[0]).toBe('serpapi'); // HIGH
    expect(order[1]).toBe('amazon'); // HIGH
    // remaining are MEDIUM
    expect(['pytrends', 'tavily', 'meta']).toContain(order[2]);
  });

  it('returns fresh instances on each call', () => {
    const batch1 = createAllProviders();
    const batch2 = createAllProviders();
    expect(batch1[0]).not.toBe(batch2[0]);
  });
});

describe('Individual provider identity contracts', () => {
  const allProviders = [
    new SerpApiProvider(),
    new PyTrendsProvider(),
    new TavilyProvider(),
    new AmazonProvider(),
    new MetaProvider(),
  ];

  for (const p of allProviders) {
    it(`${p.id}: id matches class`, () => {
      expect(['serpapi', 'pytrends', 'tavily', 'amazon', 'meta']).toContain(p.id);
    });

    it(`${p.id}: reliability is valid`, () => {
      expect(['HIGH', 'MEDIUM', 'LOW']).toContain(p.reliability);
    });

    it(`${p.id}: has all required methods`, () => {
      expect(typeof p.searchTrend).toBe('function');
      expect(typeof p.getCategoryTrends).toBe('function');
      expect(typeof p.getRelatedKeywords).toBe('function');
      expect(typeof p.testConnection).toBe('function');
    });
  }
});
