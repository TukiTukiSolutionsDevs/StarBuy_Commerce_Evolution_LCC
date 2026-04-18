'use client';

/**
 * AddToResearchModal — Sprint C / Research Board
 *
 * Opens with trend data pre-populated.
 * User enters costPrice + salePrice (+ optional notes).
 * Live margin preview while typing.
 * On submit → POST /api/admin/research
 */

import { useState, useEffect } from 'react';
import { useToastContext } from '@/components/ui/ToastProvider';
import type { TrendState } from '@/lib/trends/types';

// ─── Props ────────────────────────────────────────────────────────────────────

export interface AddToResearchTrendData {
  keyword: string;
  trendScore: number;
  trendState: TrendState;
  sources: string[];
  relatedKeywords: string[];
  category?: string;
  subcategory?: string;
}

interface AddToResearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  trendData: AddToResearchTrendData;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function computeMarginPreview(cost: string, sale: string): number | null {
  const c = parseFloat(cost);
  const s = parseFloat(sale);
  if (!isFinite(c) || !isFinite(s) || s <= 0) return null;
  return ((s - c) / s) * 100;
}

function marginColor(m: number): string {
  if (m < 20) return 'var(--admin-error)';
  if (m <= 40) return '#d4a843';
  return 'var(--admin-success)';
}

// ─── Component ───────────────────────────────────────────────────────────────

export function AddToResearchModal({ isOpen, onClose, trendData }: AddToResearchModalProps) {
  const { addToast } = useToastContext();

  const [costPrice, setCostPrice] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setCostPrice('');
      setSalePrice('');
      setNotes('');
      setError('');
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const marginPreview = computeMarginPreview(costPrice, salePrice);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const cost = parseFloat(costPrice);
    const sale = parseFloat(salePrice);

    if (!isFinite(cost) || cost <= 0) {
      setError('Enter a valid cost price.');
      return;
    }
    if (!isFinite(sale) || sale <= 0) {
      setError('Enter a valid sale price.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyword: trendData.keyword,
          trendScore: trendData.trendScore,
          trendState: trendData.trendState,
          sources: trendData.sources,
          relatedKeywords: trendData.relatedKeywords,
          category: trendData.category,
          subcategory: trendData.subcategory,
          costPrice: cost,
          salePrice: sale,
          notes: notes.trim() || undefined,
        }),
      });

      const data = (await res.json()) as { error?: string };

      if (!res.ok) throw new Error(data.error ?? 'Failed to add item');

      addToast({
        type: 'success',
        message: 'Added to Research Board',
        description: trendData.keyword,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error');
    } finally {
      setSubmitting(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div
      data-testid="add-to-research-modal"
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-md bg-[var(--admin-bg-sidebar)] border border-[var(--admin-border)] rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--admin-border)]">
          <div className="flex items-center gap-2">
            <span
              className="material-symbols-outlined text-[var(--admin-brand)]"
              style={{ fontSize: 20 }}
            >
              science
            </span>
            <h2 className="text-[var(--admin-text-heading)] font-semibold text-sm">
              Add to Research Board
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-7 h-7 flex items-center justify-center rounded-lg text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] hover:bg-white/10 transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path
                d="M1 1l10 10M11 1L1 11"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {/* Trend summary */}
        <div className="px-6 py-3 bg-[var(--admin-bg-card)] border-b border-[var(--admin-border)]">
          <p className="text-[var(--admin-text-heading)] font-medium text-sm truncate">
            {trendData.keyword}
          </p>
          <p className="text-[var(--admin-text-muted)] text-xs mt-0.5">
            Trend score:{' '}
            <span className="text-[var(--admin-text-secondary)]">{trendData.trendScore}</span>
            {trendData.category && (
              <>
                {' '}
                &middot;{' '}
                <span className="text-[var(--admin-text-secondary)]">{trendData.category}</span>
              </>
            )}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Prices row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[var(--admin-text-secondary)] text-xs font-medium mb-1.5">
                Cost Price <span className="text-[var(--admin-error)]">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--admin-text-disabled)] text-sm">
                  $
                </span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-[var(--admin-bg-card)] border border-[var(--admin-border)] text-[var(--admin-text)] placeholder-[var(--admin-text-disabled)] rounded-xl pl-7 pr-3 py-2.5 text-sm focus:outline-none focus:border-[var(--admin-brand)]/50 transition-colors"
                  data-testid="cost-price-input"
                />
              </div>
            </div>
            <div>
              <label className="block text-[var(--admin-text-secondary)] text-xs font-medium mb-1.5">
                Sale Price <span className="text-[var(--admin-error)]">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--admin-text-disabled)] text-sm">
                  $
                </span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={salePrice}
                  onChange={(e) => setSalePrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-[var(--admin-bg-card)] border border-[var(--admin-border)] text-[var(--admin-text)] placeholder-[var(--admin-text-disabled)] rounded-xl pl-7 pr-3 py-2.5 text-sm focus:outline-none focus:border-[var(--admin-brand)]/50 transition-colors"
                  data-testid="sale-price-input"
                />
              </div>
            </div>
          </div>

          {/* Live margin preview */}
          {marginPreview !== null && (
            <div
              data-testid="margin-preview"
              className="flex items-center gap-2 bg-[var(--admin-bg-card)] border border-[var(--admin-border)] rounded-xl px-3 py-2"
            >
              <span
                className="material-symbols-outlined text-[var(--admin-text-muted)]"
                style={{ fontSize: 14 }}
              >
                percent
              </span>
              <span className="text-[var(--admin-text-muted)] text-xs">Margin:</span>
              <span className="text-sm font-semibold" style={{ color: marginColor(marginPreview) }}>
                {marginPreview.toFixed(1)}%
              </span>
              <span className="text-[var(--admin-text-disabled)] text-xs ml-auto">
                {marginPreview < 20
                  ? 'Low margin'
                  : marginPreview <= 40
                    ? 'Medium margin'
                    : 'Good margin'}
              </span>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-[var(--admin-text-secondary)] text-xs font-medium mb-1.5">
              Notes <span className="text-[var(--admin-text-disabled)]">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Supplier info, observations..."
              rows={2}
              className="w-full bg-[var(--admin-bg-card)] border border-[var(--admin-border)] text-[var(--admin-text)] placeholder-[var(--admin-text-disabled)] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--admin-brand)]/50 transition-colors resize-none"
              data-testid="notes-input"
            />
          </div>

          {/* Error */}
          {error && (
            <p className="text-[var(--admin-error)] text-xs flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm">error</span>
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-[var(--admin-bg-card)] hover:bg-[var(--admin-border)] border border-[var(--admin-border)] text-[var(--admin-text-secondary)] hover:text-[var(--admin-text)] rounded-xl px-4 py-2.5 text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              data-testid="submit-btn"
              className="flex-1 bg-[var(--admin-brand)] hover:bg-[var(--admin-brand-hover)] disabled:opacity-60 disabled:cursor-not-allowed text-[var(--admin-bg-sidebar)] font-semibold rounded-xl px-4 py-2.5 text-sm transition-colors flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <span className="material-symbols-outlined text-base animate-spin">
                    progress_activity
                  </span>
                  Adding…
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-base">add</span>
                  Add to Research
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddToResearchModal;
