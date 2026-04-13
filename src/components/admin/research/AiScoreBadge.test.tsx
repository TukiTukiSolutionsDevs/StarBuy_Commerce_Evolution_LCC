/**
 * Unit tests — AiScoreBadge
 * @vitest-environment jsdom
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { AiScoreBadge } from './AiScoreBadge';
import type { AiScoreBreakdown } from '@/lib/research/types';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const breakdown: AiScoreBreakdown = {
  trend: 30,
  margin: 20,
  competition: 15,
  volume: 8,
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('AiScoreBadge', () => {
  it('renders the score number', () => {
    render(<AiScoreBadge score={73} label="Good" breakdown={breakdown} />);
    expect(screen.getByTestId('ai-score-badge')).toHaveTextContent('73');
  });

  it('renders the label text', () => {
    render(<AiScoreBadge score={73} label="Good" breakdown={breakdown} />);
    expect(screen.getByTestId('ai-score-badge')).toHaveTextContent('Good');
  });

  it('uses red color for Weak label', () => {
    render(<AiScoreBadge score={25} label="Weak" breakdown={breakdown} />);
    expect(screen.getByTestId('ai-score-badge')).toHaveStyle({ color: '#ef4444' });
  });

  it('uses gold color for Fair label', () => {
    render(<AiScoreBadge score={50} label="Fair" breakdown={breakdown} />);
    expect(screen.getByTestId('ai-score-badge')).toHaveStyle({ color: '#d4a843' });
  });

  it('uses green color for Good label', () => {
    render(<AiScoreBadge score={73} label="Good" breakdown={breakdown} />);
    expect(screen.getByTestId('ai-score-badge')).toHaveStyle({ color: '#10b981' });
  });

  it('uses indigo color for Strong label', () => {
    render(<AiScoreBadge score={90} label="Strong" breakdown={breakdown} />);
    expect(screen.getByTestId('ai-score-badge')).toHaveStyle({ color: '#6366f1' });
  });

  it('shows tooltip on hover with breakdown values', () => {
    render(<AiScoreBadge score={73} label="Good" breakdown={breakdown} />);
    const badge = screen.getByTestId('ai-score-badge');

    // Tooltip not visible initially
    expect(screen.queryByTestId('ai-score-tooltip')).not.toBeInTheDocument();

    fireEvent.mouseEnter(badge);
    expect(screen.getByTestId('ai-score-tooltip')).toBeInTheDocument();
    expect(screen.getByTestId('ai-score-tooltip')).toHaveTextContent('Trend');
    expect(screen.getByTestId('ai-score-tooltip')).toHaveTextContent('Margin');
    expect(screen.getByTestId('ai-score-tooltip')).toHaveTextContent('Competition');
    expect(screen.getByTestId('ai-score-tooltip')).toHaveTextContent('Volume');
  });

  it('hides tooltip on mouse leave', () => {
    render(<AiScoreBadge score={73} label="Good" breakdown={breakdown} />);
    const badge = screen.getByTestId('ai-score-badge');

    fireEvent.mouseEnter(badge);
    expect(screen.getByTestId('ai-score-tooltip')).toBeInTheDocument();

    fireEvent.mouseLeave(badge);
    expect(screen.queryByTestId('ai-score-tooltip')).not.toBeInTheDocument();
  });

  it('has aria-label with score and label', () => {
    render(<AiScoreBadge score={73} label="Good" breakdown={breakdown} />);
    expect(screen.getByTestId('ai-score-badge')).toHaveAttribute(
      'aria-label',
      'AI Score: 73 — Good',
    );
  });
});
