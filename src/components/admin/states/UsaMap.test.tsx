/**
 * Unit tests — UsaMap
 * @vitest-environment jsdom
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { UsaMap } from './UsaMap';
import { ALL_STATE_PATH_CODES } from './usa-paths';
import type { StateScoreMap } from '@/lib/states/types';

function makeScores(overrides: Record<string, number> = {}): StateScoreMap {
  const map: StateScoreMap = {};
  for (const [code, score] of Object.entries(overrides)) {
    map[code] = {
      stateCode: code,
      score,
      breakdown: { demographics: 0, trendActivity: 0, ecommerceIndex: 0, incomeIndex: 0 },
      topCategories: [],
      computedAt: Date.now(),
    };
  }
  return map;
}

describe('UsaMap', () => {
  it('renders the SVG map', () => {
    render(<UsaMap scores={{}} />);
    expect(screen.getByTestId('usa-map')).toBeInTheDocument();
  });

  it('renders all 51 state paths', () => {
    render(<UsaMap scores={{}} />);
    for (const code of ALL_STATE_PATH_CODES) {
      expect(screen.getByTestId(`state-${code}`)).toBeInTheDocument();
    }
  });

  it('includes DC', () => {
    render(<UsaMap scores={{}} />);
    expect(screen.getByTestId('state-DC')).toBeInTheDocument();
  });

  it('each state path has data-state attribute', () => {
    render(<UsaMap scores={{}} />);
    const ca = screen.getByTestId('state-CA');
    expect(ca.getAttribute('data-state')).toBe('CA');
  });

  it('applies fill class based on score quintile', () => {
    const scores = makeScores({ CA: 90 }); // quintile 5 → fill-emerald-500
    render(<UsaMap scores={scores} />);
    const ca = screen.getByTestId('state-CA');
    expect(ca.className.baseVal || ca.getAttribute('class')).toContain('fill-emerald-500');
  });

  it('uses fill-red-400 for states with low score', () => {
    const scores = makeScores({ TX: 10 }); // quintile 1 → fill-red-400
    render(<UsaMap scores={scores} />);
    const tx = screen.getByTestId('state-TX');
    expect(tx.className.baseVal || tx.getAttribute('class')).toContain('fill-red-400');
  });

  it('defaults to fill-red-400 for states with no score', () => {
    render(<UsaMap scores={{}} />);
    const ny = screen.getByTestId('state-NY');
    // score=0 → quintile 1 → fill-red-400
    expect(ny.className.baseVal || ny.getAttribute('class')).toContain('fill-red-400');
  });

  it('calls onStateClick when state clicked', () => {
    const handler = vi.fn();
    render(<UsaMap scores={{}} onStateClick={handler} />);
    fireEvent.click(screen.getByTestId('state-CA'));
    expect(handler).toHaveBeenCalledWith('CA');
  });

  it('calls onStateHover on mouseEnter/mouseLeave', () => {
    const handler = vi.fn();
    render(<UsaMap scores={{}} onStateHover={handler} />);
    const ca = screen.getByTestId('state-CA');
    fireEvent.mouseEnter(ca);
    expect(handler).toHaveBeenCalledWith('CA');
    fireEvent.mouseLeave(ca);
    expect(handler).toHaveBeenCalledWith(null);
  });

  it('handles keyboard Enter for accessibility', () => {
    const handler = vi.fn();
    render(<UsaMap scores={{}} onStateClick={handler} />);
    fireEvent.keyDown(screen.getByTestId('state-CA'), { key: 'Enter' });
    expect(handler).toHaveBeenCalledWith('CA');
  });

  it('handles keyboard Space for accessibility', () => {
    const handler = vi.fn();
    render(<UsaMap scores={{}} onStateClick={handler} />);
    fireEvent.keyDown(screen.getByTestId('state-CA'), { key: ' ' });
    expect(handler).toHaveBeenCalledWith('CA');
  });

  it('applies selected state stroke styling', () => {
    render(<UsaMap scores={{}} selectedState="CA" />);
    const ca = screen.getByTestId('state-CA');
    expect(ca.className.baseVal || ca.getAttribute('class')).toContain('stroke-white');
  });

  it('each state has role="button" and tabIndex', () => {
    render(<UsaMap scores={{}} />);
    const ca = screen.getByTestId('state-CA');
    expect(ca.getAttribute('role')).toBe('button');
    expect(ca.getAttribute('tabindex')).toBe('0');
  });

  it('each state has aria-label with score', () => {
    const scores = makeScores({ CA: 85 });
    render(<UsaMap scores={scores} />);
    const ca = screen.getByTestId('state-CA');
    expect(ca.getAttribute('aria-label')).toBe('CA - Score: 85');
  });

  it('applies custom className', () => {
    render(<UsaMap scores={{}} className="my-custom-class" />);
    const svg = screen.getByTestId('usa-map');
    expect(svg.getAttribute('class')).toContain('my-custom-class');
  });
});
