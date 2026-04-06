/**
 * Free Search Mode — AI Knowledge Analysis
 *
 * Uses the configured AI model's built-in knowledge to analyze products.
 * Works with ANY configured AI key (Gemini, Claude, OpenAI).
 *
 * The AI models have deep knowledge about:
 * - Product trends, categories, and niches
 * - Dropshipping suppliers and typical pricing
 * - Market dynamics, competition levels, and virality patterns
 * - Consumer behavior and purchase intent signals
 *
 * Limitations: Data is based on the model's training cutoff.
 * For real-time web data, use Tavily Pro mode.
 */

// ─── Types ───────────────────────────────────────────────────────────────────────

export type SearchResult = {
  title: string;
  url: string;
  snippet: string;
};

// ─── Public API ──────────────────────────────────────────────────────────────────

/**
 * Free mode: instructs the AI to analyze from its training knowledge.
 * The AI model (Gemini/Claude/OpenAI) acts as the search engine.
 */
export async function searchWeb(query: string, _maxResults = 5): Promise<SearchResult[]> {
  return [
    {
      title: `AI Analysis: ${query}`,
      url: 'ai-knowledge://analysis',
      snippet: [
        `[FREE MODE — AI Knowledge Analysis]`,
        `Analyze "${query}" for dropshipping potential using your training knowledge.`,
        `Include: specific product names, estimated supplier prices ($X-Y on AliExpress/CJDropshipping),`,
        `estimated retail prices, competition level (low/medium/high on Amazon and Shopify),`,
        `social media presence (TikTok, Instagram), target audience, and seasonality.`,
        `Be specific and data-oriented. Give real product examples, not generic categories.`,
      ].join(' '),
    },
  ];
}
