/**
 * PyTrends Provider — Google Trends (free, unofficial)
 *
 * Uses Google Trends public endpoints directly — no API key required.
 * WARNING: Google may throttle or block. Includes rate limiting (1 req/s)
 * and 429 propagation as a RATE_LIMITED error code.
 * Timeout: 15s via AbortController.
 */

import type {
  TrendResult,
  TrendProvider,
  TrendState,
  SearchOptions,
  ProviderTestResult,
} from '../types';
import { getCategoryById } from '../categories';
import { deriveState } from '../scorer';
import { buildCacheKey, getCached, setCached } from '../store';
import { readConfig } from '../config';

const BASE_URL = 'https://trends.google.com/trends/api';
const TIMEOUT_MS = 15_000;
const RATE_LIMIT_MS = 1_000;

// ─── Rate limiter ─────────────────────────────────────────────────────────────

let lastRequestTime = 0;

async function waitForRateLimit(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < RATE_LIMIT_MS) {
    await new Promise((res) => setTimeout(res, RATE_LIMIT_MS - elapsed));
  }
  lastRequestTime = Date.now();
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function makeAbortSignal(timeoutMs: number): AbortSignal {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), timeoutMs);
  return controller.signal;
}

function parseGoogleJson(text: string): unknown {
  // Google Trends prepends ")]}'\n" as XSSI protection
  const cleaned = text.replace(/^\)\]\}'\n/, '');
  return JSON.parse(cleaned);
}

function avgLast(values: number[], count: number): number {
  const slice = values.slice(-count);
  if (slice.length === 0) return 0;
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}

class RateLimitedError extends Error {
  readonly code = 'RATE_LIMITED';
  constructor() {
    super('Rate limited by Google Trends (HTTP 429)');
    this.name = 'RateLimitedError';
  }
}

async function trendsFetch(url: URL, timeoutMs: number): Promise<Response> {
  const res = await fetch(url.toString(), {
    signal: makeAbortSignal(timeoutMs),
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; StarBuy/1.0)' },
  });
  if (res.status === 429) throw new RateLimitedError();
  return res;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export class PyTrendsProvider implements TrendProvider {
  readonly id = 'pytrends' as const;
  readonly name = 'PyTrends (Google Trends Free)';
  readonly reliability = 'MEDIUM' as const;

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
        await waitForRateLimit();

        // Step 1: explore — get widget token
        const exploreUrl = new URL(`${BASE_URL}/explore`);
        exploreUrl.searchParams.set('q', keyword);
        exploreUrl.searchParams.set('geo', region);
        exploreUrl.searchParams.set('hl', 'en-US');

        const exploreRes = await trendsFetch(exploreUrl, TIMEOUT_MS);
        if (!exploreRes.ok) throw new Error(`Explore HTTP ${exploreRes.status}`);

        const exploreText = await exploreRes.text();
        const exploreData = parseGoogleJson(exploreText) as Record<string, unknown>;

        type Widget = { id?: string; token?: string; request?: unknown };
        const widgets = (exploreData?.widgets as Widget[] | undefined) ?? [];
        const timelineWidget = widgets.find((w) => w.id === 'TIMESERIES');

        if (!timelineWidget?.token) {
          results.push(this._emptyResult(keyword, region, options?.categoryId));
          continue;
        }

        await waitForRateLimit();

        // Step 2: multiline data
        const multilineUrl = new URL(`${BASE_URL}/widgetdata/multiline`);
        multilineUrl.searchParams.set('token', timelineWidget.token);
        multilineUrl.searchParams.set('req', JSON.stringify(timelineWidget.request));
        multilineUrl.searchParams.set('geo', region);
        multilineUrl.searchParams.set('hl', 'en-US');

        const multilineRes = await trendsFetch(multilineUrl, TIMEOUT_MS);
        if (!multilineRes.ok) throw new Error(`Multiline HTTP ${multilineRes.status}`);

        const multiText = await multilineRes.text();
        const multiData = parseGoogleJson(multiText) as Record<string, unknown>;

        type TimelineData = { value?: number[] };
        const def = multiData?.default as Record<string, unknown> | undefined;
        const timelineData = (def?.timelineData as TimelineData[] | undefined) ?? [];

        let rawScore = 50;
        let trendState: TrendState = 'unknown';

        if (timelineData.length > 0) {
          const values = timelineData.map((t) => t.value?.[0] ?? 0);
          rawScore = Math.round(avgLast(values, 12));
          const lastAvg = avgLast(values, 2);
          const prevAvg = values.length > 2 ? avgLast(values.slice(0, -2), 2) : undefined;
          trendState = deriveState(lastAvg, prevAvg);
        }

        const result: TrendResult = {
          keyword,
          score: Math.min(100, Math.max(0, rawScore)),
          state: trendState,
          timestamp: Date.now(),
          source: this.id,
          relatedKeywords: [],
          metadata: {
            region,
            rawScore,
            confidence: 0.6,
            category: options?.categoryId,
          },
        };

        if (config.cacheEnabled) {
          setCached(cacheKey, [result], config.cacheTTL);
        }
        results.push(result);
      } catch (e) {
        // Propagate RATE_LIMITED so the aggregator can handle it
        if (e instanceof RateLimitedError) throw e;
        // All other errors: skip this keyword silently
      }
    }

    return results;
  }

  private _emptyResult(keyword: string, region: string, categoryId?: string): TrendResult {
    return {
      keyword,
      score: 50,
      state: 'unknown',
      timestamp: Date.now(),
      source: this.id,
      relatedKeywords: [],
      metadata: { region, confidence: 0.3, category: categoryId },
    };
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

  async getRelatedKeywords(_keyword: string, _options?: SearchOptions): Promise<string[]> {
    // PyTrends unofficial API doesn't easily support related queries
    return [];
  }

  async testConnection(): Promise<ProviderTestResult> {
    const start = Date.now();
    try {
      const url = new URL(`${BASE_URL}/explore`);
      url.searchParams.set('q', 'test');
      url.searchParams.set('geo', 'US');
      url.searchParams.set('hl', 'en-US');

      const res = await trendsFetch(url, 3_000);
      if (!res.ok) {
        return {
          provider: this.id,
          ok: false,
          latencyMs: Date.now() - start,
          error: `HTTP ${res.status}`,
        };
      }

      const text = await res.text();
      const ok = text.includes('token');
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
