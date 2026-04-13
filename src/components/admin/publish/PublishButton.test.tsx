/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PublishButton } from './PublishButton';

const MOCK_ITEM = {
  id: 'res-1',
  keyword: 'test',
  title: 'Test Product',
  salePrice: 29.99,
  costPrice: 10,
  status: 'saved',
} as any;
const PENDING = { id: 'rec-1', researchId: 'res-1', status: 'pending' } as any;
const PUBLISHED = { id: 'rec-1', researchId: 'res-1', status: 'published' } as any;

beforeEach(() => {
  vi.clearAllMocks();
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: vi.fn().mockResolvedValue({ record: PENDING }),
  } as any);
});

describe('PublishButton', () => {
  it('renders Publish when no record', () => {
    render(<PublishButton researchItem={MOCK_ITEM} />);
    expect(screen.getByTestId('publish-button')).toHaveTextContent('Publish');
  });

  it('renders Published when record is published', () => {
    render(<PublishButton researchItem={MOCK_ITEM} publishRecord={PUBLISHED} />);
    expect(screen.getByTestId('publish-button')).toHaveTextContent('Published');
  });

  it('is disabled when already published', () => {
    render(<PublishButton researchItem={MOCK_ITEM} publishRecord={PUBLISHED} />);
    expect(screen.getByTestId('publish-button')).toBeDisabled();
  });

  it('is disabled when disabled prop is true', () => {
    render(<PublishButton researchItem={MOCK_ITEM} disabled />);
    expect(screen.getByTestId('publish-button')).toBeDisabled();
  });

  it('fires onPublishStart after successful POST', async () => {
    const onPublishStart = vi.fn();
    render(<PublishButton researchItem={MOCK_ITEM} onPublishStart={onPublishStart} />);
    fireEvent.click(screen.getByTestId('publish-button'));
    await waitFor(() => expect(onPublishStart).toHaveBeenCalledWith(PENDING));
  });
});
