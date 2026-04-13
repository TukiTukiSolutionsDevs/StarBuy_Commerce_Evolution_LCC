/**
 * Monitor Module — File-based Store
 *
 * Persists ProductMetrics[] as .starbuy-monitor/metrics.json
 * and MetricsSnapshot[] as .starbuy-monitor/snapshots.json.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { getDataDir } from '@/lib/data-dir';
import type { ProductMetrics, MetricsSnapshot } from './types';

// ─── Lazy Paths ───────────────────────────────────────────────────────────────

function getMonitorDir(): string {
  return getDataDir('.starbuy-monitor');
}

function getMetricsFile(): string {
  return join(getMonitorDir(), 'metrics.json');
}

function getSnapshotsFile(): string {
  return join(getMonitorDir(), 'snapshots.json');
}

// ─── Internal Helpers ─────────────────────────────────────────────────────────

function ensureDir(): void {
  const dir = getMonitorDir();
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  if (!existsSync(getMetricsFile())) writeFileSync(getMetricsFile(), '[]', 'utf-8');
  if (!existsSync(getSnapshotsFile())) writeFileSync(getSnapshotsFile(), '[]', 'utf-8');
}

function readJson<T>(file: string): T[] {
  ensureDir();
  try {
    return JSON.parse(readFileSync(file, 'utf-8')) as T[];
  } catch {
    return [];
  }
}

function writeJson<T>(file: string, data: T[]): void {
  ensureDir();
  writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
}

// ─── Metrics ──────────────────────────────────────────────────────────────────

export function loadAllMetrics(): ProductMetrics[] {
  return readJson<ProductMetrics>(getMetricsFile());
}

export function getMetricsByShopifyId(id: string): ProductMetrics | undefined {
  return loadAllMetrics().find((m) => m.shopifyProductId === id);
}

export function upsertMetrics(m: ProductMetrics): void {
  const all = loadAllMetrics();
  const idx = all.findIndex((r) => r.shopifyProductId === m.shopifyProductId);
  if (idx === -1) {
    all.push(m);
  } else {
    all[idx] = m;
  }
  writeJson(getMetricsFile(), all);
}

export function removeMetrics(id: string): void {
  const all = loadAllMetrics();
  const filtered = all.filter((m) => m.shopifyProductId !== id);
  writeJson(getMetricsFile(), filtered);
}

// ─── Snapshots ────────────────────────────────────────────────────────────────

export function loadAllSnapshots(): MetricsSnapshot[] {
  return readJson<MetricsSnapshot>(getSnapshotsFile());
}

export function getSnapshotsByProduct(id: string): MetricsSnapshot[] {
  return loadAllSnapshots().filter((s) => s.shopifyProductId === id);
}

export function addSnapshot(s: MetricsSnapshot): void {
  const all = loadAllSnapshots();
  all.push(s);
  writeJson(getSnapshotsFile(), all);
}

export function pruneSnapshots(maxWeeks = 12): void {
  const all = loadAllSnapshots();

  // Group by product
  const byProduct = new Map<string, MetricsSnapshot[]>();
  for (const snap of all) {
    const existing = byProduct.get(snap.shopifyProductId) ?? [];
    existing.push(snap);
    byProduct.set(snap.shopifyProductId, existing);
  }

  // Sort each group by weekStart ASC, keep last maxWeeks
  const pruned: MetricsSnapshot[] = [];
  for (const [, snaps] of byProduct) {
    const sorted = snaps.sort((a, b) => a.weekStart.localeCompare(b.weekStart));
    pruned.push(...sorted.slice(-maxWeeks));
  }

  writeJson(getSnapshotsFile(), pruned);
}
