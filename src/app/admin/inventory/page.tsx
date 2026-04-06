'use client';

/**
 * Admin Inventory Page
 *
 * Full inventory management: stats, alerts, table with inline quantity editing.
 * Calls /api/admin/inventory — no direct Shopify calls from client.
 */

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useToast } from '@/components/ui/useToast';

// ─── Types ──────────────────────────────────────────────────────────────────────

type InventoryLevel = {
  location: {
    id: string;
    name: string;
  };
  quantities: Array<{
    name: string;
    quantity: number;
  }>;
};

type InventoryVariant = {
  variantId: string;
  variantTitle: string;
  inventoryItemId: string | null;
  inventoryQuantity: number;
  levels: InventoryLevel[];
};

type InventoryProduct = {
  id: string;
  title: string;
  handle: string;
  status: string;
  vendor: string;
  featuredImage: { url: string; altText: string | null } | null;
  variants: InventoryVariant[];
};

// Flat row model for the table
type InventoryRow = {
  productId: string;
  productTitle: string;
  productImage: { url: string; altText: string | null } | null;
  variantId: string;
  variantTitle: string;
  inventoryItemId: string | null;
  available: number;
  onHand: number;
  committed: number;
  locationId: string;
  locationName: string;
};

type StockFilter = 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';
type SortField = 'product' | 'variant' | 'available' | 'on_hand' | 'committed';
type SortDir = 'asc' | 'desc';

// ─── Helpers ────────────────────────────────────────────────────────────────────

function getQty(levels: InventoryLevel[], name: string): number {
  for (const level of levels) {
    const q = level.quantities.find((q) => q.name === name);
    if (q) return q.quantity;
  }
  return 0;
}

function stockStatus(qty: number): 'in_stock' | 'low_stock' | 'out_of_stock' {
  if (qty === 0) return 'out_of_stock';
  if (qty <= 10) return 'low_stock';
  return 'in_stock';
}

function flattenProducts(products: InventoryProduct[]): InventoryRow[] {
  const rows: InventoryRow[] = [];
  for (const p of products) {
    for (const v of p.variants) {
      if (v.levels.length === 0) {
        // No location data — still show with inventoryQuantity
        rows.push({
          productId: p.id,
          productTitle: p.title,
          productImage: p.featuredImage,
          variantId: v.variantId,
          variantTitle: v.variantTitle,
          inventoryItemId: v.inventoryItemId,
          available: v.inventoryQuantity,
          onHand: v.inventoryQuantity,
          committed: 0,
          locationId: '',
          locationName: '—',
        });
      } else {
        for (const level of v.levels) {
          rows.push({
            productId: p.id,
            productTitle: p.title,
            productImage: p.featuredImage,
            variantId: v.variantId,
            variantTitle: v.variantTitle,
            inventoryItemId: v.inventoryItemId,
            available: getQty([level], 'available'),
            onHand: getQty([level], 'on_hand'),
            committed: getQty([level], 'committed'),
            locationId: level.location.id,
            locationName: level.location.name,
          });
        }
      }
    }
  }
  return rows;
}

// ─── Stock Badge ────────────────────────────────────────────────────────────────

function StockBadge({ qty }: { qty: number }) {
  const status = stockStatus(qty);
  const map = {
    in_stock: { color: '#10b981', label: 'In Stock' },
    low_stock: { color: '#d4a843', label: 'Low Stock' },
    out_of_stock: { color: '#ef4444', label: 'Out of Stock' },
  };
  const { color, label } = map[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ backgroundColor: `${color}15`, color }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

// ─── Qty Color ──────────────────────────────────────────────────────────────────

function QtyText({ qty }: { qty: number }) {
  const color = qty === 0 ? 'text-[#ef4444]' : qty <= 10 ? 'text-[#d4a843]' : 'text-[#10b981]';
  return <span className={`text-sm font-semibold tabular-nums ${color}`}>{qty}</span>;
}

// ─── Stat Card ──────────────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  color,
  onClick,
  active,
}: {
  icon: string;
  label: string;
  value: number;
  color: string;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 min-w-[150px] bg-[#111827] border rounded-2xl p-5 text-left transition-all ${
        active
          ? 'border-[#d4a843]/40 ring-1 ring-[#d4a843]/20'
          : 'border-[#1f2d4e] hover:border-[#263d6e]'
      } ${onClick ? 'cursor-pointer' : 'cursor-default'}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[#6b7280] text-xs font-medium uppercase tracking-wider mb-1">
            {label}
          </p>
          <p className="text-white text-2xl font-bold tabular-nums">{value}</p>
        </div>
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-none"
          style={{ backgroundColor: `${color}15` }}
        >
          <span className="material-symbols-outlined text-xl" style={{ color }}>
            {icon}
          </span>
        </div>
      </div>
    </button>
  );
}

