'use client';

import type { PublishValidation } from '@/lib/publish/types';

interface PrePublishChecklistProps {
  validation: PublishValidation;
  ready: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

const CHECKS: Array<{ key: keyof Omit<PublishValidation, 'errors'>; label: string }> = [
  { key: 'title', label: 'Title (min 3 chars)' },
  { key: 'description', label: 'Description' },
  { key: 'price', label: 'Price (sale > cost > 0)' },
  { key: 'images', label: 'Images' },
];

export function PrePublishChecklist({
  validation,
  ready,
  onConfirm,
  onCancel,
  loading = false,
}: PrePublishChecklistProps) {
  return (
    <div
      data-testid="pre-publish-checklist"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
    >
      <div className="w-full max-w-md rounded-xl border border-[#1f2d4e] bg-[#111827] p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold text-white">Pre-publish Checklist</h2>
        <ul className="mb-6 space-y-2">
          {CHECKS.map(({ key, label }) => (
            <li key={key} className="flex items-center gap-3">
              <span
                data-testid={`check-${key}`}
                className={validation[key] ? 'text-green-400' : 'text-red-400'}
              >
                {validation[key] ? '✓' : '✗'}
              </span>
              <span className="text-sm text-gray-300">{label}</span>
            </li>
          ))}
        </ul>
        {validation.errors.length > 0 && (
          <ul data-testid="validation-errors" className="mb-4 space-y-1">
            {validation.errors.map((e) => (
              <li key={e} className="text-xs text-red-400">
                {e}
              </li>
            ))}
          </ul>
        )}
        <div className="flex gap-3">
          <button
            data-testid="checklist-cancel"
            onClick={onCancel}
            className="flex-1 rounded border border-[#1f2d4e] py-2 text-sm text-gray-400 hover:text-white"
          >
            Cancel
          </button>
          <button
            data-testid="checklist-confirm"
            onClick={onConfirm}
            disabled={!ready || loading}
            className="flex-1 rounded bg-[#d4a843] py-2 text-sm font-medium text-[#0a0f1a] disabled:opacity-50"
          >
            {loading ? 'Publishing...' : 'Publish Now'}
          </button>
        </div>
      </div>
    </div>
  );
}
