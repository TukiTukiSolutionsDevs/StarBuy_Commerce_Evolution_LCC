'use client';

/**
 * Admin Discounts Page — Phase 3
 *
 * Migrated to use admin design tokens. Zero hardcoded hex colors.
 * Full discount code management: stats, status filter tabs, search,
 * sortable table, create modal, edit modal, delete confirm, copy code.
 */

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useToast } from '@/components/ui/useToast';
import type { AdminDiscount } from '@/lib/shopify/admin/tools/discounts';

// ─── Types ──────────────────────────────────────────────────────────────────────

type DiscountType = 'percentage' | 'fixed';
type StatusFilter = 'ALL' | 'ACTIVE' | 'SCHEDULED' | 'EXPIRED';

type DiscountForm = {
  title: string;
  code: string;
  type: DiscountType;
  value: string;
  startsAt: string;
  endsAt: string;
  usageLimit: string;
  onePerCustomer: boolean;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────────

function extractNumericId(gid: string): string {
  const parts = gid.split('/');
  return parts[parts.length - 1];
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(dateStr));
}

function localDatetimeDefault(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function generateCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function getDiscountValue(discount: AdminDiscount): string {
  const v = discount.customerGets?.value;
  if (!v) return '—';
  if (typeof v.percentage === 'number') return `${Math.round(v.percentage * 100)}%`;
  if (v.amount) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: v.amount.currencyCode,
    }).format(parseFloat(v.amount.amount));
  }
  return '—';
}

function getDiscountRawValue(discount: AdminDiscount): { type: DiscountType; value: number } {
  const v = discount.customerGets?.value;
  if (typeof v?.percentage === 'number') {
    return { type: 'percentage', value: Math.round(v.percentage * 100) };
  }
  if (v?.amount) {
    return { type: 'fixed', value: parseFloat(v.amount.amount) };
  }
  return { type: 'percentage', value: 0 };
}

function getDiscountType(discount: AdminDiscount): string {
  const v = discount.customerGets?.value;
  if (!v) return '—';
  if (typeof v.percentage === 'number') return 'Percentage';
  if (v.amount) return 'Fixed Amount';
  return '—';
}

function getTotalUsage(discount: AdminDiscount): number {
  return (discount.codes?.edges ?? []).reduce((sum, e) => sum + (e.node.usageCount ?? 0), 0);
}

function discountToForm(discount: AdminDiscount): DiscountForm {
  const { type, value } = getDiscountRawValue(discount);
  return {
    title: discount.title,
    code: discount.codes?.edges?.[0]?.node?.code ?? '',
    type,
    value: value > 0 ? String(value) : '',
    startsAt: discount.startsAt
      ? localDatetimeDefault(new Date(discount.startsAt))
      : localDatetimeDefault(),
    endsAt: discount.endsAt ? localDatetimeDefault(new Date(discount.endsAt)) : '',
    usageLimit: discount.usageLimit != null ? String(discount.usageLimit) : '',
    onePerCustomer: false,
  };
}

// ─── Status Badge ────────────────────────────────────────────────────────────────

const STATUS_STYLE: Record<string, { token: string; label: string; icon: string }> = {
  ACTIVE: { token: 'var(--admin-success)', label: 'Active', icon: 'check_circle' },
  EXPIRED: { token: 'var(--admin-text-muted)', label: 'Expired', icon: 'cancel' },
  SCHEDULED: { token: 'var(--admin-info)', label: 'Scheduled', icon: 'schedule' },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLE[status] ?? STATUS_STYLE.EXPIRED;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
      style={{ backgroundColor: `color-mix(in srgb, ${s.token} 10%, transparent)`, color: s.token }}
    >
      <span className="material-symbols-outlined" style={{ fontSize: '11px', color: s.token }}>
        {s.icon}
      </span>
      {s.label}
    </span>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  colorToken = 'var(--admin-info)',
}: {
  icon: string;
  label: string;
  value: string | number;
  colorToken?: string;
}) {
  return (
    <div
      className="rounded-xl p-4 flex items-center gap-3"
      style={{
        backgroundColor: 'var(--admin-bg-card)',
        border: '1px solid var(--admin-border)',
      }}
    >
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center flex-none"
        style={{ backgroundColor: `color-mix(in srgb, ${colorToken} 10%, transparent)` }}
      >
        <span className="material-symbols-outlined text-base" style={{ color: colorToken }}>
          {icon}
        </span>
      </div>
      <div>
        <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
          {label}
        </p>
        <p className="font-semibold text-sm mt-0.5" style={{ color: 'var(--admin-text)' }}>
          {value}
        </p>
      </div>
    </div>
  );
}

