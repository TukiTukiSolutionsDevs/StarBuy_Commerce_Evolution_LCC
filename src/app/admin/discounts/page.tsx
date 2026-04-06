'use client';

/**
 * Admin Discounts Page
 *
 * Full discount code management: stats, sortable table, create modal.
 */

import { useEffect, useState, useCallback } from 'react';
import { useToast } from '@/components/ui/useToast';
import type { AdminDiscount } from '@/lib/shopify/admin/tools/discounts';

// ─── Types ──────────────────────────────────────────────────────────────────────

type DiscountType = 'percentage' | 'fixed';

type CreateForm = {
  title: string;
  code: string;
  type: DiscountType;
  value: string;
  startsAt: string;
  endsAt: string;
  usageLimit: string;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────────

function extractNumericId(gid: string): string {
  const parts = gid.split('/');
  return parts[parts.length - 1];
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(dateStr));
}

function localDatetimeDefault(date = new Date()): string {
  // Returns "YYYY-MM-DDTHH:MM" for datetime-local inputs
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function generateCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function getDiscountValue(discount: AdminDiscount): string {
  const v = discount.customerGets?.value;
  if (!v) return '—';
  if (typeof v.percentage === 'number') {
    return `${Math.round(v.percentage * 100)}%`;
  }
  if (v.amount) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: v.amount.currencyCode,
    }).format(parseFloat(v.amount.amount));
  }
  return '—';
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

// ─── Status Badge ────────────────────────────────────────────────────────────────

const STATUS_STYLE: Record<string, { color: string; label: string }> = {
  ACTIVE: { color: '#10b981', label: 'Active' },
  EXPIRED: { color: '#6b7280', label: 'Expired' },
  SCHEDULED: { color: '#6b8cff', label: 'Scheduled' },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLE[status] ?? STATUS_STYLE.EXPIRED;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
      style={{ backgroundColor: `${s.color}18`, color: s.color }}
    >
      <span className="w-1.5 h-1.5 rounded-full flex-none" style={{ backgroundColor: s.color }} />
      {s.label}
    </span>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  color = '#6b8cff',
}: {
  icon: string;
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <div className="bg-[#111827] border border-[#1f2d4e] rounded-xl p-4 flex items-center gap-3">
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center flex-none"
        style={{ backgroundColor: `${color}18` }}
      >
        <span className="material-symbols-outlined text-base" style={{ color }}>
          {icon}
        </span>
      </div>
      <div>
        <p className="text-[#6b7280] text-xs">{label}</p>
        <p className="text-white font-semibold text-sm mt-0.5">{value}</p>
      </div>
    </div>
  );
}

