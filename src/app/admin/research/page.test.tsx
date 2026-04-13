/**
 * Integration tests — Research Board page
 * @vitest-environment jsdom
 */

import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ResearchBoardPage from './page';
import type { ResearchItem } from '@/lib/research/types';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

const mockAddToast = vi.fn();
vi.mock('@/components/ui/ToastProvider', () => ({
  useToastContext: () => ({ addToast: mockAddToast }),
}));

// Minimal mocks for child components that use SVG/canvas
vi.mock('@/components/admin/trends/ScoreRing', () => ({
  ScoreRing: ({ score }: { score: number }) => <span data-testid="score-ring">{score}</span>,
}));

vi.mock('@/components/admin/trends/TrendStateBadge', () => ({
  TrendStateBadge: ({ state }: { state: string }) => (
    <span data-testid="trend-state-badge">{state}</span>
  ),
}));

vi.mock('@/components/admin/research/MarginBadge', () => ({
  MarginBadge: ({ margin }: { margin: number }) => (
    <span data-testid="margin-badge">{margin}%</span>
  ),
}));

vi.mock('@/components/admin/research/AiScoreBadge', () => ({
  AiScoreBadge: ({ score, label }: { score: number; label: string }) => (
    <span data-testid="ai-score-badge">
      {score} {label}
    </span>
  ),
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeItem(overrides: Partial<ResearchItem> = {}): ResearchItem {
  return {
    id: 'item-1',
    keyword: 'wireless earbuds',
    title: 'wireless earbuds',
    trendScore: 82,
    trendState: 'rising',
    sources: ['pytrends'],
    relatedKeywords: ['bluetooth headphones'],
    costPrice: 15,
    salePrice: 49.99,
    marginPercent: 70.0,
    aiScore: 78,
    aiScoreBreakdown: { trend: 30, margin: 25, competition: 15, volume: 8 },
    aiScoreLabel: 'Good',
    status: 'candidate',
    addedAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

function makeFetch(items: ResearchItem[] = []) {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ items }),
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ResearchBoardPage', () => {
  beforeEach(() => {
    mockAddToast.mockClear();
    global.fetch = makeFetch() as unknown as typeof fetch;
  });

  it('renders the page heading', async () => {
    render(<ResearchBoardPage />);
    expect(screen.getByTestId('research-board-page')).toBeInTheDocument();
    expect(screen.getByText('Research Board')).toBeInTheDocument();
  });

  it('shows skeleton while loading', () => {
    render(<ResearchBoardPage />);
    expect(screen.getByTestId('table-skeleton')).toBeInTheDocument();
  });

  it('shows empty state when no items', async () => {
    render(<ResearchBoardPage />);
    await waitFor(() => {
      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    });
    expect(screen.getByText(/no items yet/i)).toBeInTheDocument();
  });

  it('renders stat cards after load', async () => {
    global.fetch = makeFetch([makeItem()]) as unknown as typeof fetch;
    render(<ResearchBoardPage />);
    await waitFor(() => {
      expect(screen.getByTestId('stat-cards')).toBeInTheDocument();
    });
    const cards = screen.getByTestId('stat-cards');
    expect(cards).toHaveTextContent('Total Items');
    expect(cards).toHaveTextContent('Avg Margin');
    expect(cards).toHaveTextContent('Avg AI Score');
    // stat card counts
    expect(cards).toHaveTextContent('1'); // Total Items = 1
  });

  it('renders filter tabs', async () => {
    render(<ResearchBoardPage />);
    await waitFor(() => {
      expect(screen.getByTestId('filter-tabs')).toBeInTheDocument();
    });
    expect(screen.getByTestId('filter-tab-all')).toBeInTheDocument();
    expect(screen.getByTestId('filter-tab-candidate')).toBeInTheDocument();
    expect(screen.getByTestId('filter-tab-saved')).toBeInTheDocument();
    expect(screen.getByTestId('filter-tab-imported')).toBeInTheDocument();
    expect(screen.getByTestId('filter-tab-discarded')).toBeInTheDocument();
  });

  it('renders the search input', async () => {
    render(<ResearchBoardPage />);
    await waitFor(() => {
      expect(screen.getByTestId('search-input')).toBeInTheDocument();
    });
  });

  it('renders a table row for each item', async () => {
    const items = [
      makeItem({ id: 'a', keyword: 'wireless earbuds' }),
      makeItem({ id: 'b', keyword: 'yoga mat' }),
    ];
    global.fetch = makeFetch(items) as unknown as typeof fetch;
    render(<ResearchBoardPage />);

    await waitFor(() => {
      expect(screen.getByTestId('research-table')).toBeInTheDocument();
    });

    const rows = screen.getAllByTestId('research-row');
    expect(rows).toHaveLength(2);
    expect(screen.getByText('wireless earbuds')).toBeInTheDocument();
    expect(screen.getByText('yoga mat')).toBeInTheDocument();
  });

  it('filters by keyword search', async () => {
    const items = [
      makeItem({ id: 'a', keyword: 'wireless earbuds' }),
      makeItem({ id: 'b', keyword: 'yoga mat' }),
    ];
    global.fetch = makeFetch(items) as unknown as typeof fetch;
    render(<ResearchBoardPage />);

    await waitFor(() => screen.getByTestId('search-input'));

    fireEvent.change(screen.getByTestId('search-input'), {
      target: { value: 'yoga' },
    });

    await waitFor(() => {
      expect(screen.getAllByTestId('research-row')).toHaveLength(1);
      expect(screen.getByText('yoga mat')).toBeInTheDocument();
      expect(screen.queryByText('wireless earbuds')).not.toBeInTheDocument();
    });
  });

  it('filters by status tab', async () => {
    const items = [
      makeItem({ id: 'a', keyword: 'earbuds', status: 'candidate' }),
      makeItem({ id: 'b', keyword: 'yoga mat', status: 'saved' }),
    ];
    global.fetch = makeFetch(items) as unknown as typeof fetch;
    render(<ResearchBoardPage />);

    await waitFor(() => screen.getByTestId('filter-tab-saved'));

    fireEvent.click(screen.getByTestId('filter-tab-saved'));

    await waitFor(() => {
      expect(screen.getAllByTestId('research-row')).toHaveLength(1);
      expect(screen.getByText('yoga mat')).toBeInTheDocument();
      expect(screen.queryByText('earbuds')).not.toBeInTheDocument();
    });
  });

  it('shows select-all checkbox', async () => {
    global.fetch = makeFetch([makeItem()]) as unknown as typeof fetch;
    render(<ResearchBoardPage />);

    await waitFor(() => screen.getByTestId('select-all-checkbox'));
    expect(screen.getByTestId('select-all-checkbox')).toBeInTheDocument();
  });

  it('shows bulk actions bar when items selected', async () => {
    global.fetch = makeFetch([makeItem()]) as unknown as typeof fetch;
    render(<ResearchBoardPage />);

    await waitFor(() => screen.getByTestId('select-all-checkbox'));

    fireEvent.click(screen.getByTestId('select-all-checkbox'));

    await waitFor(() => {
      expect(screen.getByTestId('bulk-actions-bar')).toBeInTheDocument();
      expect(screen.getByText(/1 selected/i)).toBeInTheDocument();
    });
  });

  it('shows no-results state when filter yields nothing', async () => {
    global.fetch = makeFetch([makeItem({ status: 'candidate' })]) as unknown as typeof fetch;
    render(<ResearchBoardPage />);

    await waitFor(() => screen.getByTestId('filter-tab-saved'));
    fireEvent.click(screen.getByTestId('filter-tab-saved'));

    await waitFor(() => {
      expect(screen.getByTestId('no-results-state')).toBeInTheDocument();
    });
  });
});
