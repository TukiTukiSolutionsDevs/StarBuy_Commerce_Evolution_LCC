/**
 * Unit tests — MarginBadge
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MarginBadge } from './MarginBadge';

describe('MarginBadge', () => {
  it('renders the margin percentage', () => {
    render(<MarginBadge margin={35} />);
    expect(screen.getByTestId('margin-badge')).toBeInTheDocument();
    expect(screen.getByTestId('margin-badge')).toHaveTextContent('35%');
  });

  it('uses red color for margin below 20%', () => {
    render(<MarginBadge margin={15} />);
    const badge = screen.getByTestId('margin-badge');
    expect(badge).toHaveStyle({ color: '#ef4444' });
  });

  it('uses yellow/gold color for margin 20%', () => {
    render(<MarginBadge margin={20} />);
    const badge = screen.getByTestId('margin-badge');
    expect(badge).toHaveStyle({ color: '#d4a843' });
  });

  it('uses yellow/gold color for margin 40%', () => {
    render(<MarginBadge margin={40} />);
    const badge = screen.getByTestId('margin-badge');
    expect(badge).toHaveStyle({ color: '#d4a843' });
  });

  it('uses green color for margin above 40%', () => {
    render(<MarginBadge margin={55} />);
    const badge = screen.getByTestId('margin-badge');
    expect(badge).toHaveStyle({ color: '#10b981' });
  });

  it('uses red for margin = 0', () => {
    render(<MarginBadge margin={0} />);
    const badge = screen.getByTestId('margin-badge');
    expect(badge).toHaveStyle({ color: '#ef4444' });
  });

  it('uses green for margin = 100', () => {
    render(<MarginBadge margin={100} />);
    const badge = screen.getByTestId('margin-badge');
    expect(badge).toHaveStyle({ color: '#10b981' });
  });

  it('rounds margin to nearest integer', () => {
    render(<MarginBadge margin={25.7} />);
    expect(screen.getByTestId('margin-badge')).toHaveTextContent('26%');
  });

  it('shows — for non-finite margin', () => {
    render(<MarginBadge margin={Infinity} />);
    expect(screen.getByTestId('margin-badge')).toHaveTextContent('—');
  });
});
