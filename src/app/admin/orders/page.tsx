'use client';

/**
 * Admin Orders Page
 *
 * Full orders management: filter, search, sort, paginate, view detail.
 * Matches Shopify Admin: payment/fulfillment badges, tags, notes indicator,
 * risk level, item count, sort controls.
 */

import { useEffect, useCallback, useState } from 'react';
import Link from 'next/link';
import { useToast } from '@/components/ui/useToast';
import type { AdminOrder } from '@/lib/shopify/admin/tools/orders';

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

const PAGE_SIZE = 25;

// ─── Badge helpers ──────────────────────────────────────────────────────────────

const PAYMENT_COLORS: Record<string, string> = {
  PAID: '#10b981',
  PENDING: '#d4a843',
  PARTIALLY_PAID: '#f59e0b',
  REFUNDED: '#ef4444',
  PARTIALLY_REFUNDED: '#f97316',
  VOIDED: '#6b7280',
};

const FULFILLMENT_COLORS: Record<string, string> = {
  FULFILLED: '#10b981',
  UNFULFILLED: '#f59e0b',
  PARTIALLY_FULFILLED: '#eab308',
  SCHEDULED: '#6366f1',
  ON_HOLD: '#8b5cf6',
};

const RISK_COLORS: Record<string, string> = {
  HIGH: '#ef4444',
  MEDIUM: '#f59e0b',
  LOW: '#10b981',
};

function PaymentBadge({ status }: { status: string }) {
  const color = PAYMENT_COLORS[status] ?? '#6b7280';
  const label = status.replace(/_/g, ' ');
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
      style={{ backgroundColor: `${color}15`, color }}
    >
      <span className="w-1.5 h-1.5 rounded-full flex-none" style={{ backgroundColor: color }} />
      {label.charAt(0) + label.slice(1).toLowerCase()}
    </span>
  );
}

function FulfillmentBadge({ status }: { status: string | null }) {
  const key = status ?? '';
  const color = FULFILLMENT_COLORS[key] ?? '#6b7280';
  const label = key ? key.replace(/_/g, ' ') : 'No status';
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
      style={{ backgroundColor: `${color}15`, color }}
    >
      <span className="w-1.5 h-1.5 rounded-full flex-none" style={{ backgroundColor: color }} />
      {label.charAt(0) + label.slice(1).toLowerCase()}
    </span>
  );
}

function RiskBadge({ level }: { level: string }) {
  if (!level || level === 'LOW') return null;
  const color = RISK_COLORS[level] ?? '#f59e0b';
  const icon = level === 'HIGH' ? 'gpp_bad' : 'gpp_maybe';
  return (
    <span
      title={`Fraud risk: ${level.toLowerCase()}`}
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-semibold"
      style={{ backgroundColor: `${color}20`, color }}
    >
      <span className="material-symbols-outlined text-xs">{icon}</span>
      {level === 'HIGH' ? 'High risk' : 'Medium risk'}
    </span>
  );
}

// ─── Relative date ──────────────────────────────────────────────────────────────

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

