/**
 * Unit tests — TrendStateBadge
 *
 * @vitest-environment happy-dom
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TrendStateBadge, STATE_CONFIG } from './TrendStateBadge';

describe('TrendStateBadge — labels', () => {
  it('renders "Rising" for rising state', () => {
    render(<TrendStateBadge state="rising" />);
    expect(screen.getByText('Rising')).toBeInTheDocument();
  });

  it('renders "Peak" for peak state', () => {
    render(<TrendStateBadge state="peak" />);
    expect(screen.getByText('Peak')).toBeInTheDocument();
  });

  it('renders "Stable" for stable state', () => {
    render(<TrendStateBadge state="stable" />);
    expect(screen.getByText('Stable')).toBeInTheDocument();
  });

  it('renders "Declining" for declining state', () => {
    render(<TrendStateBadge state="declining" />);
    expect(screen.getByText('Declining')).toBeInTheDocument();
  });

  it('renders "Unknown" for unknown state', () => {
    render(<TrendStateBadge state="unknown" />);
    expect(screen.getByText('Unknown')).toBeInTheDocument();
  });
});

describe('TrendStateBadge — icons', () => {
  it('renders trending_up icon for rising', () => {
    render(<TrendStateBadge state="rising" />);
    expect(screen.getByText('trending_up')).toBeInTheDocument();
  });

  it('renders rocket_launch icon for peak', () => {
    render(<TrendStateBadge state="peak" />);
    expect(screen.getByText('rocket_launch')).toBeInTheDocument();
  });

  it('renders trending_flat icon for stable', () => {
    render(<TrendStateBadge state="stable" />);
    expect(screen.getByText('trending_flat')).toBeInTheDocument();
  });

  it('renders trending_down icon for declining', () => {
    render(<TrendStateBadge state="declining" />);
    expect(screen.getByText('trending_down')).toBeInTheDocument();
  });

  it('renders help icon for unknown', () => {
    render(<TrendStateBadge state="unknown" />);
    expect(screen.getByText('help')).toBeInTheDocument();
  });
});

describe('TrendStateBadge — sizes', () => {
  it('applies md size classes by default', () => {
    const { container } = render(<TrendStateBadge state="rising" />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain('px-2.5');
    expect(badge.className).toContain('text-xs');
    expect(badge.className).toContain('font-medium');
  });

  it('applies sm size classes when size="sm"', () => {
    const { container } = render(<TrendStateBadge state="rising" size="sm" />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain('px-2');
    expect(badge.className).toContain('text-[10px]');
  });
});

describe('TrendStateBadge — colors', () => {
  // happy-dom preserves raw values in inline styles (CSS vars aren't resolved).
  // Assertions use STATE_CONFIG so they stay in sync with the source of truth.
  it('applies rising color via inline style', () => {
    const { container } = render(<TrendStateBadge state="rising" />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.style.color).toBe(STATE_CONFIG.rising.color);
  });

  it('applies declining color via inline style', () => {
    const { container } = render(<TrendStateBadge state="declining" />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.style.color).toBe(STATE_CONFIG.declining.color);
  });

  it('applies stable color via inline style', () => {
    const { container } = render(<TrendStateBadge state="stable" />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.style.color).toBe(STATE_CONFIG.stable.color);
  });

  it('applies peak color via inline style', () => {
    const { container } = render(<TrendStateBadge state="peak" />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.style.color).toBe(STATE_CONFIG.peak.color);
  });
});
