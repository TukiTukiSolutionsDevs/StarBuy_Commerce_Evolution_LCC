/**
 * Registry Tests
 *
 * Tests provider lifecycle: enable/disable, test connection, health checks.
 * All file I/O and provider instantiation is mocked.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getAvailableProviders,
  enableProvider,
  disableProvider,
  testProvider,
  getProviderHealth,
} from './registry';
import type { ProviderId } from './types';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('./config', () => ({
  readConfig: vi.fn(),
  saveConfig: vi.fn(),
}));

vi.mock('./api-keys', () => ({
  getApiKey: vi.fn(),
}));

vi.mock('./providers/index', () => ({
  createProvider: vi.fn(),
  getAllProviderIds: vi.fn(() => ['serpapi', 'amazon', 'pytrends', 'tavily', 'meta']),
  PROVIDER_META: {
    serpapi: {
      id: 'serpapi',
      name: 'SerpAPI',
      reliability: 'HIGH',
      requiresKey: true,
      cost: 'paid',
      description: 'SerpAPI description',
    },
    amazon: {
      id: 'amazon',
      name: 'Amazon PA-API',
      reliability: 'HIGH',
      requiresKey: true,
      cost: 'freemium',
      description: 'Amazon description',
    },
    pytrends: {
      id: 'pytrends',
      name: 'PyTrends',
      reliability: 'MEDIUM',
      requiresKey: false,
      cost: 'free',
      description: 'PyTrends description',
    },
    tavily: {
      id: 'tavily',
      name: 'Tavily',
      reliability: 'MEDIUM',
      requiresKey: true,
      cost: 'freemium',
      description: 'Tavily description',
    },
    meta: {
      id: 'meta',
      name: 'Meta Ad Library',
      reliability: 'MEDIUM',
      requiresKey: true,
      cost: 'free',
      description: 'Meta description',
    },
  },
}));

import { readConfig, saveConfig } from './config';
import { getApiKey } from './api-keys';
import { createProvider } from './providers/index';

const mockReadConfig = vi.mocked(readConfig);
const mockSaveConfig = vi.mocked(saveConfig);
const mockGetApiKey = vi.mocked(getApiKey);
const mockCreateProvider = vi.mocked(createProvider);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeMockProviderInstance(id: ProviderId, ok = true) {
  return {
    id,
    name: id,
    reliability: 'MEDIUM' as const,
    searchTrend: vi.fn().mockResolvedValue([]),
    getCategoryTrends: vi.fn().mockResolvedValue([]),
    getRelatedKeywords: vi.fn().mockResolvedValue([]),
    testConnection: vi.fn().mockResolvedValue({
      provider: id,
      ok,
      latencyMs: 42,
      error: ok ? undefined : 'connection refused',
    }),
  };
}

const BASE_CONFIG = {
  activeStrategy: 'smart-merge' as const,
  enabledProviders: ['pytrends', 'tavily'] as ProviderId[],
  cacheEnabled: true,
  cacheTTL: 21_600_000,
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('getAvailableProviders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetApiKey.mockReturnValue(undefined); // no keys configured by default
  });

  it('returns all 5 providers in reliability order', () => {
    mockReadConfig.mockReturnValue({ ...BASE_CONFIG });

    const providers = getAvailableProviders();

    expect(providers).toHaveLength(5);
    expect(providers.map((p) => p.id)).toEqual(['serpapi', 'amazon', 'pytrends', 'tavily', 'meta']);
  });

  it('marks enabled providers correctly', () => {
    mockReadConfig.mockReturnValue({
      ...BASE_CONFIG,
      enabledProviders: ['pytrends', 'tavily'] as ProviderId[],
    });

    const providers = getAvailableProviders();
    const enabled = providers.filter((p) => p.enabled).map((p) => p.id);
    const disabled = providers.filter((p) => !p.enabled).map((p) => p.id);

    expect(enabled).toContain('pytrends');
    expect(enabled).toContain('tavily');
    expect(disabled).toContain('serpapi');
    expect(disabled).toContain('amazon');
    expect(disabled).toContain('meta');
  });

  it('hasKey is true for pytrends (no key required)', () => {
    mockReadConfig.mockReturnValue({ ...BASE_CONFIG });
    mockGetApiKey.mockReturnValue(undefined);

    const providers = getAvailableProviders();
    const pytrends = providers.find((p) => p.id === 'pytrends')!;

    expect(pytrends.hasKey).toBe(true);
  });

  it('hasKey is true for tavily (shared key, not managed here)', () => {
    mockReadConfig.mockReturnValue({ ...BASE_CONFIG });

    const providers = getAvailableProviders();
    const tavily = providers.find((p) => p.id === 'tavily')!;

    expect(tavily.hasKey).toBe(true);
  });

  it('hasKey is false for serpapi when key is not configured', () => {
    mockReadConfig.mockReturnValue({ ...BASE_CONFIG });
    mockGetApiKey.mockReturnValue(undefined);

    const providers = getAvailableProviders();
    const serpapi = providers.find((p) => p.id === 'serpapi')!;

    expect(serpapi.hasKey).toBe(false);
  });

  it('hasKey is true for serpapi when key is configured', () => {
    mockReadConfig.mockReturnValue({ ...BASE_CONFIG });
    mockGetApiKey.mockImplementation((key) =>
      key === 'serpapi' ? 'sk-test-serpapi-key' : undefined,
    );

    const providers = getAvailableProviders();
    const serpapi = providers.find((p) => p.id === 'serpapi')!;

    expect(serpapi.hasKey).toBe(true);
  });

  it('hasKey is false for amazon when only some keys are configured', () => {
    mockReadConfig.mockReturnValue({ ...BASE_CONFIG });
    // only access-key configured, secret-key and partner-tag missing
    mockGetApiKey.mockImplementation((key) =>
      key === 'amazon-access-key' ? 'AKIAIOSFODNN7EXAMPLE' : undefined,
    );

    const providers = getAvailableProviders();
    const amazon = providers.find((p) => p.id === 'amazon')!;

    expect(amazon.hasKey).toBe(false);
  });

  it('hasKey is true for amazon when ALL 3 keys are configured', () => {
    mockReadConfig.mockReturnValue({ ...BASE_CONFIG });
    mockGetApiKey.mockImplementation((key) => {
      const keys: Record<string, string> = {
        'amazon-access-key': 'AKIAIOSFODNN7EXAMPLE',
        'amazon-secret-key': 'wJalrXUtnFEMI/K7MDENG',
        'amazon-partner-tag': 'store-20',
      };
      return keys[key as string];
    });

    const providers = getAvailableProviders();
    const amazon = providers.find((p) => p.id === 'amazon')!;

    expect(amazon.hasKey).toBe(true);
  });
});

describe('enableProvider', () => {
  beforeEach(() => vi.clearAllMocks());

  it('adds provider to the enabled list', () => {
    mockReadConfig.mockReturnValue({
      ...BASE_CONFIG,
      enabledProviders: ['pytrends'] as ProviderId[],
    });

    enableProvider('serpapi');

    expect(mockSaveConfig).toHaveBeenCalledWith({
      enabledProviders: ['pytrends', 'serpapi'],
    });
  });

  it('is a no-op when provider is already enabled', () => {
    mockReadConfig.mockReturnValue({
      ...BASE_CONFIG,
      enabledProviders: ['pytrends', 'serpapi'] as ProviderId[],
    });

    enableProvider('serpapi');

    expect(mockSaveConfig).not.toHaveBeenCalled();
  });
});

describe('disableProvider', () => {
  beforeEach(() => vi.clearAllMocks());

  it('removes provider from the enabled list', () => {
    mockReadConfig.mockReturnValue({
      ...BASE_CONFIG,
      enabledProviders: ['pytrends', 'serpapi'] as ProviderId[],
    });

    disableProvider('serpapi');

    expect(mockSaveConfig).toHaveBeenCalledWith({
      enabledProviders: ['pytrends'],
    });
  });

  it('saves empty list when last provider is disabled', () => {
    mockReadConfig.mockReturnValue({
      ...BASE_CONFIG,
      enabledProviders: ['pytrends'] as ProviderId[],
    });

    disableProvider('pytrends');

    expect(mockSaveConfig).toHaveBeenCalledWith({
      enabledProviders: [],
    });
  });

  it('still calls saveConfig even if provider was not enabled', () => {
    mockReadConfig.mockReturnValue({
      ...BASE_CONFIG,
      enabledProviders: ['pytrends'] as ProviderId[],
    });

    disableProvider('serpapi'); // serpapi was not enabled

    expect(mockSaveConfig).toHaveBeenCalledWith({
      enabledProviders: ['pytrends'],
    });
  });
});

describe('testProvider', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates the provider and calls testConnection', async () => {
    const mockInstance = makeMockProviderInstance('serpapi', true);
    mockCreateProvider.mockReturnValue(mockInstance);

    const result = await testProvider('serpapi');

    expect(mockCreateProvider).toHaveBeenCalledWith('serpapi');
    expect(mockInstance.testConnection).toHaveBeenCalled();
    expect(result.ok).toBe(true);
    expect(result.provider).toBe('serpapi');
    expect(result.latencyMs).toBe(42);
  });

  it('returns failed result when provider is unhealthy', async () => {
    const mockInstance = makeMockProviderInstance('meta', false);
    mockCreateProvider.mockReturnValue(mockInstance);

    const result = await testProvider('meta');

    expect(result.ok).toBe(false);
    expect(result.error).toBe('connection refused');
  });
});

describe('getProviderHealth', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns health for all enabled providers', async () => {
    mockReadConfig.mockReturnValue({
      ...BASE_CONFIG,
      enabledProviders: ['pytrends', 'tavily'] as ProviderId[],
    });

    mockCreateProvider.mockImplementation((id) => makeMockProviderInstance(id as ProviderId, true));

    const health = await getProviderHealth();

    expect(health).toHaveLength(2);
    expect(health.map((h) => h.provider)).toContain('pytrends');
    expect(health.map((h) => h.provider)).toContain('tavily');
    expect(health.every((h) => h.status === 'ok')).toBe(true);
  });

  it('returns empty array when no providers are enabled', async () => {
    mockReadConfig.mockReturnValue({
      ...BASE_CONFIG,
      enabledProviders: [],
    });

    const health = await getProviderHealth();

    expect(health).toEqual([]);
    expect(mockCreateProvider).not.toHaveBeenCalled();
  });

  it('records error status when a provider health check fails', async () => {
    mockReadConfig.mockReturnValue({
      ...BASE_CONFIG,
      enabledProviders: ['serpapi', 'pytrends'] as ProviderId[],
    });

    mockCreateProvider.mockImplementation((id) => {
      if (id === 'serpapi') return makeMockProviderInstance('serpapi', false);
      return makeMockProviderInstance('pytrends', true);
    });

    const health = await getProviderHealth();

    const serpHealth = health.find((h) => h.provider === 'serpapi')!;
    const pyHealth = health.find((h) => h.provider === 'pytrends')!;

    expect(serpHealth.status).toBe('error');
    expect(pyHealth.status).toBe('ok');
  });

  it('handles thrown errors gracefully (status: error, never throws)', async () => {
    mockReadConfig.mockReturnValue({
      ...BASE_CONFIG,
      enabledProviders: ['serpapi'] as ProviderId[],
    });

    mockCreateProvider.mockReturnValue({
      id: 'serpapi',
      name: 'SerpAPI',
      reliability: 'HIGH' as const,
      searchTrend: vi.fn(),
      getCategoryTrends: vi.fn(),
      getRelatedKeywords: vi.fn(),
      testConnection: vi.fn().mockRejectedValue(new Error('network timeout')),
    });

    const health = await getProviderHealth();

    expect(health).toHaveLength(1);
    expect(health[0].status).toBe('error');
    expect(health[0].error).toBe('network timeout');
  });
});
