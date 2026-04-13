/**
 * Tests — HealthBadge
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HealthBadge } from './HealthBadge';

describe('HealthBadge', () => {
  it('renders healthy badge with correct label', () => {
    render(<HealthBadge health="healthy" />);
    const badge = screen.getByTestId('health-badge');
    expect(badge.textContent).toContain('Healthy');
    expect(badge.getAttribute('data-health')).toBe('healthy');
  });

  it('renders critical badge with correct label', () => {
    render(<HealthBadge health="critical" />);
    const badge = screen.getByTestId('health-badge');
    expect(badge.textContent).toContain('Critical');
    expect(badge.getAttribute('data-health')).toBe('critical');
  });

  it('shows tooltip with reasons when showTooltip=true and reasons provided', () => {
    render(<HealthBadge health="warning" reasons={['low conversion rate']} showTooltip />);
    const tooltip = screen.getByTestId('health-badge-tooltip');
    expect(tooltip.textContent).toContain('low conversion rate');
  });

  it('does not render tooltip when showTooltip is false (default)', () => {
    render(<HealthBadge health="warning" reasons={['low conversion']} />);
    expect(screen.queryByTestId('health-badge-tooltip')).toBeNull();
  });
});
