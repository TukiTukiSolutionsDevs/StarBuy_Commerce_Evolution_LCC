/**
 * Tests — AlertBell
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AlertBell } from './AlertBell';

describe('AlertBell', () => {
  it('renders bell icon link', () => {
    render(<AlertBell unreadCount={0} />);
    expect(screen.getByTestId('alert-bell')).toBeDefined();
  });

  it('shows badge with count when unreadCount > 0', () => {
    render(<AlertBell unreadCount={5} />);
    expect(screen.getByTestId('alert-bell-badge').textContent).toContain('5');
  });

  it('does not show badge when unreadCount is 0', () => {
    render(<AlertBell unreadCount={0} />);
    expect(screen.queryByTestId('alert-bell-badge')).toBeNull();
  });
});
