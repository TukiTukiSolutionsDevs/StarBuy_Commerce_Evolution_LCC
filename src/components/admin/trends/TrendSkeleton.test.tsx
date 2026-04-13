/**
 * Unit tests — TrendSkeleton
 *
 * @vitest-environment happy-dom
 */

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { TrendSkeleton } from './TrendSkeleton';

function renderInDiv(ui: React.ReactElement) {
  return render(<div>{ui}</div>);
}

describe('TrendSkeleton — card variant', () => {
  it('renders 6 card skeletons by default', () => {
    const { container } = renderInDiv(<TrendSkeleton variant="card" />);
    expect(container.querySelectorAll('.rounded-2xl')).toHaveLength(6);
  });

  it('renders N card skeletons when count is specified', () => {
    const { container } = renderInDiv(<TrendSkeleton variant="card" count={3} />);
    expect(container.querySelectorAll('.rounded-2xl')).toHaveLength(3);
  });

  it('renders 1 card skeleton when count=1', () => {
    const { container } = renderInDiv(<TrendSkeleton variant="card" count={1} />);
    expect(container.querySelectorAll('.rounded-2xl')).toHaveLength(1);
  });

  it('renders 8 card skeletons when count=8', () => {
    const { container } = renderInDiv(<TrendSkeleton variant="card" count={8} />);
    expect(container.querySelectorAll('.rounded-2xl')).toHaveLength(8);
  });

  it('card skeletons contain animate-pulse elements', () => {
    const { container } = renderInDiv(<TrendSkeleton variant="card" count={1} />);
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
  });

  it('card skeleton has bg-[#111827] dark background', () => {
    const { container } = renderInDiv(<TrendSkeleton variant="card" count={1} />);
    const card = container.querySelector('.rounded-2xl');
    expect(card?.className).toContain('bg-[#111827]');
  });
});

describe('TrendSkeleton — row variant', () => {
  it('renders 6 row skeletons by default', () => {
    const { container } = renderInDiv(<TrendSkeleton variant="row" />);
    expect(container.querySelectorAll('.rounded-xl')).toHaveLength(6);
  });

  it('renders N row skeletons when count is specified', () => {
    const { container } = renderInDiv(<TrendSkeleton variant="row" count={4} />);
    expect(container.querySelectorAll('.rounded-xl')).toHaveLength(4);
  });

  it('renders 1 row skeleton when count=1', () => {
    const { container } = renderInDiv(<TrendSkeleton variant="row" count={1} />);
    expect(container.querySelectorAll('.rounded-xl')).toHaveLength(1);
  });

  it('row skeletons contain animate-pulse elements', () => {
    const { container } = renderInDiv(<TrendSkeleton variant="row" count={1} />);
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
  });
});
