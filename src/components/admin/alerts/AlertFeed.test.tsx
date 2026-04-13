/**
 * Tests — AlertFeed
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AlertFeed } from './AlertFeed';
import type { Alert } from '@/lib/alerts/types';

const MOCK_ALERTS: Alert[] = [
  {
    id: 'a1',
    type: 'zero_orders',
    severity: 'warning',
    status: 'unread',
    title: 'Alert One',
    message: 'Message one',
    createdAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'a2',
    type: 'stock_low',
    severity: 'critical',
    status: 'unread',
    title: 'Alert Two',
    message: 'Message two',
    createdAt: '2024-01-02T00:00:00.000Z',
  },
];

describe('AlertFeed', () => {
  it('renders a list of alert cards', () => {
    render(<AlertFeed alerts={MOCK_ALERTS} />);
    expect(screen.getByText('Alert One')).toBeDefined();
    expect(screen.getByText('Alert Two')).toBeDefined();
  });

  it('renders empty state when no alerts', () => {
    render(<AlertFeed alerts={[]} emptyMessage="No alerts yet" />);
    expect(screen.getByText('No alerts yet')).toBeDefined();
  });

  it('renders loading state when isLoading=true', () => {
    render(<AlertFeed alerts={[]} isLoading />);
    expect(screen.getByTestId('alert-feed-loading')).toBeDefined();
  });

  it('renders custom emptyMessage', () => {
    render(<AlertFeed alerts={[]} emptyMessage="All caught up!" />);
    expect(screen.getByText('All caught up!')).toBeDefined();
  });
});
