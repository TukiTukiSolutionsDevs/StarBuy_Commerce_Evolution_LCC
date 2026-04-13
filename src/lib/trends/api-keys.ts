/**
 * Trend Engine — API Key Manager
 *
 * Manages trend-provider-specific API keys at runtime.
 * Stored in a JSON file inside getDataDir() — persists across deploys.
 *
 * IMPORTANT: 'tavily' is NOT managed here.
 * Tavily key is shared with the AI system — always read from src/lib/ai/api-keys.ts.
 *
 * Priority: runtime file > environment variables.
 * SECURITY: Full key values are NEVER returned to the client. Only masked versions.
 *
 * Mirrors pattern from src/lib/ai/api-keys.ts.
 * Paths computed lazily so STARBUY_DATA_DIR can be overridden in tests.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { getDataDir } from '@/lib/data-dir';
import type { ApiKeyStatus } from './types';

// ─── Types ────────────────────────────────────────────────────────────────────

export type TrendApiKey =
  | 'serpapi'
  | 'amazon-access-key'
  | 'amazon-secret-key'
  | 'amazon-partner-tag'
  | 'meta-access-token';

type StoredTrendKeys = Partial<Record<TrendApiKey, string>>;

// ─── Constants ────────────────────────────────────────────────────────────────

const ENV_VARS: Record<TrendApiKey, string> = {
  serpapi: 'SERPAPI_KEY',
  'amazon-access-key': 'AMAZON_ACCESS_KEY',
  'amazon-secret-key': 'AMAZON_SECRET_KEY',
  'amazon-partner-tag': 'AMAZON_PARTNER_TAG',
  'meta-access-token': 'META_ACCESS_TOKEN',
};

const ALL_KEYS: TrendApiKey[] = [
  'serpapi',
  'amazon-access-key',
  'amazon-secret-key',
  'amazon-partner-tag',
  'meta-access-token',
];

// ─── Lazy Path ────────────────────────────────────────────────────────────────

function getKeysPath(): string {
  return getDataDir('.admin-trends-keys.json');
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function readStoredKeys(): StoredTrendKeys {
  try {
    const path = getKeysPath();
    if (existsSync(path)) {
      const raw = readFileSync(path, 'utf-8');
      return JSON.parse(raw) as StoredTrendKeys;
    }
  } catch {
    /* ignore parse errors */
  }
  return {};
}

function writeStoredKeys(keys: StoredTrendKeys): void {
  writeFileSync(getKeysPath(), JSON.stringify(keys, null, 2), 'utf-8');
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Mask an API key for safe display in the UI.
 * Shows first 8 chars and last 4 chars: "SERPAPI_...3f2d"
 */
export function maskKey(key: string): string {
  if (key.length <= 12) return '****';
  return `${key.slice(0, 8)}...${key.slice(-4)}`;
}

/**
 * Get the value of a trend API key.
 * Runtime file takes priority over environment variable.
 * Returns undefined if no key is configured.
 */
export function getApiKey(key: TrendApiKey): string | undefined {
  const stored = readStoredKeys();
  const runtimeKey = stored[key];
  if (runtimeKey && runtimeKey.length > 5) return runtimeKey;

  const envVal = process.env[ENV_VARS[key]];
  if (envVal && envVal.length > 5) return envVal;

  return undefined;
}

/**
 * Persist a trend API key at runtime.
 * Pass an empty string to clear the runtime key (env var fallback remains).
 */
export function setApiKey(key: TrendApiKey, value: string): void {
  const stored = readStoredKeys();
  if (value && value.trim().length > 0) {
    stored[key] = value.trim();
  } else {
    delete stored[key];
  }
  writeStoredKeys(stored);
}

/**
 * Remove a trend API key from runtime storage.
 * The env var fallback (if any) remains active.
 */
export function deleteApiKey(key: TrendApiKey): void {
  const stored = readStoredKeys();
  delete stored[key];
  writeStoredKeys(stored);
}

/**
 * Get status of all trend API keys — safe for client consumption.
 * NEVER returns actual key values.
 */
export function getProviderKeyStatus(): Record<TrendApiKey, ApiKeyStatus> {
  const stored = readStoredKeys();

  const getStatus = (key: TrendApiKey): ApiKeyStatus => {
    const runtimeKey = stored[key];
    if (runtimeKey && runtimeKey.length > 5) {
      return { configured: true, source: 'runtime', masked: maskKey(runtimeKey) };
    }
    const envVal = process.env[ENV_VARS[key]];
    if (envVal && envVal.length > 5) {
      return { configured: true, source: 'env', masked: maskKey(envVal) };
    }
    return { configured: false, source: null, masked: '' };
  };

  return Object.fromEntries(ALL_KEYS.map((k) => [k, getStatus(k)])) as Record<
    TrendApiKey,
    ApiKeyStatus
  >;
}
