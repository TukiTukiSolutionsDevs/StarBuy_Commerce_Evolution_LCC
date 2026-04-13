/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RollbackButton } from './RollbackButton';

const PUBLISHED = {
  id: 'rec-1',
  researchId: 'res-1',
  status: 'published',
  shopifyProductId: 'gid://shopify/Product/123',
  validation: { title: true, description: true, price: true, images: true, errors: [] },
  retryCount: 0,
  createdAt: '',
  updatedAt: '',
} as any;

const ARCHIVED = { ...PUBLISHED, status: 'archived', archivedAt: '2024-01-02T00:00:00.000Z' };

beforeEach(() => {
  vi.clearAllMocks();
  global.fetch = vi
    .fn()
    .mockResolvedValue({ ok: true, json: vi.fn().mockResolvedValue({ record: ARCHIVED }) } as any);
});

describe('RollbackButton', () => {
  it('renders rollback button for published records', () => {
    render(<RollbackButton record={PUBLISHED} />);
    expect(screen.getByTestId('rollback-button')).toBeInTheDocument();
  });

  it('does not render for non-published records', () => {
    render(<RollbackButton record={{ ...PUBLISHED, status: 'failed' }} />);
    expect(screen.queryByTestId('rollback-button')).not.toBeInTheDocument();
  });

  it('shows confirmation dialog on click', () => {
    render(<RollbackButton record={PUBLISHED} />);
    fireEvent.click(screen.getByTestId('rollback-button'));
    expect(screen.getByTestId('rollback-confirm-dialog')).toBeInTheDocument();
  });

  it('calls onRollbackComplete after successful rollback', async () => {
    const onRollbackComplete = vi.fn();
    render(<RollbackButton record={PUBLISHED} onRollbackComplete={onRollbackComplete} />);
    fireEvent.click(screen.getByTestId('rollback-button'));
    fireEvent.click(screen.getByTestId('rollback-confirm-yes'));
    await waitFor(() => expect(onRollbackComplete).toHaveBeenCalledWith(ARCHIVED));
  });
});
