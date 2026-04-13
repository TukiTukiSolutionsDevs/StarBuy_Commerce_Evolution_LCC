/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { PublishProgressFeed } from './PublishProgressFeed';

const PUBLISHED_RECORD = {
  id: 'rec-1',
  researchId: 'res-1',
  status: 'published',
  validation: { title: true, description: true, price: true, images: true, errors: [] },
  retryCount: 0,
  createdAt: '',
  updatedAt: '',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('PublishProgressFeed', () => {
  it('shows loading state initially', () => {
    global.fetch = vi.fn().mockReturnValue(new Promise(() => {}));
    render(<PublishProgressFeed recordId="rec-1" />);
    expect(screen.getByTestId('publish-progress-loading')).toBeInTheDocument();
  });

  it('shows feed after successful fetch', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ record: PUBLISHED_RECORD }),
      } as any);
    render(<PublishProgressFeed recordId="rec-1" />);
    await waitFor(() => expect(screen.getByTestId('publish-progress-feed')).toBeInTheDocument());
  });

  it('calls onComplete when terminal state is reached', async () => {
    const onComplete = vi.fn();
    global.fetch = vi
      .fn()
      .mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ record: PUBLISHED_RECORD }),
      } as any);
    render(<PublishProgressFeed recordId="rec-1" onComplete={onComplete} />);
    await waitFor(() => expect(onComplete).toHaveBeenCalledWith(PUBLISHED_RECORD));
  });

  it('shows error when fetch returns non-ok', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue({ ok: false, json: vi.fn().mockResolvedValue({}) } as any);
    render(<PublishProgressFeed recordId="rec-1" />);
    await waitFor(() => expect(screen.getByTestId('publish-progress-error')).toBeInTheDocument());
  });
});
