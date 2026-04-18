'use client';

/**
 * Admin Customers Page — Phase 3
 *
 * Migrated to use admin design tokens. Zero hardcoded hex colors.
 * Full customer management: search, filters, stats, sortable table, create modal.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { useToast } from '@/components/ui/useToast';
import type { AdminCustomer } from '@/lib/shopify/admin/tools/customers';

// ─── Types ──────────────────────────────────────────────────────────────────────

type SortField = 'name' | 'ordersCount' | 'totalSpent' | 'createdAt';
type SortDir = 'asc' | 'desc';
type FilterType = 'all' | 'new' | 'returning' | 'has_orders' | 'no_orders' | 'subscribed';

// ─── Helpers ─────────────────────────────────────────────────────────────────────

// Intentional: fixed avatar palette for visual differentiation — not admin theme colors
const AVATAR_COLORS = ['#d4a843', '#10b981', '#6b8cff', '#ef4444', '#8b5cf6', '#f59e0b'];

function getInitials(first: string | null, last: string | null): string {
  const f = (first ?? '').trim();
  const l = (last ?? '').trim();
  if (!f && !l) return '?';
  return `${f.charAt(0)}${l.charAt(0)}`.toUpperCase();
}

function getAvatarColor(name: string): string {
  const code = name.charCodeAt(0) || 0;
  return AVATAR_COLORS[code % AVATAR_COLORS.length];
}

function formatMoney(amount: string, currency: string): string {
  const n = parseFloat(amount);
  if (isNaN(n)) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(n);
}

function extractNumericId(gid: string): string {
  return gid.replace('gid://shopify/Customer/', '');
}

// ─── Status Badge ────────────────────────────────────────────────────────────────

const STATE_STYLE: Record<string, { token: string; label: string }> = {
  ENABLED: { token: 'var(--admin-success)', label: 'Enabled' },
  DISABLED: { token: 'var(--admin-error)', label: 'Disabled' },
  INVITED: { token: 'var(--admin-brand)', label: 'Invited' },
  DECLINED: { token: 'var(--admin-text-muted)', label: 'Declined' },
};

function StateBadge({ state }: { state: string }) {
  const s = STATE_STYLE[state] ?? STATE_STYLE.DECLINED;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
      style={{ backgroundColor: `color-mix(in srgb, ${s.token} 10%, transparent)`, color: s.token }}
    >
      <span className="w-1.5 h-1.5 rounded-full flex-none" style={{ backgroundColor: s.token }} />
      {s.label}
    </span>
  );
}

// ─── Tags Cell ────────────────────────────────────────────────────────────────────

function TagsCell({ tags }: { tags: string[] }) {
  if (tags.length === 0)
    return (
      <span className="text-xs" style={{ color: 'var(--admin-text-disabled)' }}>
        —
      </span>
    );
  const visible = tags.slice(0, 2);
  const extra = tags.length - 2;
  return (
    <div className="flex flex-wrap gap-1">
      {visible.map((t) => (
        <span
          key={t}
          className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium"
          style={{ backgroundColor: 'var(--admin-border)', color: 'var(--admin-text-secondary)' }}
        >
          {t}
        </span>
      ))}
      {extra > 0 && (
        <span
          className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium"
          style={{ backgroundColor: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}
        >
          +{extra}
        </span>
      )}
    </div>
  );
}

// ─── Sort Header ──────────────────────────────────────────────────────────────────

function SortTh({
  field,
  label,
  active,
  dir,
  onSort,
  className,
}: {
  field: SortField;
  label: string;
  active: SortField | null;
  dir: SortDir;
  onSort: (f: SortField) => void;
  className?: string;
}) {
  const isActive = active === field;
  return (
    <th
      className={`text-left text-xs font-medium uppercase tracking-wider px-4 py-3 cursor-pointer select-none group ${className ?? ''}`}
      onClick={() => onSort(field)}
    >
      <span
        className="inline-flex items-center gap-1 transition-colors"
        style={{
          color: isActive ? 'var(--admin-brand)' : 'var(--admin-text-muted)',
        }}
      >
        {label}
        {isActive ? (
          <span className="material-symbols-outlined text-sm">
            {dir === 'asc' ? 'arrow_upward' : 'arrow_downward'}
          </span>
        ) : (
          <span className="material-symbols-outlined text-sm opacity-0 group-hover:opacity-40">
            unfold_more
          </span>
        )}
      </span>
    </th>
  );
}

// ─── Skeleton Row ─────────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr style={{ borderBottom: '1px solid var(--admin-border)' }}>
      {[48, 160, 100, 80, 80, 100, 80, 60].map((w, i) => (
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

// ─── Stats Card ───────────────────────────────────────────────────────────────────

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

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────────

function DeleteModal({
  customer,
  onConfirm,
  onCancel,
  loading,
}: {
  customer: AdminCustomer;
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

  const name = [customer.firstName, customer.lastName].filter(Boolean).join(' ') || customer.email;
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
              person_remove
            </span>
          </div>
          <div>
            <p className="font-semibold" style={{ color: 'var(--admin-text)' }}>
              Delete Customer
            </p>
            <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
              This action cannot be undone
            </p>
          </div>
        </div>
        <p className="text-sm mb-6" style={{ color: 'var(--admin-text-secondary)' }}>
          Are you sure you want to delete{' '}
          <span className="font-medium" style={{ color: 'var(--admin-text)' }}>
            &ldquo;{name}&rdquo;
          </span>
          ?
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 rounded-xl py-2.5 text-sm font-medium transition-colors"
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

// ─── Create Customer Modal ────────────────────────────────────────────────────────

function CreateCustomerModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    note: '',
    acceptsMarketing: false,
    tags: '',
  });

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  function handleChange(field: keyof typeof form, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.email.trim()) {
      toast.error('Email is required');
      return;
    }
    setSaving(true);
    try {
      const tags = form.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      const res = await fetch('/api/admin/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: form.firstName.trim() || undefined,
          lastName: form.lastName.trim() || undefined,
          email: form.email.trim(),
          phone: form.phone.trim() || undefined,
          note: form.note.trim() || undefined,
          acceptsMarketing: form.acceptsMarketing,
          tags: tags.length > 0 ? tags : undefined,
        }),
      });
      const data = (await res.json()) as { customer?: AdminCustomer; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Failed to create');
      const name = [form.firstName, form.lastName].filter(Boolean).join(' ') || form.email;
      toast.success(`Customer "${name}" created`);
      onCreated();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create customer');
    } finally {
      setSaving(false);
    }
  }

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
        className="rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        style={{
          backgroundColor: 'var(--admin-bg-card)',
          border: '1px solid var(--admin-border)',
          boxShadow: 'var(--admin-shadow-dropdown)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid var(--admin-border)' }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: 'var(--admin-brand-bg)' }}
            >
              <span
                className="material-symbols-outlined text-base"
                style={{ color: 'var(--admin-brand)' }}
              >
                person_add
              </span>
            </div>
            <h2 className="admin-h2">Add Customer</h2>
          </div>
          <button
            onClick={onClose}
            className="transition-colors"
            style={{ color: 'var(--admin-text-muted)' }}
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Name row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="admin-label block mb-1.5">First name</label>
              <input
                value={form.firstName}
                onChange={(e) => handleChange('firstName', e.target.value)}
                placeholder="Jane"
                className="w-full rounded-xl px-3 py-2.5 text-sm outline-none transition-colors"
                style={inputStyle}
              />
            </div>
            <div>
              <label className="admin-label block mb-1.5">Last name</label>
              <input
                value={form.lastName}
                onChange={(e) => handleChange('lastName', e.target.value)}
                placeholder="Doe"
                className="w-full rounded-xl px-3 py-2.5 text-sm outline-none transition-colors"
                style={inputStyle}
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="admin-label block mb-1.5">
              Email <span style={{ color: 'var(--admin-error)' }}>*</span>
            </label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="jane@example.com"
              className="w-full rounded-xl px-3 py-2.5 text-sm outline-none transition-colors"
              style={inputStyle}
            />
          </div>

          {/* Phone */}
          <div>
            <label className="admin-label block mb-1.5">Phone</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              placeholder="+1 555 000 0000"
              className="w-full rounded-xl px-3 py-2.5 text-sm outline-none transition-colors"
              style={inputStyle}
            />
          </div>

          {/* Tags */}
          <div>
            <label className="admin-label block mb-1.5">Tags (comma-separated)</label>
            <input
              value={form.tags}
              onChange={(e) => handleChange('tags', e.target.value)}
              placeholder="vip, wholesale, influencer"
              className="w-full rounded-xl px-3 py-2.5 text-sm outline-none transition-colors"
              style={inputStyle}
            />
          </div>

          {/* Note */}
          <div>
            <label className="admin-label block mb-1.5">Note</label>
            <textarea
              value={form.note}
              onChange={(e) => handleChange('note', e.target.value)}
              placeholder="Internal note about this customer…"
              rows={3}
              className="w-full rounded-xl px-3 py-2.5 text-sm outline-none transition-colors resize-none"
              style={inputStyle}
            />
          </div>

          {/* Marketing consent */}
          <label className="flex items-center gap-3 cursor-pointer group">
            <button
              type="button"
              role="switch"
              aria-checked={form.acceptsMarketing}
              onClick={() => handleChange('acceptsMarketing', !form.acceptsMarketing)}
              className="relative w-10 h-5 rounded-full transition-colors flex-none"
              style={{
                backgroundColor: form.acceptsMarketing
                  ? 'var(--admin-success)'
                  : 'var(--admin-border)',
              }}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                  form.acceptsMarketing ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
            <span className="text-sm" style={{ color: 'var(--admin-text-secondary)' }}>
              Customer accepts email marketing
            </span>
          </label>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 rounded-xl py-2.5 text-sm font-medium transition-colors"
              style={{
                backgroundColor: 'var(--admin-border)',
                color: 'var(--admin-text)',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !form.email.trim()}
              className="flex-1 font-semibold rounded-xl py-2.5 text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              style={{
                backgroundColor: 'var(--admin-brand)',
                color: 'var(--admin-bg)',
              }}
            >
              {saving ? (
                <>
                  <span className="material-symbols-outlined text-base animate-spin">
                    progress_activity
                  </span>
                  Creating…
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-base">person_add</span>
                  Create Customer
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Filter Pill ──────────────────────────────────────────────────────────────────

function FilterPill({
  label,
  active,
  count,
  onClick,
}: {
  label: string;
  active: boolean;
  count?: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
      style={{
        backgroundColor: active ? 'var(--admin-brand)' : 'var(--admin-border)',
        color: active ? 'var(--admin-bg)' : 'var(--admin-text-secondary)',
      }}
    >
      {label}
      {count !== undefined && (
        <span
          className="px-1.5 py-0.5 rounded-full text-[10px] font-bold"
          style={{
            backgroundColor: active
              ? 'color-mix(in srgb, var(--admin-bg) 20%, transparent)'
              : 'color-mix(in srgb, var(--admin-bg) 40%, transparent)',
            color: active ? 'var(--admin-bg)' : 'var(--admin-text-muted)',
          }}
        >
          {count}
        </span>
      )}
    </button>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function CustomersPage() {
  const { toast } = useToast();

  const [customers, setCustomers] = useState<AdminCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<AdminCustomer | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Fetch ─────────────────────────────────────────────────────────────────────

  const fetchCustomers = useCallback(async (q: string) => {
    setLoading(true);
    setError('');
    try {
      const qs = q ? `?q=${encodeURIComponent(q)}&limit=50` : '?limit=50';
      const res = await fetch(`/api/admin/customers${qs}`);
      const data = (await res.json()) as { customers?: AdminCustomer[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Failed to load');
      setCustomers(data.customers ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load customers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomers('');
  }, [fetchCustomers]);

  function handleSearchChange(value: string) {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchCustomers(value);
    }, 400);
  }

  // ── Sort ──────────────────────────────────────────────────────────────────────

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  }

  // ── Filter counts ──────────────────────────────────────────────────────────────

  const filterCounts: Record<FilterType, number> = {
    all: customers.length,
    new: customers.filter((c) => c.ordersCount <= 1).length,
    returning: customers.filter((c) => c.ordersCount > 1).length,
    has_orders: customers.filter((c) => c.ordersCount > 0).length,
    no_orders: customers.filter((c) => c.ordersCount === 0).length,
    subscribed: customers.filter((c) => c.acceptsMarketing).length,
  };

  // ── Apply filter ──────────────────────────────────────────────────────────────

  const filtered = customers.filter((c) => {
    if (activeFilter === 'new') return c.ordersCount <= 1;
    if (activeFilter === 'returning') return c.ordersCount > 1;
    if (activeFilter === 'has_orders') return c.ordersCount > 0;
    if (activeFilter === 'no_orders') return c.ordersCount === 0;
    if (activeFilter === 'subscribed') return c.acceptsMarketing;
    return true;
  });

  // ── Sort ──────────────────────────────────────────────────────────────────────

  const sorted = [...filtered].sort((a, b) => {
    if (!sortField) return 0;
    let cmp = 0;
    if (sortField === 'name') {
      const nameA = `${a.firstName ?? ''} ${a.lastName ?? ''}`.trim().toLowerCase();
      const nameB = `${b.firstName ?? ''} ${b.lastName ?? ''}`.trim().toLowerCase();
      cmp = nameA.localeCompare(nameB);
    } else if (sortField === 'ordersCount') {
      cmp = a.ordersCount - b.ordersCount;
    } else if (sortField === 'totalSpent') {
      cmp = parseFloat(a.totalSpentV2.amount) - parseFloat(b.totalSpentV2.amount);
    } else if (sortField === 'createdAt') {
      cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    }
    return sortDir === 'asc' ? cmp : -cmp;
  });

  // ── Stats ─────────────────────────────────────────────────────────────────────

  const totalCustomers = customers.length;

  const avgSpent =
    customers.length > 0
      ? customers.reduce((sum, c) => sum + parseFloat(c.totalSpentV2.amount), 0) / customers.length
      : 0;

  const now = new Date();
  const thisMonth = customers.filter((c) => {
    const d = new Date(c.createdAt);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }).length;

  const subscribed = customers.filter((c) => c.acceptsMarketing).length;

  const currency = customers[0]?.totalSpentV2.currencyCode ?? 'USD';
  const avgSpentFormatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(avgSpent);

  // ── Delete ────────────────────────────────────────────────────────────────────

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const numId = extractNumericId(deleteTarget.id);
      const res = await fetch(`/api/admin/customers/${numId}`, { method: 'DELETE' });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Failed to delete');
      const name =
        [deleteTarget.firstName, deleteTarget.lastName].filter(Boolean).join(' ') ||
        deleteTarget.email;
      setDeleteTarget(null);
      toast.success(`"${name}" deleted`);
      fetchCustomers(search);
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
          <h1 className="admin-h1 text-2xl">Customers</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--admin-text-muted)' }}>
            {loading
              ? 'Loading…'
              : `${customers.length} customer${customers.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-colors"
          style={{
            backgroundColor: 'var(--admin-brand)',
            color: 'var(--admin-bg)',
          }}
        >
          <span className="material-symbols-outlined text-base">person_add</span>
          Add Customer
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon="people"
          label="Total customers"
          value={totalCustomers}
          colorToken="var(--admin-info)"
        />
        <StatCard
          icon="payments"
          label="Avg. spent"
          value={loading ? '—' : avgSpentFormatted}
          colorToken="var(--admin-brand)"
        />
        <StatCard
          icon="person_add"
          label="New this month"
          value={thisMonth}
          colorToken="var(--admin-success)"
        />
        <StatCard
          icon="mark_email_read"
          label="Email subscribers"
          value={subscribed}
          colorToken="var(--admin-accent)"
        />
      </div>

      {/* Search */}
      <div className="relative">
        <span
          className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-xl"
          style={{ color: 'var(--admin-text-disabled)' }}
        >
          search
        </span>
        <input
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Search by name, email or phone…"
          className="w-full rounded-xl pl-12 pr-4 py-3 text-sm outline-none transition-colors"
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
            onClick={() => handleSearchChange('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 transition-colors"
            style={{ color: 'var(--admin-text-disabled)' }}
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        )}
      </div>

      {/* Filters */}
      {!loading && customers.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {(
            [
              { key: 'all', label: 'All' },
              { key: 'new', label: 'New' },
              { key: 'returning', label: 'Returning' },
              { key: 'has_orders', label: 'Has orders' },
              { key: 'no_orders', label: 'No orders' },
              { key: 'subscribed', label: 'Subscribed' },
            ] as { key: FilterType; label: string }[]
          ).map(({ key, label }) => (
            <FilterPill
              key={key}
              label={label}
              active={activeFilter === key}
              count={filterCounts[key]}
              onClick={() => setActiveFilter(key)}
            />
          ))}
        </div>
      )}

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
              onClick={() => fetchCustomers(search)}
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
                  <SortTh
                    field="name"
                    label="Customer"
                    active={sortField}
                    dir={sortDir}
                    onSort={toggleSort}
                    className="pl-6"
                  />
                  <th
                    className="text-left text-xs font-medium uppercase tracking-wider px-4 py-3"
                    style={{ color: 'var(--admin-text-muted)' }}
                  >
                    Email
                  </th>
                  <SortTh
                    field="ordersCount"
                    label="Orders"
                    active={sortField}
                    dir={sortDir}
                    onSort={toggleSort}
                  />
                  <SortTh
                    field="totalSpent"
                    label="Total Spent"
                    active={sortField}
                    dir={sortDir}
                    onSort={toggleSort}
                  />
                  <th
                    className="text-left text-xs font-medium uppercase tracking-wider px-4 py-3"
                    style={{ color: 'var(--admin-text-muted)' }}
                  >
                    Status
                  </th>
                  <th
                    className="text-left text-xs font-medium uppercase tracking-wider px-4 py-3"
                    style={{ color: 'var(--admin-text-muted)' }}
                  >
                    Marketing
                  </th>
                  <th
                    className="text-left text-xs font-medium uppercase tracking-wider px-4 py-3"
                    style={{ color: 'var(--admin-text-muted)' }}
                  >
                    Tags
                  </th>
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
                  Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
                ) : sorted.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-16">
                      <div className="flex flex-col items-center gap-3">
                        <span
                          className="material-symbols-outlined text-4xl"
                          style={{ color: 'var(--admin-text-disabled)' }}
                        >
                          people
                        </span>
                        <p className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>
                          {search
                            ? 'No customers match your search'
                            : activeFilter !== 'all'
                              ? 'No customers match this filter'
                              : 'No customers yet'}
                        </p>
                        {activeFilter !== 'all' && (
                          <button
                            onClick={() => setActiveFilter('all')}
                            className="text-xs transition-colors"
                            style={{ color: 'var(--admin-brand)' }}
                          >
                            Clear filter
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  sorted.map((customer) => {
                    const initials = getInitials(customer.firstName, customer.lastName);
                    const avatarBg = getAvatarColor(
                      (customer.firstName ?? customer.email ?? '').trim(),
                    );
                    const fullName =
                      [customer.firstName, customer.lastName].filter(Boolean).join(' ') || '—';
                    const numId = extractNumericId(customer.id);

                    return (
                      <tr
                        key={customer.id}
                        className="transition-colors"
                        style={{ borderBottom: '1px solid var(--admin-border)' }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.backgroundColor = 'var(--admin-bg-hover)')
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.backgroundColor = 'transparent')
                        }
                      >
                        {/* Customer */}
                        <td className="px-4 py-4 pl-6">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-9 h-9 rounded-full flex items-center justify-center flex-none text-xs font-bold"
                              style={{ backgroundColor: avatarBg, color: 'var(--admin-bg)' }}
                            >
                              {initials}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <p
                                  className="text-sm font-medium"
                                  style={{ color: 'var(--admin-text)' }}
                                >
                                  {fullName}
                                </p>
                                {customer.note && (
                                  <span
                                    className="material-symbols-outlined text-sm"
                                    style={{ color: 'var(--admin-text-muted)' }}
                                    title="Has note"
                                  >
                                    sticky_note_2
                                  </span>
                                )}
                              </div>
                              {customer.phone && (
                                <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                                  {customer.phone}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Email */}
                        <td className="px-4 py-4">
                          <span
                            className="text-sm"
                            style={{ color: 'var(--admin-text-secondary)' }}
                          >
                            {customer.email}
                          </span>
                        </td>

                        {/* Orders */}
                        <td className="px-4 py-4">
                          <span
                            className="text-sm font-medium"
                            style={{ color: 'var(--admin-text-body)' }}
                          >
                            {customer.ordersCount}
                          </span>
                        </td>

                        {/* Total Spent */}
                        <td className="px-4 py-4">
                          <span
                            className="text-sm font-medium"
                            style={{ color: 'var(--admin-text-body)' }}
                          >
                            {formatMoney(
                              customer.totalSpentV2.amount,
                              customer.totalSpentV2.currencyCode,
                            )}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-4">
                          <StateBadge state={customer.state} />
                        </td>

                        {/* Marketing consent */}
                        <td className="px-4 py-4">
                          {customer.acceptsMarketing ? (
                            <span
                              className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full"
                              style={{
                                backgroundColor: 'var(--admin-success-bg)',
                                color: 'var(--admin-success)',
                              }}
                            >
                              <span className="material-symbols-outlined text-xs">
                                mark_email_read
                              </span>
                              Subscribed
                            </span>
                          ) : (
                            <span
                              className="text-xs"
                              style={{ color: 'var(--admin-text-disabled)' }}
                            >
                              —
                            </span>
                          )}
                        </td>

                        {/* Tags */}
                        <td className="px-4 py-4">
                          <TagsCell tags={customer.tags} />
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-4 pr-6">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              href={`/admin/customers/${numId}`}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                              style={{
                                backgroundColor: 'var(--admin-border)',
                                color: 'var(--admin-text-secondary)',
                              }}
                            >
                              <span className="material-symbols-outlined text-sm">person</span>
                              Profile
                            </Link>
                            <button
                              onClick={() => setDeleteTarget(customer)}
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

      {/* Delete Modal */}
      {deleteTarget && (
        <DeleteModal
          customer={deleteTarget}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={deleteLoading}
        />
      )}

      {/* Create Customer Modal */}
      {showCreate && (
        <CreateCustomerModal
          onClose={() => setShowCreate(false)}
          onCreated={() => fetchCustomers(search)}
        />
      )}
    </div>
  );
}
