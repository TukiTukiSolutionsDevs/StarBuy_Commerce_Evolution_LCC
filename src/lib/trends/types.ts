/**
 * Trend Engine — Domain Types
 *
 * All TypeScript types for the Trend Engine with Provider System.
 * Single source of truth for domain types — no duplication across files.
 */

// ─── Core Result Types ───────────────────────────────────────────────────────

export type TrendState = 'rising' | 'peak' | 'stable' | 'declining' | 'unknown';

export interface TrendResult {
  keyword: string;
  score: number; // 0-100, normalized
  state: TrendState;
  timestamp: number; // unix ms
  source: ProviderId;
  relatedKeywords: string[]; // up to 10
  metadata: TrendMetadata;
}

export interface TrendMetadata {
  region?: string; // US state code or 'US'
  category?: string;
  rawScore?: number;
  priceMin?: number; // Amazon only
  priceMax?: number; // Amazon only
  searchVolume?: number; // SerpAPI only
  adCount?: number; // Meta only
  confidence: number; // 0-1
}

// ─── Provider Types ──────────────────────────────────────────────────────────

export type ProviderId = 'serpapi' | 'pytrends' | 'tavily' | 'amazon' | 'meta';
export type ProviderReliability = 'HIGH' | 'MEDIUM' | 'LOW';

export interface SearchOptions {
  region?: string;
  categoryId?: string;
  limit?: number;
}

export interface ProviderTestResult {
  provider: ProviderId;
  ok: boolean;
  latencyMs: number;
  error?: string;
}

export interface TrendProvider {
  readonly id: ProviderId;
  readonly name: string;
  readonly reliability: ProviderReliability;
  searchTrend(keywords: string[], options?: SearchOptions): Promise<TrendResult[]>;
  getCategoryTrends(categoryId: string, options?: SearchOptions): Promise<TrendResult[]>;
  getRelatedKeywords(keyword: string, options?: SearchOptions): Promise<string[]>;
  testConnection(): Promise<ProviderTestResult>;
}

// ─── Aggregation ─────────────────────────────────────────────────────────────

export enum AggregationStrategy {
  SMART_MERGE = 'smart-merge',
  PRIMARY_ONLY = 'primary-only',
  FALLBACK_CHAIN = 'fallback-chain',
}

// ─── Config ──────────────────────────────────────────────────────────────────

export interface TrendConfig {
  activeStrategy: AggregationStrategy;
  enabledProviders: ProviderId[];
  cacheEnabled: boolean;
  cacheTTL: number; // ms, default 21_600_000 (6h)
}

export const DEFAULT_TREND_CONFIG: TrendConfig = {
  activeStrategy: AggregationStrategy.SMART_MERGE,
  enabledProviders: ['pytrends', 'tavily'],
  cacheEnabled: true,
  cacheTTL: 21_600_000,
};

// ─── Category Types ───────────────────────────────────────────────────────────

export interface CategoryKeyword {
  keyword: string;
  weight: number; // 0-1
}

export interface Subcategory {
  id: string;
  label: string;
  keywords: CategoryKeyword[];
}

export interface Category {
  id: string;
  label: string;
  icon: string;
  subcategories: Subcategory[];
}

export type CategoryTree = Category[];

// ─── Cache Types ──────────────────────────────────────────────────────────────

export interface CacheEntry {
  key: string;
  results: TrendResult[];
  createdAt: number;
  expiresAt: number;
}

// ─── API Key Status ───────────────────────────────────────────────────────────

export interface ApiKeyStatus {
  configured: boolean;
  source: 'env' | 'runtime' | null;
  masked: string;
}
