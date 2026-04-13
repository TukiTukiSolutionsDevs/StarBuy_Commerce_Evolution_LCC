import type { PublishStatus } from '@/lib/publish/types';

interface PublishStatusBadgeProps {
  status: PublishStatus;
  size?: 'sm' | 'md';
  className?: string;
}

const STATUS_STYLES: Record<PublishStatus, string> = {
  pending: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  validating: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  publishing: 'bg-amber-500/20 text-amber-400 border-amber-500/30 animate-pulse',
  published: 'bg-green-500/20 text-green-400 border-green-500/30',
  failed: 'bg-red-500/20 text-red-400 border-red-500/30',
  rollback: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  archived: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
};

const STATUS_LABELS: Record<PublishStatus, string> = {
  pending: 'Pending',
  validating: 'Validating',
  publishing: 'Publishing',
  published: 'Published',
  failed: 'Failed',
  rollback: 'Rolling back',
  archived: 'Archived',
};

const SIZE_CLASSES = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-2.5 py-1',
};

export function PublishStatusBadge({
  status,
  size = 'md',
  className = '',
}: PublishStatusBadgeProps) {
  return (
    <span
      data-testid="publish-status-badge"
      className={`inline-flex items-center rounded-full border font-medium ${STATUS_STYLES[status]} ${SIZE_CLASSES[size]} ${className}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
