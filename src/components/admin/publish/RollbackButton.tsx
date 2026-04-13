'use client';

import { useState } from 'react';
import type { PublishRecord } from '@/lib/publish/types';

interface RollbackButtonProps {
  record: PublishRecord;
  onRollbackComplete?: (r: PublishRecord) => void;
  onError?: (e: string) => void;
  className?: string;
}

export function RollbackButton({
  record,
  onRollbackComplete,
  onError,
  className = '',
}: RollbackButtonProps) {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  if (record.status !== 'published') return null;

  async function handleConfirm() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/publish/${record.id}`, { method: 'DELETE' });
      const data = (await res.json()) as { record?: PublishRecord; error?: string };
      if (!res.ok || !data.record) {
        onError?.(data.error ?? 'Rollback failed');
        return;
      }
      onRollbackComplete?.(data.record);
    } catch (err) {
      onError?.(err instanceof Error ? err.message : 'Rollback failed');
    } finally {
      setLoading(false);
      setConfirming(false);
    }
  }

  if (confirming) {
    return (
      <div data-testid="rollback-confirm-dialog" className="flex items-center gap-2">
        <span className="text-xs text-gray-400">Rollback to draft?</span>
        <button
          data-testid="rollback-confirm-yes"
          onClick={handleConfirm}
          disabled={loading}
          className="rounded bg-red-500/20 px-2 py-1 text-xs text-red-400 hover:bg-red-500/30"
        >
          {loading ? 'Rolling back...' : 'Yes, rollback'}
        </button>
        <button
          data-testid="rollback-confirm-no"
          onClick={() => setConfirming(false)}
          className="rounded border border-[#1f2d4e] px-2 py-1 text-xs text-gray-400"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      data-testid="rollback-button"
      onClick={() => setConfirming(true)}
      className={`rounded border border-orange-500/30 px-3 py-1.5 text-xs text-orange-400 hover:bg-orange-500/10 ${className}`}
    >
      Rollback
    </button>
  );
}
