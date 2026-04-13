/**
 * Alerts Module — Preferences Store
 *
 * Persists AlertPreferences as .starbuy-alerts/preferences.json
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { getDataDir } from '@/lib/data-dir';
import type { AlertPreferences, AlertType } from './types';

function getAlertsDir(): string {
  return getDataDir('.starbuy-alerts');
}

function getPrefsFile(): string {
  return join(getAlertsDir(), 'preferences.json');
}

function ensureDir(): void {
  const dir = getAlertsDir();
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

export function getDefaultPreferences(): AlertPreferences {
  return {
    thresholds: {
      lowConversionRate: 0.02,
      zeroOrdersDays: 7,
      stockLowUnits: 10,
      pulseShiftMinScore: 15,
    },
    enabledTypes: [
      'pulse_shift',
      'low_conversion',
      'zero_orders',
      'price_change',
      'stock_low',
    ] as AlertType[],
    mutedSeverities: [],
  };
}

// ─── Load / Save ──────────────────────────────────────────────────────────────

export function loadPreferences(): AlertPreferences {
  ensureDir();
  if (!existsSync(getPrefsFile())) return getDefaultPreferences();
  try {
    return JSON.parse(readFileSync(getPrefsFile(), 'utf-8')) as AlertPreferences;
  } catch {
    return getDefaultPreferences();
  }
}

export function savePreferences(prefs: AlertPreferences): void {
  ensureDir();
  writeFileSync(getPrefsFile(), JSON.stringify(prefs, null, 2), 'utf-8');
}

export function mergeWithDefaults(partial: Partial<AlertPreferences>): AlertPreferences {
  const defaults = getDefaultPreferences();
  return {
    thresholds: { ...defaults.thresholds, ...(partial.thresholds ?? {}) },
    enabledTypes: partial.enabledTypes ?? defaults.enabledTypes,
    mutedSeverities: partial.mutedSeverities ?? defaults.mutedSeverities,
  };
}
