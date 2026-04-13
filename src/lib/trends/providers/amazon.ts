/**
 * Amazon Provider — PA-API v5
 *
 * Uses Amazon Product Advertising API with AWS Signature V4 auth.
 * Keys: amazon-access-key, amazon-secret-key, amazon-partner-tag
 * Timeout: 10s via AbortController.
 */

import { createHmac, createHash } from 'crypto';
import type { TrendResult, TrendProvider, SearchOptions, ProviderTestResult } from '../types';
import { getApiKey } from '../api-keys';
import { getCategoryById } from '../categories';
import { buildCacheKey, getCached, setCached } from '../store';
import { readConfig } from '../config';

const HOST = 'webservices.amazon.com';
const AWS_REGION = 'us-east-1';
const AWS_SERVICE = 'ProductAdvertisingAPI';
const TIMEOUT_MS = 10_000;

// ─── AWS SigV4 helpers ────────────────────────────────────────────────────────

function hmacSha256(key: string | Buffer, data: string): Buffer {
  return createHmac('sha256', key).update(data, 'utf8').digest();
}

function sha256Hex(data: string): string {
  return createHash('sha256').update(data, 'utf8').digest('hex');
}

function getSigningKey(secretKey: string, dateStamp: string): Buffer {
  const kDate = hmacSha256(`AWS4${secretKey}`, dateStamp);
  const kRegion = hmacSha256(kDate, AWS_REGION);
  const kService = hmacSha256(kRegion, AWS_SERVICE);
  return hmacSha256(kService, 'aws4_request');
}

// ─── HTTP helper ──────────────────────────────────────────────────────────────

function makeAbortSignal(timeoutMs: number): AbortSignal {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), timeoutMs);
  return controller.signal;
}