// ─── Skeleton Row ─────────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr className="border-b border-[#1f2d4e]">
      {[120, 100, 80, 60, 60, 80, 140, 80].map((w, i) => (
        <td key={i} className="px-4 py-4">
          <div className="h-3.5 bg-[#1f2d4e] rounded animate-pulse" style={{ width: `${w}px` }} />
        </td>
      ))}
    </tr>
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
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#111827] border border-[#1f2d4e] rounded-2xl w-full max-w-sm p-6 shadow-2xl shadow-black/60">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-[#ef4444]/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-[#ef4444] text-xl">local_offer</span>
          </div>
          <div>
            <p className="text-white font-semibold">Delete Discount</p>
            <p className="text-[#6b7280] text-xs">This action cannot be undone</p>
          </div>
        </div>
        <p className="text-[#9ca3af] text-sm mb-6">
          Are you sure you want to delete discount code{' '}
          <span className="text-white font-medium font-mono">{code}</span>?
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 bg-[#1f2d4e] hover:bg-[#263d6e] text-white rounded-xl py-2.5 text-sm font-medium transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 bg-[#ef4444] hover:bg-[#dc2626] disabled:bg-[#374151] text-white rounded-xl py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-2"
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

// ─── Create Discount Modal ────────────────────────────────────────────────────────

const EMPTY_FORM: CreateForm = {
  title: '',
  code: '',
  type: 'percentage',
  value: '',
  startsAt: localDatetimeDefault(),
  endsAt: '',
  usageLimit: '',
};

function CreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState<CreateForm>({ ...EMPTY_FORM, startsAt: localDatetimeDefault() });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  function set<K extends keyof CreateForm>(key: K, val: CreateForm[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error('Title is required');
      return;
    }
    if (!form.code.trim()) {
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
      const body: Record<string, unknown> = {
        title: form.title.trim(),
        code: form.code.trim().toUpperCase(),
        percentage: valueNum,
        startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : undefined,
        endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : undefined,
        usageLimit: form.usageLimit ? parseInt(form.usageLimit, 10) : undefined,
      };

      const res = await fetch('/api/admin/discounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { discount?: AdminDiscount; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Failed to create');
      toast.success(`Discount "${form.code.toUpperCase()}" created`);
      onCreated();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Create failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#111827] border border-[#1f2d4e] rounded-2xl w-full max-w-lg shadow-2xl shadow-black/60 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center gap-3 p-6 border-b border-[#1f2d4e]">
          <div className="w-10 h-10 rounded-xl bg-[#d4a843]/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-[#d4a843] text-xl">sell</span>
          </div>
          <div className="flex-1">
            <p className="text-white font-semibold" style={{ fontFamily: 'var(--font-heading)' }}>
              Create Discount
            </p>
            <p className="text-[#6b7280] text-xs">Add a new discount code to your store</p>
          </div>
          <button onClick={onClose} className="text-[#374151] hover:text-white transition-colors">
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-[#9ca3af] mb-1.5">
              Title <span className="text-[#ef4444]">*</span>
            </label>
            <input
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="e.g. Summer Sale 20%"
              className="w-full bg-[#0a0f1e] border border-[#1f2d4e] focus:border-[#d4a843] focus:ring-1 focus:ring-[#d4a843] text-white placeholder-[#374151] rounded-xl px-4 py-2.5 text-sm outline-none transition-colors"
            />
          </div>

          {/* Code */}
          <div>
            <label className="block text-xs font-medium text-[#9ca3af] mb-1.5">
              Code <span className="text-[#ef4444]">*</span>
            </label>
            <div className="flex gap-2">
              <input
                value={form.code}
                onChange={(e) => set('code', e.target.value.toUpperCase())}
                placeholder="SUMMER20"
                className="flex-1 bg-[#0a0f1e] border border-[#1f2d4e] focus:border-[#d4a843] focus:ring-1 focus:ring-[#d4a843] text-white placeholder-[#374151] rounded-xl px-4 py-2.5 text-sm outline-none transition-colors font-mono uppercase"
              />
              <button
                type="button"
                onClick={() => set('code', generateCode())}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-[#1f2d4e] hover:bg-[#263d6e] text-[#9ca3af] hover:text-white text-xs font-medium transition-all"
              >
                <span className="material-symbols-outlined text-sm">casino</span>
                Auto
              </button>
            </div>
          </div>

          {/* Type + Value */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#9ca3af] mb-1.5">
                Discount Type
              </label>
              <select
                value={form.type}
                onChange={(e) => set('type', e.target.value as DiscountType)}
                className="w-full bg-[#0a0f1e] border border-[#1f2d4e] focus:border-[#d4a843] focus:ring-1 focus:ring-[#d4a843] text-white rounded-xl px-4 py-2.5 text-sm outline-none transition-colors"
              >
                <option value="percentage">Percentage</option>
                <option value="fixed">Fixed Amount</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#9ca3af] mb-1.5">
                Value <span className="text-[#ef4444]">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b7280] text-sm">
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
                  className="w-full bg-[#0a0f1e] border border-[#1f2d4e] focus:border-[#d4a843] focus:ring-1 focus:ring-[#d4a843] text-white placeholder-[#374151] rounded-xl pl-8 pr-4 py-2.5 text-sm outline-none transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Note for fixed amount */}
          {form.type === 'fixed' && (
            <p className="text-[#d4a843] text-xs bg-[#d4a843]/5 border border-[#d4a843]/20 rounded-lg px-3 py-2">
              <span className="material-symbols-outlined text-xs align-middle mr-1">info</span>
              Fixed amount discounts are stored as percentage in the API for now. Use percentage
              type for full support.
            </p>
          )}

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#9ca3af] mb-1.5">Start Date</label>
              <input
                type="datetime-local"
                value={form.startsAt}
                onChange={(e) => set('startsAt', e.target.value)}
                className="w-full bg-[#0a0f1e] border border-[#1f2d4e] focus:border-[#d4a843] focus:ring-1 focus:ring-[#d4a843] text-white rounded-xl px-4 py-2.5 text-sm outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#9ca3af] mb-1.5">
                End Date <span className="text-[#374151]">(optional)</span>
              </label>
              <input
                type="datetime-local"
                value={form.endsAt}
                onChange={(e) => set('endsAt', e.target.value)}
                className="w-full bg-[#0a0f1e] border border-[#1f2d4e] focus:border-[#d4a843] focus:ring-1 focus:ring-[#d4a843] text-white rounded-xl px-4 py-2.5 text-sm outline-none transition-colors"
              />
            </div>
          </div>

          {/* Usage Limit */}
          <div>
            <label className="block text-xs font-medium text-[#9ca3af] mb-1.5">
              Usage Limit <span className="text-[#374151]">(0 = unlimited)</span>
            </label>
            <input
              type="number"
              min={0}
              value={form.usageLimit}
              onChange={(e) => set('usageLimit', e.target.value)}
              placeholder="Unlimited"
              className="w-full bg-[#0a0f1e] border border-[#1f2d4e] focus:border-[#d4a843] focus:ring-1 focus:ring-[#d4a843] text-white placeholder-[#374151] rounded-xl px-4 py-2.5 text-sm outline-none transition-colors"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-[#1f2d4e]">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex-1 bg-[#1f2d4e] hover:bg-[#263d6e] text-white rounded-xl py-2.5 text-sm font-medium transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit as unknown as React.MouseEventHandler}
            disabled={submitting}
            className="flex-1 bg-[#d4a843] hover:bg-[#e4c06a] disabled:bg-[#374151] text-[#0a0f1e] disabled:text-[#6b7280] rounded-xl py-2.5 text-sm font-bold transition-colors flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <span className="material-symbols-outlined text-base animate-spin">
                  progress_activity
                </span>
                Creating…
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-base">add</span>
                Create Discount
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function DiscountsPage() {
  const { toast } = useToast();

  const [discounts, setDiscounts] = useState<AdminDiscount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminDiscount | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

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
  const expiredCount = discounts.filter((d) => d.status === 'EXPIRED').length;
  const totalUsage = discounts.reduce((sum, d) => sum + getTotalUsage(d), 0);

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
          <h1
            className="text-2xl font-bold text-white"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Discounts
          </h1>
          <p className="text-[#6b7280] text-sm mt-1">
            {loading
              ? 'Loading…'
              : `${discounts.length} discount code${discounts.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#d4a843] hover:bg-[#e4c06a] text-[#0a0f1e] text-sm font-bold transition-colors"
        >
          <span className="material-symbols-outlined text-base">add</span>
          Create Discount
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard
          icon="sell"
          label="Active Discounts"
          value={loading ? '—' : activeCount}
          color="#10b981"
        />
        <StatCard
          icon="bar_chart"
          label="Total Usage"
          value={loading ? '—' : totalUsage}
          color="#d4a843"
        />
        <StatCard
          icon="schedule"
          label="Expired"
          value={loading ? '—' : expiredCount}
          color="#6b7280"
        />
      </div>

      {/* Table */}
      <div className="bg-[#111827] border border-[#1f2d4e] rounded-2xl overflow-hidden">
        {error ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="material-symbols-outlined text-[#ef4444] text-4xl mb-3">error</span>
            <p className="text-[#ef4444] text-sm">{error}</p>
            <button
              onClick={fetchDiscounts}
              className="mt-4 text-[#d4a843] text-sm hover:text-[#e4c06a] transition-colors"
            >
              Try again
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1f2d4e]">
                  <th className="text-left text-xs font-medium uppercase tracking-wider text-[#6b7280] px-4 py-3 pl-6">
                    Code
                  </th>
                  <th className="text-left text-xs font-medium uppercase tracking-wider text-[#6b7280] px-4 py-3">
                    Title
                  </th>
                  <th className="text-left text-xs font-medium uppercase tracking-wider text-[#6b7280] px-4 py-3">
                    Type
                  </th>
                  <th className="text-left text-xs font-medium uppercase tracking-wider text-[#6b7280] px-4 py-3">
                    Value
                  </th>
                  <th className="text-left text-xs font-medium uppercase tracking-wider text-[#6b7280] px-4 py-3">
                    Usage
                  </th>
                  <th className="text-left text-xs font-medium uppercase tracking-wider text-[#6b7280] px-4 py-3">
                    Status
                  </th>
                  <th className="text-left text-xs font-medium uppercase tracking-wider text-[#6b7280] px-4 py-3">
                    Dates
                  </th>
                  <th className="text-right text-xs font-medium uppercase tracking-wider text-[#6b7280] px-4 py-3 pr-6">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1f2d4e]">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                ) : discounts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-16">
                      <div className="flex flex-col items-center gap-3">
                        <span className="material-symbols-outlined text-[#374151] text-4xl">
                          local_offer
                        </span>
                        <p className="text-[#6b7280] text-sm">No discount codes yet</p>
                        <button
                          onClick={() => setShowCreate(true)}
                          className="text-[#d4a843] text-sm hover:text-[#e4c06a] transition-colors"
                        >
                          Create your first discount
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  discounts.map((discount) => {
                    const firstCode = discount.codes?.edges?.[0]?.node;
                    const usage = getTotalUsage(discount);
                    return (
                      <tr key={discount.id} className="hover:bg-[#1f2d4e]/20 transition-colors">
                        {/* Code */}
                        <td className="px-4 py-4 pl-6">
                          <span className="text-white font-mono text-sm font-medium bg-[#1f2d4e] px-2 py-1 rounded-lg">
                            {firstCode?.code ?? '—'}
                          </span>
                        </td>

                        {/* Title */}
                        <td className="px-4 py-4">
                          <span className="text-[#e5e7eb] text-sm">{discount.title}</span>
                        </td>

                        {/* Type */}
                        <td className="px-4 py-4">
                          <span className="text-[#9ca3af] text-xs">
                            {getDiscountType(discount)}
                          </span>
                        </td>

                        {/* Value */}
                        <td className="px-4 py-4">
                          <span className="text-[#d4a843] font-semibold text-sm">
                            {getDiscountValue(discount)}
                          </span>
                        </td>

                        {/* Usage */}
                        <td className="px-4 py-4">
                          <span className="text-[#e5e7eb] text-sm">{usage}</span>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-4">
                          <StatusBadge status={discount.status} />
                        </td>

                        {/* Dates */}
                        <td className="px-4 py-4">
                          <div className="text-xs text-[#6b7280] space-y-0.5">
                            <p>
                              <span className="text-[#374151]">Start:</span>{' '}
                              {formatDate(discount.createdAt)}
                            </p>
                            {discount.endsAt && (
                              <p>
                                <span className="text-[#374151]">End:</span>{' '}
                                {formatDate(discount.endsAt)}
                              </p>
                            )}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-4 pr-6">
                          <div className="flex items-center justify-end">
                            <button
                              onClick={() => setDeleteTarget(discount)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#ef4444]/10 hover:bg-[#ef4444]/20 text-[#ef4444] text-xs font-medium transition-all"
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

      {/* Create Modal */}
      {showCreate && (
        <CreateModal onClose={() => setShowCreate(false)} onCreated={fetchDiscounts} />
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
