/**
 * Smoke tests — /admin/states/[stateCode] page
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/admin/states/CA',
  useSearchParams: () => new URLSearchParams(),
}));

const MOCK_DETAIL = {
  profile: {
    code: 'CA',
    name: 'California',
    region: 'West',
    population: 39000000,
    medianIncome: 91000,
    urbanizationPct: 95,
    gdpBillions: 3900,
    ecommerceIndex: 88,
    ageDistribution: { under18: 22, age18to34: 23, age35to54: 26, age55plus: 29 },
    dataYear: 2023,
  },
  score: {
    stateCode: 'CA',
    score: 85,
    breakdown: { demographics: 90, trendActivity: 80, ecommerceIndex: 88, incomeIndex: 90 },
    topCategories: ['electronics'],
    computedAt: 1000,
  },
  topTrends: [{ keyword: 'electronics', score: 80, state: 'rising' }],
  researchCandidates: [],
};

const MOCK_PULSE = { events: [], unreadCount: 0, total: 0 };

beforeEach(() => {
  vi.clearAllMocks();
  global.fetch = vi.fn((url: string) => {
    if (url.includes('/pulse')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(MOCK_PULSE) });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve(MOCK_DETAIL) });
  }) as unknown as typeof fetch;
});

// ─── Import AFTER mocking ─────────────────────────────────────────────────────

import StateProfilePage from './page';

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('/admin/states/[stateCode] page', () => {
  const params = Promise.resolve({ stateCode: 'CA' });

  it('renders the profile page after suspension resolves', async () => {
    await act(async () => {
      render(<StateProfilePage params={params} />);
    });
    await waitFor(() => {
      expect(screen.getByTestId('state-profile-page')).toBeInTheDocument();
    });
  });

  it('renders the profile page after data loads', async () => {
    render(<StateProfilePage params={params} />);
    await waitFor(() => {
      expect(screen.getByTestId('state-profile-page')).toBeInTheDocument();
    });
  });

  it('displays state name', async () => {
    render(<StateProfilePage params={params} />);
    await waitFor(() => {
      expect(screen.getByText('California')).toBeInTheDocument();
    });
  });

  it('displays score badge', async () => {
    render(<StateProfilePage params={params} />);
    await waitFor(() => {
      expect(screen.getByTestId('profile-score-badge')).toHaveTextContent('85');
    });
  });

  it('displays KPI cards', async () => {
    render(<StateProfilePage params={params} />);
    await waitFor(() => {
      expect(screen.getByText('Population')).toBeInTheDocument();
      expect(screen.getByText('Median Income')).toBeInTheDocument();
      expect(screen.getByText('Urbanization')).toBeInTheDocument();
    });
  });

  it('displays score breakdown section', async () => {
    render(<StateProfilePage params={params} />);
    await waitFor(() => {
      expect(screen.getByText('Score Breakdown')).toBeInTheDocument();
      expect(screen.getByText('Demographics')).toBeInTheDocument();
    });
  });

  it('displays age distribution section', async () => {
    render(<StateProfilePage params={params} />);
    await waitFor(() => {
      expect(screen.getByText('Age Distribution')).toBeInTheDocument();
    });
  });
});
