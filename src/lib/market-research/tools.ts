/**
 * Market Research Agent — AI SDK Tool Definitions
 *
 * 6 tools for the market research agent.
 * Each tool supports dual-mode search: free (DuckDuckGo) or tavily (API).
 * The session's searchMode is passed as a parameter to each search tool.
 *
 * Pattern follows src/lib/ai/tools.ts — uses `tool` + `zodSchema` from 'ai'.
 */

import { tool, zodSchema } from 'ai';
import { z } from 'zod';
import { searchWeb } from './search-free';
import { searchTavilyNormalized } from './search-tavily';
import { saveSession, getSession } from './store';
import type { SearchMode, ResearchResult, ResearchSignal } from './types';
import type { SearchResult } from './search-free';

// ─── Shared search dispatcher ─────────────────────────────────────────────────────

async function search(query: string, mode: SearchMode, maxResults = 5): Promise<SearchResult[]> {
  if (mode === 'tavily') {
    try {
      return await searchTavilyNormalized(query, { maxResults });
    } catch (err) {
      console.warn('[market-research/tools] Tavily failed, falling back to free search:', err);
      return searchWeb(query, maxResults);
    }
  }
  return searchWeb(query, maxResults);
}

// ─── Zod schemas (shared) ─────────────────────────────────────────────────────────

const SearchModeSchema = z.enum(['free', 'tavily']).describe('Search mode to use');

// SearchResult schema used as reference for tool output types
// const SearchResultSchema = z.object({ title: z.string(), url: z.string(), snippet: z.string() });

// ─── Tool 1: searchTrends ─────────────────────────────────────────────────────────

export const searchTrendsTool = tool({
  description:
    'Search for trending products in a niche or category. Returns web results about trending dropshipping products, viral items, and market trends for 2025.',
  inputSchema: zodSchema(
    z.object({
      query: z.string().describe('Product niche or category to research (e.g. "pet accessories")'),
      searchMode: SearchModeSchema,
      maxResults: z.number().int().min(1).max(10).optional().default(5),
    }),
  ),
  execute: async ({ query, searchMode, maxResults = 5 }) => {
    const fullQuery = `${query} trending products 2025 dropshipping`;
    const results = await search(fullQuery, searchMode as SearchMode, maxResults);
    return { query: fullQuery, results };
  },
});

// ─── Tool 2: searchTikTokTrends ───────────────────────────────────────────────────

export const searchTikTokTrendsTool = tool({
  description:
    'Search for TikTok viral products and social media trends. Returns results about viral TikTok products, trending hashtags, and social commerce opportunities.',
  inputSchema: zodSchema(
    z.object({
      query: z.string().describe('Product or niche to check TikTok virality for'),
      searchMode: SearchModeSchema,
      maxResults: z.number().int().min(1).max(10).optional().default(5),
    }),
  ),
  execute: async ({ query, searchMode, maxResults = 5 }) => {
    const fullQuery = `${query} tiktok viral products trending`;
    const results = await search(fullQuery, searchMode as SearchMode, maxResults);
    return { query: fullQuery, results };
  },
});

// ─── Tool 3: searchCompetition ────────────────────────────────────────────────────

export const searchCompetitionTool = tool({
  description:
    'Analyze competition and market saturation for a product. Returns data on Amazon best sellers, market saturation, and competitive landscape.',
  inputSchema: zodSchema(
    z.object({
      query: z.string().describe('Product to analyze competition for'),
      searchMode: SearchModeSchema,
      maxResults: z.number().int().min(1).max(10).optional().default(5),
    }),
  ),
  execute: async ({ query, searchMode, maxResults = 5 }) => {
    const fullQuery = `${query} amazon best seller competition saturation`;
    const results = await search(fullQuery, searchMode as SearchMode, maxResults);
    return { query: fullQuery, results };
  },
});

// ─── Tool 4: searchSupplierPrices ─────────────────────────────────────────────────

