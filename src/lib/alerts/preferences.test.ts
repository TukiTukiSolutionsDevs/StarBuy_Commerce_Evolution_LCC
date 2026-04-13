/**
 * Unit tests — alerts/preferences.ts
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  getDefaultPreferences,
  loadPreferences,
  savePreferences,
  mergeWithDefaults,
} from './preferences';
import type { AlertPreferences } from './types';

let tmpDir: string;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'starbuy-prefs-test-'));
  vi.stubEnv('STARBUY_DATA_DIR', tmpDir);
});

afterEach(() => {
  vi.unstubAllEnvs();
  rmSync(tmpDir, { recursive: true, force: true });
});

describe('getDefaultPreferences', () => {
  it('returns correct default thresholds', () => {
    const prefs = getDefaultPreferences();
    expect(prefs.thresholds.lowConversionRate).toBe(0.02);
    expect(prefs.thresholds.zeroOrdersDays).toBe(7);
    expect(prefs.thresholds.stockLowUnits).toBe(10);
    expect(prefs.thresholds.pulseShiftMinScore).toBe(15);
  });

  it('enables all alert types by default', () => {
    const prefs = getDefaultPreferences();
    expect(prefs.enabledTypes).toContain('pulse_shift');
    expect(prefs.enabledTypes).toContain('low_conversion');
    expect(prefs.enabledTypes).toContain('zero_orders');
    expect(prefs.enabledTypes).toContain('stock_low');
  });

  it('has empty mutedSeverities by default', () => {
    expect(getDefaultPreferences().mutedSeverities).toEqual([]);
  });
});

describe('loadPreferences', () => {
  it('returns defaults when no preferences file exists', () => {
    const prefs = loadPreferences();
    const defaults = getDefaultPreferences();
    expect(prefs.thresholds.lowConversionRate).toBe(defaults.thresholds.lowConversionRate);
    expect(prefs.enabledTypes).toEqual(defaults.enabledTypes);
  });
});

describe('savePreferences / loadPreferences round-trip', () => {
  it('persists and retrieves preferences', () => {
    const custom: AlertPreferences = {
      thresholds: {
        lowConversionRate: 0.05,
        zeroOrdersDays: 14,
        stockLowUnits: 20,
        pulseShiftMinScore: 25,
      },
      enabledTypes: ['zero_orders', 'stock_low'],
      mutedSeverities: ['info'],
    };
    savePreferences(custom);
    const loaded = loadPreferences();
    expect(loaded.thresholds.lowConversionRate).toBe(0.05);
    expect(loaded.thresholds.zeroOrdersDays).toBe(14);
    expect(loaded.enabledTypes).toEqual(['zero_orders', 'stock_low']);
    expect(loaded.mutedSeverities).toEqual(['info']);
  });
});

describe('mergeWithDefaults', () => {
  it('returns defaults when empty object passed', () => {
    const merged = mergeWithDefaults({});
    const defaults = getDefaultPreferences();
    expect(merged.thresholds.lowConversionRate).toBe(defaults.thresholds.lowConversionRate);
  });

  it('deep merges thresholds', () => {
    const merged = mergeWithDefaults({
      thresholds: { lowConversionRate: 0.05 } as AlertPreferences['thresholds'],
    });
    expect(merged.thresholds.lowConversionRate).toBe(0.05);
    expect(merged.thresholds.zeroOrdersDays).toBe(7);
  });

  it('overrides enabledTypes when provided', () => {
    const merged = mergeWithDefaults({ enabledTypes: ['stock_low'] });
    expect(merged.enabledTypes).toEqual(['stock_low']);
  });

  it('overrides mutedSeverities when provided', () => {
    const merged = mergeWithDefaults({ mutedSeverities: ['info', 'warning'] });
    expect(merged.mutedSeverities).toEqual(['info', 'warning']);
  });
});
