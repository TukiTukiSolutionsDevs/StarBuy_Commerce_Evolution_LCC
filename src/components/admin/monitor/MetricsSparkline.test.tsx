/**
 * Tests — MetricsSparkline
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MetricsSparkline } from './MetricsSparkline';
import type { MetricsSnapshot } from '@/lib/monitor/types';

function mockSnapshot(
  weekStart: string,
  overrides: Partial<MetricsSnapshot> = {},
): MetricsSnapshot {
  return {
    id: `snap-${weekStart}`,
    shopifyProductId: 'gid://shopify/Product/1',
    weekStart,
    views: 100,
    orders: 10,
    revenue: 500,
    conversionRate: 0.1,
    inventory: 50,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('MetricsSparkline', () => {
  it('shows "No data" when snapshots is empty', () => {
    render(<MetricsSparkline snapshots={[]} metric="orders" />);
    expect(screen.getByTestId('sparkline-empty').textContent).toContain('No data');
  });

  it('renders SVG sparkline with data', () => {
    const snaps = [
      mockSnapshot('2026-04-07', { orders: 5 }),
      mockSnapshot('2026-04-14', { orders: 12 }),
      mockSnapshot('2026-04-21', { orders: 8 }),
    ];
    render(<MetricsSparkline snapshots={snaps} metric="orders" />);
    expect(screen.getByTestId('sparkline')).toBeDefined();
    expect(screen.getByTestId('sparkline').querySelector('svg')).toBeDefined();
  });

  it('renders polyline element', () => {
    const snaps = [
      mockSnapshot('2026-04-07', { revenue: 100 }),
      mockSnapshot('2026-04-14', { revenue: 200 }),
    ];
    render(<MetricsSparkline snapshots={snaps} metric="revenue" />);
    const svg = screen.getByTestId('sparkline').querySelector('svg');
    expect(svg?.querySelector('polyline')).toBeDefined();
  });

  it('handles single data point without error', () => {
    const snaps = [mockSnapshot('2026-04-07')];
    render(<MetricsSparkline snapshots={snaps} metric="views" />);
    expect(screen.getByTestId('sparkline')).toBeDefined();
  });
});
