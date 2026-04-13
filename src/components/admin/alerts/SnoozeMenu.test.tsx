/**
 * Tests — SnoozeMenu
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SnoozeMenu } from './SnoozeMenu';

describe('SnoozeMenu', () => {
  it('renders the snooze trigger button', () => {
    render(<SnoozeMenu onSnooze={vi.fn()} />);
    expect(screen.getByTestId('snooze-trigger')).toBeDefined();
  });

  it('calls onSnooze with 1 when "1 hour" selected', () => {
    const onSnooze = vi.fn();
    render(<SnoozeMenu onSnooze={onSnooze} />);
    fireEvent.click(screen.getByTestId('snooze-trigger'));
    fireEvent.click(screen.getByTestId('snooze-option-1'));
    expect(onSnooze).toHaveBeenCalledWith(1);
  });

  it('calls onSnooze with 24 when "24 hours" selected', () => {
    const onSnooze = vi.fn();
    render(<SnoozeMenu onSnooze={onSnooze} />);
    fireEvent.click(screen.getByTestId('snooze-trigger'));
    fireEvent.click(screen.getByTestId('snooze-option-24'));
    expect(onSnooze).toHaveBeenCalledWith(24);
  });
});