// ─── Skeleton Row ─────────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr style={{ borderBottom: '1px solid var(--admin-border)' }}>
      {[120, 100, 80, 60, 60, 80, 140, 120].map((w, i) => (
        <td key={i} className="px-4 py-4">
          <div
            className="h-3.5 rounded animate-pulse"
            style={{ width: `${w}px`, backgroundColor: 'var(--admin-border)' }}
          />
        </td>
      ))}
    </tr>
  );
}

// ─── Copy Button ──────────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard may be unavailable
    }
  }

  return (
    <button
      onClick={handleCopy}
      title={copied ? 'Copied!' : 'Copy code'}
      className="ml-1.5 p-0.5 rounded transition-colors"
      style={{ color: copied ? 'var(--admin-success)' : 'var(--admin-text-muted)' }}
    >
      <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
        {copied ? 'check' : 'content_copy'}
      </span>
    </button>
  );
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────────

function DeleteModal({
  code,
  onConfirm,
  onCancel,
  loading,
}: {
  code: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 backdrop-blur-sm"
      style={{ backgroundColor: 'var(--admin-overlay)' }}
    >
      <div
        className="rounded-2xl w-full max-w-sm p-6"
        style={{
          backgroundColor: 'var(--admin-bg-card)',
          border: '1px solid var(--admin-border)',
          boxShadow: 'var(--admin-shadow-dropdown)',
        }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: 'var(--admin-error-bg)' }}
          >
            <span
              className="material-symbols-outlined text-xl"
              style={{ color: 'var(--admin-error)' }}
            >
              local_offer
            </span>
          </div>
          <div>
            <p className="font-semibold" style={{ color: 'var(--admin-text)' }}>
              Delete Discount
            </p>
            <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
              This action cannot be undone
            </p>
          </div>
        </div>
        <p className="text-sm mb-6" style={{ color: 'var(--admin-text-secondary)' }}>
          Are you sure you want to delete discount code{' '}
          <span className="font-medium font-mono" style={{ color: 'var(--admin-text)' }}>
            {code}
          </span>
          ?
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 rounded-xl py-2.5 text-sm font-medium transition-colors disabled:opacity-50"
            style={{
              backgroundColor: 'var(--admin-border)',
              color: 'var(--admin-text)',
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 rounded-xl py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-2"
            style={{
              backgroundColor: loading ? 'var(--admin-text-disabled)' : 'var(--admin-error)',
              color: 'white',
            }}
          >
            {loading ? (
              <>
                <span className="material-symbols-outlined text-base animate-spin">
                  progress_activity
                </span>
                Deleting…
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-base">delete</span>
                Delete
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Discount Form Modal (shared Create + Edit) ────────────────────────────────

const EMPTY_FORM: DiscountForm = {
  title: '',
  code: '',
  type: 'percentage',
  value: '',
  startsAt: '',
  endsAt: '',
  usageLimit: '',
  onePerCustomer: false,
};

function DiscountFormModal({
  mode,
  initialForm,
  initialCode,
  onClose,
  onSaved,
  editId,
}: {
  mode: 'create' | 'edit';
  initialForm: DiscountForm;
  initialCode?: string;
  onClose: () => void;
  onSaved: () => void;
  editId?: string;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState<DiscountForm>(initialForm);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  function set<K extends keyof DiscountForm>(key: K, val: DiscountForm[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error('Title is required');
      return;
    }
    if (mode === 'create' && !form.code.trim()) {
      toast.error('Code is required');
      return;
    }
    const valueNum = parseFloat(form.value);
    if (isNaN(valueNum) || valueNum <= 0) {
      toast.error('Enter a valid value');
      return;
    }
    if (form.type === 'percentage' && (valueNum < 1 || valueNum > 100)) {
      toast.error('Percentage must be between 1 and 100');
      return;
    }

    setSubmitting(true);
    try {
      if (mode === 'create') {
        const body = {
          title: form.title.trim(),
          code: form.code.trim().toUpperCase(),
          type: form.type,
          value: valueNum,
          startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : undefined,
          endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : undefined,
          usageLimit: form.usageLimit ? parseInt(form.usageLimit, 10) : undefined,
          onePerCustomer: form.onePerCustomer || undefined,
        };
        const res = await fetch('/api/admin/discounts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data = (await res.json()) as { discount?: AdminDiscount; error?: string };
        if (!res.ok) throw new Error(data.error ?? 'Failed to create');
        toast.success(`Discount "${form.code.toUpperCase()}" created`);
      } else {
        const numId = extractNumericId(editId!);
        const body: Record<string, unknown> = {
          title: form.title.trim(),
          type: form.type,
          value: valueNum,
          startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : undefined,
          endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
          usageLimit: form.usageLimit ? parseInt(form.usageLimit, 10) : null,
          onePerCustomer: form.onePerCustomer,
        };
        const res = await fetch(`/api/admin/discounts/${numId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data = (await res.json()) as { discount?: AdminDiscount; error?: string };
        if (!res.ok) throw new Error(data.error ?? 'Failed to update');
        toast.success(`Discount "${initialCode ?? form.title}" updated`);
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : `${mode === 'create' ? 'Create' : 'Update'} failed`,
      );
    } finally {
      setSubmitting(false);
    }
  }

  const isEdit = mode === 'edit';

  const inputStyle: React.CSSProperties = {
    backgroundColor: 'var(--admin-bg-input)',
    border: '1px solid var(--admin-border)',
    color: 'var(--admin-text)',
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 backdrop-blur-sm"
      style={{ backgroundColor: 'var(--admin-overlay)' }}
    >
      <div
        className="rounded-2xl w-full max-w-lg flex flex-col max-h-[90vh]"
        style={{
          backgroundColor: 'var(--admin-bg-card)',
          border: '1px solid var(--admin-border)',
          boxShadow: 'var(--admin-shadow-dropdown)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-3 p-6"
          style={{ borderBottom: '1px solid var(--admin-border)' }}
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: 'var(--admin-brand-bg)' }}
          >
            <span
              className="material-symbols-outlined text-xl"
              style={{ color: 'var(--admin-brand)' }}
            >
              {isEdit ? 'edit' : 'sell'}
            </span>
          </div>
          <div className="flex-1">
            <p
              className="font-semibold"
              style={{ fontFamily: 'var(--font-heading)', color: 'var(--admin-text)' }}
            >
              {isEdit
                ? `Edit Discount${initialCode ? ` — ${initialCode}` : ''}`
                : 'Create Discount'}
            </p>
            <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
              {isEdit
                ? 'Update discount settings (code cannot be changed)'
                : 'Add a new discount code to your store'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="transition-colors"
            style={{ color: 'var(--admin-text-disabled)' }}
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Title */}
          <div>
            <label className="admin-label block mb-1.5">
              Title <span style={{ color: 'var(--admin-error)' }}>*</span>
            </label>
            <input
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="e.g. Summer Sale 20%"
              className="w-full rounded-xl px-4 py-2.5 text-sm outline-none transition-colors"
              style={inputStyle}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--admin-brand)';
                e.currentTarget.style.boxShadow = '0 0 0 1px var(--admin-brand)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--admin-border)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>

          {/* Code (create only) */}
          {!isEdit && (
            <div>
              <label className="admin-label block mb-1.5">
                Code <span style={{ color: 'var(--admin-error)' }}>*</span>
              </label>
              <div className="flex gap-2">
                <input
                  value={form.code}
                  onChange={(e) => set('code', e.target.value.toUpperCase())}
                  placeholder="SUMMER20"
                  className="flex-1 rounded-xl px-4 py-2.5 text-sm outline-none transition-colors font-mono uppercase"
                  style={inputStyle}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'var(--admin-brand)';
                    e.currentTarget.style.boxShadow = '0 0 0 1px var(--admin-brand)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'var(--admin-border)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
                <button
                  type="button"
                  onClick={() => set('code', generateCode())}
                  className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-all"
                  style={{
                    backgroundColor: 'var(--admin-border)',
                    color: 'var(--admin-text-secondary)',
                  }}
                >
                  <span className="material-symbols-outlined text-sm">casino</span>
                  Auto
                </button>
              </div>
            </div>
          )}

          {/* Edit: show code as read-only */}
          {isEdit && initialCode && (
            <div>
              <label className="admin-label block mb-1.5">Code</label>
              <div
                className="flex items-center gap-2 rounded-xl px-4 py-2.5"
                style={{
                  backgroundColor: 'var(--admin-bg-input)',
                  border: '1px solid var(--admin-border)',
                }}
              >
                <span className="font-mono text-sm" style={{ color: 'var(--admin-text-muted)' }}>
                  {initialCode}
                </span>
                <span className="text-xs ml-auto" style={{ color: 'var(--admin-text-disabled)' }}>
                  Cannot be changed
                </span>
              </div>
            </div>
          )}

          {/* Type + Value */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="admin-label block mb-1.5">Discount Type</label>
              <select
                value={form.type}
                onChange={(e) => set('type', e.target.value as DiscountType)}
                className="w-full rounded-xl px-4 py-2.5 text-sm outline-none transition-colors"
                style={inputStyle}
              >
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed Amount ($)</option>
              </select>
            </div>
            <div>
              <label className="admin-label block mb-1.5">
                Value <span style={{ color: 'var(--admin-error)' }}>*</span>
              </label>
              <div className="relative">
                <span
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-sm"
                  style={{ color: 'var(--admin-text-muted)' }}
                >
                  {form.type === 'percentage' ? '%' : '$'}
                </span>
                <input
                  type="number"
                  min={1}
                  max={form.type === 'percentage' ? 100 : undefined}
                  step={form.type === 'percentage' ? 1 : 0.01}
                  value={form.value}
                  onChange={(e) => set('value', e.target.value)}
                  placeholder={form.type === 'percentage' ? '20' : '10.00'}
                  className="w-full rounded-xl pl-8 pr-4 py-2.5 text-sm outline-none transition-colors"
                  style={inputStyle}
                />
              </div>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="admin-label block mb-1.5">Start Date</label>
              <input
                type="datetime-local"
                value={form.startsAt}
                onChange={(e) => set('startsAt', e.target.value)}
                className="w-full rounded-xl px-4 py-2.5 text-sm outline-none transition-colors"
                style={inputStyle}
              />
            </div>
            <div>
              <label className="admin-label block mb-1.5">
                End Date <span style={{ color: 'var(--admin-text-disabled)' }}>(optional)</span>
              </label>
              <input
                type="datetime-local"
                value={form.endsAt}
                onChange={(e) => set('endsAt', e.target.value)}
                className="w-full rounded-xl px-4 py-2.5 text-sm outline-none transition-colors"
                style={inputStyle}
              />
            </div>
          </div>

          {/* Usage Limits */}
          <div>
            <label className="admin-label block mb-1.5">
              Max Total Uses{' '}
              <span style={{ color: 'var(--admin-text-disabled)' }}>(0 = unlimited)</span>
            </label>
            <input
              type="number"
              min={0}
              value={form.usageLimit}
              onChange={(e) => set('usageLimit', e.target.value)}
              placeholder="Unlimited"
              className="w-full rounded-xl px-4 py-2.5 text-sm outline-none transition-colors"
              style={inputStyle}
            />
          </div>

          {/* One per customer */}
          <label className="flex items-center gap-3 cursor-pointer group">
            <div className="relative flex-none">
              <input
                type="checkbox"
                checked={form.onePerCustomer}
                onChange={(e) => set('onePerCustomer', e.target.checked)}
                className="sr-only"
              />
              <div
                className="w-9 h-5 rounded-full transition-colors"
                style={{
                  backgroundColor: form.onePerCustomer
                    ? 'var(--admin-brand)'
                    : 'var(--admin-border)',
                }}
              >
                <div
                  className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform"
                  style={{
                    transform: form.onePerCustomer ? 'translateX(16px)' : 'translateX(0)',
                  }}
                />
              </div>
            </div>
            <div>
              <p className="text-sm" style={{ color: 'var(--admin-text)' }}>
                Limit to one per customer
              </p>
              <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                Each customer can only use this code once
              </p>
            </div>
          </label>
        </form>

        {/* Footer */}
        <div className="flex gap-3 p-6" style={{ borderTop: '1px solid var(--admin-border)' }}>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex-1 rounded-xl py-2.5 text-sm font-medium transition-colors disabled:opacity-50"
            style={{
              backgroundColor: 'var(--admin-border)',
              color: 'var(--admin-text)',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit as unknown as React.MouseEventHandler}
            disabled={submitting}
            className="flex-1 rounded-xl py-2.5 text-sm font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            style={{
              backgroundColor: 'var(--admin-brand)',
              color: 'var(--admin-bg)',
            }}
          >
            {submitting ? (
              <>
                <span className="material-symbols-outlined text-base animate-spin">
                  progress_activity
                </span>
                {isEdit ? 'Saving…' : 'Creating…'}
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-base">
                  {isEdit ? 'save' : 'add'}
                </span>
                {isEdit ? 'Save Changes' : 'Create Discount'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Status Filter Tabs ────────────────────────────────────────────────────────

const STATUS_TABS: { key: StatusFilter; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'ACTIVE', label: 'Active' },
  { key: 'SCHEDULED', label: 'Scheduled' },
  { key: 'EXPIRED', label: 'Expired' },
];

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function DiscountsPage() {
  const { toast } = useToast();

  const [discounts, setDiscounts] = useState<AdminDiscount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<AdminDiscount | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminDiscount | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [search, setSearch] = useState('');

  // ── Fetch ─────────────────────────────────────────────────────────────────────

  const fetchDiscounts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/discounts?limit=50');
      const data = (await res.json()) as { discounts?: AdminDiscount[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Failed to load');
      setDiscounts(data.discounts ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load discounts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDiscounts();
  }, [fetchDiscounts]);

  // ── Stats ─────────────────────────────────────────────────────────────────────

  const activeCount = discounts.filter((d) => d.status === 'ACTIVE').length;
  const scheduledCount = discounts.filter((d) => d.status === 'SCHEDULED').length;
  const expiredCount = discounts.filter((d) => d.status === 'EXPIRED').length;
  const totalUsage = discounts.reduce((sum, d) => sum + getTotalUsage(d), 0);

  // ── Filtered list ────────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let list = discounts;
    if (statusFilter !== 'ALL') {
      list = list.filter((d) => d.status === statusFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          (d.codes?.edges ?? []).some((e) => e.node.code.toLowerCase().includes(q)),
      );
    }
    return list;
  }, [discounts, statusFilter, search]);

  // ── Delete ────────────────────────────────────────────────────────────────────

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const numId = extractNumericId(deleteTarget.id);
      const res = await fetch(`/api/admin/discounts/${numId}`, { method: 'DELETE' });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Failed to delete');
      const code = deleteTarget.codes?.edges?.[0]?.node?.code ?? deleteTarget.title;
      setDeleteTarget(null);
      toast.success(`Discount "${code}" deleted`);
      fetchDiscounts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setDeleteLoading(false);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="admin-h1 text-2xl">Discounts</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--admin-text-muted)' }}>
            {loading
              ? 'Loading…'
              : `${discounts.length} discount code${discounts.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors"
          style={{
            backgroundColor: 'var(--admin-brand)',
            color: 'var(--admin-bg)',
          }}
        >
          <span className="material-symbols-outlined text-base">add</span>
          Create Discount
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          icon="sell"
          label="Active"
          value={loading ? '—' : activeCount}
          colorToken="var(--admin-success)"
        />
        <StatCard
          icon="schedule"
          label="Scheduled"
          value={loading ? '—' : scheduledCount}
          colorToken="var(--admin-info)"
        />
        <StatCard
          icon="cancel"
          label="Expired"
          value={loading ? '—' : expiredCount}
          colorToken="var(--admin-text-muted)"
        />
        <StatCard
          icon="bar_chart"
          label="Total Uses"
          value={loading ? '—' : totalUsage}
          colorToken="var(--admin-brand)"
        />
      </div>

      {/* Filters Row */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Status tabs */}
        <div
          className="flex gap-1 rounded-xl p-1 flex-none"
          style={{
            backgroundColor: 'var(--admin-bg-card)',
            border: '1px solid var(--admin-border)',
          }}
        >
          {STATUS_TABS.map((tab) => {
            const isActive = statusFilter === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={
                  isActive
                    ? { backgroundColor: 'var(--admin-brand)', color: 'var(--admin-bg)' }
                    : { color: 'var(--admin-text-muted)' }
                }
              >
                {tab.label}
                {tab.key !== 'ALL' && !loading && (
                  <span
                    className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px]"
                    style={
                      isActive
                        ? {
                            backgroundColor: 'color-mix(in srgb, var(--admin-bg) 20%, transparent)',
                            color: 'var(--admin-bg)',
                          }
                        : {
                            backgroundColor: 'var(--admin-border)',
                            color: 'var(--admin-text-secondary)',
                          }
                    }
                  >
                    {tab.key === 'ACTIVE'
                      ? activeCount
                      : tab.key === 'SCHEDULED'
                        ? scheduledCount
                        : expiredCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative flex-1">
          <span
            className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-base"
            style={{ color: 'var(--admin-text-disabled)' }}
          >
            search
          </span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by code or title…"
            className="w-full rounded-xl pl-9 pr-4 py-2.5 text-sm outline-none transition-colors"
            style={{
              backgroundColor: 'var(--admin-bg-card)',
              border: '1px solid var(--admin-border)',
              color: 'var(--admin-text)',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'var(--admin-brand)';
              e.currentTarget.style.boxShadow = '0 0 0 1px var(--admin-brand)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'var(--admin-border)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
              style={{ color: 'var(--admin-text-disabled)' }}
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          backgroundColor: 'var(--admin-bg-card)',
          border: '1px solid var(--admin-border)',
        }}
      >
        {error ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span
              className="material-symbols-outlined text-4xl mb-3"
              style={{ color: 'var(--admin-error)' }}
            >
              error
            </span>
            <p className="text-sm" style={{ color: 'var(--admin-error)' }}>
              {error}
            </p>
            <button
              onClick={fetchDiscounts}
              className="mt-4 text-sm transition-colors"
              style={{ color: 'var(--admin-brand)' }}
            >
              Try again
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--admin-border)' }}>
                  {['Code', 'Title', 'Type', 'Value', 'Usage', 'Status', 'Dates'].map((h, i) => (
                    <th
                      key={h}
                      className={`text-left text-xs font-medium uppercase tracking-wider px-4 py-3 ${i === 0 ? 'pl-6' : ''}`}
                      style={{ color: 'var(--admin-text-muted)' }}
                    >
                      {h}
                    </th>
                  ))}
                  <th
                    className="text-right text-xs font-medium uppercase tracking-wider px-4 py-3 pr-6"
                    style={{ color: 'var(--admin-text-muted)' }}
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-16">
                      <div className="flex flex-col items-center gap-3">
                        <span
                          className="material-symbols-outlined text-4xl"
                          style={{ color: 'var(--admin-text-disabled)' }}
                        >
                          {search || statusFilter !== 'ALL' ? 'search_off' : 'local_offer'}
                        </span>
                        <p className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>
                          {search || statusFilter !== 'ALL'
                            ? 'No discounts match your filters'
                            : 'No discount codes yet'}
                        </p>
                        {!search && statusFilter === 'ALL' && (
                          <button
                            onClick={() => setShowCreate(true)}
                            className="text-sm transition-colors"
                            style={{ color: 'var(--admin-brand)' }}
                          >
                            Create your first discount
                          </button>
                        )}
                        {(search || statusFilter !== 'ALL') && (
                          <button
                            onClick={() => {
                              setSearch('');
                              setStatusFilter('ALL');
                            }}
                            className="text-sm transition-colors"
                            style={{ color: 'var(--admin-brand)' }}
                          >
                            Clear filters
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((discount) => {
                    const firstCode = discount.codes?.edges?.[0]?.node;
                    const usage = getTotalUsage(discount);
                    const usageLimit = discount.usageLimit;
                    return (
                      <tr
                        key={discount.id}
                        className="transition-colors"
                        style={{ borderBottom: '1px solid var(--admin-border)' }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.backgroundColor = 'var(--admin-bg-hover)')
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.backgroundColor = 'transparent')
                        }
                      >
                        {/* Code */}
                        <td className="px-4 py-4 pl-6">
                          <div className="flex items-center">
                            <span
                              className="font-mono text-sm font-medium px-2 py-1 rounded-lg"
                              style={{
                                color: 'var(--admin-text)',
                                backgroundColor: 'var(--admin-border)',
                              }}
                            >
                              {firstCode?.code ?? '—'}
                            </span>
                            {firstCode?.code && <CopyButton text={firstCode.code} />}
                          </div>
                        </td>

                        {/* Title */}
                        <td className="px-4 py-4">
                          <span className="text-sm" style={{ color: 'var(--admin-text-body)' }}>
                            {discount.title}
                          </span>
                        </td>

                        {/* Type */}
                        <td className="px-4 py-4">
                          <span
                            className="text-xs"
                            style={{ color: 'var(--admin-text-secondary)' }}
                          >
                            {getDiscountType(discount)}
                          </span>
                        </td>

                        {/* Value */}
                        <td className="px-4 py-4">
                          <span
                            className="font-semibold text-sm"
                            style={{ color: 'var(--admin-brand)' }}
                          >
                            {getDiscountValue(discount)}
                          </span>
                        </td>

                        {/* Usage */}
                        <td className="px-4 py-4">
                          <span className="text-sm" style={{ color: 'var(--admin-text-body)' }}>
                            {usage}
                            {usageLimit != null && (
                              <span style={{ color: 'var(--admin-text-muted)' }}>
                                {' '}
                                / {usageLimit}
                              </span>
                            )}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-4">
                          <StatusBadge status={discount.status} />
                        </td>

                        {/* Dates */}
                        <td className="px-4 py-4">
                          <div
                            className="text-xs space-y-0.5"
                            style={{ color: 'var(--admin-text-muted)' }}
                          >
                            <p>
                              <span style={{ color: 'var(--admin-text-disabled)' }}>Start:</span>{' '}
                              {formatDate(discount.startsAt ?? discount.createdAt)}
                            </p>
                            {discount.endsAt && (
                              <p>
                                <span style={{ color: 'var(--admin-text-disabled)' }}>End:</span>{' '}
                                {formatDate(discount.endsAt)}
                              </p>
                            )}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-4 pr-6">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setEditTarget(discount)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                              style={{
                                backgroundColor: 'var(--admin-border)',
                                color: 'var(--admin-text-secondary)',
                              }}
                            >
                              <span className="material-symbols-outlined text-sm">edit</span>
                              Edit
                            </button>
                            <button
                              onClick={() => setDeleteTarget(discount)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                              style={{
                                backgroundColor: 'var(--admin-error-bg)',
                                color: 'var(--admin-error)',
                              }}
                            >
                              <span className="material-symbols-outlined text-sm">delete</span>
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Filtered count note */}
      {!loading && !error && (search || statusFilter !== 'ALL') && (
        <p className="text-xs text-center" style={{ color: 'var(--admin-text-muted)' }}>
          Showing {filtered.length} of {discounts.length} discounts
        </p>
      )}

      {/* Create Modal */}
      {showCreate && (
        <DiscountFormModal
          mode="create"
          initialForm={{ ...EMPTY_FORM, startsAt: localDatetimeDefault() }}
          onClose={() => setShowCreate(false)}
          onSaved={fetchDiscounts}
        />
      )}

      {/* Edit Modal */}
      {editTarget && (
        <DiscountFormModal
          mode="edit"
          editId={editTarget.id}
          initialForm={discountToForm(editTarget)}
          initialCode={editTarget.codes?.edges?.[0]?.node?.code}
          onClose={() => setEditTarget(null)}
          onSaved={fetchDiscounts}
        />
      )}

      {/* Delete Modal */}
      {deleteTarget && (
        <DeleteModal
          code={deleteTarget.codes?.edges?.[0]?.node?.code ?? deleteTarget.title}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={deleteLoading}
        />
      )}
    </div>
  );
}
