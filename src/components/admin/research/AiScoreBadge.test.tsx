/**
 * Unit tests — AiScoreBadge
 * @vitest-environment jsdom
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { AiScoreBadge, LABEL_CONFIG } from './AiScoreBadge';
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

  it('uses Weak color for Weak label', () => {
    render(<AiScoreBadge score={25} label="Weak" breakdown={breakdown} />);
    expect(screen.getByTestId('ai-score-badge')).toHaveStyle({ color: LABEL_CONFIG.Weak.color });
  });

  it('uses Fair color for Fair label', () => {
    render(<AiScoreBadge score={50} label="Fair" breakdown={breakdown} />);
    expect(screen.getByTestId('ai-score-badge')).toHaveStyle({ color: LABEL_CONFIG.Fair.color });
  });

  it('uses Good color for Good label', () => {
    render(<AiScoreBadge score={73} label="Good" breakdown={breakdown} />);
    expect(screen.getByTestId('ai-score-badge')).toHaveStyle({ color: LABEL_CONFIG.Good.color });
  });

  it('uses Strong color for Strong label', () => {
    render(<AiScoreBadge score={90} label="Strong" breakdown={breakdown} />);
    expect(screen.getByTestId('ai-score-badge')).toHaveStyle({ color: LABEL_CONFIG.Strong.color });
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
