/**
 * Monitor Module — Poller
 *
 * Orchestrates per-product metric fetching, health computation,
 * persistence, and weekly snapshot writing.
 */

import { getAll as getAllPublished } from '@/lib/publish/store';
import { fetchProductMetrics } from './fetcher';
import { computeHealth } from './health';
import { upsertMetrics } from './store';
import { writeWeeklySnapshot } from './snapshotter';
import type { PollResult, ProductMetrics } from './types';

// ─── pollSingleProduct ────────────────────────────────────────────────────────

export async function pollSingleProduct(
  shopifyProductId: string,
  title: string,
): Promise<ProductMetrics> {
  const raw = await fetchProductMetrics({ shopifyProductId, title });
  const { health, healthReasons } = computeHealth(raw);
  const metrics: ProductMetrics = { ...raw, health, healthReasons };
  upsertMetrics(metrics);
  writeWeeklySnapshot(metrics);
  return metrics;
}

// ─── pollAllProducts ──────────────────────────────────────────────────────────

export async function pollAllProducts(): Promise<PollResult> {
  const start = Date.now();

  const published = getAllPublished().filter((r) => r.status === 'published' && r.shopifyProductId);

  let updated = 0;
  let snapshotWritten = false;
  const errors: Array<{ shopifyProductId: string; error: string }> = [];

  for (const record of published) {
    const id = record.shopifyProductId!;
    const title = record.shopifyProductId ?? id;
    try {
      await pollSingleProduct(id, title);
      updated++;
      // pollSingleProduct already called writeWeeklySnapshot; mark true if at least one succeeded
      snapshotWritten = true;
    } catch (err) {
      errors.push({
        shopifyProductId: id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return {
    polled: published.length,
    updated,
    errors,
    snapshotWritten,
    durationMs: Date.now() - start,
  };
}
