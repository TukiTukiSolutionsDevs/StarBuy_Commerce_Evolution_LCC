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
import { getApiKey } from '@/lib/ai/api-keys';
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
// Passes the API key explicitly so runtime-stored keys (from Settings UI) work.

async function resolveModel(provider: string, modelName: string, apiKey?: string) {
  switch (provider) {
    case 'claude': {
      const { createAnthropic } = await import('@ai-sdk/anthropic');
      const client = createAnthropic({ apiKey: apiKey || process.env.ANTHROPIC_API_KEY || '' });
      return client(modelName);
    }
    case 'openai': {
      const { createOpenAI } = await import('@ai-sdk/openai');
      const client = createOpenAI({ apiKey: apiKey || process.env.OPENAI_API_KEY || '' });
      return client(modelName);
    }
    case 'gemini': {
      const { createGoogleGenerativeAI } = await import('@ai-sdk/google');
      const client = createGoogleGenerativeAI({
        apiKey: apiKey || process.env.GOOGLE_GENERATIVE_AI_API_KEY || '',
      });
      return client(modelName);
    }
    case 'ollama': {
      const { ollama } = await import('ollama-ai-provider');
      return ollama(modelName);
    }
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

// ─── Auto-detect best available provider ──────────────────────────────────────
// If the configured provider has no key, fall back to whichever provider DOES have one.

const PROVIDER_PRIORITY: Array<'claude' | 'openai' | 'gemini'> = ['claude', 'openai', 'gemini'];
const DEFAULT_MODELS: Record<string, string> = {
  claude: 'claude-sonnet-4-5',
  openai: 'gpt-4o',
  gemini: 'gemini-3.1-pro-preview',
};

function autoDetectProvider(
  preferred: string,
  preferredModel: string,
): { provider: string; model: string; key: string } | null {
  // Try preferred first
  if (preferred === 'ollama') return { provider: 'ollama', model: preferredModel, key: '' };
  const prefKey = getApiKey(preferred as 'claude' | 'openai' | 'gemini');
  if (prefKey) return { provider: preferred, model: preferredModel, key: prefKey };

  // Fallback: try others in priority order
  for (const p of PROVIDER_PRIORITY) {
    if (p === preferred) continue;
    const key = getApiKey(p);
    if (key) return { provider: p, model: DEFAULT_MODELS[p], key };
  }

  return null; // No provider has a key
}

// ─── POST ──────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  if (!(await isAdmin(request))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get active provider from settings + auto-detect if configured one has no key
  const { provider: configuredProvider, model: configuredModel } = getActiveProvider();
  const resolved = autoDetectProvider(configuredProvider, configuredModel);

  if (!resolved) {
    return Response.json(
      {
        error:
          'No AI provider configured. Go to Settings and add at least one API key (Claude, OpenAI, or Gemini).',
      },
      { status: 503 },
    );
  }

  const { provider, model: modelName, key: apiKey } = resolved;

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
    const model = (await resolveModel(provider, modelName, apiKey)) as any;

    // ─── Gemini message sanitization ───────────────────────────────────────────
    // Gemini is stricter than Claude/OpenAI: it rejects tool-result messages,
    // system-role messages (handled by the `system` param), and non-string content.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let sanitizedMessages: any[] = messages as any[];
    if (provider === 'gemini') {
      sanitizedMessages = (messages as any[])
        .filter((m) => {
          if (m.role !== 'user' && m.role !== 'assistant') return false;
          return true;
        })
        .map((m) => {
          // Flatten non-string content to string
          if (typeof m.content !== 'string') {
            if (Array.isArray(m.content)) {
              const text = m.content
                .filter((p: { type?: string }) => p.type === 'text')
                .map((p: { text?: string }) => p.text ?? '')
                .join('\n');
              return { ...m, content: text || '...' };
            }
            return { ...m, content: String(m.content) || '...' };
          }
          return m;
        });
      // Ensure at least one message exists
      if (!sanitizedMessages.length) {
        sanitizedMessages = [
          { role: 'user', content: messages[messages.length - 1]?.content ?? 'hello' },
        ];
        // Flatten again if needed
        if (typeof sanitizedMessages[0].content !== 'string') {
          sanitizedMessages[0] = { role: 'user', content: 'hello' };
        }
      }
    }

    const result = streamText({
      model,
      system: systemPrompt,
      messages: sanitizedMessages,
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
