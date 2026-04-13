'use client';

import { useEffect, useState } from 'react';
import type { PublishRecord, PublishStatus } from '@/lib/publish/types';
import { PublishStatusBadge } from './PublishStatusBadge';

interface PublishProgressFeedProps {
  recordId: string;
  onComplete?: (record: PublishRecord) => void;
  pollInterval?: number;
}

const TERMINAL_STATES: PublishStatus[] = ['published', 'failed', 'archived'];

export function PublishProgressFeed({
  recordId,
  onComplete,
  pollInterval = 2000,
}: PublishProgressFeedProps) {
  const [record, setRecord] = useState<PublishRecord | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    async function poll() {
      try {
        const res = await fetch(`/api/admin/publish/${recordId}`);
        if (!res.ok) {
          setError('Failed to fetch publish status');
          return;
        }
        const data = (await res.json()) as { record: PublishRecord };
        if (cancelled) return;
        setRecord(data.record);
        if (TERMINAL_STATES.includes(data.record.status)) {
          onComplete?.(data.record);
          return;
        }
        timer = setTimeout(poll, pollInterval);
      } catch {
        if (!cancelled) setError('Network error while polling');
      }
    }

    void poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [recordId, pollInterval, onComplete]);

  if (error)
    return (
      <div data-testid="publish-progress-error" className="text-sm text-red-400">
        {error}
      </div>
    );
  if (!record)
    return (
      <div data-testid="publish-progress-loading" className="text-sm text-gray-500">
        Loading...
      </div>
    );

  return (
    <div
      data-testid="publish-progress-feed"
      className="space-y-2 rounded-lg border border-[#1f2d4e] bg-[#111827] p-4"
    >
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-400">Publishing status</span>
        <PublishStatusBadge status={record.status} size="sm" />
      </div>
      {record.errorMessage && <p className="text-xs text-red-400">{record.errorMessage}</p>}
    </div>
  );
}
