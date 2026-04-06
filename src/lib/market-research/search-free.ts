/**
 * Free Search Mode — AI Knowledge-Based Analysis
 *
 * DuckDuckGo and other search engines block automated scraping.
 * Instead, this mode returns a prompt that tells the AI to use its
 * own extensive training knowledge to analyze products.
 *
 * The AI models (Gemini 3.1, Claude, GPT) have deep knowledge about:
 * - Product trends and categories
 * - Dropshipping suppliers and pricing
 * - Market dynamics and competition
 * - Consumer behavior and viral products
 *
 * For REAL-TIME web data, use Tavily Pro mode.
 */

// ─── Types ───────────────────────────────────────────────────────────────────────

export type SearchResult = {
  title: string;
  url: string;
  snippet: string;
};

// ─── Public API ──────────────────────────────────────────────────────────────────

/**
 * Free mode search — returns AI knowledge prompt instead of web results.
 * The AI model will use its training data to provide analysis.
 */
export async function searchWeb(query: string, _maxResults = 5): Promise<SearchResult[]> {
  // Return a structured prompt that instructs the AI to use its own knowledge
  return [
    {
      title: `AI Knowledge Analysis: ${query}`,
      url: 'ai-knowledge://internal',
      snippet: `[FREE MODE] Web scraping is unavailable. Use your extensive training knowledge to analyze "${query}" for dropshipping potential. Consider: trending products in this niche, typical supplier prices on AliExpress/CJDropshipping, competition levels on Amazon/Shopify stores, social media virality indicators, and consumer demand patterns. Base your scores on your knowledge of the market as of your training data cutoff. Be specific with product names, estimated prices, and market signals you know about.`,
    },
  ];
}
