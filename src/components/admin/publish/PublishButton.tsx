'use client';

import { useState } from 'react';
import type { ResearchItem } from '@/lib/research/types';
import type { PublishRecord } from '@/lib/publish/types';

interface PublishButtonProps {
  researchItem: ResearchItem;
  publishRecord?: PublishRecord;
  onPublishStart?: (r: PublishRecord) => void;
  onPublishComplete?: (r: PublishRecord) => void;
  onError?: (e: string) => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_CLASSES = {
  sm: 'text-xs px-3 py-1.5',
  md: 'text-sm px-4 py-2',
  lg: 'text-base px-6 py-3',
};

export function PublishButton({
  researchItem,
  publishRecord,
  onPublishStart,
  onPublishComplete,
  onError,
  disabled = false,
  size = 'md',
  className = '',
}: PublishButtonProps) {
  const [loading, setLoading] = useState(false);

  const isPublished = publishRecord?.status === 'published';
  const isInFlight =
    loading || publishRecord?.status === 'publishing' || publishRecord?.status === 'validating';
  const isDisabled = disabled || isPublished || isInFlight;

  async function handleClick() {
    if (isDisabled) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ researchId: researchItem.id }),
      });
      const data = (await res.json()) as { record?: PublishRecord; error?: string };
      if (!res.ok || !data.record) {
        onError?.(data.error ?? 'Publish failed');
        return;
      }
      onPublishStart?.(data.record);
      onPublishComplete?.(data.record);
    } catch (err) {
      onError?.(err instanceof Error ? err.message : 'Publish failed');
    } finally {
      setLoading(false);
    }
  }

  const label = isPublished ? 'Published ✓' : isInFlight ? 'Publishing...' : 'Publish';

  return (
    <button
      data-testid="publish-button"
      onClick={handleClick}
      disabled={isDisabled}
      className={`rounded font-medium transition-colors ${SIZE_CLASSES[size]} ${
        isPublished
          ? 'bg-green-500/20 text-green-400 cursor-default'
          : isDisabled
            ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
            : 'bg-[var(--admin-brand)] text-[var(--admin-bg)] hover:bg-[var(--admin-brand-hover)]'
      } ${className}`}
    >
      {label}
    </button>
  );
}
