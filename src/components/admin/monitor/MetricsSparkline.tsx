'use client';

import type { MetricsSnapshot } from '@/lib/monitor/types';

interface MetricsSparklineProps {
  snapshots: MetricsSnapshot[];
  metric: 'orders' | 'revenue' | 'conversionRate' | 'views';
  width?: number;
  height?: number;
  color?: string;
  className?: string;
}

export function MetricsSparkline({
  snapshots,
  metric,
  width = 120,
  height = 40,
  color = '#d4a843',
  className = '',
}: MetricsSparklineProps) {
  if (snapshots.length === 0) {
    return (
      <div
        data-testid="sparkline-empty"
        className={`flex items-center justify-center text-xs text-[#4b5563] ${className}`}
        style={{ width, height }}
      >
        No data
      </div>
    );
  }

  const sorted = [...snapshots].sort(
    (a, b) => new Date(a.weekStart).getTime() - new Date(b.weekStart).getTime(),
  );

  const values = sorted.map((s) => s[metric]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = values
    .map((v, i) => {
      const x = (i / Math.max(values.length - 1, 1)) * width;
      const y = height - ((v - min) / range) * (height - 4) - 2;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div data-testid="sparkline" className={className}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
