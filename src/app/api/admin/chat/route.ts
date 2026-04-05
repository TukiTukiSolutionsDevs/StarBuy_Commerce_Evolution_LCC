/**
 * Admin Chat API — Multi-provider streaming AI endpoint
 *
 * POST /api/admin/chat
 * Supports: Claude, OpenAI, Gemini, Ollama (local)
 * Provider selection from admin settings (runtime, no restart needed)
 */

import { streamText } from 'ai';
import type { NextRequest } from 'next/server';
import { adminTools } from '@/lib/ai/tools';
import { getActiveProvider } from '@/lib/ai/config';

export const dynamic = 'force-dynamic';

// ─── Auth ──────────────────────────────────────────────────────────────────────

function isAdmin(request: NextRequest): boolean {
  const password = process.env.ADMIN_CHAT_PASSWORD;
  if (!password) return false;
  const token = request.cookies.get('admin_token')?.value;
  if (!token) return false;
  return token === Buffer.from(`starbuy-admin:${password}:${process.env.NODE_ENV}`).toString('base64');
}

// ─── System Prompt ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are Starbuy Admin Assistant. You help manage a Shopify store called Starbuy.

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
  if (!isAdmin(request)) {
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
        { error: `${provider.toUpperCase()} API key not configured. Add ${envKey} to .env.local or switch provider in Settings.` },
        { status: 503 }
      );
    }
  }

  // Parse messages
  let messages: Array<{ role: string; content: string }>;
  try {
    const body = await request.json() as { messages?: Array<{ role: string; content: string }> };
    messages = body.messages ?? [];
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!messages.length) {
    return Response.json({ error: 'No messages provided' }, { status: 400 });
  }

  try {
    const model = await resolveModel(provider, modelName);

    const result = streamText({
      model,
      system: SYSTEM_PROMPT,
      messages: messages as Parameters<typeof streamText>[0]['messages'],
      tools: adminTools,
      maxSteps: 5,
    });

    return result.toDataStreamResponse();
  } catch (err) {
    console.error(`[api/admin/chat] ${provider}/${modelName} error:`, err);
    return Response.json(
      { error: `AI error (${provider}/${modelName}): ${(err as Error).message}` },
      { status: 500 }
    );
  }
}
