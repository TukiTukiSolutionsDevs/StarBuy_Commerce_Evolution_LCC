/**
 * Tests — MonitorDashboard
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MonitorDashboard } from './MonitorDashboard';
import type { ProductMetrics } from '@/lib/monitor/types';

const MOCK_METRICS: ProductMetrics[] = [
  {
    shopifyProductId: 'gid://shopify/Product/1',
    title: 'Wireless Mouse',
    fetchedAt: '2024-01-01T00:00:00.000Z',
    views: 100,
    orders: 5,
    revenue: 250,
    conversionRate: 0.05,
    inventory: 20,
    health: 'healthy',
    healthReasons: [],
  },
  {
    shopifyProductId: 'gid://shopify/Product/2',
    title: 'USB Hub',
    fetchedAt: '2024-01-01T00:00:00.000Z',
    views: 50,
    orders: 0,
    revenue: 0,
    conversionRate: 0,
    inventory: 2,
    health: 'critical',
    healthReasons: ['zero orders'],
  },
];

describe('MonitorDashboard', () => {
  it('renders metrics grid with one card per metric', () => {
    render(<MonitorDashboard metrics={MOCK_METRICS} />);
    expect(screen.getByTestId('metrics-grid')).toBeDefined();
    expect(screen.getAllByTestId('product-metric-card')).toHaveLength(2);
  });

  it('shows loading skeleton when isLoading=true', () => {
    render(<MonitorDashboard metrics={[]} isLoading />);
    expect(screen.getByTestId('loading-skeleton')).toBeDefined();
    expect(screen.queryByTestId('metrics-grid')).toBeNull();
  });

  it('shows empty state when metrics is empty and not loading', () => {
    render(<MonitorDashboard metrics={[]} />);
    expect(screen.getByTestId('empty-state')).toBeDefined();
  });

  it('calls onRefresh when refresh button is clicked', () => {
    const onRefresh = vi.fn();
    render(<MonitorDashboard metrics={MOCK_METRICS} onRefresh={onRefresh} />);
    fireEvent.click(screen.getByTestId('refresh-button'));
    expect(onRefresh).toHaveBeenCalledOnce();
  });
});
