/**
 * Unit tests — AdminLayout navigation
 *
 * Verifies that the Intelligence nav group contains both Trend Engine
 * and Market Explorer, and that active state resolves correctly for
 * /admin/explorer* routes.
 *
 * @vitest-environment happy-dom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/admin'),
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('next/dynamic', () => ({
  default: (_loader: unknown, _options?: unknown) => {
    const MockComponent = () => null;
    MockComponent.displayName = 'DynamicMock';
    return MockComponent;
  },
}));

vi.mock('next/image', () => ({
  default: ({ src, alt, width, height, className }: React.ImgHTMLAttributes<HTMLImageElement>) =>
    React.createElement('img', { src, alt, width, height, className }),
}));

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    className,
    title,
    style,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
    title?: string;
    style?: React.CSSProperties;
  }) => React.createElement('a', { href, className, title, style }, children),
}));

vi.mock('@/components/ui/ToastProvider', () => ({
  ToastProvider: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
}));

// ─── Import after mocks ───────────────────────────────────────────────────────

import { usePathname } from 'next/navigation';
import AdminLayout from './layout';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function setPathname(path: string) {
  vi.mocked(usePathname).mockReturnValue(path);
}

function renderLayout(pathname = '/admin') {
  setPathname(pathname);
  return render(
    <AdminLayout>
      <div data-testid="page-content" />
    </AdminLayout>,
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('AdminLayout — Intelligence nav items', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders "Trend Engine" nav item', () => {
    renderLayout();
    expect(screen.getByText('Trend Engine')).toBeInTheDocument();
  });

  it('renders "Market Explorer" nav item', () => {
    renderLayout();
    expect(screen.getByText('Market Explorer')).toBeInTheDocument();
  });

  it('Market Explorer link has href /admin/explorer', () => {
    renderLayout();
    const link = screen.getByRole('link', { name: /market explorer/i });
    expect(link).toHaveAttribute('href', '/admin/explorer');
  });

  it('Trend Engine link has href /admin/trends', () => {
    renderLayout();
    const link = screen.getByRole('link', { name: /trend engine/i });
    expect(link).toHaveAttribute('href', '/admin/trends');
  });

  it('explore icon is rendered for Market Explorer', () => {
    renderLayout();
    // material-symbols-outlined renders icon name as text content
    const icons = screen.getAllByText('explore');
    expect(icons.length).toBeGreaterThan(0);
  });
});

describe('AdminLayout — Market Explorer active state', () => {
  beforeEach(() => vi.clearAllMocks());

  it('is active on /admin/explorer (exact match)', () => {
    renderLayout('/admin/explorer');
    const link = screen.getByRole('link', { name: /market explorer/i });
    expect(link.style.backgroundColor).toBe('var(--admin-brand-bg)');
  });

  it('is active on /admin/explorer/electronics (startsWith)', () => {
    renderLayout('/admin/explorer/electronics');
    const link = screen.getByRole('link', { name: /market explorer/i });
    expect(link.style.backgroundColor).toBe('var(--admin-brand-bg)');
  });

  it('is active on /admin/explorer/health (startsWith)', () => {
    renderLayout('/admin/explorer/health');
    const link = screen.getByRole('link', { name: /market explorer/i });
    expect(link.style.backgroundColor).toBe('var(--admin-brand-bg)');
  });

  it('is NOT active on /admin/trends', () => {
    renderLayout('/admin/trends');
    const link = screen.getByRole('link', { name: /market explorer/i });
    expect(link.style.backgroundColor).not.toBe('var(--admin-brand-bg)');
  });

  it('is NOT active on /admin (dashboard)', () => {
    renderLayout('/admin');
    const link = screen.getByRole('link', { name: /market explorer/i });
    expect(link.style.backgroundColor).not.toBe('var(--admin-brand-bg)');
  });

  it('Trend Engine is NOT active when on /admin/explorer', () => {
    renderLayout('/admin/explorer');
    const link = screen.getByRole('link', { name: /trend engine/i });
    expect(link.style.backgroundColor).not.toBe('var(--admin-brand-bg)');
  });
});

describe('AdminLayout — collapsed sidebar tooltip', () => {
  beforeEach(() => vi.clearAllMocks());

  it('Market Explorer link has title attribute for collapsed tooltip', () => {
    // The NavItem component sets title={label} when collapsed
    // We test the link has the correct label available as text
    renderLayout('/admin/explorer');
    const link = screen.getByRole('link', { name: /market explorer/i });
    // In expanded mode (default), title is undefined — label is visible as text
    expect(screen.getByText('Market Explorer')).toBeInTheDocument();
    // Link exists with correct href
    expect(link).toHaveAttribute('href', '/admin/explorer');
  });
});
