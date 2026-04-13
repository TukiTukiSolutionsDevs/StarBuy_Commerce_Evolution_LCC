'use client';

/**
 * TrendSkeleton
 *
 * Loading placeholder for trend cards and rows.
 * variant="card" — mimics TrendCard (ScoreRing + text lines)
 * variant="row"  — mimics a compact keyword row
 */

// ─── Props ────────────────────────────────────────────────────────────────────

interface TrendSkeletonProps {
  variant: 'card' | 'row';
  count?: number;
}

// ─── Pulse helper ─────────────────────────────────────────────────────────────

function Pulse({ className = '' }: { className?: string }) {
  return <div className={`bg-[#1f2d4e] rounded animate-pulse ${className}`} />;
}

// ─── Card skeleton ────────────────────────────────────────────────────────────

function CardSkeleton() {
  return (
    <div className="bg-[#111827] border border-[#1f2d4e] rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-16 h-16 rounded-full bg-[#1f2d4e] animate-pulse flex-none" />
        <div className="flex-1 space-y-2">
          <Pulse className="h-4 w-3/4" />
          <Pulse className="h-5 w-16" />
        </div>
      </div>
      <div className="flex gap-1">
        <Pulse className="h-4 w-14" />
        <Pulse className="h-4 w-14" />
      </div>
      <Pulse className="h-1.5 w-full" />
    </div>
  );
}

// ─── Row skeleton ─────────────────────────────────────────────────────────────

function RowSkeleton() {
  return (
    <div className="bg-[#111827] border border-[#1f2d4e] rounded-xl px-4 py-3 flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-[#1f2d4e] animate-pulse flex-none" />
      <div className="flex-1 space-y-1.5">
        <Pulse className="h-3.5 w-1/2" />
        <Pulse className="h-3 w-1/3" />
      </div>
      <Pulse className="h-5 w-16" />
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export function TrendSkeleton({ variant, count = 6 }: TrendSkeletonProps) {
  const Item = variant === 'card' ? CardSkeleton : RowSkeleton;
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <Item key={i} />
      ))}
    </>
  );
}

export default TrendSkeleton;
