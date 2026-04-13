/**
 * Meta Provider — Ad Library API
 *
 * Uses the Meta Ad Library API to measure product demand via ad volume.
 * Score = Math.min(100, Math.round(adCount * 4)) — 25 ads = 100.
 * Key: meta-access-token from trends/api-keys.ts.
 * Timeout: 15s via AbortController.
 */

import type { TrendResult, TrendProvider, SearchOptions, ProviderTestResult } from '../types';
import { getApiKey } from '../api-keys';
import { getCategoryById } from '../categories';
import { buildCacheKey, getCached, setCached } from '../store';
import { readConfig } from '../config';

const BASE_URL = 'https://graph.facebook.com/v18.0/ads_archive';
const TIMEOUT_MS = 15_000;

// ─── Text helpers ─────────────────────────────────────────────────────────────

const STOP_WORDS = new Set([
  'the',
  'a',
  'an',
  'and',
  'or',
  'but',
  'in',
  'on',
  'at',
  'to',
  'for',
  'of',
  'with',
  'by',
  'from',
  'is',
  'are',
  'was',
  'were',
  'this',
  'that',
  'you',
  'your',
  'our',
  'we',
  'they',
  'them',
  'their',
  'get',
  'now',
]);

function extractNounsFromText(text: string): string[] {
  const freq = new Map<string, number>();
  const words = text.toLowerCase().match(/\b[a-z]{4,}\b/g) ?? [];
  for (const w of words) {
    if (!STOP_WORDS.has(w)) freq.set(w, (freq.get(w) ?? 0) + 1);
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([w]) => w)
    .slice(0, 10);
}

// ─── HTTP helper ──────────────────────────────────────────────────────────────

function makeAbortSignal(timeoutMs: number): AbortSignal {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), timeoutMs);
  return controller.signal;
}

async function metaGet(
  params: Record<string, string>,
  timeoutMs = TIMEOUT_MS,
): Promise<Record<string, unknown>> {
  const url = new URL(BASE_URL);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const res = await fetch(url.toString(), { signal: makeAbortSignal(timeoutMs) });
  if (!res.ok) throw new Error(`Meta Ad Library HTTP ${res.status}`);

  const json = (await res.json()) as Record<string, unknown>;
  if (json?.error) {
    const errMsg = (json.error as Record<string, unknown>)?.message;
    throw new Error(String(errMsg ?? 'Meta API error'));
  }

  return json;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export class MetaProvider implements TrendProvider {
  readonly id = 'meta' as const;
  readonly name = 'Meta Ad Library';
  readonly reliability = 'MEDIUM' as const;

  async searchTrend(keywords: string[], options?: SearchOptions): Promise<TrendResult[]> {
    const token = getApiKey('meta-access-token');
    if (!token) return [];

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
        type Ad = { ad_creative_bodies?: string[] };
        const data = await metaGet({
          access_token: token,
          search_terms: keyword,
          ad_type: 'ALL',
          ad_reached_countries: region,
          limit: '25',
          fields: 'ad_creative_bodies',
        });

        const ads = (data?.data as Ad[] | undefined) ?? [];
        const adCount = ads.length;
        const score = Math.min(100, Math.round(adCount * 4));

        const bodyText = ads.map((ad) => (ad.ad_creative_bodies ?? []).join(' ')).join(' ');
        const relatedKeywords = extractNounsFromText(bodyText);

        const result: TrendResult = {
          keyword,
          score,
          state: score >= 70 ? 'rising' : score >= 40 ? 'stable' : 'declining',
          timestamp: Date.now(),
          source: this.id,
          relatedKeywords,
          metadata: {
            region,
            rawScore: adCount,
            confidence: 0.55,
            category: options?.categoryId,
            adCount,
          },
        };

        if (config.cacheEnabled) {
          setCached(cacheKey, [result], config.cacheTTL);
        }
        results.push(result);
      } catch {
        // Per-keyword failure — skip silently
      }
    }

    return results;
  }

  async getCategoryTrends(categoryId: string, options?: SearchOptions): Promise<TrendResult[]> {
    const category = getCategoryById(categoryId);
    if (!category) return [];
    return this.searchTrend([category.label], { ...options, categoryId });
  }

  async getRelatedKeywords(keyword: string, options?: SearchOptions): Promise<string[]> {
    const token = getApiKey('meta-access-token');
    if (!token) return [];

    try {
      type Ad = { ad_creative_bodies?: string[] };
      const data = await metaGet({
        access_token: token,
        search_terms: keyword,
        ad_type: 'ALL',
        ad_reached_countries: options?.region ?? 'US',
        limit: '10',
        fields: 'ad_creative_bodies',
      });

      const ads = (data?.data as Ad[] | undefined) ?? [];
      const bodyText = ads.map((ad) => (ad.ad_creative_bodies ?? []).join(' ')).join(' ');
      return extractNounsFromText(bodyText);
    } catch {
      return [];
    }
  }

  async testConnection(): Promise<ProviderTestResult> {
    const start = Date.now();
    const token = getApiKey('meta-access-token');

    if (!token) {
      return { provider: this.id, ok: false, latencyMs: 0, error: 'No access token configured' };
    }

    try {
      const data = await metaGet(
        {
          access_token: token,
          search_terms: 'test',
          ad_type: 'ALL',
          ad_reached_countries: 'US',
          limit: '1',
          fields: 'id',
        },
        3_000,
      );

      const ok = Array.isArray(data?.data);
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
