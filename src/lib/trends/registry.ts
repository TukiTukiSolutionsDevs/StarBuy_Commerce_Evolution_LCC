/**
 * Trend Engine — Provider Registry
 *
 * Provider lifecycle management: enable/disable providers, test connections,
 * and run health checks across all enabled providers.
 *
 * Uses config.ts for persistence, api-keys.ts for key detection,
 * and providers/index.ts for creating instances.
 */

import type { ProviderId, ProviderTestResult } from './types';
import { readConfig, saveConfig } from './config';
import { getApiKey } from './api-keys';
import { createProvider, getAllProviderIds, PROVIDER_META } from './providers/index';
import type { ProviderInfo } from './providers/index';

// ─── Public Types ─────────────────────────────────────────────────────────────

export interface ProviderStatus extends ProviderInfo {
  /** Whether the provider is currently in the enabledProviders list */
  enabled: boolean;
  /** Whether all required API keys are configured for this provider */
  hasKey: boolean;
}

export interface HealthCheckResult {
  provider: ProviderId;
  status: 'ok' | 'error' | 'skipped';
  latencyMs?: number;
  error?: string;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function providerHasKey(id: ProviderId): boolean {
  switch (id) {
    case 'serpapi':
      return !!getApiKey('serpapi');
    case 'amazon':
      return !!(
        getApiKey('amazon-access-key') &&
        getApiKey('amazon-secret-key') &&
        getApiKey('amazon-partner-tag')
      );
    case 'pytrends':
      return true; // no key required — unofficial free endpoint
    case 'tavily':
      return true; // shared with AI system, managed in src/lib/ai/api-keys.ts
    case 'meta':
      return !!getApiKey('meta-access-token');
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * List all providers with their current enabled status and key presence.
 * Ordered HIGH reliability first (serpapi, amazon), then MEDIUM (pytrends, tavily, meta).
 */
export function getAvailableProviders(): ProviderStatus[] {
  const config = readConfig();
  const enabledSet = new Set(config.enabledProviders);

  return getAllProviderIds().map((id) => ({
    ...PROVIDER_META[id],
    enabled: enabledSet.has(id),
    hasKey: providerHasKey(id),
  }));
}

/**
 * Add a provider to the enabled list.
 * No-op if already enabled — does not write config unnecessarily.
 */
export function enableProvider(id: ProviderId): void {
  const config = readConfig();
  if (!config.enabledProviders.includes(id)) {
    saveConfig({ enabledProviders: [...config.enabledProviders, id] });
  }
}

/**
 * Remove a provider from the enabled list.
 * No-op if already disabled.
 */
export function disableProvider(id: ProviderId): void {
  const config = readConfig();
  saveConfig({
    enabledProviders: config.enabledProviders.filter((p) => p !== id),
  });
}

/**
 * Test the connection for a specific provider.
 * Creates a fresh instance and calls testConnection().
 * Callers are responsible for handling errors (this function does not catch).
 */
export async function testProvider(id: ProviderId): Promise<ProviderTestResult> {
  const provider = createProvider(id);
  return provider.testConnection();
}

/**
 * Run health checks on ALL currently enabled providers in parallel.
 * Never throws — failed providers are recorded with status: 'error'.
 * Returns an empty array if no providers are enabled.
 */
export async function getProviderHealth(): Promise<HealthCheckResult[]> {
  const config = readConfig();
  if (config.enabledProviders.length === 0) return [];

  const settled = await Promise.allSettled(
    config.enabledProviders.map(async (id): Promise<HealthCheckResult> => {
      const result = await testProvider(id);
      return {
        provider: id,
        status: result.ok ? 'ok' : 'error',
        latencyMs: result.latencyMs,
        error: result.error,
      };
    }),
  );

  return settled.map((r, i) => {
    if (r.status === 'fulfilled') return r.value;
    return {
      provider: config.enabledProviders[i],
      status: 'error' as const,
      error: r.reason instanceof Error ? r.reason.message : String(r.reason),
    };
  });
}
