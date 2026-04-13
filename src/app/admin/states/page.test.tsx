/**
 * Smoke tests — /admin/states page
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/admin/states',
}));

const MOCK_STATES_RESPONSE = {
  states: [
    {
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
      opportunityScore: {
        stateCode: 'CA',
        score: 85,
        breakdown: { demographics: 90, trendActivity: 80, ecommerceIndex: 88, incomeIndex: 90 },
        topCategories: ['electronics'],
        computedAt: 1000,
      },
    },
  ],
  computedAt: 1000,
};

const MOCK_PULSE_RESPONSE = {
  events: [],
  unreadCount: 0,
  total: 0,
};

beforeEach(() => {
  vi.clearAllMocks();
  global.fetch = vi.fn((url: string) => {
    if (url.includes('/pulse')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(MOCK_PULSE_RESPONSE) });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve(MOCK_STATES_RESPONSE) });
  }) as unknown as typeof fetch;
});

// ─── Import AFTER mocking ─────────────────────────────────────────────────────

import StatesPage from './page';

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('/admin/states page', () => {
  it('renders loading state initially', () => {
    render(<StatesPage />);
    expect(screen.getByText('Loading state intelligence...')).toBeInTheDocument();
  });

  it('renders the page after data loads', async () => {
    render(<StatesPage />);
    await waitFor(() => {
      expect(screen.getByTestId('states-page')).toBeInTheDocument();
    });
  });

  it('displays the State Intelligence heading', async () => {
    render(<StatesPage />);
    await waitFor(() => {
      expect(screen.getByText('State Intelligence')).toBeInTheDocument();
    });
  });

  it('renders the USA map', async () => {
    render(<StatesPage />);
    await waitFor(() => {
      expect(screen.getByTestId('usa-map')).toBeInTheDocument();
    });
  });

  it('renders KPI stat cards', async () => {
    render(<StatesPage />);
    await waitFor(() => {
      expect(screen.getByText('Avg Opportunity Score')).toBeInTheDocument();
      expect(screen.getByText('Top State')).toBeInTheDocument();
    });
  });

  it('fetches both states and pulse data', async () => {
    render(<StatesPage />);
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });
});
