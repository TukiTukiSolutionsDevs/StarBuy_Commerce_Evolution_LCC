/**
 * Unit tests — StateStatCard
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { StateStatCard } from './StateStatCard';

describe('StateStatCard', () => {
  it('renders label and value', () => {
    render(<StateStatCard label="Population" value="39M" />);
    expect(screen.getByText('Population')).toBeInTheDocument();
    expect(screen.getByTestId('stat-value')).toHaveTextContent('39M');
  });

  it('renders numeric value', () => {
    render(<StateStatCard label="Score" value={85} />);
    expect(screen.getByTestId('stat-value')).toHaveTextContent('85');
  });

  it('renders up trend icon', () => {
    render(<StateStatCard label="Score" value={85} trend="up" />);
    const trend = screen.getByTestId('stat-trend');
    expect(trend).toBeInTheDocument();
    expect(trend).toHaveTextContent('trending_up');
    expect(trend.className).toContain('text-emerald-400');
  });

  it('renders down trend icon', () => {
    render(<StateStatCard label="Score" value={40} trend="down" />);
    const trend = screen.getByTestId('stat-trend');
    expect(trend).toHaveTextContent('trending_down');
    expect(trend.className).toContain('text-red-400');
  });

  it('renders neutral trend icon', () => {
    render(<StateStatCard label="Score" value={50} trend="neutral" />);
    const trend = screen.getByTestId('stat-trend');
    expect(trend).toHaveTextContent('trending_flat');
    expect(trend.className).toContain('text-gray-400');
  });

  it('does not render trend when not provided', () => {
    render(<StateStatCard label="Score" value={50} />);
    expect(screen.queryByTestId('stat-trend')).not.toBeInTheDocument();
  });

  it('renders subtitle when provided', () => {
    render(<StateStatCard label="Income" value="$91k" subtitle="Median household" />);
    expect(screen.getByTestId('stat-subtitle')).toHaveTextContent('Median household');
  });

  it('does not render subtitle when not provided', () => {
    render(<StateStatCard label="Score" value={50} />);
    expect(screen.queryByTestId('stat-subtitle')).not.toBeInTheDocument();
  });
});
