/**
 * Tests — BatchPublishToolbar
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BatchPublishToolbar } from './BatchPublishToolbar';

describe('BatchPublishToolbar', () => {
  it('renders nothing when no items selected', () => {
    const { container } = render(
      <BatchPublishToolbar selectedIds={[]} onBatchPublish={vi.fn()} onClearSelection={vi.fn()} />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('shows count of selected items', () => {
    render(
      <BatchPublishToolbar
        selectedIds={['a', 'b', 'c']}
        onBatchPublish={vi.fn()}
        onClearSelection={vi.fn()}
      />,
    );
    expect(screen.getByTestId('batch-count').textContent).toBe('3');
  });

  it('shows warning when over 20 items', () => {
    const ids = Array.from({ length: 21 }, (_, i) => `id-${i}`);
    render(
      <BatchPublishToolbar selectedIds={ids} onBatchPublish={vi.fn()} onClearSelection={vi.fn()} />,
    );
    expect(screen.getByTestId('batch-warning')).toBeDefined();
  });

  it('disables publish button when over 20 items', () => {
    const ids = Array.from({ length: 21 }, (_, i) => `id-${i}`);
    render(
      <BatchPublishToolbar selectedIds={ids} onBatchPublish={vi.fn()} onClearSelection={vi.fn()} />,
    );
    expect(screen.getByTestId('batch-publish-btn').hasAttribute('disabled')).toBe(true);
  });

  it('calls onClearSelection when clear button clicked', () => {
    const onClear = vi.fn();
    render(
      <BatchPublishToolbar
        selectedIds={['a']}
        onBatchPublish={vi.fn()}
        onClearSelection={onClear}
      />,
    );
    fireEvent.click(screen.getByTestId('batch-clear-btn'));
    expect(onClear).toHaveBeenCalledOnce();
  });

  it('disables publish button when disabled prop is true', () => {
    render(
      <BatchPublishToolbar
        selectedIds={['a']}
        onBatchPublish={vi.fn()}
        onClearSelection={vi.fn()}
        disabled
      />,
    );
    expect(screen.getByTestId('batch-publish-btn').hasAttribute('disabled')).toBe(true);
  });

  it('shows publish button text with count', () => {
    render(
      <BatchPublishToolbar
        selectedIds={['a', 'b']}
        onBatchPublish={vi.fn()}
        onClearSelection={vi.fn()}
      />,
    );
    expect(screen.getByTestId('batch-publish-btn').textContent).toContain('Publish 2 items');
  });
});
