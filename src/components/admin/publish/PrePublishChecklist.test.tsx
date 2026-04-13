/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PrePublishChecklist } from './PrePublishChecklist';

const VALID = { title: true, description: true, price: true, images: true, errors: [] };
const INVALID = {
  title: false,
  description: true,
  price: false,
  images: true,
  errors: ['Title too short', 'Invalid price'],
};

describe('PrePublishChecklist', () => {
  it('renders all four check items', () => {
    render(
      <PrePublishChecklist
        validation={VALID}
        ready={true}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByTestId('check-title')).toBeInTheDocument();
    expect(screen.getByTestId('check-description')).toBeInTheDocument();
    expect(screen.getByTestId('check-price')).toBeInTheDocument();
    expect(screen.getByTestId('check-images')).toBeInTheDocument();
  });

  it('calls onCancel when cancel is clicked', () => {
    const onCancel = vi.fn();
    render(
      <PrePublishChecklist
        validation={VALID}
        ready={true}
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />,
    );
    fireEvent.click(screen.getByTestId('checklist-cancel'));
    expect(onCancel).toHaveBeenCalled();
  });

  it('calls onConfirm when confirm is clicked and ready', () => {
    const onConfirm = vi.fn();
    render(
      <PrePublishChecklist
        validation={VALID}
        ready={true}
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByTestId('checklist-confirm'));
    expect(onConfirm).toHaveBeenCalled();
  });

  it('disables confirm button when not ready', () => {
    render(
      <PrePublishChecklist
        validation={INVALID}
        ready={false}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByTestId('checklist-confirm')).toBeDisabled();
  });
});
