/**
 * Unit tests — alerts/aggregator.ts
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const { mockLoadAllMetrics, mockLoadPreferences } = vi.hoisted(() => ({
  mockLoadAllMetrics: vi.fn(),
  mockLoadPreferences: vi.fn(),
}));

vi.mock('@/lib/monitor/store', () => ({ loadAllMetrics: mockLoadAllMetrics }));
vi.mock('./preferences', () => ({ loadPreferences: mockLoadPreferences }));

import { deduplicateAlerts, aggregateAlerts } from './aggregator';
import { addAlert, loadAlerts } from './store';
import type { AlertPreferences, CreateAlertInput } from './types';

let tmpDir: string;

const DEFAULT_PREFS: AlertPreferences = {
  thresholds: {
    lowConversionRate: 0.02,
    zeroOrdersDays: 7,
    stockLowUnits: 10,
    pulseShiftMinScore: 15,
  },
  enabledTypes: ['pulse_shift', 'low_conversion', 'zero_orders', 'price_change', 'stock_low'],
  mutedSeverities: [],
};

function makeInput(overrides: Partial<CreateAlertInput> = {}): CreateAlertInput {
  return {
    type: 'zero_orders',
    severity: 'warning',
    title: 'No orders',
    message: 'No orders in 7 days',
    sourceId: 'gid://shopify/Product/1',
    ...overrides,
  };
}

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'starbuy-agg-test-'));
  vi.stubEnv('STARBUY_DATA_DIR', tmpDir);
  vi.clearAllMocks();
  mockLoadPreferences.mockReturnValue(DEFAULT_PREFS);
  mockLoadAllMetrics.mockReturnValue([]);
});

afterEach(() => {
  vi.unstubAllEnvs();
  rmSync(tmpDir, { recursive: true, force: true });
});

// ─── deduplicateAlerts ────────────────────────────────────────────────────────

describe('deduplicateAlerts', () => {
  it('returns all candidates when existing is empty', () => {
    const candidates = [makeInput(), makeInput({ type: 'stock_low', sourceId: 'p2' })];
    expect(deduplicateAlerts(candidates, [])).toHaveLength(2);
  });

  it('skips candidates that match an existing alert id this week', () => {
    const existing = addAlert(makeInput());
    const candidates = [makeInput()];
    const result = deduplicateAlerts(candidates, [existing]);
    expect(result).toHaveLength(0);
  });

  it('allows candidates with different type', () => {
    const existing = addAlert(makeInput({ type: 'zero_orders' }));
    const candidates = [makeInput({ type: 'stock_low' })];
    expect(deduplicateAlerts(candidates, [existing])).toHaveLength(1);
  });

  it('allows candidates with different sourceId', () => {
    const existing = addAlert(makeInput({ sourceId: 'p1' }));
    const candidates = [makeInput({ sourceId: 'p2' })];
    expect(deduplicateAlerts(candidates, [existing])).toHaveLength(1);
  });

  it('returns empty when all candidates are duplicates', () => {
    const e1 = addAlert(makeInput({ type: 'zero_orders', sourceId: 'p1' }));
    const e2 = addAlert(makeInput({ type: 'stock_low', sourceId: 'p2' }));
    const candidates = [
      makeInput({ type: 'zero_orders', sourceId: 'p1' }),
      makeInput({ type: 'stock_low', sourceId: 'p2' }),
    ];
    expect(deduplicateAlerts(candidates, [e1, e2])).toHaveLength(0);
  });
});

// ─── aggregateAlerts ──────────────────────────────────────────────────────────

describe('aggregateAlerts', () => {
  it('returns created=0 skipped=0 when no metrics', () => {
    mockLoadAllMetrics.mockReturnValue([]);
    const result = aggregateAlerts(DEFAULT_PREFS);
    expect(result.created).toBe(0);
    expect(result.skipped).toBe(0);
    expect(result.alerts).toEqual([]);
  });

  it('creates alerts from problematic metrics', () => {
    mockLoadAllMetrics.mockReturnValue([
      {
        shopifyProductId: 'p1',
        title: 'Prod 1',
        fetchedAt: new Date().toISOString(),
        views: 50,
        orders: 0,
        revenue: 0,
        conversionRate: 0,
        inventory: 5,
        health: 'critical',
        healthReasons: [],
      },
    ]);
    const result = aggregateAlerts(DEFAULT_PREFS);
    expect(result.created).toBeGreaterThan(0);
    expect(loadAlerts().length).toBeGreaterThan(0);
  });

  it('skips alerts already existing this week (second run)', () => {
    mockLoadAllMetrics.mockReturnValue([
      {
        shopifyProductId: 'p1',
        title: 'Prod 1',
        fetchedAt: new Date().toISOString(),
        views: 50,
        orders: 0,
        revenue: 0,
        conversionRate: 0,
        inventory: 20,
        health: 'critical',
        healthReasons: [],
      },
    ]);
    const r1 = aggregateAlerts(DEFAULT_PREFS);
    const r2 = aggregateAlerts(DEFAULT_PREFS);
    expect(r2.created).toBe(0);
    expect(r2.skipped).toBe(r1.created);
  });
});
