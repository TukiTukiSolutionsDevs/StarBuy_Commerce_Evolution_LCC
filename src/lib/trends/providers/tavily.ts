/**
 * Tavily Provider — AI Web Search
 *
 * IMPORTANT: Reuses Tavily key from src/lib/ai/api-keys.ts.
 * Do NOT add tavily to trends/api-keys.ts.
 *
 * Searches for trend signals in web content and parses them into TrendResult.
 * Confidence: 0.4 (AI inference, not raw data).
 * Timeout: 20s via AbortController.
 */

import type {
  TrendResult,
  TrendProvider,
  TrendState,
  SearchOptions,
  ProviderTestResult,
} from '../types';
import { getApiKey } from '@/lib/ai/api-keys';
import { getCategoryById } from '../categories';
import { buildCacheKey, getCached, setCached } from '../store';
import { readConfig } from '../config';

const BASE_URL = 'https://api.tavily.com';
const TIMEOUT_MS = 20_000;

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
  'be',
  'been',
  'being',
  'have',
  'has',
  'had',
  'do',
  'does',
  'did',
  'will',
  'would',
  'could',
  'should',
  'may',
  'might',
  'this',
  'that',
  'these',
  'those',
  'it',
  'its',
  'as',
  'up',
  'out',
  'not',
  'so',
  'if',
  'about',
  'than',
  'into',
  'through',
  'more',
  'also',
  'their',
  'they',
  'them',
  'we',
  'you',
  'your',
  'our',
  'can',
  'now',
  'new',
  'most',
  'many',
  'such',
]);

function extractKeywords(texts: string[]): string[] {
  const freq = new Map<string, number>();
  const combined = texts.join(' ').toLowerCase();
  const words = combined.match(/\b[a-z]{4,}\b/g) ?? [];

  for (const word of words) {
    if (!STOP_WORDS.has(word)) {
      freq.set(word, (freq.get(word) ?? 0) + 1);
    }
  }

  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([w]) => w)
    .slice(0, 10);
}

function scoreFromAnswer(answer: string): { score: number; state: TrendState } {
  const lower = answer.toLowerCase();

  if (/rising|trending up|popular|surge|growing|viral|hot\b|demand|booming|spike/.test(lower)) {
    return { score: 75, state: 'rising' };
  }
  if (/declining|saturated|fading|dropping|less popular|decreasing|oversaturated/.test(lower)) {
    return { score: 28, state: 'declining' };
  }
  if (/stable|consistent|steady|maintained|unchanged/.test(lower)) {
    return { score: 52, state: 'stable' };
  }
  return { score: 50, state: 'unknown' };
}

// ─── HTTP helper ──────────────────────────────────────────────────────────────

function makeAbortSignal(timeoutMs: number): AbortSignal {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), timeoutMs);
  return controller.signal;
}

async function tavilyPost(
  apiKey: string,
  payload: Record<string, unknown>,
  timeoutMs = TIMEOUT_MS,
): Promise<Record<string, unknown>> {
  const res = await fetch(`${BASE_URL}/search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
    signal: makeAbortSignal(timeoutMs),
  });
  if (!res.ok) throw new Error(`Tavily HTTP ${res.status}`);
  return (await res.json()) as Record<string, unknown>;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export class TavilyProvider implements TrendProvider {
  readonly id = 'tavily' as const;
  readonly name = 'Tavily AI Search';
  readonly reliability = 'MEDIUM' as const;

  async searchTrend(keywords: string[], options?: SearchOptions): Promise<TrendResult[]> {
    const apiKey = getApiKey('tavily');
    if (!apiKey) return [];

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
        type SearchResult = { content?: string };
        const data = await tavilyPost(apiKey, {
          query: `trending products ${keyword} 2025 demand statistics`,
          search_depth: 'basic',
          max_results: 5,
          include_answer: true,
        });

        const answer = (data?.answer as string) ?? '';
        const searchResults = (data?.results as SearchResult[] | undefined) ?? [];
        const { score, state } = scoreFromAnswer(answer);
        const contents = searchResults.map((r) => r.content ?? '').filter(Boolean);
        const relatedKeywords = extractKeywords([answer, ...contents]);

        const result: TrendResult = {
          keyword,
          score,
          state,
          timestamp: Date.now(),
          source: this.id,
          relatedKeywords,
          metadata: {
            region,
            rawScore: score,
            confidence: 0.4,
            category: options?.categoryId,
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

  async getCategoryTrends(categoryId: string, _options?: SearchOptions): Promise<TrendResult[]> {
    const apiKey = getApiKey('tavily');
    if (!apiKey) return [];

    const category = getCategoryById(categoryId);
    if (!category) return [];

    try {
      type SearchResult = { content?: string };
      const data = await tavilyPost(apiKey, {
        query: `top trending products ${category.label} 2025`,
        search_depth: 'basic',
        max_results: 5,
        include_answer: true,
      });

      const answer = (data?.answer as string) ?? '';
      const searchResults = (data?.results as SearchResult[] | undefined) ?? [];
      const { score, state } = scoreFromAnswer(answer);
      const contents = searchResults.map((r) => r.content ?? '').filter(Boolean);
      const relatedKeywords = extractKeywords([answer, ...contents]);

      return [
        {
          keyword: category.label,
          score,
          state,
          timestamp: Date.now(),
          source: this.id,
          relatedKeywords,
          metadata: { confidence: 0.4, category: categoryId },
        },
      ];
    } catch {
      return [];
    }
  }

  async getRelatedKeywords(keyword: string, _options?: SearchOptions): Promise<string[]> {
    const apiKey = getApiKey('tavily');
    if (!apiKey) return [];

    try {
      type SearchResult = { content?: string };
      const data = await tavilyPost(apiKey, {
        query: `${keyword} related products trends 2025`,
        search_depth: 'basic',
        max_results: 5,
        include_answer: false,
      });

      const searchResults = (data?.results as SearchResult[] | undefined) ?? [];
      const contents = searchResults.map((r) => r.content ?? '').filter(Boolean);
      return extractKeywords(contents);
    } catch {
      return [];
    }
  }

  async testConnection(): Promise<ProviderTestResult> {
    const start = Date.now();
    const apiKey = getApiKey('tavily');

    if (!apiKey) {
      return { provider: this.id, ok: false, latencyMs: 0, error: 'No API key configured' };
    }

    try {
      const data = await tavilyPost(apiKey, { query: 'test', max_results: 1 }, 3_000);
      const ok = Array.isArray(data?.results);
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