// ─── Alert Card ─────────────────────────────────────────────────────────────────

function AlertCard({
  row,
  onUpdate,
}: {
  row: InventoryRow;
  onUpdate: (row: InventoryRow) => void;
}) {
  const isOutOfStock = row.available === 0;
  const color = isOutOfStock ? '#ef4444' : '#d4a843';
  const bg = isOutOfStock ? 'bg-[#ef4444]/5' : 'bg-[#d4a843]/5';
  const border = isOutOfStock ? 'border-l-[#ef4444]' : 'border-l-[#d4a843]';

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-xl border border-[#1f2d4e] border-l-2 ${border} ${bg}`}
    >
      {row.productImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={row.productImage.url}
          alt={row.productImage.altText ?? row.productTitle}
          className="w-10 h-10 rounded-lg object-cover bg-[#1f2d4e] flex-none"
        />
      ) : (
        <div className="w-10 h-10 rounded-lg bg-[#1f2d4e] flex items-center justify-center flex-none">
          <span className="material-symbols-outlined text-[#374151] text-base">image</span>
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium line-clamp-1">{row.productTitle}</p>
        <p className="text-[#6b7280] text-xs">
          {row.variantTitle !== 'Default Title' ? row.variantTitle : 'Default Variant'} ·{' '}
          <span style={{ color }} className="font-semibold">
            {row.available} units
          </span>
        </p>
      </div>
      <button
        onClick={() => onUpdate(row)}
        className="flex-none flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
        style={{
          backgroundColor: `${color}15`,
          color,
        }}
      >
        <span className="material-symbols-outlined text-sm">edit</span>
        Update
      </button>
    </div>
  );
}

// ─── Inline Qty Editor ───────────────────────────────────────────────────────────

function QtyEditor({
  row,
  onSave,
  onCancel,
  saving,
}: {
  row: InventoryRow;
  onSave: (
    inventoryItemId: string,
    locationId: string,
    value: number,
    mode: 'set' | 'adjust',
  ) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
}) {
  const [mode, setMode] = useState<'set' | 'adjust'>('set');
  const [value, setValue] = useState(mode === 'set' ? String(row.available) : '0');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  function handleModeChange(m: 'set' | 'adjust') {
    setMode(m);
    setValue(m === 'set' ? String(row.available) : '0');
  }

  async function handleSave() {
    const num = parseInt(value, 10);
    if (isNaN(num)) return;
    if (!row.inventoryItemId || !row.locationId) return;
    await onSave(row.inventoryItemId, row.locationId, num, mode);
  }

  const canSave = !isNaN(parseInt(value, 10)) && !!row.inventoryItemId && !!row.locationId;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Mode toggle */}
      <div className="flex rounded-lg overflow-hidden border border-[#1f2d4e] text-xs">
        {(['set', 'adjust'] as const).map((m) => (
          <button
            key={m}
            onClick={() => handleModeChange(m)}
            className={`px-2.5 py-1 font-medium transition-colors ${
              mode === m
                ? 'bg-[#d4a843]/20 text-[#d4a843]'
                : 'bg-[#0f1729] text-[#6b7280] hover:text-[#9ca3af]'
            }`}
          >
            {m === 'set' ? 'Set to' : 'Adjust by'}
          </button>
        ))}
      </div>

      {/* Spinner buttons + input */}
      <div className="flex items-center gap-0.5">
        <button
          onClick={() => setValue((v) => String((parseInt(v, 10) || 0) - 1))}
          className="w-7 h-7 rounded-l-lg bg-[#1f2d4e] hover:bg-[#263d6e] text-[#9ca3af] flex items-center justify-center text-sm transition-colors"
        >
          <span className="material-symbols-outlined text-sm">remove</span>
        </button>
        <input
          ref={inputRef}
          type="number"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && canSave) handleSave();
            if (e.key === 'Escape') onCancel();
          }}
          className="w-16 bg-[#0f1729] border-y border-[#1f2d4e] focus:border-[#d4a843] text-white text-center text-sm py-1 outline-none tabular-nums"
        />
        <button
          onClick={() => setValue((v) => String((parseInt(v, 10) || 0) + 1))}
          className="w-7 h-7 rounded-r-lg bg-[#1f2d4e] hover:bg-[#263d6e] text-[#9ca3af] flex items-center justify-center text-sm transition-colors"
        >
          <span className="material-symbols-outlined text-sm">add</span>
        </button>
      </div>

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={!canSave || saving}
        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#d4a843]/15 hover:bg-[#d4a843]/25 disabled:opacity-40 disabled:cursor-not-allowed text-[#d4a843] text-xs font-medium transition-colors"
      >
        {saving ? (
          <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
        ) : (
          <span className="material-symbols-outlined text-sm">check</span>
        )}
        Save
      </button>

      {/* Cancel */}
      <button
        onClick={onCancel}
        className="w-7 h-7 rounded-lg bg-[#1f2d4e] hover:bg-[#263d6e] text-[#6b7280] hover:text-white flex items-center justify-center transition-colors"
      >
        <span className="material-symbols-outlined text-sm">close</span>
      </button>
    </div>
  );
}

