'use client';

import { useState } from 'react';
import type { BatchPublishResult } from '@/lib/publish/types';

interface BatchPublishToolbarProps {
  selectedIds: string[];
  onBatchPublish: (result: BatchPublishResult) => void;
  onClearSelection: () => void;
  disabled?: boolean;
  className?: string;
}

const MAX_BATCH = 20;

export function BatchPublishToolbar({
  selectedIds,
  onBatchPublish,
  onClearSelection,
  disabled = false,
  className = '',
}: BatchPublishToolbarProps) {
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const overLimit = selectedIds.length > MAX_BATCH;
  const canPublish = selectedIds.length > 0 && !overLimit && !disabled && !publishing;

  async function handlePublish() {
    setPublishing(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/publish/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Batch publish failed' }));
        throw new Error(data.error ?? 'Batch publish failed');
      }
      const data = await res.json();
      onBatchPublish(data.batch ?? data.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setPublishing(false);
    }
  }

  if (selectedIds.length === 0) return null;

  return (
    <div
      data-testid="batch-publish-toolbar"
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border border-[#1f2d4e] bg-[#111827] ${className}`}
    >
      <span className="text-sm text-[#9ca3af]">
        <span data-testid="batch-count" className="font-semibold text-white">
          {selectedIds.length}
        </span>{' '}
        selected
      </span>

      {overLimit && (
        <span data-testid="batch-warning" className="text-xs text-red-400">
          Max {MAX_BATCH} items per batch
        </span>
      )}

      <div className="flex-1" />

      {error && <span className="text-xs text-red-400">{error}</span>}

      <button
        data-testid="batch-clear-btn"
        onClick={onClearSelection}
        className="text-xs text-[#6b7280] hover:text-white px-2 py-1 rounded-lg hover:bg-[#1f2d4e]/60 transition-colors"
      >
        Clear
      </button>

      <button
        data-testid="batch-publish-btn"
        onClick={handlePublish}
        disabled={!canPublish}
        className="px-4 py-1.5 rounded-xl bg-[#d4a843] hover:bg-[#c49a3a] text-[#0d1526] text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {publishing ? 'Publishing...' : `Publish ${selectedIds.length} items`}
      </button>
    </div>
  );
}
