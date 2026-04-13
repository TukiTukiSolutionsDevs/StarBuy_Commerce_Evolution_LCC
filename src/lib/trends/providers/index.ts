/**
 * Trend Provider Registry
 *
 * Factory + metadata for all 5 providers.
 * This is the ONLY file that imports from individual provider modules.
 * Consumers import providers from here, not from individual files.
 */

// ─── Re-exports ───────────────────────────────────────────────────────────────

export type { TrendProvider, SearchOptions, ProviderTestResult } from '../types';
export { SerpApiProvider } from './serpapi';
export { PyTrendsProvider } from './pytrends';
export { TavilyProvider } from './tavily';
export { AmazonProvider } from './amazon';
export { MetaProvider } from './meta';

// ─── Types ────────────────────────────────────────────────────────────────────

import type { TrendProvider, ProviderId, ProviderReliability } from '../types';
import { SerpApiProvider } from './serpapi';
import { PyTrendsProvider } from './pytrends';
import { TavilyProvider } from './tavily';
import { AmazonProvider } from './amazon';
import { MetaProvider } from './meta';

export interface ProviderInfo {
  id: ProviderId;
  name: string;
  reliability: ProviderReliability;
  requiresKey: boolean;
  cost: 'paid' | 'free' | 'freemium';
  description: string;
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export const PROVIDER_META: Record<ProviderId, ProviderInfo> = {
  serpapi: {
    id: 'serpapi',
    name: 'SerpAPI (Google Trends)',
    reliability: 'HIGH',
    requiresKey: true,
    cost: 'paid',
    description:
      'Real-time Google Trends data via SerpAPI. Most reliable source — requires paid subscription.',
  },
  amazon: {
    id: 'amazon',
    name: 'Amazon PA-API',
    reliability: 'HIGH',
    requiresKey: true,
    cost: 'freemium',
    description: 'Amazon Product Advertising API. Best-seller data and product demand signals.',
  },
  pytrends: {
    id: 'pytrends',
    name: 'PyTrends (Google Trends Free)',
    reliability: 'MEDIUM',
    requiresKey: false,
    cost: 'free',
    description:
      'Unofficial Google Trends endpoint. No cost — but Google may rate-limit or block requests.',
  },
  tavily: {
    id: 'tavily',
    name: 'Tavily AI Search',
    reliability: 'MEDIUM',
    requiresKey: true,
    cost: 'freemium',
    description: 'AI-powered web search. Reuses your existing Tavily key from AI Settings.',
  },
  meta: {
    id: 'meta',
    name: 'Meta Ad Library',
    reliability: 'MEDIUM',
    requiresKey: true,
    cost: 'free',
    description: 'Meta Ad Library API. Ad volume as a proxy for product demand and interest.',
  },
};

// ─── Reliability order (HIGH first, then MEDIUM) ─────────────────────────────

const PROVIDER_ORDER: ProviderId[] = ['serpapi', 'amazon', 'pytrends', 'tavily', 'meta'];

// ─── Factory ──────────────────────────────────────────────────────────────────

type ProviderFactory = () => TrendProvider;

const FACTORIES: Record<ProviderId, ProviderFactory> = {
  serpapi: () => new SerpApiProvider(),
  pytrends: () => new PyTrendsProvider(),
  tavily: () => new TavilyProvider(),
  amazon: () => new AmazonProvider(),
  meta: () => new MetaProvider(),
};

/**
 * Create a fresh provider instance by ID.
 * Each call returns a new instance — no shared state.
 */
export function createProvider(id: ProviderId): TrendProvider {
  const factory = FACTORIES[id];
  if (!factory) throw new Error(`Unknown provider: ${id}`);
  return factory();
}

/**
 * Get all available provider IDs in reliability order (HIGH → MEDIUM).
 */
export function getAllProviderIds(): ProviderId[] {
  return [...PROVIDER_ORDER];
}

/**
 * Get metadata for a specific provider.
 */
export function getProviderInfo(id: ProviderId): ProviderInfo {
  return PROVIDER_META[id];
}

/**
 * Create instances of ALL providers in reliability order.
 * Useful for aggregator strategies.
 */
export function createAllProviders(): TrendProvider[] {
  return PROVIDER_ORDER.map((id) => createProvider(id));
}
