/**
 * Tests — ProductMetricCard
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProductMetricCard } from './ProductMetricCard';
import type { ProductMetrics } from '@/lib/monitor/types';

const MOCK_METRICS: ProductMetrics = {
  shopifyProductId: 'gid://shopify/Product/1',
  title: 'Wireless Mouse',
  fetchedAt: '2024-01-01T00:00:00.000Z',
  views: 100,
  orders: 5,
  revenue: 250.0,
  conversionRate: 0.05,
  inventory: 20,
  health: 'healthy',
  healthReasons: [],
};

describe('ProductMetricCard', () => {
  it('renders product title', () => {
    render(<ProductMetricCard metrics={MOCK_METRICS} />);
    expect(screen.getByText('Wireless Mouse')).toBeDefined();
  });

  it('renders health badge', () => {
    render(<ProductMetricCard metrics={MOCK_METRICS} />);
    expect(screen.getByTestId('health-badge')).toBeDefined();
  });

  it('renders inventory count', () => {
    render(<ProductMetricCard metrics={MOCK_METRICS} />);
    expect(screen.getByTestId('inventory-count').textContent).toContain('20');
  });

  it('calls onClick with shopifyProductId when card is clicked', () => {
    const onClick = vi.fn();
    render(<ProductMetricCard metrics={MOCK_METRICS} onClick={onClick} />);
    fireEvent.click(screen.getByTestId('product-metric-card'));
    expect(onClick).toHaveBeenCalledWith('gid://shopify/Product/1');
  });
});
