'use client';

/**
 * Admin Dashboard
 *
 * Client component — fetches data from API routes.
 * Shows KPI cards, revenue chart, order status chart,
 * product/order tables, and inventory alerts.
 */

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { RevenueChart, type RevenueDataPoint } from '@/components/admin/charts/RevenueChart';
import {
  OrderStatusChart,
  type OrderStatusDataPoint,
} from '@/components/admin/charts/OrderStatusChart';
import type { AdminOrder } from '@/lib/shopify/admin/tools/orders';
import type { AdminProduct } from '@/lib/shopify/admin/tools/products';

// ─── Types ─────────────────────────────────────────────────────────────────────

type DashboardData = {
  // KPIs
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  totalProducts: number;
  // Charts
  revenueByDay: RevenueDataPoint[];
  ordersByStatus: OrderStatusDataPoint[];
  // Tables
  topProducts: AdminProduct[];
  recentOrders: AdminOrder[];
  // Alerts
  lowStockProducts: AdminProduct[];
  outOfStockProducts: AdminProduct[];
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatCurrency(value: number): string {
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatCount(value: number): string {
  return value.toLocaleString('en-US');
}

function getShortDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function getChartLabel(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

// ─── Build dashboard data from raw API responses ───────────────────────────────

function buildDashboardData(orders: AdminOrder[], products: AdminProduct[]): DashboardData {
  // KPIs
  const totalRevenue = orders.reduce(
    (sum, o) => sum + parseFloat(o.currentTotalPriceSet.shopMoney.amount || '0'),
    0,
  );
  const totalOrders = orders.length;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const totalProducts = products.length;

  // Revenue by day (last 7 days)
  const now = new Date();
  const days7: RevenueDataPoint[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const label = getChartLabel(d.toISOString());
    const dayKey = d.toISOString().slice(0, 10); // "YYYY-MM-DD"
    const dayRevenue = orders
      .filter((o) => o.createdAt.slice(0, 10) === dayKey)
      .reduce((s, o) => s + parseFloat(o.currentTotalPriceSet.shopMoney.amount || '0'), 0);
    days7.push({ date: label, revenue: dayRevenue });
  }

  // Orders by financial status
  const statusMap: Record<string, number> = {};
  for (const o of orders) {
    const s = o.displayFinancialStatus ?? 'OTHER';
    statusMap[s] = (statusMap[s] ?? 0) + 1;
  }
  const ordersByStatus: OrderStatusDataPoint[] = Object.entries(statusMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // Top 5 products by inventory
  const topProducts = [...products]
    .sort((a, b) => {
      const totalA = a.variants.edges.reduce((s, e) => s + (e.node.inventoryQuantity ?? 0), 0);
      const totalB = b.variants.edges.reduce((s, e) => s + (e.node.inventoryQuantity ?? 0), 0);
      return totalB - totalA;
    })
    .slice(0, 5);

  // Recent 5 orders
  const recentOrders = [...orders]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  // Inventory alerts
  const outOfStockProducts = products.filter((p) => {
    const total = p.variants.edges.reduce((s, e) => s + (e.node.inventoryQuantity ?? 0), 0);
    return total === 0;
  });
  const lowStockProducts = products.filter((p) => {
    const total = p.variants.edges.reduce((s, e) => s + (e.node.inventoryQuantity ?? 0), 0);
    return total > 0 && total < 10;
  });

  return {
    totalRevenue,
    totalOrders,
    avgOrderValue,
    totalProducts,
    revenueByDay: days7,
    ordersByStatus,
    topProducts,
    recentOrders,
    lowStockProducts,
    outOfStockProducts,
  };
}

// ─── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`bg-[#1f2d4e]/40 rounded-lg animate-pulse ${className}`} />;
}

function KpiSkeleton() {
  return (
    <div className="bg-[#111827] border border-[#1f2d4e] rounded-2xl p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-10 w-10 rounded-xl" />
      </div>
      <Skeleton className="h-9 w-32" />
      <Skeleton className="h-3 w-20" />
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="bg-[#111827] border border-[#1f2d4e] rounded-2xl p-6">
      <Skeleton className="h-5 w-32 mb-6" />
      <Skeleton className="h-[220px] w-full" />
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  icon,
  color,
  sub,
}: {
  label: string;
  value: string;
  icon: string;
  color: string;
  sub?: string;
}) {
  return (
    <div className="bg-[#111827] border border-[#1f2d4e] rounded-2xl p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="text-[#6b7280] text-sm font-medium">{label}</span>
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-none"
          style={{ backgroundColor: `${color}15` }}
        >
          <span className="material-symbols-outlined text-xl" style={{ color }}>
            {icon}
          </span>
        </div>
      </div>
      <div>
        <p
          className="text-3xl font-bold"
          style={{ fontFamily: 'var(--font-heading)', color: '#ffffff' }}
        >
          {value}
        </p>
        {sub && <p className="text-[#6b7280] text-xs mt-1">{sub}</p>}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { color: string }> = {
    ACTIVE: { color: '#10b981' },
    DRAFT: { color: '#d4a843' },
    ARCHIVED: { color: '#6b7280' },
    PAID: { color: '#10b981' },
    PENDING: { color: '#d4a843' },
    REFUNDED: { color: '#ef4444' },
    VOIDED: { color: '#6b8cff' },
    UNFULFILLED: { color: '#d4a843' },
    FULFILLED: { color: '#10b981' },
    PARTIALLY_FULFILLED: { color: '#f59e0b' },
  };
  const s = map[status?.toUpperCase()] ?? { color: '#6b7280' };
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
      style={{ backgroundColor: `${s.color}15`, color: s.color }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.color }} />
      {status ? status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, ' ') : '—'}
    </span>
  );
}

function SectionHeader({
  title,
  href,
  linkLabel = 'View all',
}: {
  title: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-[#1f2d4e]">
      <h2 className="font-semibold" style={{ fontFamily: 'var(--font-heading)', color: '#ffffff' }}>
        {title}
      </h2>
      {href && (
        <Link
          href={href}
          className="text-[#d4a843] text-sm hover:text-[#e4c06a] transition-colors flex items-center gap-1"
        >
          {linkLabel}
          <span className="material-symbols-outlined text-sm">arrow_forward</span>
        </Link>
      )}
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const [ordersRes, statsRes] = await Promise.all([
          fetch('/api/admin/orders?limit=250&days=30'),
          fetch('/api/admin/stats'),
        ]);

        if (!ordersRes.ok || !statsRes.ok) {
          throw new Error('Failed to load dashboard data');
        }

        const [{ orders }, { stats }] = await Promise.all([
          ordersRes.json() as Promise<{ orders: AdminOrder[] }>,
          statsRes.json() as Promise<{
            stats: {
              totalProducts: number;
              totalCollections: number;
              totalInventoryUnits: number;
              storeStatus: string;
            };
          }>,
        ]);

        // We also need products for inventory alerts / top products table
        // Use a simple fetch to the existing stats route since products come from there
        // But we need the raw products — so let's call products API directly
        const productsRes = await fetch('/api/admin/products?limit=50');
        let products: AdminProduct[] = [];
        if (productsRes.ok) {
          const { products: p } = (await productsRes.json()) as { products: AdminProduct[] };
          products = p ?? [];
        }

        const built = buildDashboardData(orders, products);
        // Override totalProducts from stats (authoritative)
        built.totalProducts = stats.totalProducts;

        setData(built);
      } catch (err) {
        console.error('[AdminDashboard] fetch error:', err);
        setError('Failed to load dashboard data. Please refresh.');
      } finally {
        setLoading(false);
      }
    }

    void fetchDashboard();
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div>
        <h1
          className="text-2xl font-bold"
          style={{ fontFamily: 'var(--font-heading)', color: '#ffffff' }}
        >
          Dashboard
        </h1>
        <p className="text-[#6b7280] text-sm mt-1">
          Welcome back — here&apos;s your store overview for the last 30 days.
        </p>
      </div>

      {error && (
        <div className="bg-[#ef4444]/10 border border-[#ef4444]/30 rounded-2xl px-6 py-4 flex items-center gap-3">
          <span className="material-symbols-outlined text-[#ef4444]">error</span>
          <p className="text-[#ef4444] text-sm">{error}</p>
        </div>
      )}

      {/* ── Row 1: KPI Cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {loading ? (
          <>
            <KpiSkeleton />
            <KpiSkeleton />
            <KpiSkeleton />
            <KpiSkeleton />
          </>
        ) : (
          <>
            <KpiCard
              label="Total Revenue"
              value={formatCurrency(data?.totalRevenue ?? 0)}
              icon="payments"
              color="#d4a843"
              sub="Last 30 days"
            />
            <KpiCard
              label="Total Orders"
              value={formatCount(data?.totalOrders ?? 0)}
              icon="shopping_bag"
              color="#10b981"
              sub="Last 30 days"
            />
            <KpiCard
              label="Avg Order Value"
              value={formatCurrency(data?.avgOrderValue ?? 0)}
              icon="trending_up"
              color="#6b8cff"
              sub="AOV · last 30 days"
            />
            <KpiCard
              label="Total Products"
              value={formatCount(data?.totalProducts ?? 0)}
              icon="inventory_2"
              color="#f59e0b"
              sub="All variants included"
            />
          </>
        )}
      </div>

      {/* ── Row 2: Charts ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {loading ? (
          <>
            <ChartSkeleton />
            <ChartSkeleton />
          </>
        ) : (
          <>
            {/* Revenue Line Chart */}
            <div className="bg-[#111827] border border-[#1f2d4e] rounded-2xl p-6">
              <div className="mb-4">
                <h2
                  className="font-semibold"
                  style={{ fontFamily: 'var(--font-heading)', color: '#ffffff' }}
                >
                  Revenue (Last 7 Days)
                </h2>
                <p className="text-[#6b7280] text-xs mt-0.5">Daily totals in USD</p>
              </div>
              <RevenueChart data={data?.revenueByDay ?? []} />
            </div>

            {/* Order Status Donut */}
            <div className="bg-[#111827] border border-[#1f2d4e] rounded-2xl p-6">
              <div className="mb-4">
                <h2
                  className="font-semibold"
                  style={{ fontFamily: 'var(--font-heading)', color: '#ffffff' }}
                >
                  Orders by Status
                </h2>
                <p className="text-[#6b7280] text-xs mt-0.5">
                  Financial status breakdown · last 30 days
                </p>
              </div>
              <OrderStatusChart data={data?.ordersByStatus ?? []} />
            </div>
          </>
        )}
      </div>

      {/* ── Row 3: Tables ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Products by Inventory */}
        <div className="bg-[#111827] border border-[#1f2d4e] rounded-2xl overflow-hidden">
          <SectionHeader title="Top Products by Inventory" href="/admin/products" />
          {loading ? (
            <div className="p-6 space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : !data?.topProducts.length ? (
            <div className="flex flex-col items-center justify-center py-12">
              <span className="material-symbols-outlined text-[#374151] text-4xl mb-3">
                inventory_2
              </span>
              <p className="text-[#6b7280] text-sm">No products found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#1f2d4e]">
                    {['Product', 'Status', 'Stock'].map((h) => (
                      <th
                        key={h}
                        className="text-left text-[#6b7280] text-xs font-medium uppercase tracking-wider px-6 py-3"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1f2d4e]">
                  {data.topProducts.map((product) => {
                    const inventoryTotal = product.variants.edges.reduce(
                      (sum, e) => sum + (e.node.inventoryQuantity ?? 0),
                      0,
                    );
                    return (
                      <tr key={product.id} className="hover:bg-[#1f2d4e]/20 transition-colors">
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-3">
                            {product.featuredImage ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={product.featuredImage.url}
                                alt={product.featuredImage.altText ?? product.title}
                                className="w-8 h-8 rounded-lg object-cover bg-[#1f2d4e] flex-none"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-lg bg-[#1f2d4e] flex items-center justify-center flex-none">
                                <span className="material-symbols-outlined text-[#374151] text-sm">
                                  image
                                </span>
                              </div>
                            )}
                            <p className="text-white text-sm font-medium truncate max-w-[160px]">
                              {product.title}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-3">
                          <StatusBadge status={product.status} />
                        </td>
                        <td className="px-6 py-3">
                          <span
                            className={`text-sm font-medium ${
                              inventoryTotal === 0
                                ? 'text-[#ef4444]'
                                : inventoryTotal < 10
                                  ? 'text-[#d4a843]'
                                  : 'text-[#10b981]'
                            }`}
                          >
                            {inventoryTotal.toLocaleString()}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent Orders */}
        <div className="bg-[#111827] border border-[#1f2d4e] rounded-2xl overflow-hidden">
          <SectionHeader title="Recent Orders" href="/admin/orders" />
          {loading ? (
            <div className="p-6 space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : !data?.recentOrders.length ? (
            <div className="flex flex-col items-center justify-center py-12">
              <span className="material-symbols-outlined text-[#374151] text-4xl mb-3">
                shopping_bag
              </span>
              <p className="text-[#6b7280] text-sm">No orders in the last 30 days</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#1f2d4e]">
                    {['Order', 'Total', 'Status', 'Date'].map((h) => (
                      <th
                        key={h}
                        className="text-left text-[#6b7280] text-xs font-medium uppercase tracking-wider px-6 py-3"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1f2d4e]">
                  {data.recentOrders.map((order) => {
                    const amount = parseFloat(order.currentTotalPriceSet.shopMoney.amount);
                    return (
                      <tr key={order.id} className="hover:bg-[#1f2d4e]/20 transition-colors">
                        <td className="px-6 py-3">
                          <p className="text-white text-sm font-medium">{order.name}</p>
                          {order.customer && (
                            <p className="text-[#6b7280] text-xs">
                              {[order.customer.firstName, order.customer.lastName]
                                .filter(Boolean)
                                .join(' ') || order.customer.email}
                            </p>
                          )}
                        </td>
                        <td className="px-6 py-3">
                          <span className="text-[#e5e7eb] text-sm font-medium">
                            {formatCurrency(amount)}
                          </span>
                        </td>
                        <td className="px-6 py-3">
                          <StatusBadge status={order.displayFinancialStatus} />
                        </td>
                        <td className="px-6 py-3">
                          <span className="text-[#6b7280] text-xs">
                            {getShortDate(order.createdAt)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Row 4: Inventory Alerts ──────────────────────────────────────── */}
      {!loading &&
        ((data?.outOfStockProducts?.length ?? 0) > 0 ||
          (data?.lowStockProducts?.length ?? 0) > 0) && (
          <div>
            <h2
              className="font-semibold mb-4"
              style={{ fontFamily: 'var(--font-heading)', color: '#ffffff' }}
            >
              Inventory Alerts
            </h2>
            <div className="space-y-3">
              {/* Out of stock */}
              {data!.outOfStockProducts.map((product) => (
                <div
                  key={product.id}
                  className="bg-[#ef4444]/5 border border-[#ef4444]/30 rounded-xl px-5 py-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-[#ef4444] text-xl">
                      warning
                    </span>
                    <div>
                      <p className="text-white text-sm font-medium">{product.title}</p>
                      <p className="text-[#ef4444] text-xs mt-0.5">Out of stock</p>
                    </div>
                  </div>
                  <Link
                    href={`/admin/products/${product.handle ?? product.id}`}
                    className="text-[#ef4444] text-xs hover:text-[#f87171] transition-colors flex items-center gap-1"
                  >
                    Restock
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </Link>
                </div>
              ))}

              {/* Low stock */}
              {data!.lowStockProducts.map((product) => {
                const stock = product.variants.edges.reduce(
                  (s, e) => s + (e.node.inventoryQuantity ?? 0),
                  0,
                );
                return (
                  <div
                    key={product.id}
                    className="bg-[#d4a843]/5 border border-[#d4a843]/30 rounded-xl px-5 py-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-[#d4a843] text-xl">
                        inventory
                      </span>
                      <div>
                        <p className="text-white text-sm font-medium">{product.title}</p>
                        <p className="text-[#d4a843] text-xs mt-0.5">
                          Low stock — {stock} unit{stock !== 1 ? 's' : ''} remaining
                        </p>
                      </div>
                    </div>
                    <Link
                      href={`/admin/products/${product.handle ?? product.id}`}
                      className="text-[#d4a843] text-xs hover:text-[#e4c06a] transition-colors flex items-center gap-1"
                    >
                      Restock
                      <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      {/* ── Quick Actions ────────────────────────────────────────────────── */}
      <div>
        <h2
          className="font-semibold mb-4"
          style={{ fontFamily: 'var(--font-heading)', color: '#ffffff' }}
        >
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            href="/admin/products"
            className="group bg-[#111827] border border-[#1f2d4e] hover:border-[#d4a843]/40 rounded-2xl p-6 flex items-center gap-4 transition-all hover:bg-[#1b2a5e]/20"
          >
            <div className="w-12 h-12 rounded-xl bg-[#d4a843]/10 flex items-center justify-center group-hover:bg-[#d4a843]/20 transition-colors">
              <span className="material-symbols-outlined text-[#d4a843] text-2xl">add_box</span>
            </div>
            <div>
              <p className="text-white font-semibold text-sm">Add Product</p>
              <p className="text-[#6b7280] text-xs mt-0.5">Create a new product listing</p>
            </div>
            <span className="material-symbols-outlined text-[#374151] group-hover:text-[#d4a843] ml-auto transition-colors">
              arrow_forward
            </span>
          </Link>

          <Link
            href="/admin/collections"
            className="group bg-[#111827] border border-[#1f2d4e] hover:border-[#1b2a5e] rounded-2xl p-6 flex items-center gap-4 transition-all hover:bg-[#1b2a5e]/20"
          >
            <div className="w-12 h-12 rounded-xl bg-[#1b2a5e]/30 flex items-center justify-center group-hover:bg-[#1b2a5e]/50 transition-colors">
              <span className="material-symbols-outlined text-[#6b8cff] text-2xl">
                collections_bookmark
              </span>
            </div>
            <div>
              <p className="text-white font-semibold text-sm">View Collections</p>
              <p className="text-[#6b7280] text-xs mt-0.5">Browse all collections</p>
            </div>
            <span className="material-symbols-outlined text-[#374151] group-hover:text-[#6b8cff] ml-auto transition-colors">
              arrow_forward
            </span>
          </Link>

          <Link
            href="/admin/products?tab=inventory"
            className="group bg-[#111827] border border-[#1f2d4e] hover:border-[#10b981]/40 rounded-2xl p-6 flex items-center gap-4 transition-all hover:bg-[#10b981]/5"
          >
            <div className="w-12 h-12 rounded-xl bg-[#10b981]/10 flex items-center justify-center group-hover:bg-[#10b981]/20 transition-colors">
              <span className="material-symbols-outlined text-[#10b981] text-2xl">warehouse</span>
            </div>
            <div>
              <p className="text-white font-semibold text-sm">Check Inventory</p>
              <p className="text-[#6b7280] text-xs mt-0.5">Manage stock levels</p>
            </div>
            <span className="material-symbols-outlined text-[#374151] group-hover:text-[#10b981] ml-auto transition-colors">
              arrow_forward
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
