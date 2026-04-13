/**
 * Unit tests — trends/config.ts
 *
 * Tests config read/write/merge with defaults using a temp STARBUY_DATA_DIR.
 * Paths are computed lazily so env stub is effective without module reset.
 *
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { readConfig, saveConfig, getActiveStrategy, getEnabledProviders } from './config';
import { AggregationStrategy, DEFAULT_TREND_CONFIG } from './types';

// ─── Setup ────────────────────────────────────────────────────────────────────

let tmpDir: string;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'starbuy-config-test-'));
  vi.stubEnv('STARBUY_DATA_DIR', tmpDir);
});

afterEach(() => {
  vi.unstubAllEnvs();
  rmSync(tmpDir, { recursive: true, force: true });
});

/** Write a config JSON directly to the temp dir */
function writeConfigFile(data: object): void {
  writeFileSync(join(tmpDir, '.admin-trends-config.json'), JSON.stringify(data, null, 2), 'utf-8');
}

// ─── readConfig ───────────────────────────────────────────────────────────────

describe('readConfig', () => {
  it('returns defaults when no config file exists', () => {
    const config = readConfig();
    expect(config).toEqual(DEFAULT_TREND_CONFIG);
  });

  it('returns saved values from file', () => {
    writeConfigFile({
      activeStrategy: AggregationStrategy.PRIMARY_ONLY,
      enabledProviders: ['serpapi'],
      cacheEnabled: false,
      cacheTTL: 3_600_000,
    });

    const config = readConfig();
    expect(config.activeStrategy).toBe(AggregationStrategy.PRIMARY_ONLY);
    expect(config.enabledProviders).toEqual(['serpapi']);
    expect(config.cacheEnabled).toBe(false);
    expect(config.cacheTTL).toBe(3_600_000);
  });

  it('merges partial file with defaults — missing fields fall back to defaults', () => {
    writeConfigFile({ activeStrategy: AggregationStrategy.FALLBACK_CHAIN });

    const config = readConfig();
    expect(config.activeStrategy).toBe(AggregationStrategy.FALLBACK_CHAIN);
    // Non-specified fields should come from defaults
    expect(config.enabledProviders).toEqual(DEFAULT_TREND_CONFIG.enabledProviders);
    expect(config.cacheEnabled).toBe(DEFAULT_TREND_CONFIG.cacheEnabled);
    expect(config.cacheTTL).toBe(DEFAULT_TREND_CONFIG.cacheTTL);
  });

  it('returns defaults when file has invalid JSON', () => {
    writeFileSync(join(tmpDir, '.admin-trends-config.json'), 'NOT JSON', 'utf-8');
    expect(readConfig()).toEqual(DEFAULT_TREND_CONFIG);
  });
});

// ─── saveConfig ───────────────────────────────────────────────────────────────

describe('saveConfig', () => {
  it('saves and retrieves the updated config', () => {
    saveConfig({ activeStrategy: AggregationStrategy.SMART_MERGE });
    const config = readConfig();
    expect(config.activeStrategy).toBe(AggregationStrategy.SMART_MERGE);
  });

  it('partial update preserves unspecified fields', () => {
    // First, save a full config
    saveConfig({
      activeStrategy: AggregationStrategy.FALLBACK_CHAIN,
      enabledProviders: ['serpapi', 'tavily'],
      cacheEnabled: true,
      cacheTTL: 7_200_000,
    });

    // Partially update only strategy
    saveConfig({ activeStrategy: AggregationStrategy.PRIMARY_ONLY });

    const config = readConfig();
    expect(config.activeStrategy).toBe(AggregationStrategy.PRIMARY_ONLY);
    // Other fields must not be reset
    expect(config.enabledProviders).toEqual(['serpapi', 'tavily']);
    expect(config.cacheEnabled).toBe(true);
    expect(config.cacheTTL).toBe(7_200_000);
  });

  it('returns the updated config', () => {
    const result = saveConfig({ cacheTTL: 43_200_000 });
    expect(result.cacheTTL).toBe(43_200_000);
  });

  it('persists across multiple read calls', () => {
    saveConfig({ enabledProviders: ['amazon'] });
    expect(readConfig().enabledProviders).toEqual(['amazon']);
    expect(readConfig().enabledProviders).toEqual(['amazon']);
  });
});

// ─── getActiveStrategy ────────────────────────────────────────────────────────

describe('getActiveStrategy', () => {
  it('returns the default strategy when no file exists', () => {
    expect(getActiveStrategy()).toBe(DEFAULT_TREND_CONFIG.activeStrategy);
  });

  it('returns the saved strategy after saveConfig', () => {
    saveConfig({ activeStrategy: AggregationStrategy.FALLBACK_CHAIN });
    expect(getActiveStrategy()).toBe(AggregationStrategy.FALLBACK_CHAIN);
  });
});

// ─── getEnabledProviders ──────────────────────────────────────────────────────

describe('getEnabledProviders', () => {
  it('returns the default enabled providers when no file exists', () => {
    expect(getEnabledProviders()).toEqual(DEFAULT_TREND_CONFIG.enabledProviders);
  });

  it('returns the saved providers after saveConfig', () => {
    saveConfig({ enabledProviders: ['serpapi', 'amazon', 'meta'] });
    expect(getEnabledProviders()).toEqual(['serpapi', 'amazon', 'meta']);
  });

  it('default includes pytrends and tavily', () => {
    const providers = getEnabledProviders();
    expect(providers).toContain('pytrends');
    expect(providers).toContain('tavily');
  });
});
