/**
 * Market Research API — Streaming AI research endpoint
 *
 * GET  /api/admin/market-research       — list research sessions
 * POST /api/admin/market-research       — start new research session (streaming)
 *
 * The POST endpoint creates a session, then streams an AI response
 * that calls the market research tools to systematically analyze products.
 * Uses the same streaming pattern as /api/admin/chat.
 */

import { streamText, stepCountIs } from 'ai';
import type { NextRequest } from 'next/server';
import { verifyAdminToken, ADMIN_TOKEN_COOKIE } from '@/lib/admin-auth';
import { getActiveProvider } from '@/lib/ai/config';
import { getApiKey } from '@/lib/ai/api-keys';
import { saveSession, getSession, listSessions } from '@/lib/market-research/store';
import { marketResearchTools } from '@/lib/market-research/tools';
import type { SearchMode, ResearchSession, ResearchResult } from '@/lib/market-research/types';

export const maxDuration = 120;
export const dynamic = 'force-dynamic';

// ─── Auth ──────────────────────────────────────────────────────────────────────

async function isAdmin(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get(ADMIN_TOKEN_COOKIE)?.value;
  if (!token) return false;
  const payload = await verifyAdminToken(token);
  return payload !== null;
}

// ─── Model Resolver — passes API key explicitly for runtime keys ──────────────

