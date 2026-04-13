/**
 * Unit tests — ScoreRing
 *
 * @vitest-environment happy-dom
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ScoreRing } from './ScoreRing';

describe('ScoreRing — score label', () => {
  it('renders the score number', () => {
    render(<ScoreRing score={75} state="rising" />);
    expect(screen.getByText('75')).toBeInTheDocument();
  });

  it('renders score 0', () => {
    render(<ScoreRing score={0} state="declining" />);
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('renders score 100', () => {
    render(<ScoreRing score={100} state="peak" />);
    expect(screen.getByText('100')).toBeInTheDocument();
  });

  it('clamps scores below 0 to 0', () => {
    render(<ScoreRing score={-10} state="unknown" />);
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('clamps scores above 100 to 100', () => {
    render(<ScoreRing score={150} state="rising" />);
    expect(screen.getByText('100')).toBeInTheDocument();
  });
});

describe('ScoreRing — SVG structure', () => {
  it('renders an SVG element', () => {
    const { container } = render(<ScoreRing score={50} state="stable" />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('has aria-label with score for accessibility', () => {
    render(<ScoreRing score={42} state="stable" />);
    expect(screen.getByRole('img', { name: 'Score: 42' })).toBeInTheDocument();
  });

  it('renders two circles (track + progress arc)', () => {
    const { container } = render(<ScoreRing score={60} state="rising" />);
    expect(container.querySelectorAll('circle')).toHaveLength(2);
  });

  it('background track uses #1f2d4e stroke', () => {
    const { container } = render(<ScoreRing score={50} state="stable" />);
    const track = container.querySelectorAll('circle')[0];
    expect(track.getAttribute('stroke')).toBe('#1f2d4e');
  });

  it('progress arc has strokeLinecap="round"', () => {
    const { container } = render(<ScoreRing score={50} state="stable" />);
    const arc = container.querySelectorAll('circle')[1];
    expect(arc.getAttribute('stroke-linecap')).toBe('round');
  });
});

describe('ScoreRing — sizes', () => {
  it('renders md (64px) by default', () => {
    const { container } = render(<ScoreRing score={50} state="stable" />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.style.width).toBe('64px');
    expect(wrapper.style.height).toBe('64px');
  });

  it('renders sm (48px)', () => {
    const { container } = render(<ScoreRing score={50} state="stable" size="sm" />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.style.width).toBe('48px');
    expect(wrapper.style.height).toBe('48px');
  });

  it('renders lg (80px)', () => {
    const { container } = render(<ScoreRing score={50} state="stable" size="lg" />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.style.width).toBe('80px');
    expect(wrapper.style.height).toBe('80px');
  });
});

describe('ScoreRing — state colors on progress arc', () => {
  it('uses #10b981 for rising', () => {
    const { container } = render(<ScoreRing score={80} state="rising" />);
    expect(container.querySelectorAll('circle')[1].getAttribute('stroke')).toBe('#10b981');
  });

  it('uses #ef4444 for declining', () => {
    const { container } = render(<ScoreRing score={20} state="declining" />);
    expect(container.querySelectorAll('circle')[1].getAttribute('stroke')).toBe('#ef4444');
  });

  it('uses #6b8cff for stable', () => {
    const { container } = render(<ScoreRing score={50} state="stable" />);
    expect(container.querySelectorAll('circle')[1].getAttribute('stroke')).toBe('#6b8cff');
  });

  it('uses #d4a843 for peak', () => {
    const { container } = render(<ScoreRing score={90} state="peak" />);
    expect(container.querySelectorAll('circle')[1].getAttribute('stroke')).toBe('#d4a843');
  });

  it('uses #4b5563 for unknown', () => {
    const { container } = render(<ScoreRing score={30} state="unknown" />);
    expect(container.querySelectorAll('circle')[1].getAttribute('stroke')).toBe('#4b5563');
  });
});

describe('ScoreRing — arc math', () => {
  it('dashoffset is 0 when score=100 (full ring)', () => {
    const { container } = render(<ScoreRing score={100} state="peak" />);
    const arc = container.querySelectorAll('circle')[1];
    expect(parseFloat(arc.getAttribute('stroke-dashoffset') ?? '1')).toBeCloseTo(0, 1);
  });

  it('dashoffset equals circumference when score=0 (empty ring)', () => {
    const { container } = render(<ScoreRing score={0} state="declining" />);
    const r = 64 * 0.4; // md default
    const circumference = 2 * Math.PI * r;
    const arc = container.querySelectorAll('circle')[1];
    expect(parseFloat(arc.getAttribute('stroke-dashoffset') ?? '0')).toBeCloseTo(circumference, 1);
  });

  it('dashoffset is half circumference when score=50', () => {
    const { container } = render(<ScoreRing score={50} state="stable" />);
    const r = 64 * 0.4;
    const circumference = 2 * Math.PI * r;
    const arc = container.querySelectorAll('circle')[1];
    expect(parseFloat(arc.getAttribute('stroke-dashoffset') ?? '0')).toBeCloseTo(
      circumference * 0.5,
      1,
    );
  });
});
