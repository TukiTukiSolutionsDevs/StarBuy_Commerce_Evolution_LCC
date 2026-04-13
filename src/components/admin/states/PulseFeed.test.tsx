/**
 * Unit tests — PulseFeed
 * @vitest-environment jsdom
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { PulseFeed } from './PulseFeed';
import type { MarketPulseEvent } from '@/lib/states/types';

function makeEvent(id: string, overrides: Partial<MarketPulseEvent> = {}): MarketPulseEvent {
  return {
    id,
    stateCode: 'CA',
    stateName: 'California',
    category: 'electronics',
    categoryLabel: 'Electronics',
    severity: 'notable',
    deltaPercent: 15.5,
    previousScore: 60,
    currentScore: 69,
    detectedAt: Date.now(),
    isRead: false,
    ...overrides,
  };
}

describe('PulseFeed', () => {
  it('renders the Market Pulse heading', () => {
    render(<PulseFeed events={[]} />);
    expect(screen.getByText('Market Pulse')).toBeInTheDocument();
  });

  it('shows empty state when no events', () => {
    render(<PulseFeed events={[]} />);
    expect(screen.getByTestId('empty-state')).toHaveTextContent('No pulse events');
  });

  it('renders event cards for non-minor events', () => {
    const events = [
      makeEvent('1', { severity: 'notable' }),
      makeEvent('2', { severity: 'major' }),
      makeEvent('3', { severity: 'minor' }),
    ];
    render(<PulseFeed events={events} />);
    // By default "All" tab excludes minor
    expect(screen.getAllByTestId('pulse-event-card')).toHaveLength(2);
  });

  it('shows unread badge with count', () => {
    const events = [
      makeEvent('1', { isRead: false }),
      makeEvent('2', { isRead: true }),
      makeEvent('3', { isRead: false }),
    ];
    render(<PulseFeed events={events} />);
    expect(screen.getByTestId('unread-badge')).toHaveTextContent('2');
  });

  it('hides unread badge when all read', () => {
    const events = [makeEvent('1', { isRead: true })];
    render(<PulseFeed events={events} />);
    expect(screen.queryByTestId('unread-badge')).not.toBeInTheDocument();
  });

  it('renders filter tabs', () => {
    render(<PulseFeed events={[]} />);
    expect(screen.getByTestId('tab-all')).toBeInTheDocument();
    expect(screen.getByTestId('tab-anomaly')).toBeInTheDocument();
    expect(screen.getByTestId('tab-major')).toBeInTheDocument();
    expect(screen.getByTestId('tab-notable')).toBeInTheDocument();
  });

  it('filters by severity when tab clicked', () => {
    const events = [
      makeEvent('1', { severity: 'notable' }),
      makeEvent('2', { severity: 'major' }),
      makeEvent('3', { severity: 'anomaly' }),
    ];
    render(<PulseFeed events={events} />);

    fireEvent.click(screen.getByTestId('tab-major'));
    expect(screen.getAllByTestId('pulse-event-card')).toHaveLength(1);
  });

  it('shows all non-minor when All tab clicked after filtering', () => {
    const events = [makeEvent('1', { severity: 'notable' }), makeEvent('2', { severity: 'major' })];
    render(<PulseFeed events={events} />);

    fireEvent.click(screen.getByTestId('tab-major'));
    expect(screen.getAllByTestId('pulse-event-card')).toHaveLength(1);

    fireEvent.click(screen.getByTestId('tab-all'));
    expect(screen.getAllByTestId('pulse-event-card')).toHaveLength(2);
  });

  it('shows mark all read button when handler provided and unread exist', () => {
    const events = [makeEvent('1')];
    render(<PulseFeed events={events} onMarkAllRead={vi.fn()} />);
    expect(screen.getByTestId('mark-all-read-btn')).toBeInTheDocument();
  });

  it('calls onMarkAllRead when button clicked', () => {
    const handler = vi.fn();
    render(<PulseFeed events={[makeEvent('1')]} onMarkAllRead={handler} />);
    fireEvent.click(screen.getByTestId('mark-all-read-btn'));
    expect(handler).toHaveBeenCalled();
  });

  it('hides mark all read when no unread events', () => {
    render(<PulseFeed events={[makeEvent('1', { isRead: true })]} onMarkAllRead={vi.fn()} />);
    expect(screen.queryByTestId('mark-all-read-btn')).not.toBeInTheDocument();
  });

  it('passes onMarkRead to event cards', () => {
    const handler = vi.fn();
    render(<PulseFeed events={[makeEvent('1')]} onMarkRead={handler} />);
    fireEvent.click(screen.getByTestId('mark-read-btn'));
    expect(handler).toHaveBeenCalledWith('1');
  });
});
