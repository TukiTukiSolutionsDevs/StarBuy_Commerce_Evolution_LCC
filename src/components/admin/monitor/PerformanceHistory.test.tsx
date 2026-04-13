/**
 * Tests — PerformanceHistory
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PerformanceHistory } from './PerformanceHistory';
import type { ProductMetrics, MetricsSnapshot } from '@/lib/monitor/types';

const MOCK_METRICS: ProductMetrics = {
  shopifyProductId: 'gid://shopify/Product/1',
  title: 'Test Product',
  fetchedAt: new Date().toISOString(),
  views: 500,
  orders: 25,
  revenue: 1250,
  conversionRate: 0.05,
  inventory: 80,
  health: 'healthy',
  healthReasons: ['healthy'],
};

function mockSnapshot(weekStart: string): MetricsSnapshot {
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
  };
}

describe('PerformanceHistory', () => {
  it('renders table view by default', () => {
    const snaps = [mockSnapshot('2026-04-07'), mockSnapshot('2026-04-14')];
    render(
      <PerformanceHistory
        shopifyProductId="gid://shopify/Product/1"
        snapshots={snaps}
        currentMetrics={MOCK_METRICS}
      />,
    );
    expect(screen.getByTestId('history-table')).toBeDefined();
  });

  it('shows empty state when no snapshots', () => {
    render(
      <PerformanceHistory
        shopifyProductId="gid://shopify/Product/1"
        snapshots={[]}
        currentMetrics={MOCK_METRICS}
      />,
    );
    expect(screen.getByTestId('history-empty')).toBeDefined();
  });

  it('displays snapshot data in table rows', () => {
    const snaps = [mockSnapshot('2026-04-07')];
    render(
      <PerformanceHistory
        shopifyProductId="gid://shopify/Product/1"
        snapshots={snaps}
        currentMetrics={MOCK_METRICS}
      />,
    );
    expect(screen.getByText('2026-04-07')).toBeDefined();
  });

  it('toggles to chart view', () => {
    const snaps = [mockSnapshot('2026-04-07'), mockSnapshot('2026-04-14')];
    render(
      <PerformanceHistory
        shopifyProductId="gid://shopify/Product/1"
        snapshots={snaps}
        currentMetrics={MOCK_METRICS}
      />,
    );
    fireEvent.click(screen.getByTestId('view-toggle-chart'));
    expect(screen.getByTestId('history-charts')).toBeDefined();
  });

  it('starts in chart view when specified', () => {
    const snaps = [mockSnapshot('2026-04-07')];
    render(
      <PerformanceHistory
        shopifyProductId="gid://shopify/Product/1"
        snapshots={snaps}
        currentMetrics={MOCK_METRICS}
        view="chart"
      />,
    );
    expect(screen.getByTestId('history-charts')).toBeDefined();
  });
});
