'use client';

/**
 * Admin Customers Page
 *
 * Full customer management: search, stats, sortable table, customer profiles.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { useToast } from '@/components/ui/useToast';
import type { AdminCustomer } from '@/lib/shopify/admin/tools/customers';

// ─── Types ──────────────────────────────────────────────────────────────────────

type SortField = 'name' | 'ordersCount' | 'totalSpent' | 'createdAt';
type SortDir = 'asc' | 'desc';

// ─── Helpers ─────────────────────────────────────────────────────────────────────

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

const STATE_STYLE: Record<string, { color: string; label: string }> = {
  ENABLED: { color: '#10b981', label: 'Enabled' },
  DISABLED: { color: '#ef4444', label: 'Disabled' },
  INVITED: { color: '#d4a843', label: 'Invited' },
  DECLINED: { color: '#6b7280', label: 'Declined' },
};

function StateBadge({ state }: { state: string }) {
  const s = STATE_STYLE[state] ?? STATE_STYLE.DECLINED;
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

// ─── Tags Cell ────────────────────────────────────────────────────────────────────

function TagsCell({ tags }: { tags: string[] }) {
  if (tags.length === 0) return <span className="text-[#374151] text-xs">—</span>;
  const visible = tags.slice(0, 3);
  const extra = tags.length - 3;
  return (
    <div className="flex flex-wrap gap-1">
      {visible.map((t) => (
        <span
          key={t}
          className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#1f2d4e] text-[#9ca3af]"
        >
          {t}
        </span>
      ))}
      {extra > 0 && (
        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#1f2d4e] text-[#6b7280]">
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
        className={`inline-flex items-center gap-1 transition-colors ${
          isActive ? 'text-[#d4a843]' : 'text-[#6b7280] group-hover:text-[#9ca3af]'
        }`}
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
    <tr className="border-b border-[#1f2d4e]">
      {[48, 160, 100, 80, 80, 100, 80, 60].map((w, i) => (
        <td key={i} className="px-4 py-4">
          <div className="h-3.5 bg-[#1f2d4e] rounded animate-pulse" style={{ width: `${w}px` }} />
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
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#111827] border border-[#1f2d4e] rounded-2xl w-full max-w-sm p-6 shadow-2xl shadow-black/60">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-[#ef4444]/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-[#ef4444] text-xl">person_remove</span>
          </div>
          <div>
            <p className="text-white font-semibold">Delete Customer</p>
            <p className="text-[#6b7280] text-xs">This action cannot be undone</p>
          </div>
        </div>
        <p className="text-[#9ca3af] text-sm mb-6">
          Are you sure you want to delete{' '}
          <span className="text-white font-medium">&ldquo;{name}&rdquo;</span>?
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 bg-[#1f2d4e] hover:bg-[#263d6e] text-white rounded-xl py-2.5 text-sm font-medium transition-colors"
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

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function CustomersPage() {
  const { toast } = useToast();

  const [customers, setCustomers] = useState<AdminCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<AdminCustomer | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

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

  const sorted = [...customers].sort((a, b) => {
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

  const returning = customers.filter((c) => c.ordersCount > 1).length;

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
          <h1
            className="text-2xl font-bold text-white"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Customers
          </h1>
          <p className="text-[#6b7280] text-sm mt-1">
            {loading
              ? 'Loading…'
              : `${customers.length} customer${customers.length !== 1 ? 's' : ''}`}
          </p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon="people" label="Total customers" value={totalCustomers} color="#6b8cff" />
        <StatCard
          icon="payments"
          label="Avg. spent"
          value={loading ? '—' : avgSpentFormatted}
          color="#d4a843"
        />
        <StatCard icon="person_add" label="New this month" value={thisMonth} color="#10b981" />
        <StatCard icon="repeat" label="Returning" value={returning} color="#8b5cf6" />
      </div>

      {/* Search */}
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-[#374151] text-xl">
          search
        </span>
        <input
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Search by name, email or phone…"
          className="w-full bg-[#111827] border border-[#1f2d4e] focus:border-[#d4a843] focus:ring-1 focus:ring-[#d4a843] text-white placeholder-[#374151] rounded-xl pl-12 pr-4 py-3 text-sm outline-none transition-colors"
        />
        {search && (
          <button
            onClick={() => handleSearchChange('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-[#374151] hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-[#111827] border border-[#1f2d4e] rounded-2xl overflow-hidden">
        {error ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="material-symbols-outlined text-[#ef4444] text-4xl mb-3">error</span>
            <p className="text-[#ef4444] text-sm">{error}</p>
            <button
              onClick={() => fetchCustomers(search)}
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
                  <SortTh
                    field="name"
                    label="Customer"
                    active={sortField}
                    dir={sortDir}
                    onSort={toggleSort}
                    className="pl-6"
                  />
                  <th className="text-left text-xs font-medium uppercase tracking-wider text-[#6b7280] px-4 py-3">
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
                  <th className="text-left text-xs font-medium uppercase tracking-wider text-[#6b7280] px-4 py-3">
                    Location
                  </th>
                  <th className="text-left text-xs font-medium uppercase tracking-wider text-[#6b7280] px-4 py-3">
                    Status
                  </th>
                  <th className="text-left text-xs font-medium uppercase tracking-wider text-[#6b7280] px-4 py-3">
                    Tags
                  </th>
                  <th className="text-right text-xs font-medium uppercase tracking-wider text-[#6b7280] px-4 py-3 pr-6">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1f2d4e]">
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
                ) : sorted.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-16">
                      <div className="flex flex-col items-center gap-3">
                        <span className="material-symbols-outlined text-[#374151] text-4xl">
                          people
                        </span>
                        <p className="text-[#6b7280] text-sm">
                          {search ? 'No customers match your search' : 'No customers yet'}
                        </p>
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
                    const location =
                      [customer.defaultAddress?.city, customer.defaultAddress?.country]
                        .filter(Boolean)
                        .join(', ') || '—';
                    const numId = extractNumericId(customer.id);

                    return (
                      <tr key={customer.id} className="hover:bg-[#1f2d4e]/20 transition-colors">
                        {/* Customer */}
                        <td className="px-4 py-4 pl-6">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-9 h-9 rounded-full flex items-center justify-center flex-none text-xs font-bold text-[#0a0f1e]"
                              style={{ backgroundColor: avatarBg }}
                            >
                              {initials}
                            </div>
                            <div>
                              <p className="text-white text-sm font-medium">{fullName}</p>
                              {customer.phone && (
                                <p className="text-[#6b7280] text-xs">{customer.phone}</p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Email */}
                        <td className="px-4 py-4">
                          <span className="text-[#9ca3af] text-sm">{customer.email}</span>
                        </td>

                        {/* Orders */}
                        <td className="px-4 py-4">
                          <span className="text-[#e5e7eb] text-sm font-medium">
                            {customer.ordersCount}
                          </span>
                        </td>

                        {/* Total Spent */}
                        <td className="px-4 py-4">
                          <span className="text-[#e5e7eb] text-sm font-medium">
                            {formatMoney(
                              customer.totalSpentV2.amount,
                              customer.totalSpentV2.currencyCode,
                            )}
                          </span>
                        </td>

                        {/* Location */}
                        <td className="px-4 py-4">
                          <span className="text-[#9ca3af] text-sm">{location}</span>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-4">
                          <StateBadge state={customer.state} />
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
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1f2d4e] hover:bg-[#263d6e] text-[#9ca3af] hover:text-white text-xs font-medium transition-all"
                            >
                              <span className="material-symbols-outlined text-sm">person</span>
                              Profile
                            </Link>
                            <button
                              onClick={() => setDeleteTarget(customer)}
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

      {/* Delete Modal */}
      {deleteTarget && (
        <DeleteModal
          customer={deleteTarget}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={deleteLoading}
        />
      )}
    </div>
  );
}
