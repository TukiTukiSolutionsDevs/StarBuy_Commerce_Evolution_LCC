/**
 * Trend Engine — Configuration Management
 *
 * Manages non-sensitive trend engine config: aggregation strategy,
 * enabled providers, cache settings. Stored as a JSON file.
 *
 * Mirrors pattern from src/lib/ai/config.ts.
 * Paths computed lazily so STARBUY_DATA_DIR can be set in tests.
 *
 * Priority: file overrides defaults — partial files are merged with defaults.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { getDataDir } from '@/lib/data-dir';
import { AggregationStrategy, DEFAULT_TREND_CONFIG } from './types';
import type { TrendConfig, ProviderId } from './types';

// ─── Lazy Path ────────────────────────────────────────────────────────────────

function getConfigPath(): string {
  return getDataDir('.admin-trends-config.json');
}

// ─── Internal read/write ─────────────────────────────────────────────────────

function readSavedConfig(): TrendConfig {
  try {
    const path = getConfigPath();
    if (existsSync(path)) {
      const raw = readFileSync(path, 'utf-8');
      return { ...DEFAULT_TREND_CONFIG, ...JSON.parse(raw) };
    }
  } catch {
    /* use defaults on any parse error */
  }
  return { ...DEFAULT_TREND_CONFIG };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Read the current trend config, merging saved values with defaults.
 */
export function readConfig(): TrendConfig {
  return readSavedConfig();
}

/**
 * Partially update and persist the trend config.
 * Unspecified fields are not reset — they keep their current value.
 */
export function saveConfig(partial: Partial<TrendConfig>): TrendConfig {
  const current = readSavedConfig();
  const updated = { ...current, ...partial };
  writeFileSync(getConfigPath(), JSON.stringify(updated, null, 2), 'utf-8');
  return updated;
}

/**
 * Get the active aggregation strategy.
 */
export function getActiveStrategy(): AggregationStrategy {
  return readSavedConfig().activeStrategy;
}

/**
 * Get the list of currently enabled provider IDs.
 */
export function getEnabledProviders(): ProviderId[] {
  return readSavedConfig().enabledProviders;
}