// ─── Sort Header ────────────────────────────────────────────────────────────────

function SortTh({
  field,
  label,
  activeField,
  direction,
  onSort,
  className,
}: {
  field: SortField;
  label: string;
  activeField: SortField | null;
  direction: SortDir;
  onSort: (f: SortField) => void;
  className?: string;
}) {
  const isActive = activeField === field;
  return (
    <th
      onClick={() => onSort(field)}
      className={`text-left text-xs font-medium uppercase tracking-wider px-4 py-3 cursor-pointer select-none group ${className ?? ''}`}
    >
      <span
        className={`inline-flex items-center gap-1 transition-colors ${
          isActive ? 'text-[#d4a843]' : 'text-[#6b7280] group-hover:text-[#9ca3af]'
        }`}
      >
        {label}
        <span className="material-symbols-outlined text-sm">
          {isActive ? (direction === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more'}
        </span>
      </span>
    </th>
  );
}

// ─── Skeleton Row ────────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr className="border-b border-[#1f2d4e]">
      {[180, 100, 60, 60, 60, 100, 80].map((w, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-[#1f2d4e] rounded animate-pulse" style={{ width: `${w}px` }} />
        </td>
      ))}
    </tr>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────────

const STOCK_FILTERS: { value: StockFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'in_stock', label: 'In Stock' },
  { value: 'low_stock', label: 'Low Stock' },
  { value: 'out_of_stock', label: 'Out of Stock' },
];

const PAGE_SIZE = 50;

export default function InventoryPage() {
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rows, setRows] = useState<InventoryRow[]>([]);

  const [search, setSearch] = useState('');
  const [stockFilter, setStockFilter] = useState<StockFilter>('all');
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(1);

  const [alertsOpen, setAlertsOpen] = useState(true);

  // Editing state: key = `${variantId}::${locationId}`
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  // ── Fetch ─────────────────────────────────────────────────────────────────────

  const fetchInventory = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/inventory');
      const data = (await res.json()) as {
        products?: InventoryProduct[];
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? 'Failed to load');
      const flat = flattenProducts(data.products ?? []);
      setRows(flat);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load inventory');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  // ── Stats ─────────────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    // Deduplicate by variantId to count SKUs
    const uniqueVariants = new Map<string, InventoryRow>();
    for (const r of rows) {
      if (!uniqueVariants.has(r.variantId)) {
        uniqueVariants.set(r.variantId, r);
      }
    }
    const variants = Array.from(uniqueVariants.values());

    return {
      totalSKUs: variants.length,
      inStock: variants.filter((v) => v.available > 10).length,
      lowStock: variants.filter((v) => v.available > 0 && v.available <= 10).length,
      outOfStock: variants.filter((v) => v.available === 0).length,
    };
  }, [rows]);

  // ── Alert rows ────────────────────────────────────────────────────────────────

  const alertRows = useMemo(() => {
    const seen = new Set<string>();
    const out: InventoryRow[] = [];
    const low: InventoryRow[] = [];

    for (const r of rows) {
      if (seen.has(r.variantId)) continue;
      seen.add(r.variantId);
      if (r.available === 0) out.push(r);
      else if (r.available <= 10) low.push(r);
    }

    return { out, low };
  }, [rows]);

  // ── Filtered + sorted rows ────────────────────────────────────────────────────

  const filteredRows = useMemo(() => {
    let result = rows;

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (r) => r.productTitle.toLowerCase().includes(q) || r.variantTitle.toLowerCase().includes(q),
      );
    }

    if (stockFilter !== 'all') {
      result = result.filter((r) => stockStatus(r.available) === stockFilter);
    }

    if (sortField) {
      result = [...result].sort((a, b) => {
        let cmp = 0;
        if (sortField === 'product') cmp = a.productTitle.localeCompare(b.productTitle);
        else if (sortField === 'variant') cmp = a.variantTitle.localeCompare(b.variantTitle);
        else if (sortField === 'available') cmp = a.available - b.available;
        else if (sortField === 'on_hand') cmp = a.onHand - b.onHand;
        else if (sortField === 'committed') cmp = a.committed - b.committed;
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }

    return result;
  }, [rows, search, stockFilter, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const pagedRows = filteredRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
    setPage(1);
  }

  // ── Inventory update ──────────────────────────────────────────────────────────

  async function handleSave(
    inventoryItemId: string,
    locationId: string,
    value: number,
    mode: 'set' | 'adjust',
  ) {
    const key = `${inventoryItemId}::${locationId}`;
    setSavingKey(key);
    try {
      const body =
        mode === 'set'
          ? { inventoryItemId, locationId, quantity: value }
          : { inventoryItemId, locationId, delta: value };

      const res = await fetch('/api/admin/inventory', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = (await res.json()) as { success?: boolean; message?: string; error?: string };

      if (!res.ok) throw new Error(data.error ?? 'Update failed');

      toast.success(data.message ?? 'Inventory updated');
      setEditingKey(null);
      // Refresh data
      await fetchInventory();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update inventory');
    } finally {
      setSavingKey(null);
    }
  }

  function startEdit(row: InventoryRow) {
    const key = `${row.inventoryItemId ?? row.variantId}::${row.locationId}`;
    setEditingKey(key);
  }

  function rowEditKey(row: InventoryRow) {
    return `${row.inventoryItemId ?? row.variantId}::${row.locationId}`;
  }

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1
            className="text-2xl font-bold text-white"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Inventory
          </h1>
          <p className="text-[#6b7280] text-sm mt-1">
            {loading
              ? 'Loading…'
              : `${stats.totalSKUs} SKU${stats.totalSKUs !== 1 ? 's' : ''} across all locations`}
          </p>
        </div>
        <button
          onClick={fetchInventory}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#1f2d4e] bg-[#111827] hover:border-[#263d6e] text-[#9ca3af] hover:text-white text-sm font-medium transition-all disabled:opacity-50"
        >
          <span className={`material-symbols-outlined text-base ${loading ? 'animate-spin' : ''}`}>
            refresh
          </span>
          Refresh
        </button>
      </div>

      {/* ── Stats Row ─────────────────────────────────────────────────────────── */}
      <div className="flex gap-4 flex-wrap">
        <StatCard
          icon="package_2"
          label="Total SKUs"
          value={stats.totalSKUs}
          color="#6366f1"
          onClick={() => {
            setStockFilter('all');
            setPage(1);
          }}
          active={stockFilter === 'all'}
        />
        <StatCard
          icon="check_circle"
          label="In Stock"
          value={stats.inStock}
          color="#10b981"
          onClick={() => {
            setStockFilter('in_stock');
            setPage(1);
          }}
          active={stockFilter === 'in_stock'}
        />
        <StatCard
          icon="warning"
          label="Low Stock"
          value={stats.lowStock}
          color="#d4a843"
          onClick={() => {
            setStockFilter('low_stock');
            setPage(1);
          }}
          active={stockFilter === 'low_stock'}
        />
        <StatCard
          icon="error"
          label="Out of Stock"
          value={stats.outOfStock}
          color="#ef4444"
          onClick={() => {
            setStockFilter('out_of_stock');
            setPage(1);
          }}
          active={stockFilter === 'out_of_stock'}
        />
      </div>

      {/* ── Alerts Section ────────────────────────────────────────────────────── */}
      {!loading && (alertRows.out.length > 0 || alertRows.low.length > 0) && (
        <div className="bg-[#111827] border border-[#1f2d4e] rounded-2xl overflow-hidden">
          <button
            onClick={() => setAlertsOpen((v) => !v)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#1f2d4e]/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[#d4a843] text-xl">
                notifications_active
              </span>
              <span
                className="text-white font-semibold text-sm"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                Stock Alerts
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-[#ef4444]/15 text-[#ef4444] font-medium">
                {alertRows.out.length} out
              </span>
              {alertRows.low.length > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-[#d4a843]/15 text-[#d4a843] font-medium">
                  {alertRows.low.length} low
                </span>
              )}
            </div>
            <span className="material-symbols-outlined text-[#6b7280] text-xl">
              {alertsOpen ? 'expand_less' : 'expand_more'}
            </span>
          </button>

          {alertsOpen && (
            <div className="px-5 pb-5 space-y-4">
              {/* Out of stock */}
              {alertRows.out.length > 0 && (
                <div>
                  <p className="text-[#ef4444] text-xs font-semibold uppercase tracking-wider mb-2">
                    Out of Stock ({alertRows.out.length})
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {alertRows.out.map((r) => (
                      <AlertCard
                        key={`${r.variantId}-${r.locationId}`}
                        row={r}
                        onUpdate={startEdit}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Low stock */}
              {alertRows.low.length > 0 && (
                <div>
                  <p className="text-[#d4a843] text-xs font-semibold uppercase tracking-wider mb-2">
                    Low Stock ≤ 10 units ({alertRows.low.length})
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {alertRows.low.map((r) => (
                      <AlertCard
                        key={`${r.variantId}-${r.locationId}`}
                        row={r}
                        onUpdate={startEdit}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Filters ───────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-[#374151] text-xl">
            search
          </span>
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search products or variants…"
            className="w-full bg-[#111827] border border-[#1f2d4e] focus:border-[#d4a843] focus:ring-1 focus:ring-[#d4a843] text-white placeholder-[#374151] rounded-xl pl-12 pr-4 py-2.5 text-sm outline-none transition-colors"
          />
          {search && (
            <button
              onClick={() => {
                setSearch('');
                setPage(1);
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[#374151] hover:text-white transition-colors"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          )}
        </div>

        {/* Stock filter tabs */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {STOCK_FILTERS.map(({ value, label }) => {
            const counts = {
              all: rows.length,
              in_stock: rows.filter((r) => stockStatus(r.available) === 'in_stock').length,
              low_stock: rows.filter((r) => stockStatus(r.available) === 'low_stock').length,
              out_of_stock: rows.filter((r) => stockStatus(r.available) === 'out_of_stock').length,
            };
            return (
              <button
                key={value}
                onClick={() => {
                  setStockFilter(value);
                  setPage(1);
                }}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                  stockFilter === value
                    ? 'bg-[#d4a843]/10 text-[#d4a843] border border-[#d4a843]/30'
                    : 'bg-[#111827] border border-[#1f2d4e] text-[#6b7280] hover:text-[#9ca3af] hover:border-[#374151]'
                }`}
              >
                {label}
                <span
                  className={`text-xs px-1.5 py-0.5 rounded-full ${
                    stockFilter === value
                      ? 'bg-[#d4a843]/20 text-[#d4a843]'
                      : 'bg-[#1f2d4e] text-[#374151]'
                  }`}
                >
                  {counts[value]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Table ────────────────────────────────────────────────────────────── */}
      <div className="bg-[#111827] border border-[#1f2d4e] rounded-2xl overflow-hidden">
        {error ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="material-symbols-outlined text-[#ef4444] text-4xl mb-3">error</span>
            <p className="text-[#ef4444] text-sm">{error}</p>
            <button
              onClick={fetchInventory}
              className="mt-4 text-[#d4a843] text-sm hover:text-[#e4c06a] transition-colors"
            >
              Try again
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1f2d4e] bg-[#0d1526]">
                  <SortTh
                    field="product"
                    label="Product"
                    activeField={sortField}
                    direction={sortDir}
                    onSort={handleSort}
                    className="pl-5"
                  />
                  <SortTh
                    field="variant"
                    label="Variant"
                    activeField={sortField}
                    direction={sortDir}
                    onSort={handleSort}
                  />
                  <SortTh
                    field="available"
                    label="Available"
                    activeField={sortField}
                    direction={sortDir}
                    onSort={handleSort}
                  />
                  <SortTh
                    field="on_hand"
                    label="On Hand"
                    activeField={sortField}
                    direction={sortDir}
                    onSort={handleSort}
                  />
                  <SortTh
                    field="committed"
                    label="Committed"
                    activeField={sortField}
                    direction={sortDir}
                    onSort={handleSort}
                  />
                  <th className="text-left text-xs font-medium uppercase tracking-wider px-4 py-3 text-[#6b7280]">
                    Location
                  </th>
                  <th className="text-right text-xs font-medium uppercase tracking-wider px-4 py-3 text-[#6b7280]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1f2d4e]">
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
                ) : pagedRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-16">
                      <div className="flex flex-col items-center gap-3">
                        <span className="material-symbols-outlined text-[#374151] text-4xl">
                          warehouse
                        </span>
                        <p className="text-[#6b7280] text-sm">
                          {search
                            ? 'No results match your search'
                            : stockFilter !== 'all'
                              ? `No ${stockFilter.replace('_', ' ')} items`
                              : 'No inventory data'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  pagedRows.map((row) => {
                    const key = rowEditKey(row);
                    const isEditing = editingKey === key;
                    const isSaving = savingKey === key;

                    return (
                      <tr
                        key={`${row.variantId}-${row.locationId}`}
                        className={`transition-colors ${
                          isEditing ? 'bg-[#d4a843]/5' : 'hover:bg-[#1f2d4e]/20'
                        }`}
                      >
                        {/* Product */}
                        <td className="px-4 pl-5 py-3">
                          <div className="flex items-center gap-3">
                            {row.productImage ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={row.productImage.url}
                                alt={row.productImage.altText ?? row.productTitle}
                                className="w-9 h-9 rounded-lg object-cover bg-[#1f2d4e] flex-none"
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-lg bg-[#1f2d4e] flex items-center justify-center flex-none">
                                <span className="material-symbols-outlined text-[#374151] text-sm">
                                  image
                                </span>
                              </div>
                            )}
                            <p className="text-white text-sm font-medium line-clamp-1 max-w-[180px]">
                              {row.productTitle}
                            </p>
                          </div>
                        </td>

                        {/* Variant */}
                        <td className="px-4 py-3">
                          <span className="text-[#9ca3af] text-sm">
                            {row.variantTitle === 'Default Title' ? '—' : row.variantTitle}
                          </span>
                        </td>

                        {/* Available — editable */}
                        <td className="px-4 py-3">
                          {isEditing ? (
                            <QtyEditor
                              row={row}
                              onSave={handleSave}
                              onCancel={() => setEditingKey(null)}
                              saving={isSaving}
                            />
                          ) : (
                            <button
                              onClick={() => startEdit(row)}
                              className="group flex items-center gap-1.5 hover:text-[#d4a843] transition-colors"
                              title="Click to edit"
                            >
                              <QtyText qty={row.available} />
                              <span className="material-symbols-outlined text-sm text-[#374151] opacity-0 group-hover:opacity-80 transition-opacity">
                                edit
                              </span>
                            </button>
                          )}
                        </td>

                        {/* On Hand */}
                        <td className="px-4 py-3">
                          <span className="text-[#9ca3af] text-sm tabular-nums">{row.onHand}</span>
                        </td>

                        {/* Committed */}
                        <td className="px-4 py-3">
                          <span className="text-[#9ca3af] text-sm tabular-nums">
                            {row.committed}
                          </span>
                        </td>

                        {/* Location */}
                        <td className="px-4 py-3">
                          <span className="text-[#6b7280] text-xs">{row.locationName}</span>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <StockBadge qty={row.available} />
                            {!isEditing && (
                              <button
                                onClick={() => startEdit(row)}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#1f2d4e] hover:bg-[#263d6e] text-[#9ca3af] hover:text-white text-xs font-medium transition-all"
                              >
                                <span className="material-symbols-outlined text-sm">edit</span>
                                Update
                              </button>
                            )}
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

        {/* Pagination */}
        {!loading && !error && totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-[#1f2d4e]">
            <span className="text-[#6b7280] text-xs">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filteredRows.length)}{' '}
              of {filteredRows.length} rows
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="w-8 h-8 rounded-lg bg-[#1f2d4e] hover:bg-[#263d6e] disabled:opacity-30 disabled:cursor-not-allowed text-[#9ca3af] flex items-center justify-center transition-colors"
              >
                <span className="material-symbols-outlined text-sm">chevron_left</span>
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                      p === page
                        ? 'bg-[#d4a843]/15 text-[#d4a843] border border-[#d4a843]/30'
                        : 'bg-[#1f2d4e] text-[#6b7280] hover:text-white hover:bg-[#263d6e]'
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="w-8 h-8 rounded-lg bg-[#1f2d4e] hover:bg-[#263d6e] disabled:opacity-30 disabled:cursor-not-allowed text-[#9ca3af] flex items-center justify-center transition-colors"
              >
                <span className="material-symbols-outlined text-sm">chevron_right</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
