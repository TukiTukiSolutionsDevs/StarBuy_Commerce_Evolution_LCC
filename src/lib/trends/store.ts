/**
 * Trend Engine — File-based Cache
 *
 * Caches TrendResult arrays by a deterministic SHA-256 key with TTL support.
 * Follows the same pattern as src/lib/ai/memory/store.ts.
 *
 * Paths computed lazily so STARBUY_DATA_DIR can be overridden in tests.
 * Prune on write: expired entries removed first, then trimmed to MAX_ENTRIES.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';
import { getDataDir } from '@/lib/data-dir';
import type { CacheEntry, TrendResult, ProviderId } from './types';

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_ENTRIES = 500;

// ─── Lazy Paths ───────────────────────────────────────────────────────────────

function getCacheDir(): string {
  return getDataDir('.starbuy-trends-cache');
}

function getCacheFile(): string {
  return join(getCacheDir(), 'cache.json');
}

// ─── Init ─────────────────────────────────────────────────────────────────────

function ensureCacheDir(): void {
  const dir = getCacheDir();
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  const file = getCacheFile();
  if (!existsSync(file)) {
    writeFileSync(file, JSON.stringify([], null, 2), 'utf-8');
  }
}

// ─── Internal read/write ─────────────────────────────────────────────────────

function readEntries(): CacheEntry[] {
  ensureCacheDir();
  try {
    const raw = readFileSync(getCacheFile(), 'utf-8');
    return JSON.parse(raw) as CacheEntry[];
  } catch {
    return [];
  }
}

function writeEntries(entries: CacheEntry[]): void {
  ensureCacheDir();
  const now = Date.now();
  // 1. Remove expired entries first
  const active = entries.filter((e) => e.expiresAt > now);
  // 2. Trim to MAX_ENTRIES by newest first
  const pruned =
    active.length > MAX_ENTRIES
      ? [...active].sort((a, b) => b.createdAt - a.createdAt).slice(0, MAX_ENTRIES)
      : active;
  writeFileSync(getCacheFile(), JSON.stringify(pruned, null, 2), 'utf-8');
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Build a deterministic 32-char hex cache key.
 * Case-insensitive for keyword. Region defaults to 'US'.
 */
export function buildCacheKey(
  provider: ProviderId,
  keyword: string,
  region = 'US',
  categoryId?: string,
): string {
  const raw = `${provider}:${keyword.toLowerCase().trim()}:${region}${categoryId ? `:${categoryId}` : ''}`;
  return createHash('sha256').update(raw).digest('hex').slice(0, 32);
}

/**
 * Retrieve cached results for a key.
 * Returns null if the entry is missing or expired.
 */
export function getCached(key: string): TrendResult[] | null {
  const entries = readEntries();
  const entry = entries.find((e) => e.key === key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) return null;
  return entry.results;
}

/**
 * Save results to cache. Upserts by key.
 * Prunes expired entries and enforces MAX_ENTRIES on write.
 */
export function setCached(key: string, results: TrendResult[], ttlMs: number): void {
  const entries = readEntries();
  const now = Date.now();
  const newEntry: CacheEntry = {
    key,
    results,
    createdAt: now,
    expiresAt: now + ttlMs,
  };

  const idx = entries.findIndex((e) => e.key === key);
  if (idx >= 0) {
    entries[idx] = newEntry;
  } else {
    entries.push(newEntry);
  }

  writeEntries(entries);
}

/**
 * Clear the entire cache.
 */
export function clearCache(): void {
  ensureCacheDir();
  writeFileSync(getCacheFile(), JSON.stringify([], null, 2), 'utf-8');
}

/**
 * Get cache statistics.
 */
export function getCacheStats(): { total: number; expired: number; active: number } {
  const entries = readEntries();
  const now = Date.now();
  const expired = entries.filter((e) => e.expiresAt <= now).length;
  const total = entries.length;
  return { total, expired, active: total - expired };
}
