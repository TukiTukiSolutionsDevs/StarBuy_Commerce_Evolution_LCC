'use client';

/**
 * UsaMap
 *
 * Interactive SVG map of the USA with color-coded opportunity scores.
 * Supports click, hover, keyboard navigation, and accessibility.
 */

import { useCallback } from 'react';
import { STATE_PATHS, USA_VIEWBOX } from './usa-paths';
import { scoreToQuintile, QUINTILE_COLORS } from '@/lib/states/types';
import type { StateScoreMap } from '@/lib/states/types';

// ─── Props ────────────────────────────────────────────────────────────────────

interface UsaMapProps {
  scores: StateScoreMap;
  onStateClick?: (stateCode: string) => void;
  onStateHover?: (stateCode: string | null) => void;
  selectedState?: string | null;
  className?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getFillClass(stateCode: string, scores: StateScoreMap): string {
  const score = scores[stateCode]?.score ?? 0;
  return QUINTILE_COLORS[scoreToQuintile(score)];
}

// ─── Component ────────────────────────────────────────────────────────────────

export function UsaMap({
  scores,
  onStateClick,
  onStateHover,
  selectedState,
  className = '',
}: UsaMapProps) {
  const handleClick = useCallback(
    (code: string) => {
      onStateClick?.(code);
    },
    [onStateClick],
  );

  const handleKeyDown = useCallback(
    (code: string, e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onStateClick?.(code);
      }
    },
    [onStateClick],
  );

  return (
    <svg
      data-testid="usa-map"
      viewBox={USA_VIEWBOX}
      className={`w-full h-auto ${className}`}
      role="img"
      aria-label="Interactive map of the United States showing market opportunity scores"
    >
      {Object.entries(STATE_PATHS).map(([code, pathData]) => {
        const isSelected = selectedState === code;
        const fillClass = getFillClass(code, scores);

        return (
          <path
            key={code}
            data-testid={`state-${code}`}
            data-state={code}
            d={pathData.d}
            className={`${fillClass} cursor-pointer transition-all duration-150 hover:brightness-125 ${
              isSelected ? 'stroke-white stroke-2' : 'stroke-[#1f2d4e] stroke-[0.5]'
            }`}
            role="button"
            tabIndex={0}
            aria-label={`${code} - Score: ${scores[code]?.score ?? 0}`}
            onClick={() => handleClick(code)}
            onKeyDown={(e) => handleKeyDown(code, e)}
            onMouseEnter={() => onStateHover?.(code)}
            onMouseLeave={() => onStateHover?.(null)}
          />
        );
      })}
    </svg>
  );
}

export default UsaMap;