async function resolveModel(provider: string, modelName: string, apiKey?: string) {
  switch (provider) {
    case 'claude': {
      const { createAnthropic } = await import('@ai-sdk/anthropic');
      return createAnthropic({ apiKey: apiKey || process.env.ANTHROPIC_API_KEY || '' })(modelName);
    }
    case 'openai': {
      const { createOpenAI } = await import('@ai-sdk/openai');
      return createOpenAI({ apiKey: apiKey || process.env.OPENAI_API_KEY || '' })(modelName);
    }
    case 'gemini': {
      const { createGoogleGenerativeAI } = await import('@ai-sdk/google');
      return createGoogleGenerativeAI({
        apiKey: apiKey || process.env.GOOGLE_GENERATIVE_AI_API_KEY || '',
      })(modelName);
    }
    case 'ollama': {
      const { ollama } = await import('ollama-ai-provider');
      return ollama(modelName);
    }
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

// ─── Auto-detect best provider ────────────────────────────────────────────────

const PRIORITY: Array<'claude' | 'openai' | 'gemini'> = ['claude', 'openai', 'gemini'];
const DEFAULTS: Record<string, string> = {
  claude: 'claude-sonnet-4-5',
  openai: 'gpt-4o',
  gemini: 'gemini-3.1-pro-preview',
};

function autoDetect(preferred: string, preferredModel: string) {
  if (preferred === 'ollama') return { provider: 'ollama', model: preferredModel, key: '' };
  const k = getApiKey(preferred as 'claude' | 'openai' | 'gemini');
  if (k) return { provider: preferred, model: preferredModel, key: k };
  for (const p of PRIORITY) {
    if (p === preferred) continue;
    const key = getApiKey(p);
    if (key) return { provider: p, model: DEFAULTS[p], key };
  }
  return null;
}

// ─── System Prompt ────────────────────────────────────────────────────────────

function buildSystemPrompt(
  query: string,
  category: string | undefined,
  sessionId: string,
  searchMode: SearchMode,
): string {
  const modeLabel = searchMode === 'tavily' ? 'tavily' : 'free';
  return `You are a Market Intelligence Agent for StarBuy, a Shopify dropshipping store.

Your job is to find SPECIFIC, REAL PRODUCTS the user can buy RIGHT NOW on marketplaces.
- Query: "${query}"
${category ? `- Category: "${category}"` : ''}
- Session ID: ${sessionId}
- Search Mode: "${modeLabel}"

Note: The user's query may be in any language (English, Spanish, etc.). Always understand the intent and research products accordingly, but write your output in English.

## CRITICAL: The user wants DIRECT PRODUCT LINKS

The user does NOT want:
- Blog posts or articles about products
- TikTok videos or YouTube links talking about products
- Forum discussions or Reddit threads
- Generic category recommendations

The user DOES want:
- EXACT product names (e.g. "Baseus 65W GaN USB-C Charger")
- DIRECT links to buy on Amazon, AliExpress, Temu, eBay, Walmart
- REAL prices on each marketplace
- Price comparison across suppliers vs retail

## Research Methodology

Follow this EXACT sequence. You MUST call the tools in order with searchMode: "${modeLabel}":

1. **searchTrends** — Identify specific trending products in this niche
2. **searchTikTokTrends** — Find products going viral on TikTok (specific product names, not trends)
3. **searchCompetition** — Check competition for the specific products found
4. **searchSupplierPrices** — Find these EXACT products on AliExpress, CJDropshipping, Temu with prices and DIRECT links
5. **searchRetailProducts** — Find these EXACT products on Amazon, eBay, Walmart with prices and DIRECT links
6. **searchReviews** — Get customer feedback and quality signals
7. **saveResearchResult** — CRITICAL: Save EACH product with its marketplace listings. Session ID: "${sessionId}"

## CRITICAL RULE: You MUST include listings[]

When calling saveResearchResult, you MUST include the "listings" array with DIRECT product URLs.
Each listing MUST have:
- marketplace: "amazon" | "aliexpress" | "temu" | "cjdropshipping" | "ebay" | "walmart"
- productUrl: The DIRECT URL to the product page (user clicks → sees product → can buy)
- price: The actual price (e.g. "$12.99")
- title: Product title on that marketplace

Example listing:
{
  "marketplace": "aliexpress",
  "productUrl": "https://www.aliexpress.com/item/1005006XXXXX.html",
  "price": "$5.99",
  "currency": "USD",
  "title": "LED Galaxy Projector Night Light"
}

If you cannot find a direct URL, construct the marketplace search URL:
- Amazon: https://www.amazon.com/s?k=PRODUCT+NAME
- AliExpress: https://www.aliexpress.com/wholesale?SearchText=PRODUCT+NAME
- Temu: https://www.temu.com/search_result.html?search_key=PRODUCT+NAME

## CRITICAL RULE: You MUST call saveResearchResult

After analyzing products, you MUST call the saveResearchResult tool for each product.
Do NOT just write about products — you MUST save them using the tool.
If you skip saveResearchResult, the user sees ZERO results.

## Scoring Guidelines (0-100)

- **trend** (0-100): Based on search volume trends, social media buzz, growing vs declining
- **demand** (0-100): Based on sales data, search frequency, buyer intent signals
- **competition** (0-100): 100 = blue ocean (low competition), 0 = fully saturated
- **margin** (0-100): Based on supplier cost vs retail potential (>60% margin = high score)
- **overall**: Weighted composite — trend×0.25 + demand×0.25 + competition×0.25 + margin×0.25

## Recommendation Thresholds

- **hot**: overall ≥ 75, strong trend + low competition
- **promising**: overall 55-74, good fundamentals
- **saturated**: competition < 30 (too crowded)
- **pass**: overall < 40 or clear red flags

## Output Format

After saving all products with saveResearchResult, write a brief summary:

#### 1. Product Name
- Overall: XX/100 | Trend: XX | Demand: XX | Competition: XX | Margin: XX
- 🛒 AliExpress: $X.XX — [link]
- 🛒 Amazon: $XX.XX — [link]
- Margin: ~XX%
- Recommendation: hot/promising/saturated/pass
- Why: Brief reasoning

Repeat for each product (aim for 3-5 products minimum).

Be systematic, data-driven, and ALWAYS include direct product links. The user needs to click and buy.`;
}

// ─── Extract Products from AI Summary Text ────────────────────────────────────
// Fallback for when the AI describes products but doesn't call saveResearchResult.
// Parses markdown-style summaries with scores and product details.

function extractProductsFromSummary(summary: string): ResearchResult[] {
  const products: ResearchResult[] = [];

  // Split by product headers — very aggressive matching:
  // "#### 1." "### 1." "**1." "1. **" "1." (at line start) "Product 1:" etc
  const sections = summary.split(
    /(?=####?\s*\d+[\.\):]|(?=\*\*\d+[\.\):])|(?=\d+\.\s+\*\*)|(?=^#{1,4}\s+.+$)|(?=^\d+\.\s+[A-Z]))/m,
  );

  for (const section of sections) {
    if (section.trim().length < 30) continue;

    // Extract title — multiple patterns from most to least specific
    const titlePatterns = [
      /(?:#{2,4}\s*\d*[\.\):]*\s*)(.*?)(?:\n|$)/, // ### 1. Title
      /\*\*\d*[\.\):]*\s*(.*?)\*\*/, // **1. Title**
      /\d+\.\s+\*\*(.*?)\*\*/, // 1. **Title**
      /\d+[\.\)]\s+([A-Z][^\n]{3,60})/, // 1. Title (uppercase start)
      /^([A-Z][A-Za-z\s\-\/]{5,60})$/m, // Standalone title line
    ];

    let title = '';
    for (const pat of titlePatterns) {
      const m = section.match(pat);
      if (m?.[1]) {
        title = m[1].replace(/\*+/g, '').trim();
        break;
      }
    }

    if (!title || title.length < 3) continue;
    // Skip non-product headers
    if (/^(summary|conclusion|overview|risk|market|total|note)/i.test(title)) continue;

    // Extract scores
    const trendMatch = section.match(/[Tt]rend[:\s]*(\d+)/);
    const demandMatch = section.match(/[Dd]emand[:\s]*(\d+)/);
    const competitionMatch = section.match(/[Cc]ompetition[:\s]*(\d+)/);
    const marginMatch = section.match(/[Mm]argin[:\s]*(\d+)/);
    const overallMatch = section.match(/[Oo]verall[:\s]*(\d+[\.\d]*)/);

    const trend = trendMatch ? parseInt(trendMatch[1]) : 50;
    const demand = demandMatch ? parseInt(demandMatch[1]) : 50;
    const competition = competitionMatch ? parseInt(competitionMatch[1]) : 50;
    const margin = marginMatch ? parseInt(marginMatch[1]) : 50;
    const overall = overallMatch
      ? parseFloat(overallMatch[1])
      : Math.round(trend * 0.25 + demand * 0.25 + competition * 0.25 + margin * 0.25);

    // Extract prices
    const supplierMatch = section.match(
      /(?:[Ss]ourc|[Ss]upplier|[Cc]ost)[^\d$]*\$?([\d.]+)\s*[-–]\s*\$?([\d.]+)/,
    );
    const retailMatch = section.match(
      /(?:[Rr]etail|[Ss]elling|[Pp]rice)[^\d$]*\$?([\d.]+)\s*[-–]\s*\$?([\d.]+)/,
    );
    const marginPctMatch = section.match(/(?:[Mm]argin|[Pp]rofit)[^\d]*~?(\d+)%/);

    // Determine recommendation
    let recommendation: 'hot' | 'promising' | 'saturated' | 'pass' = 'promising';
    const lowerSection = section.toLowerCase();
    if (lowerSection.includes('hot') || overall >= 75) recommendation = 'hot';
    else if (lowerSection.includes('saturated') || competition < 30) recommendation = 'saturated';
    else if (overall < 40) recommendation = 'pass';

    // Extract reasoning (everything after scores, first ~300 chars of prose)
    const reasoningMatch = section.match(
      /(?:[Ww]hy it wins|[Rr]eason|[Ww]hy)[:\s]*([^\n]+(?:\n(?![\n#])[^\n]+)*)/,
    );
    const reasoning =
      reasoningMatch?.[1]?.replace(/\*+/g, '').trim().slice(0, 400) ??
      `AI-identified product with overall score of ${overall}/100.`;

    products.push({
      id: `extracted-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title,
      description: reasoning.slice(0, 200),
      scores: { trend, demand, competition, margin, overall },
      listings: [],
      signals: [
        {
          source: 'AI Analysis',
          indicator: `Overall score: ${overall}/100`,
          strength: overall >= 70 ? 'strong' : overall >= 50 ? 'moderate' : 'weak',
        },
        ...(trendMatch
          ? [
              {
                source: 'Trend',
                indicator: `Trend score: ${trend}/100`,
                strength: (trend >= 70 ? 'strong' : 'moderate') as 'strong' | 'moderate' | 'weak',
              },
            ]
          : []),
        ...(lowerSection.includes('tiktok')
          ? [
              {
                source: 'TikTok',
                indicator: 'Viral potential detected',
                strength: 'strong' as const,
              },
            ]
          : []),
      ],
      priceRange: {
        supplier: supplierMatch ? `$${supplierMatch[1]}-${supplierMatch[2]}` : 'Research needed',
        retail: retailMatch ? `$${retailMatch[1]}-${retailMatch[2]}` : 'Research needed',
        marginPercent: marginPctMatch
          ? `${marginPctMatch[1]}%`
          : `~${Math.round((1 - 0.4) * 100)}%`,
      },
      recommendation,
      reasoning,
      sources: [],
      researchedAt: Date.now(),
    });
  }

  return products;
}

// ─── GET — List sessions ──────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  if (!(await isAdmin(request))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const sessions = listSessions();
    return Response.json({ sessions });
  } catch (err) {
    console.error('[api/admin/market-research] GET error:', err);
    return Response.json({ error: 'Failed to list sessions' }, { status: 500 });
  }
}

// ─── POST — Start new research session (streaming) ───────────────────────────

export async function POST(request: NextRequest) {
  if (!(await isAdmin(request))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Parse body
  let query: string;
  let category: string | undefined;
  let searchMode: SearchMode;

  try {
    const body = (await request.json()) as {
      query?: string;
      category?: string;
      searchMode?: string;
    };
    query = body.query?.trim() ?? '';
    category = body.category?.trim() || undefined;
    searchMode = body.searchMode === 'tavily' ? 'tavily' : 'free';
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!query) {
    return Response.json({ error: 'query is required' }, { status: 400 });
  }

  // Auto-detect best provider with a configured API key
  const { provider: configuredProvider, model: configuredModel } = getActiveProvider();
  const resolved = autoDetect(configuredProvider, configuredModel);

  if (!resolved) {
    return Response.json(
      { error: 'No AI provider configured. Go to Settings and add at least one API key.' },
      { status: 503 },
    );
  }

  const { provider, model: modelName, key: apiKey } = resolved;

  // Validate Tavily key if tavily mode is requested
  if (searchMode === 'tavily') {
    const tavilyKey = getApiKey('tavily');
    if (!tavilyKey) {
      return Response.json(
        {
          error:
            'Tavily API key not configured. Add TAVILY_API_KEY to .env.local or switch to free mode.',
        },
        { status: 503 },
      );
    }
  }

  // Create session record
  const sessionId = `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const session: ResearchSession = {
    id: sessionId,
    query,
    category,
    searchMode,
    status: 'running',
    results: [],
    createdAt: Date.now(),
  };
  saveSession(session);

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const model = (await resolveModel(provider, modelName, apiKey)) as any;
    const systemPrompt = buildSystemPrompt(query, category, sessionId, searchMode);

    const result = streamText({
      model,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Research winning dropshipping products for: "${query}"${category ? ` in the "${category}" category` : ''}. Use search mode: ${searchMode}. Session ID: ${sessionId}`,
        },
      ],
      tools: marketResearchTools,
      stopWhen: stepCountIs(15),
      onFinish: async (event: { text: string }) => {
        // Re-read session to get any tool-saved results
        const currentSession = getSession(sessionId) ?? session;
        const summary = event.text.slice(0, 3000);

        // If AI described products in text but didn't call saveResearchResult (common with Gemini),
        // parse the summary to extract products automatically.
        if (currentSession.results.length === 0 && summary.length > 100) {
          const extracted = extractProductsFromSummary(summary);
          if (extracted.length > 0) {
            currentSession.results.push(...extracted);
            console.log(
              `[market-research] Extracted ${extracted.length} products from AI summary (tool calling missed)`,
            );
          }
        }

        const updatedSession = {
          ...currentSession,
          status: 'complete' as const,
          summary,
          completedAt: Date.now(),
        };
        saveSession(updatedSession);
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    // Attach session ID as a response header so the client can poll for results
    const response = result.toUIMessageStreamResponse();
    const headers = new Headers(response.headers);
    headers.set('x-session-id', sessionId);
    headers.set('x-search-mode', searchMode);

    return new Response(response.body, {
      status: response.status,
      headers,
    });
  } catch (err) {
    console.error(`[api/admin/market-research] ${provider}/${modelName} error:`, err);

    // Mark session as failed
    saveSession({ ...session, status: 'failed', error: (err as Error).message });

    return Response.json(
      { error: `AI error (${provider}/${modelName}): ${(err as Error).message}` },
      { status: 500 },
    );
  }
}
