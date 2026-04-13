'use client';

/**
 * ScoreRing
 *
 * SVG circular progress ring showing a 0-100 score.
 * Arc color matches TrendState. Background track is #1f2d4e.
 */

import type { TrendState } from '@/lib/trends/types';
import { STATE_CONFIG } from './TrendStateBadge';

// ─── Props ────────────────────────────────────────────────────────────────────

interface ScoreRingProps {
  score: number;
  state: TrendState;
  size?: 'sm' | 'md' | 'lg';
}

// ─── Size maps ────────────────────────────────────────────────────────────────

const SIZE_PX: Record<'sm' | 'md' | 'lg', number> = { sm: 48, md: 64, lg: 80 };
const STROKE_W: Record<'sm' | 'md' | 'lg', number> = { sm: 3, md: 4, lg: 5 };
const FONT_PX: Record<'sm' | 'md' | 'lg', number> = { sm: 11, md: 14, lg: 18 };

// ─── Component ───────────────────────────────────────────────────────────────

export function ScoreRing({ score, state, size = 'md' }: ScoreRingProps) {
  const px = SIZE_PX[size];
  const sw = STROKE_W[size];
  const center = px / 2;
  const r = px * 0.4;
  const circumference = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, score));
  const offset = (1 - clamped / 100) * circumference;
  const { color } = STATE_CONFIG[state] ?? STATE_CONFIG.unknown;

  return (
    <div className="relative flex-none" style={{ width: px, height: px }}>
      <svg
        width={px}
        height={px}
        viewBox={`0 0 ${px} ${px}`}
        role="img"
        aria-label={`Score: ${clamped}`}
      >
        <circle cx={center} cy={center} r={r} fill="none" stroke="#1f2d4e" strokeWidth={sw} />
        <circle
          cx={center}
          cy={center}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={sw}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90, ${center}, ${center})`}
        />
      </svg>
      <span
        className="absolute inset-0 flex items-center justify-center font-bold text-white"
        style={{ fontSize: FONT_PX[size] }}
      >
        {clamped}
      </span>
    </div>
  );
}

export default ScoreRing;
