/**
 * SerpAPI Provider — Google Trends
 *
 * Uses SerpAPI REST API to fetch real Google Trends data.
 * Requires 'serpapi' key from trends/api-keys.ts.
 * Timeout: 10s via AbortController. Errors are swallowed per-keyword.
 */

import type {
  TrendResult,
  TrendProvider,
  TrendState,
  SearchOptions,
  ProviderTestResult,
} from '../types';
import { getApiKey } from '../api-keys';
import { getCategoryById } from '../categories';
import { deriveState } from '../scorer';
import { buildCacheKey, getCached, setCached } from '../store';
import { readConfig } from '../config';

const BASE_URL = 'https://serpapi.com/search';
const TIMEOUT_MS = 10_000;

// ─── Internal helpers ─────────────────────────────────────────────────────────

function makeAbortSignal(timeoutMs: number): AbortSignal {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), timeoutMs);
  return controller.signal;
}

function avgLast(values: number[], count: number): number {
  const slice = values.slice(-count);
  if (slice.length === 0) return 0;
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}

async function serpApiFetch(
  params: Record<string, string>,
  timeoutMs = TIMEOUT_MS,
): Promise<Record<string, unknown>> {
  const url = new URL(BASE_URL);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const apiKey = getApiKey('serpapi');
  if (apiKey) url.searchParams.set('api_key', apiKey);

  const res = await fetch(url.toString(), { signal: makeAbortSignal(timeoutMs) });
  if (!res.ok) throw new Error(`SerpAPI HTTP ${res.status}`);
  return (await res.json()) as Record<string, unknown>;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export class SerpApiProvider implements TrendProvider {
  readonly id = 'serpapi' as const;
  readonly name = 'SerpAPI (Google Trends)';
  readonly reliability = 'HIGH' as const;

  async searchTrend(keywords: string[], options?: SearchOptions): Promise<TrendResult[]> {
    const config = readConfig();
    const region = options?.region ?? 'US';
    const results: TrendResult[] = [];

    for (const keyword of keywords) {
      const cacheKey = buildCacheKey(this.id, keyword, region, options?.categoryId);
      const cached = getCached(cacheKey);
      if (cached) {
        results.push(...cached);
        continue;
      }

      try {
        const data = await serpApiFetch({
          engine: 'google_trends',
          q: keyword,
          geo: region,
          data_type: 'TIMESERIES',
        });

        type TimelinePoint = { values?: Array<{ extracted_value?: number }> };
        const iot = data?.interest_over_time as Record<string, unknown> | undefined;
        const timeline = (iot?.timeline_data as TimelinePoint[] | undefined) ?? [];

        let rawScore = 50;
        let trendState: TrendState = 'unknown';

        if (timeline.length > 0) {
          const values = timeline.map((t) => t.values?.[0]?.extracted_value ?? 0);
          rawScore = Math.round(avgLast(values, 12));
          const lastVal = avgLast(values, 1);
          const prevVal = values.length > 1 ? avgLast(values.slice(0, -1), 1) : undefined;
          trendState = deriveState(lastVal, prevVal);
        }

        // Related keywords — second call
        let relatedKeywords: string[] = [];
        try {
          const relData = await serpApiFetch({
            engine: 'google_trends',
            q: keyword,
            geo: region,
            data_type: 'RELATED_QUERIES',
          });
          type RelQuery = { query?: string };
          const rq = relData?.related_queries as Record<string, unknown> | undefined;
          const rising = (rq?.rising as RelQuery[] | undefined) ?? [];
          relatedKeywords = rising
            .map((r) => r.query ?? '')
            .filter(Boolean)
            .slice(0, 10);
        } catch {
          // Related queries are optional — ignore failure
        }

        const result: TrendResult = {
          keyword,
          score: Math.min(100, Math.max(0, rawScore)),
          state: trendState,
          timestamp: Date.now(),
          source: this.id,
          relatedKeywords,
          metadata: {
            region,
            rawScore,
            searchVolume: rawScore,
            confidence: 0.9,
            category: options?.categoryId,
          },
        };

        if (config.cacheEnabled) {
          setCached(cacheKey, [result], config.cacheTTL);
        }
        results.push(result);
      } catch {
        // Per-keyword failure is swallowed — never crash the batch
      }
    }

    return results;
  }

  async getCategoryTrends(categoryId: string, options?: SearchOptions): Promise<TrendResult[]> {
    const category = getCategoryById(categoryId);
    if (!category) return [];

    const keywords = category.subcategories
      .flatMap((s) => s.keywords)
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 5)
      .map((k) => k.keyword);

    return this.searchTrend(keywords, { ...options, categoryId });
  }

  async getRelatedKeywords(keyword: string, options?: SearchOptions): Promise<string[]> {
    try {
      const region = options?.region ?? 'US';
      const data = await serpApiFetch({
        engine: 'google_trends',
        q: keyword,
        geo: region,
        data_type: 'RELATED_QUERIES',
      });

      type RelQuery = { query?: string };
      const rq = data?.related_queries as Record<string, unknown> | undefined;
      const rising = ((rq?.rising as RelQuery[] | undefined) ?? [])
        .map((r) => r.query ?? '')
        .filter(Boolean);
      const top = ((rq?.top as RelQuery[] | undefined) ?? [])
        .map((r) => r.query ?? '')
        .filter(Boolean);

      return [...new Set([...rising, ...top])].slice(0, 10);
    } catch {
      return [];
    }
  }

  async testConnection(): Promise<ProviderTestResult> {
    const start = Date.now();
    try {
      const data = await serpApiFetch(
        { engine: 'google_trends', q: 'test', data_type: 'TIMESERIES' },
        2_000,
      );
      const ok = 'interest_over_time' in data;
      return { provider: this.id, ok, latencyMs: Date.now() - start };
    } catch (e) {
      return {
        provider: this.id,
        ok: false,
        latencyMs: Date.now() - start,
        error: e instanceof Error ? e.message : 'Unknown error',
      };
    }
  }
}