export const searchSupplierPricesTool = tool({
  description:
    'Find supplier prices from AliExpress, CJDropshipping, and other wholesale sources. Returns pricing data to calculate potential margins.',
  inputSchema: zodSchema(
    z.object({
      query: z.string().describe('Product to find supplier prices for'),
      searchMode: SearchModeSchema,
      maxResults: z.number().int().min(1).max(10).optional().default(5),
    }),
  ),
  execute: async ({ query, searchMode, maxResults = 5 }) => {
    const fullQuery = `${query} aliexpress cjdropshipping price wholesale`;
    const results = await search(fullQuery, searchMode as SearchMode, maxResults);
    return { query: fullQuery, results };
  },
});

// ─── Tool 5: searchReviews ────────────────────────────────────────────────────────

export const searchReviewsTool = tool({
  description:
    'Search for customer reviews, ratings, and feedback for a product. Returns quality indicators and customer sentiment to assess product viability.',
  inputSchema: zodSchema(
    z.object({
      query: z.string().describe('Product to find reviews and ratings for'),
      searchMode: SearchModeSchema,
      maxResults: z.number().int().min(1).max(10).optional().default(5),
    }),
  ),
  execute: async ({ query, searchMode, maxResults = 5 }) => {
    const fullQuery = `${query} reviews rating customer feedback`;
    const results = await search(fullQuery, searchMode as SearchMode, maxResults);
    return { query: fullQuery, results };
  },
});

// ─── Tool 6: saveResearchResult ───────────────────────────────────────────────────

export const saveResearchResultTool = tool({
  description:
    'Save a fully scored and analyzed research result to the session store. Call this once per promising product after completing all other research steps.',
  inputSchema: zodSchema(
    z.object({
      sessionId: z.string().describe('The research session ID to save this result into'),
      result: z
        .object({
          title: z.string().describe('Product title'),
          description: z.string().describe('Product description and key features'),
          scores: z.object({
            trend: z.number().min(0).max(100).describe('Trend score 0-100'),
            demand: z.number().min(0).max(100).describe('Demand score 0-100'),
            competition: z
              .number()
              .min(0)
              .max(100)
              .describe('Competition score 0-100 (100 = blue ocean)'),
            margin: z.number().min(0).max(100).describe('Margin score 0-100'),
            overall: z.number().min(0).max(100).describe('Weighted overall score 0-100'),
          }),
          signals: z
            .array(
              z.object({
                source: z.string().describe('Signal source (e.g. TikTok, Amazon)'),
                indicator: z.string().describe('Signal description (e.g. "47K videos in 30d")'),
                strength: z.enum(['strong', 'moderate', 'weak']),
              }),
            )
            .describe('Evidence signals supporting the analysis'),
          priceRange: z.object({
            supplier: z.string().describe('Supplier cost (e.g. "$5-8")'),
            retail: z.string().describe('Suggested retail price (e.g. "$25-35")'),
            marginPercent: z.string().describe('Estimated margin (e.g. "68%")'),
          }),
          recommendation: z
            .enum(['hot', 'promising', 'saturated', 'pass'])
            .describe('Final recommendation'),
          reasoning: z.string().describe('Detailed reasoning for the recommendation'),
          sources: z
            .array(
              z.object({
                title: z.string(),
                url: z.string(),
                snippet: z.string(),
              }),
            )
            .describe('Source URLs used in the research'),
        })
        .describe('Fully scored research result'),
    }),
  ),
  execute: async ({ sessionId, result }) => {
    const session = getSession(sessionId);
    if (!session) {
      return { success: false, error: `Session ${sessionId} not found` };
    }

    const researchResult: ResearchResult = {
      id: `result-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      ...result,
      signals: result.signals as ResearchSignal[],
      researchedAt: Date.now(),
    };

    session.results.push(researchResult);
    saveSession(session);

    return {
      success: true,
      resultId: researchResult.id,
      savedAt: researchResult.researchedAt,
    };
  },
});

// ─── All market research tools export ────────────────────────────────────────────

export const marketResearchTools = {
  searchTrends: searchTrendsTool,
  searchTikTokTrends: searchTikTokTrendsTool,
  searchCompetition: searchCompetitionTool,
  searchSupplierPrices: searchSupplierPricesTool,
  searchReviews: searchReviewsTool,
  saveResearchResult: saveResearchResultTool,
};
