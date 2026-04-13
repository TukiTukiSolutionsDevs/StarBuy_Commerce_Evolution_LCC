/**
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PublishStatusBadge } from './PublishStatusBadge';

describe('PublishStatusBadge', () => {
  it('renders the correct label for published', () => {
    render(<PublishStatusBadge status="published" />);
    expect(screen.getByTestId('publish-status-badge')).toHaveTextContent('Published');
  });

  it('renders the correct label for failed', () => {
    render(<PublishStatusBadge status="failed" />);
    expect(screen.getByTestId('publish-status-badge')).toHaveTextContent('Failed');
  });

  it('renders the correct label for pending', () => {
    render(<PublishStatusBadge status="pending" />);
    expect(screen.getByTestId('publish-status-badge')).toHaveTextContent('Pending');
  });

  it('applies animate-pulse class for publishing status', () => {
    render(<PublishStatusBadge status="publishing" />);
    const badge = screen.getByTestId('publish-status-badge');
    expect(badge.className).toMatch(/animate-pulse/);
  });
});
