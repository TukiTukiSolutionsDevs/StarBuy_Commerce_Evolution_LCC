import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TrendEnginePage from './page';

// ─── Navigation mock ──────────────────────────────────────────────────────────

const mockPush = vi.fn();
const mockGet = vi.fn().mockReturnValue(null);

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => ({ get: mockGet }),
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const CONFIG_RESPONSE = {
  config: {
    activeStrategy: 'smart-merge',
    enabledProviders: ['pytrends', 'tavily'],
    cacheEnabled: true,
    cacheTTL: 3_600_000,
  },
};

const MOCK_RESULT = {
  keyword: 'wireless earbuds',
  score: 82,
  state: 'rising' as const,
  sources: ['pytrends' as const],
  relatedKeywords: ['bluetooth headphones', 'noise cancelling'],
  timestamp: Date.now(),
  metadata: { confidence: 0.9 },
};

function makeFetch(searchResults: (typeof MOCK_RESULT)[] = []) {
  return vi.fn().mockImplementation((url: string) => {
    if (typeof url === 'string' && url.includes('/config')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(CONFIG_RESPONSE),
      });
    }
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ results: searchResults }),
    });
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('TrendEnginePage — Trends Dashboard', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockGet.mockReturnValue(null);
    localStorage.clear();
    global.fetch = makeFetch() as unknown as typeof fetch;
  });

  it('renders the search input with placeholder', () => {
    render(<TrendEnginePage />);
    expect(screen.getByPlaceholderText(/search trends/i)).toBeInTheDocument();
  });

  it('renders the Search submit button', () => {
    render(<TrendEnginePage />);
    expect(screen.getByTestId('search-submit')).toBeInTheDocument();
  });

  it('renders the state selector with Virginia (VA) as default', () => {
    render(<TrendEnginePage />);
    expect(screen.getByTestId('state-selector')).toHaveValue('VA');
  });

  it('submits search and renders result cards', async () => {
    global.fetch = makeFetch([MOCK_RESULT]) as unknown as typeof fetch;
    render(<TrendEnginePage />);

    fireEvent.change(screen.getByPlaceholderText(/search trends/i), {
      target: { value: 'wireless earbuds' },
    });
    fireEvent.click(screen.getByTestId('search-submit'));

    await waitFor(() => {
      expect(screen.getByTestId('result-card')).toBeInTheDocument();
    });
    expect(
      within(screen.getByTestId('result-card')).getByText('wireless earbuds'),
    ).toBeInTheDocument();
  });

  it('autorun=true URL param triggers search on mount and fills input', async () => {
    mockGet.mockImplementation((key: string) => {
      if (key === 'keywords') return 'wireless earbuds';
      if (key === 'autorun') return 'true';
      return null;
    });
    global.fetch = makeFetch([MOCK_RESULT]) as unknown as typeof fetch;

    render(<TrendEnginePage />);

    await waitFor(() => {
      expect(screen.getByTestId('result-card')).toBeInTheDocument();
    });
    expect(screen.getByPlaceholderText(/search trends/i)).toHaveValue('wireless earbuds');
  });

  it('saves recent search to localStorage after submit', async () => {
    render(<TrendEnginePage />);

    fireEvent.change(screen.getByPlaceholderText(/search trends/i), {
      target: { value: 'yoga mat' },
    });
    fireEvent.click(screen.getByTestId('search-submit'));

    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem('starbuy:trend-searches') ?? '[]') as string[];
      expect(stored).toContain('yoga mat');
    });
  });

  it('renders recent search chips from localStorage on mount', () => {
    localStorage.setItem('starbuy:trend-searches', JSON.stringify(['protein powder', 'yoga mat']));
    render(<TrendEnginePage />);

    const chips = screen.getAllByTestId('recent-search-chip');
    expect(chips).toHaveLength(2);
    expect(chips[0]).toHaveTextContent('protein powder');
  });

  it('clicking a recent chip fills input and triggers search', async () => {
    localStorage.setItem('starbuy:trend-searches', JSON.stringify(['protein powder']));
    global.fetch = makeFetch([MOCK_RESULT]) as unknown as typeof fetch;
    render(<TrendEnginePage />);

    fireEvent.click(screen.getByTestId('recent-search-chip'));

    await waitFor(() => {
      expect(screen.getByTestId('result-card')).toBeInTheDocument();
    });
    expect(screen.getByPlaceholderText(/search trends/i)).toHaveValue('protein powder');
  });

  it('renders engine status bar with strategy name and provider count', async () => {
    render(<TrendEnginePage />);

    await waitFor(() => {
      expect(screen.getByTestId('engine-status-bar')).toBeInTheDocument();
    });
    expect(screen.getByTestId('engine-status-bar')).toHaveTextContent('Smart Merge');
    expect(screen.getByTestId('provider-count')).toHaveTextContent('2');
  });

  it('renders 8 quick category link buttons', () => {
    render(<TrendEnginePage />);
    expect(screen.getAllByTestId('category-link')).toHaveLength(8);
  });
});
