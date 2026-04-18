/**
 * Unit tests — PulseEventCard
 * @vitest-environment jsdom
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { PulseEventCard } from './PulseEventCard';
import type { MarketPulseEvent } from '@/lib/states/types';

function makeEvent(overrides: Partial<MarketPulseEvent> = {}): MarketPulseEvent {
  return {
    id: 'evt-1',
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

describe('PulseEventCard', () => {
  it('renders category label and state', () => {
    render(<PulseEventCard event={makeEvent()} />);
    expect(screen.getByText('Electronics')).toBeInTheDocument();
    expect(screen.getByText('California (CA)')).toBeInTheDocument();
  });

  it('renders severity badge with correct label', () => {
    render(<PulseEventCard event={makeEvent({ severity: 'major' })} />);
    expect(screen.getByTestId('severity-badge')).toHaveTextContent('Major');
  });

  it('renders anomaly severity', () => {
    render(<PulseEventCard event={makeEvent({ severity: 'anomaly' })} />);
    expect(screen.getByTestId('severity-badge')).toHaveTextContent('Anomaly');
  });

  it('renders minor severity', () => {
    render(<PulseEventCard event={makeEvent({ severity: 'minor' })} />);
    expect(screen.getByTestId('severity-badge')).toHaveTextContent('Minor');
  });

  it('displays positive delta with + sign in green', () => {
    render(<PulseEventCard event={makeEvent({ deltaPercent: 25.3 })} />);
    const delta = screen.getByTestId('delta-value');
    expect(delta).toHaveTextContent('+25.3%');
    expect(delta).toHaveStyle({ color: 'var(--admin-success)' });
  });

  it('displays negative delta in red', () => {
    render(<PulseEventCard event={makeEvent({ deltaPercent: -18.7 })} />);
    const delta = screen.getByTestId('delta-value');
    expect(delta).toHaveTextContent('-18.7%');
    expect(delta).toHaveStyle({ color: 'var(--admin-error)' });
  });

  it('shows score transition', () => {
    render(<PulseEventCard event={makeEvent({ previousScore: 60, currentScore: 69 })} />);
    expect(screen.getByText('60 → 69')).toBeInTheDocument();
  });

  it('shows time ago', () => {
    render(<PulseEventCard event={makeEvent({ detectedAt: Date.now() })} />);
    expect(screen.getByTestId('time-ago')).toHaveTextContent('Just now');
  });

  it('shows mark read button for unread events with handler', () => {
    const handler = vi.fn();
    render(<PulseEventCard event={makeEvent()} onMarkRead={handler} />);
    expect(screen.getByTestId('mark-read-btn')).toBeInTheDocument();
  });

  it('calls onMarkRead with event id when clicked', () => {
    const handler = vi.fn();
    render(<PulseEventCard event={makeEvent({ id: 'evt-42' })} onMarkRead={handler} />);
    fireEvent.click(screen.getByTestId('mark-read-btn'));
    expect(handler).toHaveBeenCalledWith('evt-42');
  });

  it('hides mark read button for already-read events', () => {
    render(<PulseEventCard event={makeEvent({ isRead: true })} onMarkRead={vi.fn()} />);
    expect(screen.queryByTestId('mark-read-btn')).not.toBeInTheDocument();
  });

  it('hides mark read button when no handler provided', () => {
    render(<PulseEventCard event={makeEvent()} />);
    expect(screen.queryByTestId('mark-read-btn')).not.toBeInTheDocument();
  });

  it('applies reduced opacity for read events', () => {
    render(<PulseEventCard event={makeEvent({ isRead: true })} />);
    const card = screen.getByTestId('pulse-event-card');
    expect(card.className).toContain('opacity-60');
  });
});
