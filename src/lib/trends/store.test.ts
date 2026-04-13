/**
 * Unit tests — trends/store.ts
 *
 * Tests file-based cache with TTL, prune, and max-entry enforcement.
 * Uses a temp STARBUY_DATA_DIR so no real files are touched.
 *
 * Paths in store.ts are computed lazily (on each call), so stubbing the env
 * var before calling is sufficient — no module reset needed.
 *
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { buildCacheKey, getCached, setCached, clearCache, getCacheStats } from './store';
import type { TrendResult, CacheEntry } from './types';

// ─── Test helpers ─────────────────────────────────────────────────────────────

let tmpDir: string;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'starbuy-trends-test-'));
  vi.stubEnv('STARBUY_DATA_DIR', tmpDir);
});

afterEach(() => {
  vi.unstubAllEnvs();
  rmSync(tmpDir, { recursive: true, force: true });
});

function makeTrendResult(keyword = 'test-keyword'): TrendResult {
  return {
    keyword,
    score: 75,
    state: 'rising',
    timestamp: Date.now(),
    source: 'pytrends',
    relatedKeywords: [],
    metadata: { confidence: 0.8 },
  };
}

/** Directly write a cache file with given entries (bypasses setCached logic) */
function writeCacheFile(entries: CacheEntry[]): void {
  const dir = join(tmpDir, '.starbuy-trends-cache');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'cache.json'), JSON.stringify(entries, null, 2), 'utf-8');
}

// ─── buildCacheKey ────────────────────────────────────────────────────────────

describe('buildCacheKey', () => {
  it('returns a 32-char hex string', () => {
    const key = buildCacheKey('pytrends', 'air fryer');
    expect(key).toHaveLength(32);
    expect(/^[0-9a-f]+$/.test(key)).toBe(true);
  });

  it('identical inputs produce identical keys', () => {
    const a = buildCacheKey('pytrends', 'air fryer', 'US');
    const b = buildCacheKey('pytrends', 'air fryer', 'US');
    expect(a).toBe(b);
  });

  it('is case-insensitive for keyword', () => {
    const lower = buildCacheKey('pytrends', 'air fryer', 'US');
    const upper = buildCacheKey('pytrends', 'AIR FRYER', 'US');
    const mixed = buildCacheKey('pytrends', 'Air Fryer', 'US');
    expect(lower).toBe(upper);
    expect(lower).toBe(mixed);
  });

  it('different providers produce different keys', () => {
    const a = buildCacheKey('pytrends', 'air fryer');
    const b = buildCacheKey('serpapi', 'air fryer');
    expect(a).not.toBe(b);
  });

  it('different regions produce different keys', () => {
    const us = buildCacheKey('pytrends', 'air fryer', 'US');
    const gb = buildCacheKey('pytrends', 'air fryer', 'GB');
    expect(us).not.toBe(gb);
  });

  it('including categoryId changes the key', () => {
    const without = buildCacheKey('pytrends', 'air fryer', 'US');
    const withCat = buildCacheKey('pytrends', 'air fryer', 'US', 'home');
    expect(without).not.toBe(withCat);
  });

  it('defaults region to US', () => {
    const explicit = buildCacheKey('pytrends', 'air fryer', 'US');
    const defaulted = buildCacheKey('pytrends', 'air fryer');
    expect(explicit).toBe(defaulted);
  });
});

// ─── getCached ────────────────────────────────────────────────────────────────

describe('getCached', () => {
  it('returns null when cache is empty', () => {
    const key = buildCacheKey('pytrends', 'sneakers');
    expect(getCached(key)).toBeNull();
  });

  it('returns null for a key not in the cache', () => {
    const results = [makeTrendResult()];
    const key = buildCacheKey('pytrends', 'known');
    setCached(key, results, 60_000);

    const unknownKey = buildCacheKey('pytrends', 'unknown');
    expect(getCached(unknownKey)).toBeNull();
  });

  it('returns results for a valid, non-expired entry', () => {
    const results = [makeTrendResult('yoga mat')];
    const key = buildCacheKey('pytrends', 'yoga mat');
    setCached(key, results, 60_000); // 1 minute TTL

    const cached = getCached(key);
    expect(cached).not.toBeNull();
    expect(cached![0].keyword).toBe('yoga mat');
  });

  it('returns null for an expired entry', () => {
    const key = buildCacheKey('pytrends', 'expired-kw');
    const now = Date.now();
    writeCacheFile([
      {
        key,
        results: [makeTrendResult('expired-kw')],
        createdAt: now - 7_200_000, // 2h ago
        expiresAt: now - 1000, // expired 1s ago
      },
    ]);

    expect(getCached(key)).toBeNull();
  });
});

