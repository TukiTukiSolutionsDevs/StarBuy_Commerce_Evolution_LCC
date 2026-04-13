/**
 * Monitor Module — Domain Types
 *
 * All types for the product health-monitoring pipeline.
 */

// ─── Health ───────────────────────────────────────────────────────────────────

export type HealthStatus = 'healthy' | 'warning' | 'critical' | 'unknown';

export interface HealthThresholds {
  lowConversionRate: number; // default 0.02
  lowConversionRateCritical: number; // default 0.005
  zeroOrdersDays: number; // default 3
  zeroOrdersDaysCritical: number; // default 7
  stockLowUnits: number; // default 10
  stockLowUnitsCritical: number; // default 3
}

// ─── Metrics ──────────────────────────────────────────────────────────────────

export interface ProductMetrics {
  shopifyProductId: string;
  title: string;
  fetchedAt: string; // ISO 8601
  views: number;
  orders: number;
  revenue: number;
  conversionRate: number;
  inventory: number;
  health: HealthStatus;
  healthReasons: string[];
}

export interface MetricsSnapshot {
  id: string; // uuid
  shopifyProductId: string;
  weekStart: string; // ISO Monday 00:00 UTC
  views: number;
  orders: number;
  revenue: number;
  conversionRate: number;
  inventory: number;
  createdAt: string; // ISO 8601
}

// ─── Input / Output ───────────────────────────────────────────────────────────

export type FetchMetricsInput = { shopifyProductId: string; title: string };
export type UpsertMetricsInput = Omit<ProductMetrics, 'health' | 'healthReasons'>;

export type PollResult = {
  polled: number;
  updated: number;
  errors: Array<{ shopifyProductId: string; error: string }>;
  snapshotWritten: boolean;
  durationMs: number;
};
