/**
 * Tests — ResearchStatusBadge
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ResearchStatusBadge } from './ResearchStatusBadge';
import type { ResearchItemStatus } from '@/lib/research/types';

describe('ResearchStatusBadge', () => {
  const statuses: ResearchItemStatus[] = [
    'candidate',
    'saved',
    'imported',
    'discarded',
    'importing',
    'published',
  ];

  it.each(statuses)('renders badge for status "%s"', (status) => {
    render(<ResearchStatusBadge status={status} />);
    const badge = screen.getByTestId('research-status-badge');
    expect(badge).toBeDefined();
    expect(badge.getAttribute('data-status')).toBe(status);
  });

  it('shows "Importing…" label with pulse for importing status', () => {
    render(<ResearchStatusBadge status="importing" />);
    const badge = screen.getByTestId('research-status-badge');
    expect(badge.textContent).toContain('Importing');
    expect(badge.className).toContain('animate-pulse');
  });

  it('shows "Published" label for published status', () => {
    render(<ResearchStatusBadge status="published" />);
    expect(screen.getByTestId('research-status-badge').textContent).toContain('Published');
  });

  it('applies custom className', () => {
    render(<ResearchStatusBadge status="saved" className="mt-2" />);
    expect(screen.getByTestId('research-status-badge').className).toContain('mt-2');
  });
});
