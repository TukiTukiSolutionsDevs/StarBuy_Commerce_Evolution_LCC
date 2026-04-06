/**
 * Tavily Search — API-based web search
 *
 * Uses the Tavily Search API for high-quality, structured results.
 * Requires TAVILY_API_KEY (configured in admin settings or .env.local).
 *
 * Reads the API key via the existing api-keys.ts system.
 */

import { getApiKey } from '@/lib/ai/api-keys';
import type { SearchResult } from './search-free';

// ─── Types ───────────────────────────────────────────────────────────────────────

export type TavilyResultItem = {
  title: string;
  url: string;
  content: string;
  score?: number;
};

export type TavilyResult = {
  answer?: string;
  results: TavilyResultItem[];
  query: string;
};

export type TavilySearchOptions = {
  searchDepth?: 'basic' | 'advanced';
  maxResults?: number;
  includeAnswer?: boolean;
};

// ─── Public API ──────────────────────────────────────────────────────────────────

/**
 * Search using the Tavily API.
 * Throws if the API key is not configured or the request fails.
 */
export async function searchTavily(
  query: string,
  options?: TavilySearchOptions,
): Promise<TavilyResult> {
  const apiKey = getApiKey('tavily');
  if (!apiKey) {
    throw new Error(
      'Tavily API key not configured. Add TAVILY_API_KEY to .env.local or configure it in Admin Settings.',
    );
  }

  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      search_depth: options?.searchDepth ?? 'basic',
      max_results: options?.maxResults ?? 5,
      include_answer: options?.includeAnswer ?? true,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Tavily API error ${res.status}: ${body}`);
  }

  return res.json() as Promise<TavilyResult>;
}

/**
 * Search with Tavily and normalize to the shared SearchResult shape.
 * Throws if the API key is not configured or the request fails.
 */
export async function searchTavilyNormalized(
  query: string,
  options?: TavilySearchOptions,
): Promise<SearchResult[]> {
  const result = await searchTavily(query, options);
  return result.results.map((r) => ({
    title: r.title,
    url: r.url,
    snippet: r.content,
  }));
}
