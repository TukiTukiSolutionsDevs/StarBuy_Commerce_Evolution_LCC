/**
 * Admin Chat API — Multi-provider streaming AI endpoint
 *
 * POST /api/admin/chat
 * Supports: Claude, OpenAI, Gemini, Ollama (local)
 * Provider selection from admin settings (runtime, no restart needed)
 *
 * Uses the multi-agent orchestrator to route messages to specialist agents.
 * Each specialist gets a focused system prompt and a filtered tool subset.
 */

import { streamText, stepCountIs } from 'ai';
import type { NextRequest } from 'next/server';
import { adminTools } from '@/lib/ai/tools';
import { getActiveProvider } from '@/lib/ai/config';
import { verifyAdminToken, ADMIN_TOKEN_COOKIE } from '@/lib/admin-auth';
import { routeMessage, getAgentTools, getAgent } from '@/lib/ai/agents';

export const dynamic = 'force-dynamic';

// ─── Auth ──────────────────────────────────────────────────────────────────────

async function isAdmin(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get(ADMIN_TOKEN_COOKIE)?.value;
  if (!token) return false;
  const payload = await verifyAdminToken(token);
  return payload !== null;
}

// ─── Fallback System Prompt ─────────────────────────────────────────────────────
// Used only when routing fails completely

const FALLBACK_SYSTEM_PROMPT = `You are Starbuy Admin Assistant. You help manage a Shopify store called Starbuy.

You can:
- Search, create, update, and delete products
- Manage orders (view, cancel, fulfill, refund)
- Manage customers (search, create, update, delete)
- Check and update inventory levels
- Manage collections (list, add/remove products)
- Create and list discount codes

Guidelines:
- Always confirm with the user BEFORE executing destructive actions (delete, cancel, refund)
- When showing product/order data, present it in a clear, structured format
- For errors, explain what went wrong and suggest next steps
- Be concise and direct — admins are busy
- Respond in the same language the user writes in
- When creating products, ask for missing required info before proceeding`;

// ─── Model Resolver ────────────────────────────────────────────────────────────

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

// ─── POST ──────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  if (!(await isAdmin(request))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get active provider from settings
  const { provider, model: modelName } = getActiveProvider();

  // Validate API key exists (except Ollama which is local)
  const keyMap: Record<string, string> = {
    claude: 'ANTHROPIC_API_KEY',
    openai: 'OPENAI_API_KEY',
    gemini: 'GOOGLE_GENERATIVE_AI_API_KEY',
  };

  if (provider !== 'ollama') {
    const envKey = keyMap[provider];
    if (!envKey || !process.env[envKey]) {
      return Response.json(
        {
          error: `${provider.toUpperCase()} API key not configured. Add ${envKey} to .env.local or switch provider in Settings.`,
        },
        { status: 503 },
      );
    }
  }

  // Parse messages
  let messages: Array<{ role: string; content: string }>;
  try {
    const body = (await request.json()) as { messages?: Array<{ role: string; content: string }> };
    messages = body.messages ?? [];
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!messages.length) {
    return Response.json({ error: 'No messages provided' }, { status: 400 });
  }

  // ─── Orchestrator: route last user message to specialist agent ──────────────
  const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user');

  let systemPrompt = FALLBACK_SYSTEM_PROMPT;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let tools: Record<string, any> = adminTools;
  let routingDecision: ReturnType<typeof routeMessage> | null = null;

  if (lastUserMessage?.content) {
    try {
      routingDecision = routeMessage(lastUserMessage.content);
      const agent = getAgent(routingDecision.agentId);

      if (agent) {
        systemPrompt = agent.systemPrompt;
        tools = getAgentTools(routingDecision.agentId);

        console.log(
          `[orchestrator] → ${agent.name} (${routingDecision.agentId}) | confidence=${routingDecision.confidence} | ${routingDecision.reasoning}`,
        );
      }
    } catch (err) {
      console.warn('[orchestrator] routing failed, using fallback:', err);
    }
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const model = (await resolveModel(provider, modelName)) as any;

    const result = streamText({
      model,
      system: systemPrompt,
      messages: messages as any,
      tools,
      stopWhen: stepCountIs(5),
    } as any);

    // Include routing metadata as a custom annotation in the stream response
    const response = result.toUIMessageStreamResponse();

    // Attach routing info as response headers for debugging/UI consumption
    if (routingDecision) {
      const headers = new Headers(response.headers);
      headers.set('x-agent-id', routingDecision.agentId);
      headers.set('x-agent-confidence', String(routingDecision.confidence));
      headers.set('x-agent-reasoning', routingDecision.reasoning.slice(0, 200));

      return new Response(response.body, {
        status: response.status,
        headers,
      });
    }

    return response;
  } catch (err) {
    console.error(`[api/admin/chat] ${provider}/${modelName} error:`, err);
    return Response.json(
      { error: `AI error (${provider}/${modelName}): ${(err as Error).message}` },
      { status: 500 },
    );
  }
}
