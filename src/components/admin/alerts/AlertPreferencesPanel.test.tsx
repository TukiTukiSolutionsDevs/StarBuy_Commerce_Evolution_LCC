/**
 * Tests — AlertPreferencesPanel
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AlertPreferencesPanel } from './AlertPreferencesPanel';
import type { AlertPreferences } from '@/lib/alerts/types';

const MOCK_PREFS: AlertPreferences = {
  thresholds: {
    lowConversionRate: 0.02,
    zeroOrdersDays: 7,
    stockLowUnits: 10,
    pulseShiftMinScore: 15,
  },
  enabledTypes: ['zero_orders', 'stock_low', 'low_conversion', 'pulse_shift', 'price_change'],
  mutedSeverities: [],
};

describe('AlertPreferencesPanel', () => {
  it('renders threshold inputs', () => {
    render(<AlertPreferencesPanel preferences={MOCK_PREFS} onSave={vi.fn()} />);
    expect(screen.getByTestId('pref-stock-low-units')).toBeDefined();
    expect(screen.getByTestId('pref-zero-orders-days')).toBeDefined();
  });

  it('renders type toggle checkboxes', () => {
    render(<AlertPreferencesPanel preferences={MOCK_PREFS} onSave={vi.fn()} />);
    expect(screen.getByTestId('pref-toggle-zero_orders')).toBeDefined();
    expect(screen.getByTestId('pref-toggle-stock_low')).toBeDefined();
  });

  it('calls onSave when save button clicked', () => {
    const onSave = vi.fn();
    render(<AlertPreferencesPanel preferences={MOCK_PREFS} onSave={onSave} />);
    fireEvent.click(screen.getByTestId('pref-save-btn'));
    expect(onSave).toHaveBeenCalled();
  });
});
