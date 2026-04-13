/**
 * Tests — AlertCard
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AlertCard } from './AlertCard';
import type { Alert } from '@/lib/alerts/types';

const MOCK_ALERT: Alert = {
  id: 'abc123',
  type: 'zero_orders',
  severity: 'warning',
  status: 'unread',
  title: 'No orders: Product X',
  message: 'Product X has had no orders in 7 days.',
  sourceId: 'gid://shopify/Product/1',
  sourceLabel: 'Product X',
  createdAt: '2024-01-01T00:00:00.000Z',
};

describe('AlertCard', () => {
  it('renders alert title and message', () => {
    render(<AlertCard alert={MOCK_ALERT} />);
    expect(screen.getByText('No orders: Product X')).toBeDefined();
    expect(screen.getByText('Product X has had no orders in 7 days.')).toBeDefined();
  });

  it('calls onDismiss with alert id when dismiss button clicked', () => {
    const onDismiss = vi.fn();
    render(<AlertCard alert={MOCK_ALERT} onDismiss={onDismiss} />);
    fireEvent.click(screen.getByTestId('alert-dismiss-btn'));
    expect(onDismiss).toHaveBeenCalledWith('abc123');
  });

  it('calls onRead with alert id when mark-read button clicked', () => {
    const onRead = vi.fn();
    render(<AlertCard alert={MOCK_ALERT} onRead={onRead} />);
    fireEvent.click(screen.getByTestId('alert-read-btn'));
    expect(onRead).toHaveBeenCalledWith('abc123');
  });

  it('renders severity indicator', () => {
    render(<AlertCard alert={MOCK_ALERT} />);
    expect(screen.getByTestId('alert-card')).toBeDefined();
    expect(screen.getByTestId('alert-card').getAttribute('data-severity')).toBe('warning');
  });
});