// ─── setCached ────────────────────────────────────────────────────────────────

describe('setCached', () => {
  it('persists results that can be retrieved', () => {
    const key = buildCacheKey('serpapi', 'protein powder');
    const results = [makeTrendResult('protein powder')];
    setCached(key, results, 21_600_000);

    expect(getCached(key)).toEqual(results);
  });

  it('upserts — does not append duplicate keys', () => {
    const key = buildCacheKey('pytrends', 'coffee maker');
    setCached(key, [makeTrendResult('coffee v1')], 60_000);
    setCached(key, [makeTrendResult('coffee v2')], 60_000);

    const cached = getCached(key);
    expect(cached).toHaveLength(1);
    expect(cached![0].keyword).toBe('coffee v2');
  });

  it('prunes expired entries on write', () => {
    const now = Date.now();
    const expiredKey = buildCacheKey('pytrends', 'old');
    writeCacheFile([
      {
        key: expiredKey,
        results: [],
        createdAt: now - 10_000,
        expiresAt: now - 1000, // expired
      },
    ]);

    // Write a new valid entry → should trigger prune
    const newKey = buildCacheKey('pytrends', 'new');
    setCached(newKey, [makeTrendResult('new')], 60_000);

    // Expired entry should be gone
    expect(getCached(expiredKey)).toBeNull();
    // New entry should be present
    expect(getCached(newKey)).not.toBeNull();
  });

  it('enforces max entries by keeping newest', () => {
    const now = Date.now();
    // Fill cache with 502 active entries directly
    const entries: CacheEntry[] = Array.from({ length: 502 }, (_, i) => ({
      key: `key-${i.toString().padStart(4, '0')}`,
      results: [],
      createdAt: now + i, // each 1ms newer
      expiresAt: now + 60_000,
    }));
    writeCacheFile(entries);

    // Write one more to trigger prune
    const triggerKey = buildCacheKey('pytrends', 'trigger');
    setCached(triggerKey, [], 60_000);

    const stats = getCacheStats();
    expect(stats.total).toBeLessThanOrEqual(500);
  });
});

// ─── clearCache ───────────────────────────────────────────────────────────────

describe('clearCache', () => {
  it('removes all entries', () => {
    const key = buildCacheKey('pytrends', 'smartwatch');
    setCached(key, [makeTrendResult()], 60_000);
    expect(getCached(key)).not.toBeNull();

    clearCache();

    expect(getCached(key)).toBeNull();
    expect(getCacheStats().total).toBe(0);
  });

  it('works on an empty cache without throwing', () => {
    expect(() => clearCache()).not.toThrow();
  });
});

// ─── getCacheStats ────────────────────────────────────────────────────────────

describe('getCacheStats', () => {
  it('returns zeros for an empty cache', () => {
    const stats = getCacheStats();
    expect(stats.total).toBe(0);
    expect(stats.expired).toBe(0);
    expect(stats.active).toBe(0);
  });

  it('correctly counts active and expired entries', () => {
    const now = Date.now();
    writeCacheFile([
      { key: 'active-1', results: [], createdAt: now, expiresAt: now + 60_000 },
      { key: 'active-2', results: [], createdAt: now, expiresAt: now + 60_000 },
      { key: 'expired-1', results: [], createdAt: now - 10_000, expiresAt: now - 1000 },
    ]);

    const stats = getCacheStats();
    expect(stats.total).toBe(3);
    expect(stats.expired).toBe(1);
    expect(stats.active).toBe(2);
  });

  it('total = active + expired', () => {
    const now = Date.now();
    writeCacheFile([
      { key: 'a', results: [], createdAt: now, expiresAt: now + 60_000 },
      { key: 'b', results: [], createdAt: now - 5000, expiresAt: now - 1000 },
    ]);

    const stats = getCacheStats();
    expect(stats.total).toBe(stats.active + stats.expired);
  });
});
