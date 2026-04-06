/**
 * API Key Manager
 *
 * Manages AI provider API keys at runtime — stored in a JSON file inside
 * getDataDir() so they persist across deployments without being in source control.
 *
 * Priority: runtime file > environment variables
 *
 * SECURITY: Full key values are NEVER returned to the client.
 * Only masked versions (e.g. "sk-ant-...3f2d") are exposed.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { getDataDir } from '@/lib/data-dir';

// ─── Types ──────────────────────────────────────────────────────────────────────

export type ApiKeyProvider = 'claude' | 'openai' | 'gemini';

type StoredKeys = {
  claude?: string;
  openai?: string;
  gemini?: string;
};

export type ApiKeyStatus = {
  configured: boolean;
  source: 'env' | 'runtime' | null;
  masked: string;
};

// ─── Storage ─────────────────────────────────────────────────────────────────────

const KEYS_PATH = getDataDir('.admin-ai-keys.json');

// Map from our provider names to env var names
const ENV_VARS: Record<ApiKeyProvider, string> = {
  claude: 'ANTHROPIC_API_KEY',
  openai: 'OPENAI_API_KEY',
  gemini: 'GOOGLE_GENERATIVE_AI_API_KEY',
};

// ─── Internal helpers ─────────────────────────────────────────────────────────────

function readStoredKeys(): StoredKeys {
  try {
    if (existsSync(KEYS_PATH)) {
      const raw = readFileSync(KEYS_PATH, 'utf-8');
      return JSON.parse(raw) as StoredKeys;
    }
  } catch {
    /* ignore parse errors — return empty */
  }
  return {};
}

function writeStoredKeys(keys: StoredKeys): void {
  writeFileSync(KEYS_PATH, JSON.stringify(keys, null, 2), 'utf-8');
}

/**
 * Mask an API key for safe display in the UI.
 * Shows the first 8 chars and last 4 chars: "sk-ant-a...3f2d"
 */
function maskKey(key: string): string {
  if (key.length <= 12) return '****';
  const prefix = key.slice(0, 8);
  const suffix = key.slice(-4);
  return `${prefix}...${suffix}`;
}

// ─── Public API ───────────────────────────────────────────────────────────────────

/**
 * Get the API key for a provider.
 * Runtime keys (stored in file) take priority over environment variables.
 * Returns undefined if no key is configured.
 */
export function getApiKey(provider: ApiKeyProvider): string | undefined {
  // 1. Check runtime-stored key first
  const stored = readStoredKeys();
  const runtimeKey = stored[provider];
  if (runtimeKey && runtimeKey.length > 5) {
    return runtimeKey;
  }

  // 2. Fall back to environment variable
  const envKey = ENV_VARS[provider];
  const envVal = process.env[envKey];
  if (envVal && envVal.length > 5) {
    return envVal;
  }

  return undefined;
}

/**
 * Store an API key for a provider at runtime.
 * Pass an empty string or null to clear the runtime key (falls back to env).
 */
export function setApiKey(provider: ApiKeyProvider, key: string): void {
  const stored = readStoredKeys();
  if (key && key.trim().length > 0) {
    stored[provider] = key.trim();
  } else {
    delete stored[provider];
  }
  writeStoredKeys(stored);
}

/**
 * Get the status of all API keys — for the settings UI.
 * NEVER returns the actual key value.
 */
export function getApiKeyStatus(): Record<ApiKeyProvider, ApiKeyStatus> {
  const stored = readStoredKeys();

  const getStatus = (provider: ApiKeyProvider): ApiKeyStatus => {
    // Check runtime key
    const runtimeKey = stored[provider];
    if (runtimeKey && runtimeKey.length > 5) {
      return {
        configured: true,
        source: 'runtime',
        masked: maskKey(runtimeKey),
      };
    }

    // Check env var
    const envKey = ENV_VARS[provider];
    const envVal = process.env[envKey];
    if (envVal && envVal.length > 5) {
      return {
        configured: true,
        source: 'env',
        masked: maskKey(envVal),
      };
    }

    return {
      configured: false,
      source: null,
      masked: '',
    };
  };

  return {
    claude: getStatus('claude'),
    openai: getStatus('openai'),
    gemini: getStatus('gemini'),
  };
}
