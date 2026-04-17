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
import type { SearchMode, ResearchResult, ResearchSignal, MarketplaceListing } from './types';
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
    'Find DIRECT product listings with prices on supplier marketplaces (AliExpress, CJDropshipping, Temu). Returns actual product page URLs where you can see the price and buy.',
  inputSchema: zodSchema(
    z.object({
      query: z
        .string()
        .describe('Specific product name to find on supplier sites (e.g. "LED galaxy projector")'),
      searchMode: SearchModeSchema,
      maxResults: z.number().int().min(1).max(10).optional().default(5),
    }),
  ),
  execute: async ({ query, searchMode, maxResults = 5 }) => {
    // Search each marketplace separately for direct product links
    const aliQuery = `site:aliexpress.com "${query}" price`;
    const cjQuery = `site:cjdropshipping.com "${query}"`;
    const temuQuery = `site:temu.com "${query}" price`;

    const [aliResults, cjResults, temuResults] = await Promise.all([
      search(aliQuery, searchMode as SearchMode, maxResults),
      search(cjQuery, searchMode as SearchMode, Math.ceil(maxResults / 2)),
      search(temuQuery, searchMode as SearchMode, Math.ceil(maxResults / 2)),
    ]);

    return {
      query,
      aliexpress: aliResults,
      cjdropshipping: cjResults,
      temu: temuResults,
    };
  },
});

// ─── Tool 4b: searchRetailProducts ────────────────────────────────────────────────

export const searchRetailProductsTool = tool({
  description:
    'Find DIRECT product listings on retail marketplaces (Amazon, eBay, Walmart) with prices and ratings. Returns actual product page URLs the user can click to see and buy.',
  inputSchema: zodSchema(
    z.object({
      query: z
        .string()
        .describe('Specific product name to find on Amazon (e.g. "LED galaxy projector")'),
      searchMode: SearchModeSchema,
      maxResults: z.number().int().min(1).max(10).optional().default(5),
    }),
  ),
  execute: async ({ query, searchMode, maxResults = 5 }) => {
    const amazonQuery = `site:amazon.com "${query}" price`;
    const ebayQuery = `site:ebay.com "${query}" price`;
    const walmartQuery = `site:walmart.com "${query}" price`;

    const [amazonResults, ebayResults, walmartResults] = await Promise.all([
      search(amazonQuery, searchMode as SearchMode, maxResults),
      search(ebayQuery, searchMode as SearchMode, Math.ceil(maxResults / 2)),
      search(walmartQuery, searchMode as SearchMode, Math.ceil(maxResults / 2)),
    ]);

    return {
      query,
      amazon: amazonResults,
      ebay: ebayResults,
      walmart: walmartResults,
    };
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
          title: z.string().describe('Product title — the exact product name'),
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
          listings: z
            .array(
              z.object({
                marketplace: z
                  .enum([
                    'amazon',
                    'aliexpress',
                    'temu',
                    'cjdropshipping',
                    'ebay',
                    'walmart',
                    'other',
                  ])
                  .describe('Which marketplace this listing is from'),
                productUrl: z
                  .string()
                  .describe(
                    'DIRECT URL to the product page — user clicks and sees the product ready to buy',
                  ),
                price: z
                  .string()
                  .describe('Price on this marketplace (e.g. "$12.99" or "$8.50-$15.00")'),
                currency: z.string().optional().default('USD').describe('Currency code'),
                title: z.string().describe('Product title as shown on this marketplace'),
                rating: z.string().optional().describe('Rating (e.g. "4.5/5 (2,340 reviews)")'),
                shippingInfo: z
                  .string()
                  .optional()
                  .describe('Shipping info (e.g. "Free shipping", "Ships in 7-15 days")'),
                imageUrl: z.string().optional().describe('Product image URL from the marketplace'),
              }),
            )
            .describe(
              'REQUIRED: Direct product listings on marketplaces. Each must have a real productUrl the user can click to see and buy the product.',
            ),
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
        .describe('Fully scored research result with DIRECT marketplace links'),
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
      listings: (result.listings ?? []) as MarketplaceListing[],
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
  searchRetailProducts: searchRetailProductsTool,
  searchReviews: searchReviewsTool,
  saveResearchResult: saveResearchResultTool,
};
