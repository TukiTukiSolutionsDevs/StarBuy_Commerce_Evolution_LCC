/**
 * Unit tests — monitor/health.ts
 * @vitest-environment node
 */

import { describe, it, expect } from 'vitest';
import { getDefaultThresholds, computeHealth } from './health';
import type { ProductMetrics } from './types';

type MetricsInput = Omit<ProductMetrics, 'health' | 'healthReasons'>;

function makeInput(overrides: Partial<MetricsInput> = {}): MetricsInput {
  return {
    shopifyProductId: 'gid://shopify/Product/1',
    title: 'Test',
    fetchedAt: new Date().toISOString(), // fresh
    views: 200,
    orders: 10,
    revenue: 500,
    conversionRate: 0.05,
    inventory: 20,
    ...overrides,
  };
}

describe('getDefaultThresholds', () => {
  it('returns correct defaults', () => {
    const t = getDefaultThresholds();
    expect(t.lowConversionRate).toBe(0.02);
    expect(t.lowConversionRateCritical).toBe(0.005);
    expect(t.zeroOrdersDays).toBe(3);
    expect(t.zeroOrdersDaysCritical).toBe(7);
    expect(t.stockLowUnits).toBe(10);
    expect(t.stockLowUnitsCritical).toBe(3);
  });
});

describe('computeHealth — healthy', () => {
  it('returns healthy when all metrics are fine', () => {
    const result = computeHealth(makeInput());
    expect(result.health).toBe('healthy');
    expect(result.healthReasons).toEqual(['healthy']);
  });
});

describe('computeHealth — stock', () => {
  it('returns warning when inventory < stockLowUnits', () => {
    const result = computeHealth(makeInput({ inventory: 5 }));
    expect(result.health).toBe('warning');
    expect(result.healthReasons).toContain('stock_low');
  });

  it('returns critical when inventory < stockLowUnitsCritical', () => {
    const result = computeHealth(makeInput({ inventory: 2 }));
    expect(result.health).toBe('critical');
    expect(result.healthReasons).toContain('stock_critical');
  });

  it('respects custom stockLowUnits threshold', () => {
    const result = computeHealth(makeInput({ inventory: 15 }), { stockLowUnits: 20 });
    expect(result.health).toBe('warning');
    expect(result.healthReasons).toContain('stock_low');
  });
});

describe('computeHealth — conversion rate', () => {
  it('returns warning when conversionRate < lowConversionRate (but > 0)', () => {
    const result = computeHealth(makeInput({ conversionRate: 0.01 }));
    expect(result.health).toBe('warning');
    expect(result.healthReasons).toContain('low_conversion');
  });

  it('returns critical when conversionRate < lowConversionRateCritical', () => {
    const result = computeHealth(makeInput({ conversionRate: 0.003 }));
    expect(result.health).toBe('critical');
    expect(result.healthReasons).toContain('low_conversion_critical');
  });

  it('does not flag conversion when conversionRate is 0 (no data)', () => {
    const result = computeHealth(makeInput({ conversionRate: 0, orders: 0, views: 0 }));
    expect(result.healthReasons).not.toContain('low_conversion');
    expect(result.healthReasons).not.toContain('low_conversion_critical');
  });
});

describe('computeHealth — zero orders', () => {
  it('returns critical when orders=0 and views>0', () => {
    const result = computeHealth(makeInput({ orders: 0, views: 100, conversionRate: 0 }));
    expect(result.health).toBe('critical');
    expect(result.healthReasons).toContain('zero_orders_critical');
  });
});

describe('computeHealth — worst-wins', () => {
  it('critical beats warning when both apply', () => {
    // inventory warning + zero_orders critical
    const result = computeHealth(
      makeInput({ inventory: 5, orders: 0, views: 100, conversionRate: 0 }),
    );
    expect(result.health).toBe('critical');
    expect(result.healthReasons).toContain('stock_low');
    expect(result.healthReasons).toContain('zero_orders_critical');
  });

  it('collects all reasons', () => {
    const result = computeHealth(makeInput({ inventory: 2, conversionRate: 0.003 }));
    expect(result.healthReasons).toContain('stock_critical');
    expect(result.healthReasons).toContain('low_conversion_critical');
  });
});

describe('computeHealth — stale', () => {
  it('returns unknown when fetchedAt > 2 hours ago', () => {
    const stale = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
    const result = computeHealth(makeInput({ fetchedAt: stale }));
    expect(result.health).toBe('unknown');
    expect(result.healthReasons).toContain('stale');
  });

  it('does not return unknown when fetchedAt is recent', () => {
    const fresh = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const result = computeHealth(makeInput({ fetchedAt: fresh }));
    expect(result.health).not.toBe('unknown');
  });
});

describe('computeHealth — custom thresholds', () => {
  it('uses merged custom thresholds', () => {
    // custom critical stock = 5, inventory = 4 → critical
    const result = computeHealth(makeInput({ inventory: 4 }), { stockLowUnitsCritical: 5 });
    expect(result.health).toBe('critical');
    expect(result.healthReasons).toContain('stock_critical');
  });
});