// ─── Skeleton row ───────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr className="border-b border-[#1f2d4e]">
      {[120, 160, 80, 90, 80, 100, 110, 60].map((w, i) => (
        <td key={i} className="px-4 py-4">
          <div className="h-4 bg-[#1f2d4e] rounded animate-pulse" style={{ width: `${w}px` }} />
        </td>
      ))}
    </tr>
  );
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

  // Reset page when filters change
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

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ fontFamily: 'var(--font-heading)', color: '#ffffff' }}
          >
            Orders
          </h1>
          <p className="text-[#6b7280] text-sm mt-1">
            {loading ? 'Loading…' : `${displayCount} order${displayCount !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!loading && sorted.length > 0 && (
            <button
              onClick={() => exportCsv(sorted)}
              className="flex items-center gap-2 bg-[#111827] border border-[#1f2d4e] hover:border-[#374151] text-[#9ca3af] hover:text-white rounded-xl px-4 py-2.5 text-sm font-medium transition-all"
            >
              <span className="material-symbols-outlined text-base">download</span>
              Export CSV
            </button>
          )}
          <button
            onClick={() => fetchOrders(true)}
            disabled={loading}
            className="flex items-center gap-2 bg-[#111827] border border-[#1f2d4e] hover:border-[#374151] text-[#9ca3af] hover:text-white rounded-xl px-4 py-2.5 text-sm font-medium transition-all disabled:opacity-50"
          >
            <span
              className={`material-symbols-outlined text-base ${loading ? 'animate-spin' : ''}`}
            >
              refresh
            </span>
            Refresh
          </button>
        </div>
      </div>

      {/* ── Status tabs ────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap">
        {STATUS_TABS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setActiveStatus(value)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeStatus === value
                ? 'bg-[#d4a843]/10 text-[#d4a843] border border-[#d4a843]/30'
                : 'bg-[#111827] border border-[#1f2d4e] text-[#6b7280] hover:text-[#9ca3af] hover:border-[#374151]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Filter row ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Date range */}
        <select
          value={activeDays}
          onChange={(e) => setActiveDays(Number(e.target.value))}
          className="bg-[#111827] border border-[#1f2d4e] hover:border-[#374151] focus:border-[#d4a843] focus:ring-1 focus:ring-[#d4a843] text-[#9ca3af] focus:text-white rounded-xl px-4 py-2.5 text-sm outline-none transition-colors cursor-pointer"
        >
          {DATE_RANGES.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        {/* Sort */}
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortOption)}
          className="bg-[#111827] border border-[#1f2d4e] hover:border-[#374151] focus:border-[#d4a843] focus:ring-1 focus:ring-[#d4a843] text-[#9ca3af] focus:text-white rounded-xl px-4 py-2.5 text-sm outline-none transition-colors cursor-pointer"
        >
          {SORT_OPTIONS.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-[#374151] text-xl pointer-events-none">
            search
          </span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by order #, customer, email or tag…"
            className="w-full bg-[#111827] border border-[#1f2d4e] focus:border-[#d4a843] focus:ring-1 focus:ring-[#d4a843] text-white placeholder-[#374151] rounded-xl pl-12 pr-10 py-2.5 text-sm outline-none transition-colors"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#374151] hover:text-white transition-colors"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Table ──────────────────────────────────────────────────── */}
      <div className="bg-[#111827] border border-[#1f2d4e] rounded-2xl overflow-hidden">
        {error ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="material-symbols-outlined text-[#ef4444] text-4xl mb-3">error</span>
            <p className="text-[#ef4444] text-sm">{error}</p>
            <button
              onClick={() => fetchOrders(true)}
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
                  <th className="text-left text-xs font-medium uppercase tracking-wider text-[#6b7280] px-4 py-3">
                    Order
                  </th>
                  <th className="text-left text-xs font-medium uppercase tracking-wider text-[#6b7280] px-4 py-3">
                    Customer
                  </th>
                  <th className="text-left text-xs font-medium uppercase tracking-wider text-[#6b7280] px-4 py-3">
                    Date
                  </th>
                  <th className="text-center text-xs font-medium uppercase tracking-wider text-[#6b7280] px-4 py-3">
                    Items
                  </th>
                  <th className="text-right text-xs font-medium uppercase tracking-wider text-[#6b7280] px-4 py-3">
                    Total
                  </th>
                  <th className="text-left text-xs font-medium uppercase tracking-wider text-[#6b7280] px-4 py-3">
                    Payment
                  </th>
                  <th className="text-left text-xs font-medium uppercase tracking-wider text-[#6b7280] px-4 py-3">
                    Fulfillment
                  </th>
                  <th className="text-right text-xs font-medium uppercase tracking-wider text-[#6b7280] px-4 py-3">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1f2d4e]">
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
                ) : sorted.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-16">
                      <div className="flex flex-col items-center gap-3">
                        <span className="material-symbols-outlined text-[#374151] text-4xl">
                          receipt_long
                        </span>
                        <p className="text-[#6b7280] text-sm">
                          {search
                            ? 'No orders match your search'
                            : 'No orders found for this period'}
                        </p>
                      </div>
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
                      <tr key={order.id} className="hover:bg-[#1f2d4e]/20 transition-colors">
                        {/* Order */}
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Link
                              href={`/admin/orders/${numericId}`}
                              className="text-[#d4a843] hover:text-[#e4c06a] font-semibold text-sm transition-colors"
                            >
                              {order.name}
                            </Link>
                            {hasNote && (
                              <span
                                title="Has internal note"
                                className="material-symbols-outlined text-sm text-[#6366f1]"
                              >
                                sticky_note_2
                              </span>
                            )}
                            {order.hasTimelineComment && (
                              <span
                                title="Has timeline comment"
                                className="material-symbols-outlined text-sm text-[#6b7280]"
                              >
                                comment
                              </span>
                            )}
                          </div>
                          {/* Risk badge */}
                          {riskLevel && riskLevel !== 'LOW' && (
                            <div className="mt-1">
                              <RiskBadge level={riskLevel} />
                            </div>
                          )}
                          {/* Tags */}
                          {order.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {order.tags.slice(0, 3).map((tag) => (
                                <span
                                  key={tag}
                                  className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#1f2d4e] text-[#6b7280]"
                                >
                                  {tag}
                                </span>
                              ))}
                              {order.tags.length > 3 && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#1f2d4e] text-[#4b5563]">
                                  +{order.tags.length - 3}
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Customer */}
                        <td className="px-4 py-4">
                          <p className="text-[#e5e7eb] text-sm">{customerDisplay}</p>
                          {order.customer?.email && customerName && (
                            <p className="text-[#4b5563] text-xs mt-0.5 truncate max-w-[160px]">
                              {order.customer.email}
                            </p>
                          )}
                        </td>

                        {/* Date */}
                        <td className="px-4 py-4">
                          <span
                            className="text-[#9ca3af] text-sm cursor-default"
                            title={new Date(order.createdAt).toLocaleString()}
                          >
                            {relativeDate(order.createdAt)}
                          </span>
                        </td>

                        {/* Items */}
                        <td className="px-4 py-4 text-center">
                          <span className="text-[#9ca3af] text-sm">{itemCount}</span>
                        </td>

                        {/* Total */}
                        <td className="px-4 py-4 text-right">
                          <span className="text-[#e5e7eb] text-sm font-medium">
                            {formatCurrency(money.amount, money.currencyCode)}
                          </span>
                        </td>

                        {/* Payment */}
                        <td className="px-4 py-4">
                          <PaymentBadge status={order.displayFinancialStatus} />
                        </td>

                        {/* Fulfillment */}
                        <td className="px-4 py-4">
                          <FulfillmentBadge status={order.displayFulfillmentStatus} />
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-end">
                            <Link
                              href={`/admin/orders/${numericId}`}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1f2d4e] hover:bg-[#263d6e] text-[#9ca3af] hover:text-white text-xs font-medium transition-all"
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
          <div className="border-t border-[#1f2d4e] p-4 flex justify-center">
            <button
              onClick={loadMore}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#1f2d4e] hover:bg-[#263d6e] text-[#9ca3af] hover:text-white text-sm font-medium transition-all"
            >
              <span className="material-symbols-outlined text-base">expand_more</span>
              Load more orders
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
