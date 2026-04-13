/**
 * Trend Engine — Public API Surface
 *
 * This is the ONLY import point for consumers of the trend engine.
 * Batch 1: types, config, cache, categories, scorer.
 * Batch 2: providers (factory, metadata).
 * Batch 3: aggregator (searchTrends) + registry (lifecycle management).
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type {
  TrendState,
  TrendResult,
  TrendMetadata,
  ProviderId,
  ProviderReliability,
  SearchOptions,
  ProviderTestResult,
  TrendProvider,
  TrendConfig,
  CategoryKeyword,
  Subcategory,
  Category,
  CategoryTree,
  CacheEntry,
  ApiKeyStatus,
} from './types';

export { AggregationStrategy, DEFAULT_TREND_CONFIG } from './types';

// ─── Categories ───────────────────────────────────────────────────────────────

export { CATEGORY_TREE, getCategoryById, getSubcategoryById, getAllKeywords } from './categories';

// ─── Scorer ───────────────────────────────────────────────────────────────────

export { normalizeScore, deriveState } from './scorer';

// ─── Cache ────────────────────────────────────────────────────────────────────

export { buildCacheKey, getCached, setCached, clearCache, getCacheStats } from './store';

// ─── Config ───────────────────────────────────────────────────────────────────

export { readConfig, saveConfig, getActiveStrategy, getEnabledProviders } from './config';

// ─── API Keys ─────────────────────────────────────────────────────────────────

export type { TrendApiKey } from './api-keys';
export { maskKey, getApiKey, setApiKey, deleteApiKey, getProviderKeyStatus } from './api-keys';

// ─── Providers ────────────────────────────────────────────────────────────────

export type { ProviderInfo } from './providers/index';
export {
  PROVIDER_META,
  createProvider,
  getAllProviderIds,
  getProviderInfo,
  createAllProviders,
  SerpApiProvider,
  PyTrendsProvider,
  TavilyProvider,
  AmazonProvider,
  MetaProvider,
} from './providers/index';

// ─── Aggregator ───────────────────────────────────────────────────────────────

export type { AggregatedTrendResult, SearchTrendsOptions } from './aggregator';
export { searchTrends } from './aggregator';

// ─── Registry ─────────────────────────────────────────────────────────────────

export type { ProviderStatus, HealthCheckResult } from './registry';
export {
  getAvailableProviders,
  enableProvider,
  disableProvider,
  testProvider,
  getProviderHealth,
} from './registry';
