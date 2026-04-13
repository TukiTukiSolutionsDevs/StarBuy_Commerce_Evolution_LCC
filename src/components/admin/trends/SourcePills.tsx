'use client';

/**
 * SourcePills
 *
 * Renders provider ID badges. Shows up to 3; overflows as "+N".
 */

import type { ProviderId } from '@/lib/trends/types';

// ─── Display names ────────────────────────────────────────────────────────────

export const PROVIDER_LABELS: Record<ProviderId, string> = {
  serpapi: 'SerpAPI',
  pytrends: 'PyTrends',
  tavily: 'Tavily',
  amazon: 'Amazon',
  meta: 'Meta',
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface SourcePillsProps {
  sources: ProviderId[];
}

// ─── Component ───────────────────────────────────────────────────────────────

const PILL = 'bg-[#1f2d4e] text-[#6b7280] text-[10px] font-mono rounded-full px-2 py-0.5';

export function SourcePills({ sources }: SourcePillsProps) {
  if (!sources.length) return null;

  const visible = sources.slice(0, 3);
  const overflow = sources.length - 3;

  return (
    <div className="flex flex-wrap gap-1">
      {visible.map((src) => (
        <span key={src} className={PILL}>
          {PROVIDER_LABELS[src] ?? src}
        </span>
      ))}
      {overflow > 0 && <span className={PILL}>+{overflow}</span>}
    </div>
  );
}

export default SourcePills;
