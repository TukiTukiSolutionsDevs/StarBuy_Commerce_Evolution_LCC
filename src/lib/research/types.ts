/**
 * Research Board — Domain Types
 *
 * All TypeScript types for the Research Board.
 * Single source of truth — no duplication across files.
 */

import type { TrendState, ProviderId } from '@/lib/trends/types';

// ─── Status & Labels ──────────────────────────────────────────────────────────

export type ResearchItemStatus =
  | 'candidate'
  | 'saved'
  | 'imported'
  | 'discarded'
  | 'importing'
  | 'published';

export type AiScoreLabel = 'Weak' | 'Fair' | 'Good' | 'Strong';

// ─── AI Score ─────────────────────────────────────────────────────────────────

export type AiScoreBreakdown = {
  trend: number; // 0–40
  margin: number; // 0–30
  competition: number; // 0–20
  volume: number; // 0–10
};

// ─── Core Item ────────────────────────────────────────────────────────────────

export type ResearchItem = {
  id: string; // crypto.randomUUID()
  keyword: string;
  title: string; // defaults to keyword if not provided
  description?: string;
  imageUrl?: string;

  // Trend snapshot — captured at add-time from AggregatedTrendResult
  trendScore: number; // 0–100
  trendState: TrendState;
  sources: ProviderId[];
  relatedKeywords: string[];
  searchVolume?: number; // SerpAPI; undefined if unavailable
  adCount?: number; // Meta; undefined if unavailable

  // Pricing — stored as-is, positive numbers
  costPrice: number;
  salePrice: number;
  marginPercent: number; // computed: (salePrice - costPrice) / salePrice * 100, 1dp

  // AI Score — computed at write time, recomputed on price change
  aiScore: number; // 0–100 integer
  aiScoreBreakdown: AiScoreBreakdown;
  aiScoreLabel: AiScoreLabel; // derived from aiScore

  // State
  status: ResearchItemStatus;
  notes?: string;
  shopifyProductId?: string; // set after successful import

  // Reserved for future use (not in UI v1)
  category?: string;
  subcategory?: string;

  addedAt: number; // Date.now()
  updatedAt: number; // Date.now()
};

// ─── Input Types ──────────────────────────────────────────────────────────────

export type AddResearchItemInput = {
  keyword: string;
  trendScore: number;
  trendState: TrendState;
  sources: ProviderId[];
  relatedKeywords: string[];
  searchVolume?: number;
  adCount?: number;
  costPrice: number;
  salePrice: number;
  title?: string;
  description?: string;
  notes?: string;
};

export type UpdateResearchItemInput = Partial<
  Pick<
    ResearchItem,
    'costPrice' | 'salePrice' | 'status' | 'notes' | 'title' | 'description' | 'shopifyProductId'
  >
>;
