/**
 * Unit tests — TrendStateBadge
 *
 * @vitest-environment happy-dom
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TrendStateBadge } from './TrendStateBadge';

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
  // happy-dom preserves hex values in inline styles (no rgb() normalization)
  it('applies rising color (#10b981) via inline style', () => {
    const { container } = render(<TrendStateBadge state="rising" />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.style.color).toBe('#10b981');
  });

  it('applies declining color (#ef4444) via inline style', () => {
    const { container } = render(<TrendStateBadge state="declining" />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.style.color).toBe('#ef4444');
  });

  it('applies stable color (#6b8cff) via inline style', () => {
    const { container } = render(<TrendStateBadge state="stable" />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.style.color).toBe('#6b8cff');
  });

  it('applies peak color (#d4a843) via inline style', () => {
    const { container } = render(<TrendStateBadge state="peak" />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.style.color).toBe('#d4a843');
  });
});
