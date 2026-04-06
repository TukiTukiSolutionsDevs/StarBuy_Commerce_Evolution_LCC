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
import { saveSession, listSessions } from '@/lib/market-research/store';
import { marketResearchTools } from '@/lib/market-research/tools';
import type { SearchMode, ResearchSession } from '@/lib/market-research/types';

export const maxDuration = 120;
export const dynamic = 'force-dynamic';

// ─── Auth ──────────────────────────────────────────────────────────────────────

async function isAdmin(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get(ADMIN_TOKEN_COOKIE)?.value;
  if (!token) return false;
  const payload = await verifyAdminToken(token);
  return payload !== null;
}

// ─── Model Resolver (mirrors chat/route.ts) ───────────────────────────────────

async function resolveModel(provider: string, modelName: string) {
  switch (provider) {
    case 'claude': {
      const { anthropic } = await import('@ai-sdk/anthropic');
      return anthropic(modelName);
    }
    case 'openai': {
      const { openai } = await import('@ai-sdk/openai');
      return openai(modelName);
    }
    case 'gemini': {
      const { google } = await import('@ai-sdk/google');
      return google(modelName);
    }
    case 'ollama': {
      const { ollama } = await import('ollama-ai-provider');
      return ollama(modelName);
    }
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

// ─── System Prompt ────────────────────────────────────────────────────────────

function buildSystemPrompt(query: string, category: string | undefined, sessionId: string): string {
  return `You are a Market Intelligence Agent for StarBuy, a Shopify dropshipping store.

Your job is to research winning products for the following request:
- Query: "${query}"
${category ? `- Category: "${category}"` : ''}
- Session ID: ${sessionId}

## Research Methodology

Follow this EXACT sequence for each promising product candidate you identify:

1. **searchTrends** — Search for trending products in this niche
2. **searchTikTokTrends** — Check TikTok viral potential
3. **searchCompetition** — Analyze competition and market saturation
4. **searchSupplierPrices** — Find wholesale costs on AliExpress/CJDropshipping
5. **searchReviews** — Get customer feedback and product quality signals
6. **saveResearchResult** — Save scored results to session (sessionId: "${sessionId}")

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

After all research is complete, write a structured summary:
- Total products analyzed
- Top recommendations with key metrics
- Market insights for the niche
- Risk factors identified

Be systematic, data-driven, and concise. Use the tools in the sequence above.`;
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

  // Get active AI provider
  const { provider, model: modelName } = getActiveProvider();

  // Validate API key (except Ollama)
  if (provider !== 'ollama') {
    const key = getApiKey(provider as 'claude' | 'openai' | 'gemini');
    if (!key) {
      const envKeyMap: Record<string, string> = {
        claude: 'ANTHROPIC_API_KEY',
        openai: 'OPENAI_API_KEY',
        gemini: 'GOOGLE_GENERATIVE_AI_API_KEY',
      };
      const envKey = envKeyMap[provider] ?? `${provider.toUpperCase()}_API_KEY`;
      return Response.json(
        {
          error: `${provider.toUpperCase()} API key not configured. Add it in Settings → API Keys or set ${envKey} in .env.local.`,
        },
        { status: 503 },
      );
    }
  }

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
    const model = (await resolveModel(provider, modelName)) as any;
    const systemPrompt = buildSystemPrompt(query, category, sessionId);

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
        // Mark session as complete with summary
        const updatedSession = {
          ...session,
          status: 'complete' as const,
          summary: event.text.slice(0, 2000),
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
