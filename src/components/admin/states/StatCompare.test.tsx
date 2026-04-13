/**
 * Unit tests — StatCompare
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { StatCompare } from './StatCompare';
import type { StateWithScore, OpportunityScore } from '@/lib/states/types';

function makeState(code: string, name: string, score: number): StateWithScore {
  const oppScore: OpportunityScore = {
    stateCode: code,
    score,
    breakdown: { demographics: 25, trendActivity: 25, ecommerceIndex: 25, incomeIndex: 25 },
    topCategories: ['electronics'],
    computedAt: Date.now(),
  };
  return {
    code,
    name,
    region: 'West',
    population: 5000000,
    medianIncome: 70000,
    urbanizationPct: 80,
    gdpBillions: 400,
    ecommerceIndex: 70,
    ageDistribution: { under18: 22, age18to34: 22, age35to54: 26, age55plus: 30 },
    dataYear: 2023,
    opportunityScore: oppScore,
  };
}

describe('StatCompare', () => {
  it('renders comparison table with 2 states', () => {
    const states = [makeState('CA', 'California', 85), makeState('TX', 'Texas', 70)];
    render(<StatCompare states={states} />);
    expect(screen.getByTestId('stat-compare')).toBeInTheDocument();
  });

  it('renders comparison table with 3 states', () => {
    const states = [
      makeState('CA', 'California', 85),
      makeState('TX', 'Texas', 70),
      makeState('NY', 'New York', 80),
    ];
    render(<StatCompare states={states} />);
    expect(screen.getByText('California')).toBeInTheDocument();
    expect(screen.getByText('Texas')).toBeInTheDocument();
    expect(screen.getByText('New York')).toBeInTheDocument();
  });

  it('returns null when fewer than 2 states', () => {
    const { container } = render(<StatCompare states={[makeState('CA', 'California', 85)]} />);
    expect(container.innerHTML).toBe('');
  });

  it('shows state names in header', () => {
    const states = [makeState('CA', 'California', 85), makeState('TX', 'Texas', 70)];
    render(<StatCompare states={states} />);
    expect(screen.getByText('California')).toBeInTheDocument();
    expect(screen.getByText('Texas')).toBeInTheDocument();
  });

  it('shows state codes', () => {
    const states = [makeState('CA', 'California', 85), makeState('TX', 'Texas', 70)];
    render(<StatCompare states={states} />);
    expect(screen.getByText('CA')).toBeInTheDocument();
    expect(screen.getByText('TX')).toBeInTheDocument();
  });

  it('renders score badges with correct values', () => {
    const states = [makeState('CA', 'California', 85), makeState('TX', 'Texas', 70)];
    render(<StatCompare states={states} />);
    expect(screen.getByTestId('compare-score-badge-CA')).toHaveTextContent('85');
    expect(screen.getByTestId('compare-score-badge-TX')).toHaveTextContent('70');
  });

  it('renders all 7 comparison rows', () => {
    const states = [makeState('CA', 'California', 85), makeState('TX', 'Texas', 70)];
    render(<StatCompare states={states} />);
    expect(screen.getByTestId('compare-row-opportunity-score')).toBeInTheDocument();
    expect(screen.getByTestId('compare-row-population')).toBeInTheDocument();
    expect(screen.getByTestId('compare-row-median-income')).toBeInTheDocument();
    expect(screen.getByTestId('compare-row-urbanization')).toBeInTheDocument();
    expect(screen.getByTestId('compare-row-e-commerce-index')).toBeInTheDocument();
    expect(screen.getByTestId('compare-row-gdp')).toBeInTheDocument();
    expect(screen.getByTestId('compare-row-region')).toBeInTheDocument();
  });

  it('formats population correctly', () => {
    const states = [makeState('CA', 'California', 85), makeState('TX', 'Texas', 70)];
    render(<StatCompare states={states} />);
    // Both have population 5000000 → "5.0M"
    const popRow = screen.getByTestId('compare-row-population');
    expect(popRow).toHaveTextContent('5.0M');
  });

  it('highlights opportunity score row', () => {
    const states = [makeState('CA', 'California', 85), makeState('TX', 'Texas', 70)];
    render(<StatCompare states={states} />);
    const row = screen.getByTestId('compare-row-opportunity-score');
    expect(row.className).toContain('bg-');
  });
});
