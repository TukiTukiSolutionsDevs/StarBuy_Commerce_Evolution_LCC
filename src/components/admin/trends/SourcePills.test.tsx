/**
 * Unit tests — SourcePills
 *
 * @vitest-environment happy-dom
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SourcePills } from './SourcePills';
import type { ProviderId } from '@/lib/trends/types';

describe('SourcePills — empty', () => {
  it('renders nothing for empty sources array', () => {
    const { container } = render(<SourcePills sources={[]} />);
    expect(container.firstChild).toBeNull();
  });
});

describe('SourcePills — display names', () => {
  it('renders "SerpAPI" for serpapi', () => {
    render(<SourcePills sources={['serpapi']} />);
    expect(screen.getByText('SerpAPI')).toBeInTheDocument();
  });

  it('renders "PyTrends" for pytrends', () => {
    render(<SourcePills sources={['pytrends']} />);
    expect(screen.getByText('PyTrends')).toBeInTheDocument();
  });

  it('renders "Tavily" for tavily', () => {
    render(<SourcePills sources={['tavily']} />);
    expect(screen.getByText('Tavily')).toBeInTheDocument();
  });

  it('renders "Amazon" for amazon', () => {
    render(<SourcePills sources={['amazon']} />);
    expect(screen.getByText('Amazon')).toBeInTheDocument();
  });

  it('renders "Meta" for meta', () => {
    render(<SourcePills sources={['meta']} />);
    expect(screen.getByText('Meta')).toBeInTheDocument();
  });
});

describe('SourcePills — overflow', () => {
  it('renders all 3 pills when sources.length === 3', () => {
    render(<SourcePills sources={['serpapi', 'pytrends', 'tavily']} />);
    expect(screen.getByText('SerpAPI')).toBeInTheDocument();
    expect(screen.getByText('PyTrends')).toBeInTheDocument();
    expect(screen.getByText('Tavily')).toBeInTheDocument();
  });

  it('renders exactly 3 span pills (no overflow) for 3 sources', () => {
    const { container } = render(<SourcePills sources={['serpapi', 'pytrends', 'tavily']} />);
    const pills = container.querySelectorAll('span');
    expect(pills).toHaveLength(3);
  });

  it('shows +1 pill for 4 sources and hides 4th', () => {
    const sources: ProviderId[] = ['serpapi', 'pytrends', 'tavily', 'amazon'];
    render(<SourcePills sources={sources} />);
    expect(screen.getByText('+1')).toBeInTheDocument();
    expect(screen.queryByText('Amazon')).not.toBeInTheDocument();
  });

  it('shows +2 pill for 5 sources', () => {
    const sources: ProviderId[] = ['serpapi', 'pytrends', 'tavily', 'amazon', 'meta'];
    render(<SourcePills sources={sources} />);
    expect(screen.getByText('+2')).toBeInTheDocument();
    expect(screen.queryByText('Amazon')).not.toBeInTheDocument();
    expect(screen.queryByText('Meta')).not.toBeInTheDocument();
  });

  it('no overflow pill for exactly 3 sources', () => {
    render(<SourcePills sources={['serpapi', 'pytrends', 'tavily']} />);
    expect(screen.queryByText(/^\+/)).not.toBeInTheDocument();
  });
});

describe('SourcePills — styling', () => {
  it('each pill has font-mono class', () => {
    const { container } = render(<SourcePills sources={['pytrends']} />);
    const pill = container.querySelector('span');
    expect(pill?.className).toContain('font-mono');
  });

  it('each pill has rounded-full class', () => {
    const { container } = render(<SourcePills sources={['tavily']} />);
    const pill = container.querySelector('span');
    expect(pill?.className).toContain('rounded-full');
  });
});
