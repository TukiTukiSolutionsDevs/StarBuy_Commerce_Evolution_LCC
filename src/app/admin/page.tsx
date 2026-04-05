/**
 * Admin Dashboard
 *
 * Server component — calls admin tools directly.
 * Shows stats cards, recent products, and quick actions.
 */

export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { searchProducts } from '@/lib/shopify/admin/tools/products';
import { listCollections } from '@/lib/shopify/admin/tools/collections';
import type { AdminProduct } from '@/lib/shopify/admin/tools/products';

// ─── Stats fetch ───────────────────────────────────────────────────────────────

async function getDashboardData() {
  try {
    const [products, collections] = await Promise.all([
      searchProducts('', 250),
      listCollections(50),
    ]);

    let totalInventoryUnits = 0;
    for (const product of products) {
      for (const edge of product.variants.edges) {
        const qty = edge.node.inventoryQuantity;
        if (typeof qty === 'number' && qty > 0) {
          totalInventoryUnits += qty;
        }
      }
    }

    const recentProducts = [...products]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);

    return {
      totalProducts: products.length,
      totalCollections: collections.length,
      totalInventoryUnits,
      recentProducts,
    };
  } catch {
    return {
      totalProducts: 0,
      totalCollections: 0,
      totalInventoryUnits: 0,
      recentProducts: [] as AdminProduct[],
    };
  }
}

// ─── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon,
  color,
  sub,
}: {
  label: string;
  value: string | number;
  icon: string;
  color: string;
  sub?: string;
}) {
  return (
    <div className="bg-[#111827] border border-[#1f2d4e] rounded-2xl p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="text-[#6b7280] text-sm font-medium">{label}</span>
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `${color}15` }}
        >
          <span
            className="material-symbols-outlined text-xl"
            style={{ color }}
          >
            {icon}
          </span>
        </div>
      </div>
      <div>
        <p
          className="text-3xl font-bold text-white"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          {value}
        </p>
        {sub && <p className="text-[#6b7280] text-xs mt-1">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Status Badge ───────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { color: string; bg: string }> = {
    ACTIVE: { color: '#10b981', bg: '#10b981' },
    DRAFT: { color: '#d4a843', bg: '#d4a843' },
    ARCHIVED: { color: '#6b7280', bg: '#6b7280' },
  };
  const s = map[status] ?? map.DRAFT;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
      style={{ backgroundColor: `${s.bg}15`, color: s.color }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: s.color }}
      />
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default async function AdminDashboardPage() {
  const data = await getDashboardData();

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1
          className="text-2xl font-bold text-white"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          Dashboard
        </h1>
        <p className="text-[#6b7280] text-sm mt-1">
          Welcome back — here&apos;s your store overview.
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Total Products"
          value={data.totalProducts}
          icon="inventory_2"
          color="#d4a843"
          sub="All variants included"
        />
        <StatCard
          label="Collections"
          value={data.totalCollections}
          icon="collections_bookmark"
          color="#1B2A5E"
          sub="Active collections"
        />
        <StatCard
          label="Inventory Units"
          value={data.totalInventoryUnits.toLocaleString()}
          icon="warehouse"
          color="#10b981"
          sub="Total available stock"
        />
        <StatCard
          label="Store Status"
          value="Online"
          icon="storefront"
          color="#10b981"
          sub="Headless Shopify"
        />
      </div>

      {/* Recent Products */}
      <div className="bg-[#111827] border border-[#1f2d4e] rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1f2d4e]">
          <h2
            className="text-white font-semibold"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Recent Products
          </h2>
          <Link
            href="/admin/products"
            className="text-[#d4a843] text-sm hover:text-[#e4c06a] transition-colors flex items-center gap-1"
          >
            View all
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </Link>
        </div>

        {data.recentProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <span className="material-symbols-outlined text-[#374151] text-4xl mb-3">inventory_2</span>
            <p className="text-[#6b7280] text-sm">No products found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1f2d4e]">
                  {['Product', 'Status', 'Price', 'Inventory', 'Created'].map((h) => (
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
                {data.recentProducts.map((product) => {
                  const price = product.priceRangeV2.minVariantPrice;
                  const inventoryTotal = product.variants.edges.reduce(
                    (sum, e) => sum + (e.node.inventoryQuantity ?? 0),
                    0
                  );

                  return (
                    <tr
                      key={product.id}
                      className="hover:bg-[#1f2d4e]/20 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {product.featuredImage ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={product.featuredImage.url}
                              alt={product.featuredImage.altText ?? product.title}
                              className="w-10 h-10 rounded-lg object-cover bg-[#1f2d4e] flex-none"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-[#1f2d4e] flex items-center justify-center flex-none">
                              <span className="material-symbols-outlined text-[#374151] text-base">
                                image
                              </span>
                            </div>
                          )}
                          <div>
                            <p className="text-white text-sm font-medium truncate max-w-[200px]">
                              {product.title}
                            </p>
                            {product.vendor && (
                              <p className="text-[#6b7280] text-xs">{product.vendor}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={product.status} />
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-[#e5e7eb] text-sm">
                          {parseFloat(price.amount) > 0
                            ? `${price.currencyCode} ${parseFloat(price.amount).toFixed(2)}`
                            : '—'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`text-sm font-medium ${
                            inventoryTotal === 0
                              ? 'text-[#ef4444]'
                              : inventoryTotal < 10
                              ? 'text-[#d4a843]'
                              : 'text-[#10b981]'
                          }`}
                        >
                          {inventoryTotal}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-[#6b7280] text-xs">
                          {new Date(product.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
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

      {/* Quick Actions */}
      <div>
        <h2
          className="text-white font-semibold mb-4"
          style={{ fontFamily: 'var(--font-heading)' }}
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
              <span className="material-symbols-outlined text-[#6b8cff] text-2xl">collections_bookmark</span>
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
