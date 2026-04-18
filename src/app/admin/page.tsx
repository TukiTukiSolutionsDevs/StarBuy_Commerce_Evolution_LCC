'use client';

/**
 * Admin Dashboard — Phase 3
 *
 * Migrated to use admin UI components and design tokens.
 * Zero hardcoded hex colors.
 */

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { RevenueChart, type RevenueDataPoint } from '@/components/admin/charts/RevenueChart';
import {
  OrderStatusChart,
  type OrderStatusDataPoint,
} from '@/components/admin/charts/OrderStatusChart';
import {
  AdminPageHeader,
  AdminStatCard,
  AdminCard,
  AdminBadge,
  AdminSkeleton,
  AdminEmptyState,
  AdminErrorState,
} from '@/components/admin/ui';
import type { AdminOrder } from '@/lib/shopify/admin/tools/orders';
import type { AdminProduct } from '@/lib/shopify/admin/tools/products';

// ─── Types ─────────────────────────────────────────────────────────────────────

type DashboardData = {
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  totalProducts: number;
  revenueByDay: RevenueDataPoint[];
  ordersByStatus: OrderStatusDataPoint[];
  topProducts: AdminProduct[];
  recentOrders: AdminOrder[];
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

// ─── Status mapping ────────────────────────────────────────────────────────────

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'brand';

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  ACTIVE: 'success',
  PAID: 'success',
  FULFILLED: 'success',
  DRAFT: 'brand',
  PENDING: 'warning',
  UNFULFILLED: 'warning',
  PARTIALLY_FULFILLED: 'warning',
  REFUNDED: 'error',
  ARCHIVED: 'neutral',
  VOIDED: 'info',
};

function statusLabel(status: string): string {
  if (!status) return '—';
  return status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, ' ');
}

// ─── Build dashboard data from raw API responses ───────────────────────────────

