/**
 * Unit tests — StateTooltip
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { StateTooltip } from './StateTooltip';
import type { StateProfile, OpportunityScore } from '@/lib/states/types';

const MOCK_PROFILE: StateProfile = {
  code: 'CA',
  name: 'California',
  region: 'West',
  population: 38965193,
  medianIncome: 91905,
  urbanizationPct: 95,
  gdpBillions: 3900,
  ecommerceIndex: 88,
  ageDistribution: { under18: 22, age18to34: 23, age35to54: 26, age55plus: 29 },
  dataYear: 2023,
};

const MOCK_SCORE: OpportunityScore = {
  stateCode: 'CA',
  score: 85,
  breakdown: { demographics: 90, trendActivity: 80, ecommerceIndex: 88, incomeIndex: 90 },
  topCategories: ['electronics', 'fashion'],
  computedAt: Date.now(),
};

const DEFAULT_POS = { x: 100, y: 200 };

describe('StateTooltip', () => {
  it('renders when visible and profile provided', () => {
    render(
      <StateTooltip
        profile={MOCK_PROFILE}
        score={MOCK_SCORE}
        position={DEFAULT_POS}
        visible={true}
      />,
    );
    expect(screen.getByTestId('state-tooltip')).toBeInTheDocument();
  });

  it('does not render when visible=false', () => {
    render(
      <StateTooltip
        profile={MOCK_PROFILE}
        score={MOCK_SCORE}
        position={DEFAULT_POS}
        visible={false}
      />,
    );
    expect(screen.queryByTestId('state-tooltip')).not.toBeInTheDocument();
  });

  it('does not render when profile is null', () => {
    render(<StateTooltip profile={null} score={null} position={DEFAULT_POS} visible={true} />);
    expect(screen.queryByTestId('state-tooltip')).not.toBeInTheDocument();
  });

  it('displays state name', () => {
    render(
      <StateTooltip
        profile={MOCK_PROFILE}
        score={MOCK_SCORE}
        position={DEFAULT_POS}
        visible={true}
      />,
    );
    expect(screen.getByText('California')).toBeInTheDocument();
  });

  it('displays score with label', () => {
    render(
      <StateTooltip
        profile={MOCK_PROFILE}
        score={MOCK_SCORE}
        position={DEFAULT_POS}
        visible={true}
      />,
    );
    expect(screen.getByTestId('tooltip-score')).toHaveTextContent('85 (High)');
  });

  it('displays formatted population (millions)', () => {
    render(
      <StateTooltip
        profile={MOCK_PROFILE}
        score={MOCK_SCORE}
        position={DEFAULT_POS}
        visible={true}
      />,
    );
    expect(screen.getByTestId('tooltip-population')).toHaveTextContent('39.0M');
  });

  it('displays formatted income', () => {
    render(
      <StateTooltip
        profile={MOCK_PROFILE}
        score={MOCK_SCORE}
        position={DEFAULT_POS}
        visible={true}
      />,
    );
    expect(screen.getByTestId('tooltip-income')).toHaveTextContent('$92K');
  });

  it('displays ecommerce index', () => {
    render(
      <StateTooltip
        profile={MOCK_PROFILE}
        score={MOCK_SCORE}
        position={DEFAULT_POS}
        visible={true}
      />,
    );
    expect(screen.getByText('88/100')).toBeInTheDocument();
  });

  it('displays top categories when present', () => {
    render(
      <StateTooltip
        profile={MOCK_PROFILE}
        score={MOCK_SCORE}
        position={DEFAULT_POS}
        visible={true}
      />,
    );
    expect(screen.getByText('electronics, fashion')).toBeInTheDocument();
  });

  it('handles score=null gracefully (shows 0)', () => {
    render(
      <StateTooltip profile={MOCK_PROFILE} score={null} position={DEFAULT_POS} visible={true} />,
    );
    expect(screen.getByTestId('tooltip-score')).toHaveTextContent('0 (Low)');
  });

  it('positions tooltip at given coordinates', () => {
    render(
      <StateTooltip
        profile={MOCK_PROFILE}
        score={MOCK_SCORE}
        position={{ x: 150, y: 300 }}
        visible={true}
      />,
    );
    const tooltip = screen.getByTestId('state-tooltip');
    expect(tooltip.style.left).toBe('150px');
    expect(tooltip.style.top).toBe('300px');
  });
});
