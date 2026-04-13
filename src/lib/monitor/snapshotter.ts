/**
 * Monitor Module — Weekly Snapshotter
 *
 * Writes one MetricsSnapshot per product per ISO week (Monday 00:00 UTC).
 * Idempotent: calling twice in the same week returns null on second call.
 */

import { randomUUID } from 'crypto';
import { addSnapshot, getSnapshotsByProduct, pruneSnapshots } from './store';
import type { MetricsSnapshot, ProductMetrics } from './types';

// ─── getWeekStart ─────────────────────────────────────────────────────────────

/**
 * Returns the ISO string for Monday 00:00:00.000 UTC of the week
 * containing `date` (defaults to now).
 */
export function getWeekStart(date?: Date): string {
  const d = date ? new Date(date.getTime()) : new Date();
  const day = d.getUTCDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const daysToMonday = day === 0 ? 6 : day - 1;
  d.setUTCDate(d.getUTCDate() - daysToMonday);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

// ─── shouldWriteSnapshot ──────────────────────────────────────────────────────

export function shouldWriteSnapshot(shopifyProductId: string, weekStart: string): boolean {
  return !getSnapshotsByProduct(shopifyProductId).some((s) => s.weekStart === weekStart);
}

// ─── writeWeeklySnapshot ──────────────────────────────────────────────────────

export function writeWeeklySnapshot(metrics: ProductMetrics): MetricsSnapshot | null {
  const weekStart = getWeekStart();

  if (!shouldWriteSnapshot(metrics.shopifyProductId, weekStart)) {
    return null;
  }

  const snapshot: MetricsSnapshot = {
    id: randomUUID(),
    shopifyProductId: metrics.shopifyProductId,
    weekStart,
    views: metrics.views,
    orders: metrics.orders,
    revenue: metrics.revenue,
    conversionRate: metrics.conversionRate,
    inventory: metrics.inventory,
    createdAt: new Date().toISOString(),
  };

  addSnapshot(snapshot);
  pruneSnapshots();

  return snapshot;
}
