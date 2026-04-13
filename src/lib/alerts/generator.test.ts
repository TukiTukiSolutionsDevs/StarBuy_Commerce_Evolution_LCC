/**
 * Unit tests — alerts/generator.ts
 * @vitest-environment node
 */

import { describe, it, expect } from 'vitest';
import { buildAlertId, generateFromMetrics, generateFromPulseEvents } from './generator';
import type { AlertPreferences } from './types';
import type { ProductMetrics } from '@/lib/monitor/types';

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

function makeMetrics(overrides: Partial<ProductMetrics> = {}): ProductMetrics {
  return {
    shopifyProductId: 'gid://shopify/Product/1',
    title: 'Test Product',
    fetchedAt: new Date().toISOString(),
    views: 100,
    orders: 5,
    revenue: 250,
    conversionRate: 0.05,
    inventory: 20,
    health: 'healthy',
    healthReasons: [],
    ...overrides,
  };
}

function makePulseEvent(overrides: Record<string, unknown> = {}) {
  return {
    sourceId: 'gid://shopify/Product/1',
    title: 'Test Product',
    deltaPercent: 20,
    ...overrides,
  };
}

// ─── buildAlertId ─────────────────────────────────────────────────────────────

describe('buildAlertId', () => {
  it('returns a 16-char hex string', () => {
    const id = buildAlertId('zero_orders', 'gid://shopify/Product/1', '2024-01-01');
    expect(id).toHaveLength(16);
    expect(id).toMatch(/^[0-9a-f]+$/);
  });

  it('is deterministic for same inputs', () => {
    const id1 = buildAlertId('zero_orders', 'gid://shopify/Product/1', '2024-01-01');
    const id2 = buildAlertId('zero_orders', 'gid://shopify/Product/1', '2024-01-01');
    expect(id1).toBe(id2);
  });

  it('differs with different type', () => {
    const id1 = buildAlertId('zero_orders', 'gid://shopify/Product/1', '2024-01-01');
    const id2 = buildAlertId('stock_low', 'gid://shopify/Product/1', '2024-01-01');
    expect(id1).not.toBe(id2);
  });

  it('differs with different sourceId', () => {
    const id1 = buildAlertId('zero_orders', 'gid://shopify/Product/1', '2024-01-01');
    const id2 = buildAlertId('zero_orders', 'gid://shopify/Product/2', '2024-01-01');
    expect(id1).not.toBe(id2);
  });

  it('differs with different weekStart', () => {
    const id1 = buildAlertId('zero_orders', 'gid://shopify/Product/1', '2024-01-01');
    const id2 = buildAlertId('zero_orders', 'gid://shopify/Product/1', '2024-01-08');
    expect(id1).not.toBe(id2);
  });
});

// ─── generateFromMetrics ──────────────────────────────────────────────────────

describe('generateFromMetrics', () => {
  it('returns empty array for empty metrics list', () => {
    expect(generateFromMetrics([], DEFAULT_PREFS)).toEqual([]);
  });

  it('generates low_conversion alert when conversionRate below threshold', () => {
    const alerts = generateFromMetrics(
      [makeMetrics({ conversionRate: 0.01, orders: 1, views: 100 })],
      DEFAULT_PREFS,
    );
    expect(alerts.some((a) => a.type === 'low_conversion')).toBe(true);
  });

  it('does not generate low_conversion when rate is healthy', () => {
    const alerts = generateFromMetrics(
      [makeMetrics({ conversionRate: 0.05, orders: 5, views: 100 })],
      DEFAULT_PREFS,
    );
    expect(alerts.some((a) => a.type === 'low_conversion')).toBe(false);
  });

  it('generates zero_orders alert when orders is 0 and views > 0', () => {
    const alerts = generateFromMetrics(
      [makeMetrics({ orders: 0, conversionRate: 0, views: 50 })],
      DEFAULT_PREFS,
    );
    expect(alerts.some((a) => a.type === 'zero_orders')).toBe(true);
  });

  it('generates stock_low alert when inventory below threshold', () => {
    const alerts = generateFromMetrics([makeMetrics({ inventory: 5 })], DEFAULT_PREFS);
    expect(alerts.some((a) => a.type === 'stock_low')).toBe(true);
  });

  it('does not generate stock_low when inventory is healthy', () => {
    const alerts = generateFromMetrics([makeMetrics({ inventory: 50 })], DEFAULT_PREFS);
    expect(alerts.some((a) => a.type === 'stock_low')).toBe(false);
  });

  it('respects enabledTypes — skips disabled types', () => {
    const prefs: AlertPreferences = { ...DEFAULT_PREFS, enabledTypes: ['pulse_shift'] };
    const alerts = generateFromMetrics(
      [makeMetrics({ conversionRate: 0.01, inventory: 5, orders: 0, views: 10 })],
      prefs,
    );
    expect(alerts).toHaveLength(0);
  });

  it('handles multiple products', () => {
    const alerts = generateFromMetrics(
      [
        makeMetrics({ shopifyProductId: 'p1', inventory: 5 }),
        makeMetrics({ shopifyProductId: 'p2', orders: 0, conversionRate: 0, views: 10 }),
      ],
      DEFAULT_PREFS,
    );
    expect(alerts.length).toBeGreaterThanOrEqual(2);
  });
});

// ─── generateFromPulseEvents ──────────────────────────────────────────────────

describe('generateFromPulseEvents', () => {
  it('returns empty array for empty events', () => {
    expect(generateFromPulseEvents([], DEFAULT_PREFS)).toEqual([]);
  });

  it('generates pulse_shift alert when |deltaPercent| >= pulseShiftMinScore', () => {
    const alerts = generateFromPulseEvents([makePulseEvent({ deltaPercent: 20 })], DEFAULT_PREFS);
    expect(alerts.some((a) => a.type === 'pulse_shift')).toBe(true);
  });

  it('generates pulse_shift for negative deltaPercent below -minScore', () => {
    const alerts = generateFromPulseEvents([makePulseEvent({ deltaPercent: -25 })], DEFAULT_PREFS);
    expect(alerts.some((a) => a.type === 'pulse_shift')).toBe(true);
  });

  it('skips events below the min score threshold', () => {
    const alerts = generateFromPulseEvents([makePulseEvent({ deltaPercent: 10 })], DEFAULT_PREFS);
    expect(alerts.some((a) => a.type === 'pulse_shift')).toBe(false);
  });

  it('respects enabledTypes — skips pulse_shift when disabled', () => {
    const prefs: AlertPreferences = { ...DEFAULT_PREFS, enabledTypes: ['zero_orders'] };
    const alerts = generateFromPulseEvents([makePulseEvent({ deltaPercent: 50 })], prefs);
    expect(alerts).toHaveLength(0);
  });

  it('sets sourceId from event', () => {
    const alerts = generateFromPulseEvents(
      [makePulseEvent({ sourceId: 'gid://shopify/Product/42', deltaPercent: 30 })],
      DEFAULT_PREFS,
    );
    expect(alerts[0].sourceId).toBe('gid://shopify/Product/42');
  });
});