async function signedPaapiPost(
  operation: string,
  payload: Record<string, unknown>,
  timeoutMs = TIMEOUT_MS,
): Promise<Record<string, unknown>> {
  const accessKey = getApiKey('amazon-access-key');
  const secretKey = getApiKey('amazon-secret-key');
  const partnerTag = getApiKey('amazon-partner-tag');

  if (!accessKey || !secretKey || !partnerTag) {
    throw new Error(
      'Amazon PA-API requires amazon-access-key, amazon-secret-key, and amazon-partner-tag',
    );
  }

  const path = `/paapi5/${operation.toLowerCase()}`;
  const target = `com.amazon.paapi5.v1.ProductAdvertisingAPIv1.${operation}`;
  const url = `https://${HOST}${path}`;

  const body = JSON.stringify({
    ...payload,
    PartnerTag: partnerTag,
    PartnerType: 'Associates',
    Marketplace: 'www.amazon.com',
  });

  const now = new Date();
  // Format: 20240101T120000Z
  const amzDate =
    now
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}/, '')
      .slice(0, 15) + 'Z';
  const dateStamp = amzDate.slice(0, 8);
  const bodyHash = sha256Hex(body);

  const canonicalHeaders =
    `content-encoding:amz-1.0\n` +
    `content-type:application/json; charset=utf-8\n` +
    `host:${HOST}\n` +
    `x-amz-date:${amzDate}\n` +
    `x-amz-target:${target}\n`;
  const signedHeaders = 'content-encoding;content-type;host;x-amz-date;x-amz-target';
  const canonicalRequest = `POST\n${path}\n\n${canonicalHeaders}\n${signedHeaders}\n${bodyHash}`;

  const credentialScope = `${dateStamp}/${AWS_REGION}/${AWS_SERVICE}/aws4_request`;
  const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${sha256Hex(canonicalRequest)}`;

  const signingKey = getSigningKey(secretKey, dateStamp);
  const signature = createHmac('sha256', signingKey).update(stringToSign, 'utf8').digest('hex');
  const authHeader = `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Encoding': 'amz-1.0',
      'Content-Type': 'application/json; charset=utf-8',
      'X-Amz-Date': amzDate,
      'X-Amz-Target': target,
      Authorization: authHeader,
    },
    body,
    signal: makeAbortSignal(timeoutMs),
  });

  if (!res.ok) throw new Error(`Amazon PA-API HTTP ${res.status}`);
  return (await res.json()) as Record<string, unknown>;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export class AmazonProvider implements TrendProvider {
  readonly id = 'amazon' as const;
  readonly name = 'Amazon PA-API';
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
        const data = await signedPaapiPost('SearchItems', {
          Keywords: keyword,
          SearchIndex: 'All',
          Resources: ['BrowseNodeInfo.BrowseNodes', 'Offers.Listings.Price'],
          ItemCount: 10,
        });

        type Listing = { Price?: { Amount?: number } };
        type BrowseNodeChild = { DisplayName?: string };
        type BrowseNode = { Children?: BrowseNodeChild[] };
        type BrowseNodeInfo = { BrowseNodes?: BrowseNode[] };
        type Item = { BrowseNodeInfo?: BrowseNodeInfo; Offers?: { Listings?: Listing[] } };
        type SearchResult = { Items?: Item[]; TotalResultCount?: number };

        const sr = data?.SearchResult as SearchResult | undefined;
        const items = sr?.Items ?? [];
        const totalCount = sr?.TotalResultCount ?? items.length;
        const score = Math.min(100, Math.round(totalCount / 100));

        // Related keywords from browse nodes
        const relatedSet = new Set<string>();
        for (const item of items.slice(0, 3)) {
          const nodes = item.BrowseNodeInfo?.BrowseNodes ?? [];
          for (const node of nodes.slice(0, 1)) {
            for (const child of (node.Children ?? []).slice(0, 3)) {
              if (child.DisplayName) relatedSet.add(child.DisplayName);
            }
          }
        }

        // Price range
        const prices = items
          .flatMap((i) => i.Offers?.Listings ?? [])
          .map((l) => l.Price?.Amount)
          .filter((p): p is number => typeof p === 'number');

        const result: TrendResult = {
          keyword,
          score,
          state: score >= 70 ? 'rising' : score >= 40 ? 'stable' : 'declining',
          timestamp: Date.now(),
          source: this.id,
          relatedKeywords: [...relatedSet].slice(0, 10),
          metadata: {
            region,
            rawScore: totalCount,
            confidence: 0.85,
            category: options?.categoryId,
            priceMin: prices.length ? Math.min(...prices) : undefined,
            priceMax: prices.length ? Math.max(...prices) : undefined,
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

    const keywords = category.subcategories
      .flatMap((s) => s.keywords)
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 5)
      .map((k) => k.keyword);

    return this.searchTrend(keywords, { ...options, categoryId });
  }

  async getRelatedKeywords(keyword: string, _options?: SearchOptions): Promise<string[]> {
    try {
      type BrowseNodeChild = { DisplayName?: string };
      type BrowseNode = { Children?: BrowseNodeChild[] };
      type BrowseNodeInfo = { BrowseNodes?: BrowseNode[] };
      type Item = { BrowseNodeInfo?: BrowseNodeInfo };
      type SearchResult = { Items?: Item[] };

      const data = await signedPaapiPost('SearchItems', {
        Keywords: keyword,
        SearchIndex: 'All',
        Resources: ['BrowseNodeInfo.BrowseNodes'],
        ItemCount: 3,
      });

      const sr = data?.SearchResult as SearchResult | undefined;
      const items = sr?.Items ?? [];
      const keywords: string[] = [];

      for (const item of items) {
        const nodes = item.BrowseNodeInfo?.BrowseNodes ?? [];
        for (const child of (nodes[0]?.Children ?? []).slice(0, 3)) {
          if (child.DisplayName) keywords.push(child.DisplayName);
        }
      }

      return [...new Set(keywords)].slice(0, 10);
    } catch {
      return [];
    }
  }

  async testConnection(): Promise<ProviderTestResult> {
    const start = Date.now();
    try {
      await signedPaapiPost(
        'SearchItems',
        { Keywords: 'test', SearchIndex: 'All', Resources: [], ItemCount: 1 },
        3_000,
      );
      return { provider: this.id, ok: true, latencyMs: Date.now() - start };
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
