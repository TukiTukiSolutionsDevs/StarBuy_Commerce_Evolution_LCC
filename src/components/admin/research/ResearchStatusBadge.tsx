'use client';

import type { ResearchItemStatus } from '@/lib/research/types';

const STATUS_CONFIG: Record<ResearchItemStatus, { classes: string; label: string }> = {
  candidate: { classes: 'bg-blue-500/20 text-blue-400', label: 'Candidate' },
  saved: { classes: 'bg-purple-500/20 text-purple-400', label: 'Saved' },
  imported: { classes: 'bg-cyan-500/20 text-cyan-400', label: 'Imported' },
  discarded: { classes: 'bg-gray-500/20 text-gray-500', label: 'Discarded' },
  importing: { classes: 'bg-amber-500/20 text-amber-400 animate-pulse', label: 'Importing…' },
  published: { classes: 'bg-green-500/20 text-green-400', label: 'Published' },
};

interface ResearchStatusBadgeProps {
  status: ResearchItemStatus;
  className?: string;
}

export function ResearchStatusBadge({ status, className = '' }: ResearchStatusBadgeProps) {
  const { classes, label } = STATUS_CONFIG[status];
  return (
    <span
      data-testid="research-status-badge"
      data-status={status}
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${classes} ${className}`}
    >
      {label}
    </span>
  );
}
