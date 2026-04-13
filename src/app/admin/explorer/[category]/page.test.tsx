import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CategoryDetailPage from './page';
import { CATEGORY_TREE } from '@/lib/trends/categories';
import type { AggregatedTrendResult } from '@/lib/trends/aggregator';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockPush = vi.fn();
let mockCategoryId = 'electronics';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useParams: () => ({ category: mockCategoryId }),
}));

vi.mock('@/components/admin/trends/ScoreRing', () => ({
  ScoreRing: ({ score }: { score: number }) => <div data-testid="score-ring" data-score={score} />,
  default: ({ score }: { score: number }) => <div data-testid="score-ring" data-score={score} />,
}));

vi.mock('@/components/admin/trends/TrendStateBadge', () => ({
  TrendStateBadge: ({ state }: { state: string }) => (
    <div data-testid="trend-state-badge">{state}</div>
  ),
  default: ({ state }: { state: string }) => <div data-testid="trend-state-badge">{state}</div>,
  STATE_CONFIG: {
    rising: { color: '#22c55e', label: 'Rising', icon: 'trending_up' },
    peak: { color: '#f59e0b', label: 'Peak', icon: 'trending_flat' },
    stable: { color: '#6b7280', label: 'Stable', icon: 'trending_flat' },
    declining: { color: '#ef4444', label: 'Declining', icon: 'trending_down' },
    unknown: { color: '#374151', label: 'Unknown', icon: 'help_outline' },
  },
}));

vi.mock('@/components/admin/trends/SourcePills', () => ({
  SourcePills: () => <div data-testid="source-pills" />,
  default: () => <div data-testid="source-pills" />,
}));

vi.mock('@/components/admin/trends/TrendSkeleton', () => ({
  TrendSkeleton: () => <div data-testid="trend-skeleton" />,
  default: () => <div data-testid="trend-skeleton" />,
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockResults: AggregatedTrendResult[] = [
  {
    keyword: 'smartwatch',
    score: 85,
    state: 'rising',
    timestamp: 1712995200000,
    sources: ['pytrends'],
    relatedKeywords: ['fitness tracker'],
    metadata: { confidence: 0.9 },
  },
  {
    keyword: 'fitness tracker',
    score: 72,
    state: 'stable',
    timestamp: 1712995200000,
    sources: ['tavily'],
    relatedKeywords: [],
    metadata: { confidence: 0.8 },
  },
];

const okFetch = (data: unknown) =>
  vi.fn().mockResolvedValue({
    ok: true,
    json: async () => data,
  }) as unknown as typeof fetch;

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('CategoryDetailPage', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockCategoryId = 'electronics';
    global.fetch = okFetch({ results: [] });
  });

  it('renders the category name as heading', () => {
    render(<CategoryDetailPage />);
    expect(screen.getByRole('heading', { name: /electronics & tech/i })).toBeInTheDocument();
  });

  it('renders Explorer breadcrumb link', () => {
    render(<CategoryDetailPage />);
    expect(screen.getByText('Explorer')).toBeInTheDocument();
  });

  it('Explorer breadcrumb links to /admin/explorer', () => {
    render(<CategoryDetailPage />);
    // Breadcrumb uses <Link> — check href, not router.push
    expect(screen.getByRole('link', { name: /explorer/i })).toHaveAttribute(
      'href',
      '/admin/explorer',
    );
  });

  it('renders all subcategory tabs', () => {
    render(<CategoryDetailPage />);
    const category = CATEGORY_TREE.find((c) => c.id === 'electronics')!;
    for (const sub of category.subcategories) {
      expect(screen.getByText(sub.label)).toBeInTheDocument();
    }
  });

  it('shows loading skeleton while fetching', async () => {
    global.fetch = vi.fn(() => new Promise(() => {})) as unknown as typeof fetch;
    render(<CategoryDetailPage />);
    await waitFor(() => expect(screen.getByTestId('trend-skeleton')).toBeInTheDocument());
  });

  it('shows trend results after successful fetch', async () => {
    global.fetch = okFetch({ results: mockResults });
    render(<CategoryDetailPage />);
    await waitFor(() => {
      expect(screen.getByText('smartwatch')).toBeInTheDocument();
      expect(screen.getByText('fitness tracker')).toBeInTheDocument();
    });
  });

  it('renders ScoreRing and TrendStateBadge for each result', async () => {
    global.fetch = okFetch({ results: mockResults });
    render(<CategoryDetailPage />);
    await waitFor(() => {
      expect(screen.getAllByTestId('score-ring')).toHaveLength(2);
      expect(screen.getAllByTestId('trend-state-badge')).toHaveLength(2);
    });
  });

  it('shows error message when fetch fails (non-ok response)', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Failed to load trends' }),
    }) as unknown as typeof fetch;
    render(<CategoryDetailPage />);
    await waitFor(() => expect(screen.getByText(/failed to load trends/i)).toBeInTheDocument());
  });

  it('renders Analyze link for each result', async () => {
    global.fetch = okFetch({ results: mockResults });
    render(<CategoryDetailPage />);
    await waitFor(() => {
      const links = screen.getAllByText(/analyze/i);
      expect(links).toHaveLength(mockResults.length);
    });
  });

  it('does not re-fetch when clicking already-loaded tab', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ results: mockResults }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<CategoryDetailPage />);
    await waitFor(() => expect(screen.getByText('smartwatch')).toBeInTheDocument());

    const callsBefore = fetchMock.mock.calls.length;
    // Click the first tab again (already cached) — use testid to avoid ambiguity
    // with the sub-header "for Smart Home" text
    const tabs = screen.getAllByTestId('subcategory-tab');
    fireEvent.click(tabs[0]);

    // No additional fetch — served from cache
    expect(fetchMock.mock.calls.length).toBe(callsBefore);
  });

  it('fetches new data when clicking a different tab', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ results: mockResults }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<CategoryDetailPage />);
    await waitFor(() => expect(screen.getByText('smartwatch')).toBeInTheDocument());

    await act(async () => {
      // Click the second tab — use testid index to avoid text ambiguity
      const tabs = screen.getAllByTestId('subcategory-tab');
      fireEvent.click(tabs[1]);
    });
    expect(fetchMock.mock.calls.length).toBe(2);
  });

  it('shows not found state for unknown category', () => {
    mockCategoryId = 'nonexistent-id-xyz';
    render(<CategoryDetailPage />);
    expect(screen.getByText(/not found/i)).toBeInTheDocument();
  });
});
