/**
 * Trend Engine — Aggregator
 *
 * Core engine that combines results from multiple providers using one of
 * three aggregation strategies: SMART_MERGE, PRIMARY_ONLY, FALLBACK_CHAIN.
 *
 * Contract: never throws — always returns results (possibly empty on total failure).
 * Cache is checked per-provider per-keyword BEFORE any network call.
 */

import { AggregationStrategy } from './types';
import type {
  TrendResult,
  TrendState,
  TrendMetadata,
  ProviderId,
  ProviderReliability,
  SearchOptions,
} from './types';
import { readConfig } from './config';
import { buildCacheKey, getCached, setCached } from './store';
import { createProvider, getAllProviderIds, PROVIDER_META } from './providers/index';

// ─── Public Types ─────────────────────────────────────────────────────────────

/**
 * Aggregated result that may combine data from multiple providers.
 * Unlike TrendResult (single source), this carries all contributing sources.
 */
export interface AggregatedTrendResult {
  keyword: string;
  score: number; // 0-100, weighted average in SMART_MERGE; raw otherwise
  state: TrendState;
  timestamp: number;
  sources: ProviderId[]; // one or more providers that contributed
  relatedKeywords: string[];
  metadata: TrendMetadata;
}

export interface SearchTrendsOptions {
  region?: string;
  categoryId?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const RELIABILITY_WEIGHT: Record<ProviderReliability, number> = {
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

// ─── Internal: fetch with cache ───────────────────────────────────────────────

/**
 * Fetch results for a set of keywords from one provider.
 * Checks cache per keyword — only calls the provider for cache misses.
 * Writes fresh results back to cache.
 */
async function fetchFromProvider(
  providerId: ProviderId,
  keywords: string[],
  options: SearchOptions,
  cacheEnabled: boolean,
  cacheTTL: number,
): Promise<TrendResult[]> {
  const region = options.region ?? 'US';
  const cachedResults: TrendResult[] = [];
  const uncached: string[] = [];

  if (cacheEnabled) {
    for (const kw of keywords) {
      const key = buildCacheKey(providerId, kw, region, options.categoryId);
      const hit = getCached(key);
      if (hit !== null) {
        cachedResults.push(...hit);
      } else {
        uncached.push(kw);
      }
    }
  } else {
    uncached.push(...keywords);
  }

  if (uncached.length === 0) return cachedResults;

  const provider = createProvider(providerId);
  const fresh = await provider.searchTrend(uncached, options);

  if (cacheEnabled) {
    for (const kw of uncached) {
      const keyResults = fresh.filter((r) => r.keyword.toLowerCase() === kw.toLowerCase());
      const key = buildCacheKey(providerId, kw, region, options.categoryId);
      setCached(key, keyResults, cacheTTL);
    }
  }

  return [...cachedResults, ...fresh];
}

// ─── Internal: merge ──────────────────────────────────────────────────────────

/**
 * Merge results from multiple providers into AggregatedTrendResult[].
 * Score = weighted average by provider reliability (HIGH=3, MEDIUM=2, LOW=1).
 * State and metadata come from the highest-confidence individual result.
 */
function mergeResults(
  resultsByProvider: Array<{ providerId: ProviderId; results: TrendResult[] }>,
): AggregatedTrendResult[] {
  const byKeyword = new Map<string, { results: TrendResult[]; providers: ProviderId[] }>();

  for (const { providerId, results } of resultsByProvider) {
    for (const result of results) {
      const key = result.keyword.toLowerCase();
      if (!byKeyword.has(key)) {
        byKeyword.set(key, { results: [], providers: [] });
      }
      const entry = byKeyword.get(key)!;
      entry.results.push(result);
      if (!entry.providers.includes(providerId)) {
        entry.providers.push(providerId);
      }
    }
  }

  const merged: AggregatedTrendResult[] = [];

  for (const [, { results, providers }] of byKeyword) {
    let totalWeight = 0;
    let weightedScore = 0;

    for (const r of results) {
      const meta = PROVIDER_META[r.source];
      const weight = meta ? RELIABILITY_WEIGHT[meta.reliability] : 1;
      weightedScore += r.score * weight;
      totalWeight += weight;
    }

    const finalScore = totalWeight > 0 ? Math.round(weightedScore / totalWeight) : 0;

    const relatedSet = new Set<string>();
    for (const r of results) {
      for (const kw of r.relatedKeywords) relatedSet.add(kw);
    }

    // Use the highest-confidence result's keyword casing / state / metadata
    const best = results.reduce((a, b) => (a.metadata.confidence >= b.metadata.confidence ? a : b));

    merged.push({
      keyword: best.keyword,
      score: finalScore,
      state: best.state,
      timestamp: Date.now(),
      sources: providers,
      relatedKeywords: [...relatedSet].slice(0, 10),
      metadata: best.metadata,
    });
  }

  return merged;
}

/**
 * Wrap single-provider results into AggregatedTrendResult format.
 */
function toAggregated(results: TrendResult[], providerId: ProviderId): AggregatedTrendResult[] {
  return results.map((r) => ({
    keyword: r.keyword,
    score: r.score,
    state: r.state,
    timestamp: r.timestamp,
    sources: [providerId],
    relatedKeywords: r.relatedKeywords,
    metadata: r.metadata,
  }));
}

// ─── Strategies ───────────────────────────────────────────────────────────────

async function smartMerge(
  keywords: string[],
  enabledProviders: ProviderId[],
  options: SearchOptions,
  cacheEnabled: boolean,
  cacheTTL: number,
): Promise<AggregatedTrendResult[]> {
  if (enabledProviders.length === 0) return [];

  const settled = await Promise.allSettled(
    enabledProviders.map(async (id) => ({
      providerId: id,
      results: await fetchFromProvider(id, keywords, options, cacheEnabled, cacheTTL),
    })),
  );

  const successful = settled
    .filter(
      (r): r is PromiseFulfilledResult<{ providerId: ProviderId; results: TrendResult[] }> =>
        r.status === 'fulfilled',
    )
    .map((r) => r.value);

  if (successful.length === 0) return [];

  return mergeResults(successful);
}

async function primaryOnly(
  keywords: string[],
  enabledProviders: ProviderId[],
  options: SearchOptions,
  cacheEnabled: boolean,
  cacheTTL: number,
): Promise<AggregatedTrendResult[]> {
  if (enabledProviders.length === 0) return [];

  // Pick highest-reliability enabled provider (global reliability order: HIGH first)
  const ordered = getAllProviderIds().filter((id) => enabledProviders.includes(id));
  const primary = ordered[0];
  if (!primary) return [];

  const results = await fetchFromProvider(primary, keywords, options, cacheEnabled, cacheTTL);
  return toAggregated(results, primary);
}

async function fallbackChain(
  keywords: string[],
  enabledProviders: ProviderId[],
  options: SearchOptions,
  cacheEnabled: boolean,
  cacheTTL: number,
): Promise<AggregatedTrendResult[]> {
  if (enabledProviders.length === 0) return [];

  const ordered = getAllProviderIds().filter((id) => enabledProviders.includes(id));

  for (const id of ordered) {
    try {
      const results = await fetchFromProvider(id, keywords, options, cacheEnabled, cacheTTL);
      if (results.length > 0) {
        return toAggregated(results, id);
      }
    } catch {
      // Provider failed — continue to next in chain
    }
  }

  return [];
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Search for trends using the configured aggregation strategy.
 *
 * - Reads strategy + enabled providers from config.ts
 * - Checks cache in store.ts before calling any provider
 * - Never throws — returns [] on total failure
 */
export async function searchTrends(
  keywords: string[],
  options: SearchTrendsOptions = {},
): Promise<AggregatedTrendResult[]> {
  if (keywords.length === 0) return [];

  const config = readConfig();
  const { activeStrategy, enabledProviders, cacheEnabled, cacheTTL } = config;

  if (enabledProviders.length === 0) return [];

  const searchOptions: SearchOptions = {
    region: options.region ?? 'US',
    categoryId: options.categoryId,
  };

  try {
    switch (activeStrategy) {
      case AggregationStrategy.SMART_MERGE:
        return await smartMerge(keywords, enabledProviders, searchOptions, cacheEnabled, cacheTTL);
      case AggregationStrategy.PRIMARY_ONLY:
        return await primaryOnly(keywords, enabledProviders, searchOptions, cacheEnabled, cacheTTL);
      case AggregationStrategy.FALLBACK_CHAIN:
        return await fallbackChain(
          keywords,
          enabledProviders,
          searchOptions,
          cacheEnabled,
          cacheTTL,
        );
      default:
        return await smartMerge(keywords, enabledProviders, searchOptions, cacheEnabled, cacheTTL);
    }
  } catch {
    return [];
  }
}
