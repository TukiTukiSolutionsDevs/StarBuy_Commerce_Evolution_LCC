'use client';

/**
 * Admin Orders Page — Phase 3
 *
 * Full orders management: filter, search, sort, paginate, view detail.
 * Migrated to admin design tokens. Zero hardcoded hex colors.
 */

import { useEffect, useCallback, useState } from 'react';
import Link from 'next/link';
import { useToast } from '@/components/ui/useToast';
import type { AdminOrder } from '@/lib/shopify/admin/tools/orders';
import {
  AdminPageHeader,
  AdminCard,
  AdminBadge,
  AdminSkeleton,
  AdminEmptyState,
  AdminErrorState,
  AdminSearchInput,
} from '@/components/admin/ui';

// ─── Constants ──────────────────────────────────────────────────────────────────

const STATUS_TABS = [
  { value: '', label: 'All' },
  { value: 'unfulfilled', label: 'Unfulfilled' },
  { value: 'fulfilled', label: 'Fulfilled' },
  { value: 'paid', label: 'Paid' },
  { value: 'refunded', label: 'Refunded' },
  { value: 'cancelled', label: 'Cancelled' },
] as const;

const DATE_RANGES = [
  { value: 1, label: 'Today' },
  { value: 7, label: 'Last 7 days' },
  { value: 30, label: 'Last 30 days' },
  { value: 90, label: 'Last 90 days' },
  { value: 9999, label: 'All time' },
] as const;

const SORT_OPTIONS = [
  { value: 'date_desc', label: 'Newest first' },
  { value: 'date_asc', label: 'Oldest first' },
  { value: 'total_desc', label: 'Highest total' },
  { value: 'total_asc', label: 'Lowest total' },
] as const;

type SortOption = (typeof SORT_OPTIONS)[number]['value'];
type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'brand';

const PAGE_SIZE = 25;

// ─── Badge helpers ──────────────────────────────────────────────────────────────

const PAYMENT_VARIANT: Record<string, BadgeVariant> = {
  PAID: 'success',
  PENDING: 'brand',
  PARTIALLY_PAID: 'warning',
  REFUNDED: 'error',
  PARTIALLY_REFUNDED: 'error',
  VOIDED: 'neutral',
};

const FULFILLMENT_VARIANT: Record<string, BadgeVariant> = {
  FULFILLED: 'success',
  UNFULFILLED: 'warning',
  PARTIALLY_FULFILLED: 'warning',
  SCHEDULED: 'info',
  ON_HOLD: 'info',
};

function badgeLabel(status: string | null): string {
  if (!status) return 'No status';
  const label = status.replace(/_/g, ' ');
  return label.charAt(0) + label.slice(1).toLowerCase();
}

