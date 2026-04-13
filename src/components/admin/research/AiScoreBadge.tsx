'use client';

/**
 * AiScoreBadge — Sprint C / Research Board
 *
 * Shows AI recommendation score (0-100) with label + tooltip breakdown.
 * Labels: Weak (0-39), Fair (40-59), Good (60-79), Strong (80-100)
 * Colors: weak=red, fair=yellow, good=green, strong=indigo
 */

import { useState } from 'react';
import type { AiScoreBreakdown } from '@/lib/research/types';

// ─── Props ────────────────────────────────────────────────────────────────────

interface AiScoreBadgeProps {
  score: number;
  label: string;
  breakdown: AiScoreBreakdown;
}

// ─── Config ───────────────────────────────────────────────────────────────────

type LabelKey = 'Weak' | 'Fair' | 'Good' | 'Strong';

const LABEL_CONFIG: Record<LabelKey, { color: string; bg: string; border: string }> = {
  Weak: { color: '#ef4444', bg: '#ef444426', border: '#ef44444d' },
  Fair: { color: '#d4a843', bg: '#d4a84326', border: '#d4a8434d' },
  Good: { color: '#10b981', bg: '#10b98126', border: '#10b9814d' },
  Strong: { color: '#6366f1', bg: '#6366f126', border: '#6366f14d' },
};

function getConfig(label: string) {
  return LABEL_CONFIG[label as LabelKey] ?? LABEL_CONFIG.Weak;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function AiScoreBadge({ score, label, breakdown }: AiScoreBadgeProps) {
  const { color, bg, border } = getConfig(label);
  const [showTip, setShowTip] = useState(false);

  return (
    <div className="relative inline-flex">
      <button
        data-testid="ai-score-badge"
        type="button"
        onMouseEnter={() => setShowTip(true)}
        onMouseLeave={() => setShowTip(false)}
        onFocus={() => setShowTip(true)}
        onBlur={() => setShowTip(false)}
        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border cursor-default"
        style={{ color, backgroundColor: bg, borderColor: border }}
        aria-label={`AI Score: ${score} — ${label}`}
      >
        <span
          className="material-symbols-outlined"
          aria-hidden="true"
          style={{ fontSize: 11, lineHeight: 1 }}
        >
          auto_awesome
        </span>
        {score}
        <span className="opacity-80">{label}</span>
      </button>

      {/* Tooltip */}
      {showTip && (
        <div
          data-testid="ai-score-tooltip"
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-10 w-44 bg-[#0d1526] border border-[#1f2d4e] rounded-xl p-3 shadow-xl text-xs"
          role="tooltip"
        >
          <p className="text-[#9ca3af] font-semibold mb-2 uppercase tracking-wider text-[10px]">
            AI Breakdown
          </p>
          <div className="space-y-1.5">
            <Row label="Trend" value={breakdown.trend} />
            <Row label="Margin" value={breakdown.margin} />
            <Row label="Competition" value={breakdown.competition} />
            <Row label="Volume" value={breakdown.volume} />
          </div>
          {/* Arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-[#1f2d4e]" />
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[#6b7280]">{label}</span>
      <div className="flex items-center gap-1.5">
        <div className="w-16 h-1 rounded-full bg-[#1f2d4e] overflow-hidden">
          <div
            className="h-full rounded-full bg-[#6366f1]"
            style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
          />
        </div>
        <span className="text-white w-6 text-right">{value}</span>
      </div>
    </div>
  );
}

export default AiScoreBadge;