function buildDashboardData(orders: AdminOrder[], products: AdminProduct[]): DashboardData {
  const totalRevenue = orders.reduce(
    (sum, o) => sum + parseFloat(o.currentTotalPriceSet.shopMoney.amount || '0'),
    0,
  );
  const totalOrders = orders.length;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const totalProducts = products.length;

  const now = new Date();
  const days7: RevenueDataPoint[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const label = getChartLabel(d.toISOString());
    const dayKey = d.toISOString().slice(0, 10);
    const dayRevenue = orders
      .filter((o) => o.createdAt.slice(0, 10) === dayKey)
      .reduce((s, o) => s + parseFloat(o.currentTotalPriceSet.shopMoney.amount || '0'), 0);
    days7.push({ date: label, revenue: dayRevenue });
  }

  const statusMap: Record<string, number> = {};
  for (const o of orders) {
    const s = o.displayFinancialStatus ?? 'OTHER';
    statusMap[s] = (statusMap[s] ?? 0) + 1;
  }
  const ordersByStatus: OrderStatusDataPoint[] = Object.entries(statusMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const topProducts = [...products]
    .sort((a, b) => {
      const totalA = a.variants.edges.reduce((s, e) => s + (e.node.inventoryQuantity ?? 0), 0);
      const totalB = b.variants.edges.reduce((s, e) => s + (e.node.inventoryQuantity ?? 0), 0);
      return totalB - totalA;
    })
    .slice(0, 5);

  const recentOrders = [...orders]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

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

// ─── Section Header (internal) ─────────────────────────────────────────────────

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
    <div
      className="flex items-center justify-between px-6 py-4"
      style={{ borderBottom: '1px solid var(--admin-border)' }}
    >
      <h2 className="admin-h2">{title}</h2>
      {href && (
        <Link
          href={href}
          className="text-sm flex items-center gap-1 transition-colors"
          style={{ color: 'var(--admin-brand)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '0.8';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '1';
          }}
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

  async function fetchDashboard() {
    setLoading(true);
    setError(null);
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

      const productsRes = await fetch('/api/admin/products?limit=50');
      let products: AdminProduct[] = [];
      if (productsRes.ok) {
        const { products: p } = (await productsRes.json()) as { products: AdminProduct[] };
        products = p ?? [];
      }

      const built = buildDashboardData(orders, products);
      built.totalProducts = stats.totalProducts;
      setData(built);
    } catch (err) {
      console.error('[AdminDashboard] fetch error:', err);
      setError('Failed to load dashboard data. Please refresh.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchDashboard();
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <AdminPageHeader
        title="Dashboard"
        subtitle="Welcome back — here's your store overview for the last 30 days."
      />

      {error && <AdminErrorState message={error} onRetry={fetchDashboard} />}

      {/* ── Row 1: KPI Cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {loading ? (
          <AdminSkeleton variant="stat" count={4} />
        ) : (
          <>
            <AdminStatCard
              label="Total Revenue"
              value={formatCurrency(data?.totalRevenue ?? 0)}
              icon="payments"
              color="var(--admin-brand)"
              subtitle="Last 30 days"
            />
            <AdminStatCard
              label="Total Orders"
              value={formatCount(data?.totalOrders ?? 0)}
              icon="shopping_bag"
              color="var(--admin-success)"
              subtitle="Last 30 days"
            />
            <AdminStatCard
              label="Avg Order Value"
              value={formatCurrency(data?.avgOrderValue ?? 0)}
              icon="trending_up"
              color="var(--admin-info)"
              subtitle="AOV · last 30 days"
            />
            <AdminStatCard
              label="Total Products"
              value={formatCount(data?.totalProducts ?? 0)}
              icon="inventory_2"
              color="var(--admin-warning)"
              subtitle="All variants included"
            />
          </>
        )}
      </div>

      {/* ── Row 2: Charts ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {loading ? (
          <AdminSkeleton variant="card" count={2} className="h-[300px]" />
        ) : (
          <>
            <AdminCard>
              <div className="mb-4">
                <h2 className="admin-h2">Revenue (Last 7 Days)</h2>
                <p className="admin-caption mt-0.5">Daily totals in USD</p>
              </div>
              <RevenueChart data={data?.revenueByDay ?? []} />
            </AdminCard>

            <AdminCard>
              <div className="mb-4">
                <h2 className="admin-h2">Orders by Status</h2>
                <p className="admin-caption mt-0.5">Financial status breakdown · last 30 days</p>
              </div>
              <OrderStatusChart data={data?.ordersByStatus ?? []} />
            </AdminCard>
          </>
        )}
      </div>

      {/* ── Row 3: Tables ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Products by Inventory */}
        <AdminCard padding="none">
          <SectionHeader title="Top Products by Inventory" href="/admin/products" />
          {loading ? (
            <div className="p-6 space-y-3">
              <AdminSkeleton variant="table-row" count={5} />
            </div>
          ) : !data?.topProducts.length ? (
            <AdminEmptyState icon="inventory_2" title="No products found" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--admin-border)' }}>
                    {['Product', 'Status', 'Stock'].map((h) => (
                      <th
                        key={h}
                        className="text-left text-xs font-medium uppercase tracking-wider px-6 py-3"
                        style={{ color: 'var(--admin-text-muted)' }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.topProducts.map((product) => {
                    const inventoryTotal = product.variants.edges.reduce(
                      (sum, e) => sum + (e.node.inventoryQuantity ?? 0),
                      0,
                    );
                    return (
                      <tr
                        key={product.id}
                        className="transition-colors"
                        style={{ borderBottom: '1px solid var(--admin-border)' }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'var(--admin-bg-hover)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-3">
                            {product.featuredImage ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={product.featuredImage.url}
                                alt={product.featuredImage.altText ?? product.title}
                                className="w-8 h-8 rounded-lg object-cover flex-none"
                                style={{ backgroundColor: 'var(--admin-bg-elevated)' }}
                              />
                            ) : (
                              <div
                                className="w-8 h-8 rounded-lg flex items-center justify-center flex-none"
                                style={{ backgroundColor: 'var(--admin-bg-elevated)' }}
                              >
                                <span
                                  className="material-symbols-outlined text-sm"
                                  style={{ color: 'var(--admin-text-disabled)' }}
                                >
                                  image
                                </span>
                              </div>
                            )}
                            <p
                              className="text-sm font-medium truncate max-w-[160px]"
                              style={{ color: 'var(--admin-text)' }}
                            >
                              {product.title}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-3">
                          <AdminBadge
                            variant={STATUS_VARIANT[product.status?.toUpperCase()] ?? 'neutral'}
                          >
                            {statusLabel(product.status)}
                          </AdminBadge>
                        </td>
                        <td className="px-6 py-3">
                          <span
                            className="text-sm font-medium"
                            style={{
                              color:
                                inventoryTotal === 0
                                  ? 'var(--admin-error)'
                                  : inventoryTotal < 10
                                    ? 'var(--admin-warning)'
                                    : 'var(--admin-success)',
                            }}
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
        </AdminCard>

        {/* Recent Orders */}
        <AdminCard padding="none">
          <SectionHeader title="Recent Orders" href="/admin/orders" />
          {loading ? (
            <div className="p-6 space-y-3">
              <AdminSkeleton variant="table-row" count={5} />
            </div>
          ) : !data?.recentOrders.length ? (
            <AdminEmptyState icon="shopping_bag" title="No orders in the last 30 days" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--admin-border)' }}>
                    {['Order', 'Total', 'Status', 'Date'].map((h) => (
                      <th
                        key={h}
                        className="text-left text-xs font-medium uppercase tracking-wider px-6 py-3"
                        style={{ color: 'var(--admin-text-muted)' }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.recentOrders.map((order) => {
                    const amount = parseFloat(order.currentTotalPriceSet.shopMoney.amount);
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
                        <td className="px-6 py-3">
                          <p className="text-sm font-medium" style={{ color: 'var(--admin-text)' }}>
                            {order.name}
                          </p>
                          {order.customer && (
                            <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                              {[order.customer.firstName, order.customer.lastName]
                                .filter(Boolean)
                                .join(' ') || order.customer.email}
                            </p>
                          )}
                        </td>
                        <td className="px-6 py-3">
                          <span
                            className="text-sm font-medium"
                            style={{ color: 'var(--admin-text-body)' }}
                          >
                            {formatCurrency(amount)}
                          </span>
                        </td>
                        <td className="px-6 py-3">
                          <AdminBadge
                            variant={
                              STATUS_VARIANT[order.displayFinancialStatus?.toUpperCase()] ??
                              'neutral'
                            }
                          >
                            {statusLabel(order.displayFinancialStatus)}
                          </AdminBadge>
                        </td>
                        <td className="px-6 py-3">
                          <span className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
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
        </AdminCard>
      </div>

      {/* ── Row 4: Inventory Alerts ──────────────────────────────────────── */}
      {!loading &&
        ((data?.outOfStockProducts?.length ?? 0) > 0 ||
          (data?.lowStockProducts?.length ?? 0) > 0) && (
          <div>
            <h2 className="admin-h2 mb-4">Inventory Alerts</h2>
            <div className="space-y-3">
              {data!.outOfStockProducts.map((product) => (
                <div
                  key={product.id}
                  className="rounded-xl px-5 py-4 flex items-center justify-between"
                  style={{
                    backgroundColor: 'var(--admin-error-bg)',
                    border: '1px solid color-mix(in srgb, var(--admin-error) 30%, transparent)',
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="material-symbols-outlined text-xl"
                      style={{ color: 'var(--admin-error)' }}
                    >
                      warning
                    </span>
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--admin-text)' }}>
                        {product.title}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--admin-error)' }}>
                        Out of stock
                      </p>
                    </div>
                  </div>
                  <Link
                    href={`/admin/products/${product.handle ?? product.id}`}
                    className="text-xs flex items-center gap-1 transition-colors"
                    style={{ color: 'var(--admin-error)' }}
                  >
                    Restock
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </Link>
                </div>
              ))}

              {data!.lowStockProducts.map((product) => {
                const stock = product.variants.edges.reduce(
                  (s, e) => s + (e.node.inventoryQuantity ?? 0),
                  0,
                );
                return (
                  <div
                    key={product.id}
                    className="rounded-xl px-5 py-4 flex items-center justify-between"
                    style={{
                      backgroundColor: 'var(--admin-warning-bg)',
                      border: '1px solid color-mix(in srgb, var(--admin-warning) 30%, transparent)',
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="material-symbols-outlined text-xl"
                        style={{ color: 'var(--admin-warning)' }}
                      >
                        inventory
                      </span>
                      <div>
                        <p className="text-sm font-medium" style={{ color: 'var(--admin-text)' }}>
                          {product.title}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--admin-warning)' }}>
                          Low stock — {stock} unit{stock !== 1 ? 's' : ''} remaining
                        </p>
                      </div>
                    </div>
                    <Link
                      href={`/admin/products/${product.handle ?? product.id}`}
                      className="text-xs flex items-center gap-1 transition-colors"
                      style={{ color: 'var(--admin-warning)' }}
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
        <h2 className="admin-h2 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              href: '/admin/products',
              icon: 'add_box',
              color: 'var(--admin-brand)',
              label: 'Add Product',
              desc: 'Create a new product listing',
            },
            {
              href: '/admin/collections',
              icon: 'collections_bookmark',
              color: 'var(--admin-info)',
              label: 'View Collections',
              desc: 'Browse all collections',
            },
            {
              href: '/admin/products?tab=inventory',
              icon: 'warehouse',
              color: 'var(--admin-success)',
              label: 'Check Inventory',
              desc: 'Manage stock levels',
            },
          ].map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="group flex items-center gap-4 rounded-2xl p-6 transition-all"
              style={{
                backgroundColor: 'var(--admin-bg-card)',
                border: '1px solid var(--admin-border)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = `color-mix(in srgb, ${action.color} 40%, transparent)`;
                e.currentTarget.style.backgroundColor = 'var(--admin-bg-elevated)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--admin-border)';
                e.currentTarget.style.backgroundColor = 'var(--admin-bg-card)';
              }}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center flex-none transition-colors"
                style={{
                  backgroundColor: `color-mix(in srgb, ${action.color} 10%, transparent)`,
                }}
              >
                <span
                  className="material-symbols-outlined text-2xl"
                  style={{ color: action.color }}
                >
                  {action.icon}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm" style={{ color: 'var(--admin-text)' }}>
                  {action.label}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>
                  {action.desc}
                </p>
              </div>
              <span
                className="material-symbols-outlined ml-auto transition-colors"
                style={{ color: 'var(--admin-text-disabled)' }}
              >
                arrow_forward
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