function RiskBadge({ level }: { level: string }) {
  if (!level || level === 'LOW') return null;
  const isHigh = level === 'HIGH';
  return (
    <span
      title={`Fraud risk: ${level.toLowerCase()}`}
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-semibold"
      style={{
        backgroundColor: isHigh ? 'var(--admin-error-bg)' : 'var(--admin-warning-bg)',
        color: isHigh ? 'var(--admin-error)' : 'var(--admin-warning)',
      }}
    >
      <span className="material-symbols-outlined text-xs">{isHigh ? 'gpp_bad' : 'gpp_maybe'}</span>
      {isHigh ? 'High risk' : 'Medium risk'}
    </span>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

function relativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function formatCurrency(amount: string, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(parseFloat(amount));
}

// ─── Sort helper ────────────────────────────────────────────────────────────────

function sortOrders(orders: AdminOrder[], sort: SortOption): AdminOrder[] {
  return [...orders].sort((a, b) => {
    switch (sort) {
      case 'date_asc':
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case 'date_desc':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case 'total_asc':
        return (
          parseFloat(a.currentTotalPriceSet.shopMoney.amount) -
          parseFloat(b.currentTotalPriceSet.shopMoney.amount)
        );
      case 'total_desc':
        return (
          parseFloat(b.currentTotalPriceSet.shopMoney.amount) -
          parseFloat(a.currentTotalPriceSet.shopMoney.amount)
        );
      default:
        return 0;
    }
  });
}

// ─── Export CSV ─────────────────────────────────────────────────────────────────

function exportCsv(orders: AdminOrder[]) {
  const headers = ['Order', 'Customer', 'Email', 'Date', 'Total', 'Payment', 'Fulfillment', 'Tags'];
  const rows = orders.map((o) => {
    const name = o.customer
      ? `${o.customer.firstName ?? ''} ${o.customer.lastName ?? ''}`.trim()
      : 'Guest';
    const total = o.currentTotalPriceSet.shopMoney;
    return [
      o.name,
      name,
      o.customer?.email ?? o.email ?? '',
      new Date(o.createdAt).toLocaleDateString(),
      `${total.currencyCode} ${total.amount}`,
      o.displayFinancialStatus,
      o.displayFulfillmentStatus,
      o.tags.join('; '),
    ];
  });

  const csv = [headers, ...rows]
    .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

// ─── Select styles ──────────────────────────────────────────────────────────────

const selectStyle: React.CSSProperties = {
  backgroundColor: 'var(--admin-bg-card)',
  border: '1px solid var(--admin-border)',
  color: 'var(--admin-text-secondary)',
};

// ─── Page ───────────────────────────────────────────────────────────────────────

export default function OrdersPage() {
  const { toast } = useToast();

  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [total, setTotal] = useState(0);

  const [activeStatus, setActiveStatus] = useState<string>('');
  const [activeDays, setActiveDays] = useState<number>(30);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortOption>('date_desc');
  const [page, setPage] = useState(1);

  // ── Fetch ───────────────────────────────────────────────────────────────────

  const fetchOrders = useCallback(
    async (reset = false) => {
      setLoading(true);
      setError('');
      try {
        const params = new URLSearchParams();
        if (activeStatus) params.set('status', activeStatus);
        params.set('days', String(activeDays));
        params.set('limit', String(PAGE_SIZE * (reset ? 1 : page)));

        const res = await fetch(`/api/admin/orders?${params}`);
        const data = (await res.json()) as { orders?: AdminOrder[]; error?: string };
        if (!res.ok) throw new Error(data.error ?? 'Failed to load orders');
        setOrders(data.orders ?? []);
        setTotal(data.orders?.length ?? 0);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load orders');
        toast.error(err instanceof Error ? err.message : 'Failed to load orders');
      } finally {
        setLoading(false);
      }
    },
    [activeStatus, activeDays, page, toast],
  );

  useEffect(() => {
    setPage(1);
    setOrders([]);
  }, [activeStatus, activeDays]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // ── Client-side search + sort ───────────────────────────────────────────────

  const filtered = search.trim()
    ? orders.filter((o) => {
        const q = search.toLowerCase();
        return (
          o.name.toLowerCase().includes(q) ||
          (o.customer?.firstName ?? '').toLowerCase().includes(q) ||
          (o.customer?.lastName ?? '').toLowerCase().includes(q) ||
          (o.customer?.email ?? '').toLowerCase().includes(q) ||
          (o.email ?? '').toLowerCase().includes(q) ||
          o.tags.some((t) => t.toLowerCase().includes(q))
        );
      })
    : orders;

  const sorted = sortOrders(filtered, sort);
  const displayCount = sorted.length;
  const hasMore = total >= PAGE_SIZE * page;

  function loadMore() {
    setPage((p) => p + 1);
  }

  // ── Action buttons helper ─────────────────────────────────────────────────

  const actionBtnStyle: React.CSSProperties = {
    backgroundColor: 'var(--admin-bg-card)',
    border: '1px solid var(--admin-border)',
    color: 'var(--admin-text-secondary)',
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <AdminPageHeader
        title="Orders"
        subtitle={loading ? 'Loading…' : `${displayCount} order${displayCount !== 1 ? 's' : ''}`}
        actions={
          <div className="flex items-center gap-2">
            {!loading && sorted.length > 0 && (
              <button
                onClick={() => exportCsv(sorted)}
                className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all"
                style={actionBtnStyle}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--admin-text)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--admin-text-secondary)';
                }}
              >
                <span className="material-symbols-outlined text-base">download</span>
                Export CSV
              </button>
            )}
            <button
              onClick={() => fetchOrders(true)}
              disabled={loading}
              className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all disabled:opacity-50"
              style={actionBtnStyle}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--admin-text)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--admin-text-secondary)';
              }}
            >
              <span
                className={`material-symbols-outlined text-base ${loading ? 'animate-spin' : ''}`}
              >
                refresh
              </span>
              Refresh
            </button>
          </div>
        }
      />

      {/* ── Status tabs ────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap">
        {STATUS_TABS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setActiveStatus(value)}
            className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
            style={
              activeStatus === value
                ? {
                    backgroundColor: 'var(--admin-brand-bg)',
                    color: 'var(--admin-brand)',
                    border: '1px solid var(--admin-brand-border)',
                  }
                : {
                    backgroundColor: 'var(--admin-bg-card)',
                    color: 'var(--admin-text-muted)',
                    border: '1px solid var(--admin-border)',
                  }
            }
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Filter row ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={activeDays}
          onChange={(e) => setActiveDays(Number(e.target.value))}
          className="rounded-xl px-4 py-2.5 text-sm outline-none transition-colors cursor-pointer"
          style={selectStyle}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'var(--admin-brand)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'var(--admin-border)';
          }}
        >
          {DATE_RANGES.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortOption)}
          className="rounded-xl px-4 py-2.5 text-sm outline-none transition-colors cursor-pointer"
          style={selectStyle}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'var(--admin-brand)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'var(--admin-border)';
          }}
        >
          {SORT_OPTIONS.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        <AdminSearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by order #, customer, email or tag…"
          className="flex-1 min-w-[200px]"
        />
      </div>

      {/* ── Table ──────────────────────────────────────────────────── */}
      <AdminCard padding="none">
        {error ? (
          <AdminErrorState message={error} onRetry={() => fetchOrders(true)} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--admin-border)' }}>
                  {[
                    'Order',
                    'Customer',
                    'Date',
                    'Items',
                    'Total',
                    'Payment',
                    'Fulfillment',
                    'Actions',
                  ].map((h) => (
                    <th
                      key={h}
                      className={`text-xs font-medium uppercase tracking-wider px-4 py-3 ${
                        h === 'Items'
                          ? 'text-center'
                          : h === 'Total' || h === 'Actions'
                            ? 'text-right'
                            : 'text-left'
                      }`}
                      style={{ color: 'var(--admin-text-muted)' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--admin-border)' }}>
                      {[120, 160, 80, 40, 80, 100, 110, 60].map((w, j) => (
                        <td key={j} className="px-4 py-4">
                          <AdminSkeleton variant="text" className={`w-[${w}px]`} />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : sorted.length === 0 ? (
                  <tr>
                    <td colSpan={8}>
                      <AdminEmptyState
                        icon="receipt_long"
                        title={
                          search ? 'No orders match your search' : 'No orders found for this period'
                        }
                      />
                    </td>
                  </tr>
                ) : (
                  sorted.map((order) => {
                    const numericId = order.id.replace('gid://shopify/Order/', '');
                    const customerName = order.customer
                      ? `${order.customer.firstName ?? ''} ${order.customer.lastName ?? ''}`.trim()
                      : null;
                    const customerDisplay =
                      customerName || order.customer?.email || order.email || '—';
                    const money = order.currentTotalPriceSet.shopMoney;
                    const itemCount = order.lineItems.edges.reduce(
                      (sum, e) => sum + e.node.quantity,
                      0,
                    );
                    const hasNote = !!order.note;
                    const riskLevel = order.riskLevel ?? '';

                    return (
                      <tr
                        key={order.id}
                        className="transition-colors"
                        style={{ borderBottom: '1px solid var(--admin-border)' }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'var(--admin-bg-hover)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        {/* Order */}
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Link
                              href={`/admin/orders/${numericId}`}
                              className="font-semibold text-sm transition-colors"
                              style={{ color: 'var(--admin-brand)' }}
                            >
                              {order.name}
                            </Link>
                            {hasNote && (
                              <span
                                title="Has internal note"
                                className="material-symbols-outlined text-sm"
                                style={{ color: 'var(--admin-accent)' }}
                              >
                                sticky_note_2
                              </span>
                            )}
                            {order.hasTimelineComment && (
                              <span
                                title="Has timeline comment"
                                className="material-symbols-outlined text-sm"
                                style={{ color: 'var(--admin-text-muted)' }}
                              >
                                comment
                              </span>
                            )}
                          </div>
                          {riskLevel && riskLevel !== 'LOW' && (
                            <div className="mt-1">
                              <RiskBadge level={riskLevel} />
                            </div>
                          )}
                          {order.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {order.tags.slice(0, 3).map((tag) => (
                                <span
                                  key={tag}
                                  className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                                  style={{
                                    backgroundColor: 'var(--admin-bg-hover)',
                                    color: 'var(--admin-text-muted)',
                                  }}
                                >
                                  {tag}
                                </span>
                              ))}
                              {order.tags.length > 3 && (
                                <span
                                  className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                                  style={{
                                    backgroundColor: 'var(--admin-bg-hover)',
                                    color: 'var(--admin-text-disabled)',
                                  }}
                                >
                                  +{order.tags.length - 3}
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Customer */}
                        <td className="px-4 py-4">
                          <p className="text-sm" style={{ color: 'var(--admin-text-body)' }}>
                            {customerDisplay}
                          </p>
                          {order.customer?.email && customerName && (
                            <p
                              className="text-xs mt-0.5 truncate max-w-[160px]"
                              style={{ color: 'var(--admin-text-disabled)' }}
                            >
                              {order.customer.email}
                            </p>
                          )}
                        </td>

                        {/* Date */}
                        <td className="px-4 py-4">
                          <span
                            className="text-sm cursor-default"
                            style={{ color: 'var(--admin-text-secondary)' }}
                            title={new Date(order.createdAt).toLocaleString()}
                          >
                            {relativeDate(order.createdAt)}
                          </span>
                        </td>

                        {/* Items */}
                        <td className="px-4 py-4 text-center">
                          <span
                            className="text-sm"
                            style={{ color: 'var(--admin-text-secondary)' }}
                          >
                            {itemCount}
                          </span>
                        </td>

                        {/* Total */}
                        <td className="px-4 py-4 text-right">
                          <span
                            className="text-sm font-medium"
                            style={{ color: 'var(--admin-text-body)' }}
                          >
                            {formatCurrency(money.amount, money.currencyCode)}
                          </span>
                        </td>

                        {/* Payment */}
                        <td className="px-4 py-4">
                          <AdminBadge
                            variant={PAYMENT_VARIANT[order.displayFinancialStatus] ?? 'neutral'}
                          >
                            {badgeLabel(order.displayFinancialStatus)}
                          </AdminBadge>
                        </td>

                        {/* Fulfillment */}
                        <td className="px-4 py-4">
                          <AdminBadge
                            variant={
                              FULFILLMENT_VARIANT[order.displayFulfillmentStatus ?? ''] ?? 'neutral'
                            }
                          >
                            {badgeLabel(order.displayFulfillmentStatus)}
                          </AdminBadge>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-end">
                            <Link
                              href={`/admin/orders/${numericId}`}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                              style={{
                                backgroundColor: 'var(--admin-bg-hover)',
                                color: 'var(--admin-text-secondary)',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.color = 'var(--admin-text)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.color = 'var(--admin-text-secondary)';
                              }}
                            >
                              <span className="material-symbols-outlined text-sm">open_in_new</span>
                              View
                            </Link>
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

        {/* Load more */}
        {!loading && !error && hasMore && sorted.length > 0 && (
          <div
            className="p-4 flex justify-center"
            style={{ borderTop: '1px solid var(--admin-border)' }}
          >
            <button
              onClick={loadMore}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{
                backgroundColor: 'var(--admin-bg-hover)',
                color: 'var(--admin-text-secondary)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--admin-text)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--admin-text-secondary)';
              }}
            >
              <span className="material-symbols-outlined text-base">expand_more</span>
              Load more orders
            </button>
          </div>
        )}
      </AdminCard>
    </div>
  );
}
