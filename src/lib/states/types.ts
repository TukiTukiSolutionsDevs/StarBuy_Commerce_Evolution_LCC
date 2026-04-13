/**
 * State Intelligence — Domain Types
 *
 * All TypeScript types for the State Intelligence system.
 * Single source of truth — no duplication across files.
 */

// ─── Geography ────────────────────────────────────────────────────────────────

export type UsRegion = 'West' | 'Southwest' | 'Midwest' | 'Southeast' | 'Northeast';

export type AgeDistribution = {
  under18: number; // percentage 0-100
  age18to34: number;
  age35to54: number;
  age55plus: number;
};

// ─── State Profile ────────────────────────────────────────────────────────────

export type StateProfile = {
  code: string; // 'CA', 'TX', 'DC'
  name: string;
  region: UsRegion;
  population: number;
  medianIncome: number; // USD/year
  urbanizationPct: number; // 0-100
  gdpBillions: number;
  ecommerceIndex: number; // 0-100 (internet penetration × digital spend proxy)
  ageDistribution: AgeDistribution;
  dataYear: number; // e.g. 2023
};

// ─── Opportunity Score ────────────────────────────────────────────────────────

export type ScoreBreakdown = {
  demographics: number; // weight 0.35
  trendActivity: number; // weight 0.30
  ecommerceIndex: number; // weight 0.20
  incomeIndex: number; // weight 0.15
};

export type OpportunityScore = {
  stateCode: string;
  score: number; // 0-100 integer
  breakdown: ScoreBreakdown;
  topCategories: string[]; // top 3 category IDs
  computedAt: number; // Date.now()
};

export type StateWithScore = StateProfile & { opportunityScore: OpportunityScore };

export type StateScoreMap = Record<string, OpportunityScore>;

// ─── Market Pulse ─────────────────────────────────────────────────────────────

export type PulseSeverity = 'minor' | 'notable' | 'major' | 'anomaly';

export type MarketPulseEvent = {
  id: string;
  stateCode: string;
  stateName: string;
  category: string;
  categoryLabel: string;
  severity: PulseSeverity;
  deltaPercent: number; // WoW change, signed (e.g. +42.5 or -18.3)
  previousScore: number;
  currentScore: number;
  detectedAt: number; // Date.now()
  isRead: boolean;
};

// ─── Trend Snapshots ──────────────────────────────────────────────────────────

export type StateTrendSnapshot = {
  stateCode: string;
  weekOf: string; // ISO date of Monday, e.g. '2026-04-07'
  categoryScores: Record<string, number>; // categoryId → 0-100
  updatedAt: number;
};

// ─── API Types ────────────────────────────────────────────────────────────────

export type StatesListResponse = {
  states: StateWithScore[];
  computedAt: number;
};

export type StateDetailResponse = {
  profile: StateProfile;
  score: OpportunityScore;
  topTrends: Array<{ keyword: string; score: number; state: string }>;
  researchCandidates: Array<{ id: string; keyword: string; aiScore: number }>;
};

export type PulseListResponse = {
  events: MarketPulseEvent[];
  unreadCount: number;
  total: number;
};

export type PulseMarkReadRequest = {
  eventIds: string[];
};

export type PulseMarkReadResponse = {
  marked: number;
};

export type CompareResponse = {
  states: StateWithScore[];
};

export type ApiErrorResponse = {
  error: string;
};

// ─── Score Color Mapping ──────────────────────────────────────────────────────

export type ScoreQuintile = 1 | 2 | 3 | 4 | 5;

export function scoreToQuintile(score: number): ScoreQuintile {
  if (score <= 20) return 1;
  if (score <= 40) return 2;
  if (score <= 60) return 3;
  if (score <= 80) return 4;
  return 5;
}

export const QUINTILE_COLORS: Record<ScoreQuintile, string> = {
  1: 'fill-red-400',
  2: 'fill-orange-400',
  3: 'fill-yellow-400',
  4: 'fill-teal-400',
  5: 'fill-emerald-500',
};

export const QUINTILE_BG_COLORS: Record<ScoreQuintile, string> = {
  1: 'bg-red-400',
  2: 'bg-orange-400',
  3: 'bg-yellow-400',
  4: 'bg-teal-400',
  5: 'bg-emerald-500',
};
