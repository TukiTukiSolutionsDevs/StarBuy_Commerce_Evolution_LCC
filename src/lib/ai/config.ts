/**
 * AI Provider Configuration
 *
 * Runtime config stored as JSON file. Changeable from the admin UI
 * without restarting the server. API keys stay in .env.local for security.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { getDataDir } from '@/lib/data-dir';

// ─── Types ──────────────────────────────────────────────────────────────────────

export type AIProvider = 'claude' | 'openai' | 'gemini' | 'ollama';

export type AIConfig = {
  provider: AIProvider;
  model: string;
  ollama: {
    baseUrl: string;
    model: string;
  };
  shopify: {
    domain: string;
    clientId: string;
    hasClientSecret: boolean;
    connected: boolean;
  };
};

export type AIConfigFull = AIConfig & {
  providers: {
    claude: { configured: boolean; models: string[] };
    openai: { configured: boolean; models: string[] };
    gemini: { configured: boolean; models: string[] };
    ollama: { configured: boolean; models: string[] };
  };
};

// ─── Saved config (provider + model selection only) ─────────────────────────────

type SavedConfig = {
  provider: AIProvider;
  model: string;
  ollamaBaseUrl: string;
  ollamaModel: string;
};

const CONFIG_PATH = getDataDir('.admin-ai-config.json');

const DEFAULT_CONFIG: SavedConfig = {
  provider: 'claude',
  model: 'claude-sonnet-4-5',
  ollamaBaseUrl: 'http://localhost:11434',
  ollamaModel: 'llama3.1:8b',
};

// ─── Models per provider ────────────────────────────────────────────────────────

export const PROVIDER_MODELS: Record<AIProvider, string[]> = {
  claude: ['claude-sonnet-4-5', 'claude-haiku-4', 'claude-opus-4'],
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'o1', 'o1-mini', 'o3-mini'],
  gemini: ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.0-flash'],
  ollama: [
    'llama3.1:8b',
    'llama3.2:3b',
    'qwen2.5:7b',
    'mistral:7b',
    'gemma2:9b',
    'phi3:mini',
    'deepseek-r1:8b',
  ],
};

// ─── Read / Write ───────────────────────────────────────────────────────────────

function readSavedConfig(): SavedConfig {
  try {
    if (existsSync(CONFIG_PATH)) {
      const raw = readFileSync(CONFIG_PATH, 'utf-8');
      return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
    }
  } catch {
    /* use defaults */
  }
  return { ...DEFAULT_CONFIG };
}

export function saveConfig(partial: Partial<SavedConfig>): SavedConfig {
  const current = readSavedConfig();
  const updated = { ...current, ...partial };
  writeFileSync(CONFIG_PATH, JSON.stringify(updated, null, 2), 'utf-8');
  return updated;
}

// ─── Get full config (for the settings UI) ──────────────────────────────────────

export function getFullConfig(): AIConfigFull {
  const saved = readSavedConfig();

  const hasKey = (name: string) => {
    const val = process.env[name];
    return !!val && val.length > 5;
  };

  return {
    provider: saved.provider,
    model: saved.model,
    ollama: {
      baseUrl: saved.ollamaBaseUrl,
      model: saved.ollamaModel,
    },
    shopify: {
      domain: process.env.SHOPIFY_STORE_DOMAIN ?? '',
      clientId: process.env.SHOPIFY_CLIENT_ID ?? '',
      hasClientSecret: hasKey('SHOPIFY_CLIENT_SECRET'),
      connected: hasKey('SHOPIFY_CLIENT_ID') && hasKey('SHOPIFY_CLIENT_SECRET'),
    },
    providers: {
      claude: {
        configured: hasKey('ANTHROPIC_API_KEY'),
        models: PROVIDER_MODELS.claude,
      },
      openai: {
        configured: hasKey('OPENAI_API_KEY'),
        models: PROVIDER_MODELS.openai,
      },
      gemini: {
        configured: hasKey('GOOGLE_GENERATIVE_AI_API_KEY'),
        models: PROVIDER_MODELS.gemini,
      },
      ollama: {
        configured: true, // always available if running locally
        models: PROVIDER_MODELS.ollama,
      },
    },
  };
}

// ─── Get active provider + model (for the chat route) ───────────────────────────

export function getActiveProvider(): {
  provider: AIProvider;
  model: string;
  ollamaBaseUrl: string;
} {
  const saved = readSavedConfig();
  return {
    provider: saved.provider,
    model: saved.provider === 'ollama' ? saved.ollamaModel : saved.model,
    ollamaBaseUrl: saved.ollamaBaseUrl,
  };
}
