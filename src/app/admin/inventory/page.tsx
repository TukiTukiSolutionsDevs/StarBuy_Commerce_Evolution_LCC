'use client';

/**
 * Admin Inventory Page
 *
 * Full inventory management: stats, alerts, table with modal quantity editing,
 * bulk update, CSV export, location filter, SKU/barcode, tracked indicator.
 * Calls /api/admin/inventory — no direct Shopify calls from client.
 */

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useToast } from '@/components/ui/useToast';
import type { InventoryAdjustmentReason } from '@/lib/shopify/admin/tools/inventory';

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
  sku: string;
  barcode: string | null;
  tracked: boolean;
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
  sku: string;
  barcode: string | null;
  tracked: boolean;
  inventoryItemId: string | null;
  available: number;
  onHand: number;
  committed: number;
  incoming: number;
  locationId: string;
  locationName: string;
};

type StockFilter = 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';
type SortField = 'product' | 'sku' | 'variant' | 'available' | 'on_hand' | 'committed';
type SortDir = 'asc' | 'desc';

// Adjustment modal data — either single row or bulk
type AdjustTarget = { type: 'single'; row: InventoryRow } | { type: 'bulk'; rows: InventoryRow[] };

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
          sku: v.sku ?? '',
          barcode: v.barcode ?? null,
          tracked: v.tracked ?? true,
          inventoryItemId: v.inventoryItemId,
          available: v.inventoryQuantity,
          onHand: v.inventoryQuantity,
          committed: 0,
          incoming: 0,
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
            sku: v.sku ?? '',
            barcode: v.barcode ?? null,
            tracked: v.tracked ?? true,
            inventoryItemId: v.inventoryItemId,
            available: getQty([level], 'available'),
            onHand: getQty([level], 'on_hand'),
            committed: getQty([level], 'committed'),
            incoming: getQty([level], 'incoming'),
            locationId: level.location.id,
            locationName: level.location.name,
          });
        }
      }
    }
  }
  return rows;
}

function exportToCsv(rows: InventoryRow[]) {
  const headers = [
    'Product',
    'SKU',
    'Barcode',
    'Variant',
    'Available',
    'On Hand',
    'Committed',
    'Incoming',
    'Location',
    'Status',
  ];
  const escape = (v: string | number | null) => {
    const s = String(v ?? '');
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  const lines = [
    headers.join(','),
    ...rows.map((r) =>
      [
        escape(r.productTitle),
        escape(r.sku),
        escape(r.barcode),
        escape(r.variantTitle === 'Default Title' ? '—' : r.variantTitle),
        r.available,
        r.onHand,
        r.committed,
        r.incoming,
        escape(r.locationName),
        escape(
          r.tracked
            ? r.available === 0
              ? 'Out of Stock'
              : r.available <= 10
                ? 'Low Stock'
                : 'In Stock'
            : 'Not Tracked',
        ),
      ].join(','),
    ),
  ].join('\n');

  const blob = new Blob([lines], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const date = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `inventory-export-${date}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Reason options ──────────────────────────────────────────────────────────────

const REASON_OPTIONS: { value: InventoryAdjustmentReason; label: string }[] = [
  { value: 'correction', label: 'Correction' },
  { value: 'cycle_count_available', label: 'Cycle count' },
  { value: 'damaged', label: 'Damaged' },
  { value: 'promotion_or_exchange', label: 'Promotion / Exchange' },
  { value: 'received', label: 'Received' },
  { value: 'restock', label: 'Restock' },
  { value: 'safety_stock', label: 'Safety stock' },
  { value: 'shrinkage', label: 'Shrinkage' },
  { value: 'quality_control', label: 'Quality control' },
  { value: 'other', label: 'Other' },
];

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

function NotTrackedBadge() {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ backgroundColor: '#6b728020', color: '#6b7280' }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#6b7280' }} />
      Not tracked
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
          <p className="text-white text-2xl font-bold tabular-nums" style={{ color: '#ffffff' }}>
            {value}
          </p>
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

// ─── Adjustment Modal ────────────────────────────────────────────────────────────

function AdjustmentModal({
  target,
  onSave,
  onClose,
  saving,
}: {
  target: AdjustTarget;
  onSave: (
    params: {
      inventoryItemId: string;
      locationId: string;
      value: number;
      mode: 'set' | 'adjust';
      reason: InventoryAdjustmentReason;
      note: string;
    }[],
  ) => Promise<void>;
  onClose: () => void;
  saving: boolean;
}) {
  const [mode, setMode] = useState<'set' | 'adjust'>('set');
  const [value, setValue] = useState('0');
  const [reason, setReason] = useState<InventoryAdjustmentReason>('correction');
  const [note, setNote] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const isBulk = target.type === 'bulk';
  const singleRow = target.type === 'single' ? target.row : null;
  const rows = target.type === 'bulk' ? target.rows : [target.row];

  // For single row, initialise set value to current available
  useEffect(() => {
    if (singleRow && mode === 'set') {
      setValue(String(singleRow.available));
    } else if (mode === 'adjust') {
      setValue('0');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const numValue = parseInt(value, 10);
  const isValid = !isNaN(numValue) && rows.every((r) => r.inventoryItemId && r.locationId);

  function previewQty(currentAvailable: number): number {
    if (isNaN(numValue)) return currentAvailable;
    return mode === 'set' ? numValue : currentAvailable + numValue;
  }

  async function handleSave() {
    if (!isValid || saving) return;
    const params = rows
      .filter((r) => r.inventoryItemId && r.locationId)
      .map((r) => ({
        inventoryItemId: r.inventoryItemId!,
        locationId: r.locationId,
        value: numValue,
        mode,
        reason,
        note,
      }));
    await onSave(params);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-lg bg-[#111827] border border-[#1f2d4e] rounded-2xl shadow-2xl flex flex-col"
        style={{ maxHeight: '90vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1f2d4e]">
          <div>
            <h2
              className="text-base font-semibold"
              style={{ color: '#ffffff', fontFamily: 'var(--font-heading)' }}
            >
              {isBulk
                ? `Update ${rows.length} items`
                : singleRow
                  ? 'Update inventory'
                  : 'Update inventory'}
            </h2>
            {!isBulk && singleRow && (
              <p className="text-[#6b7280] text-xs mt-0.5">
                {singleRow.productTitle}
                {singleRow.variantTitle !== 'Default Title' ? ` · ${singleRow.variantTitle}` : ''}
                {singleRow.locationName !== '—' ? ` · ${singleRow.locationName}` : ''}
              </p>
            )}
            {isBulk && (
              <p className="text-[#6b7280] text-xs mt-0.5">
                {rows.length} variant{rows.length !== 1 ? 's' : ''} selected
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-[#1f2d4e] hover:bg-[#263d6e] text-[#6b7280] hover:text-white flex items-center justify-center transition-colors"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          {/* Current stock — single only */}
          {!isBulk && singleRow && (
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Available', value: singleRow.available, color: '#10b981' },
                { label: 'On Hand', value: singleRow.onHand, color: '#9ca3af' },
                { label: 'Committed', value: singleRow.committed, color: '#6b7280' },
              ].map(({ label, value: v, color }) => (
                <div
                  key={label}
                  className="bg-[#0a0f1e] border border-[#1f2d4e] rounded-xl p-3 text-center"
                >
                  <p className="text-[#6b7280] text-xs mb-1">{label}</p>
                  <p className="text-lg font-bold tabular-nums" style={{ color }}>
                    {v}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Mode toggle */}
          <div>
            <p className="text-[#6b7280] text-xs font-medium uppercase tracking-wider mb-2">
              Adjustment type
            </p>
            <div className="flex rounded-xl overflow-hidden border border-[#1f2d4e]">
              {(['set', 'adjust'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
                    mode === m
                      ? 'bg-[#d4a843]/15 text-[#d4a843]'
                      : 'bg-[#0a0f1e] text-[#6b7280] hover:text-[#9ca3af]'
                  }`}
                >
                  {m === 'set' ? 'Set to' : 'Adjust by'}
                </button>
              ))}
            </div>
          </div>

          {/* Quantity input */}
          <div>
            <p className="text-[#6b7280] text-xs font-medium uppercase tracking-wider mb-2">
              {mode === 'set' ? 'New quantity' : 'Delta (+ or −)'}
            </p>
            <div className="flex items-center gap-0">
              <button
                onClick={() => setValue((v) => String((parseInt(v, 10) || 0) - 1))}
                className="w-10 h-10 rounded-l-xl bg-[#1f2d4e] hover:bg-[#263d6e] text-[#9ca3af] flex items-center justify-center text-sm transition-colors border border-[#1f2d4e]"
              >
                <span className="material-symbols-outlined text-sm">remove</span>
              </button>
              <input
                ref={inputRef}
                type="number"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && isValid) handleSave();
                  if (e.key === 'Escape') onClose();
                }}
                className="flex-1 h-10 bg-[#0a0f1e] border-y border-[#1f2d4e] focus:border-[#d4a843] text-white text-center text-base font-semibold outline-none tabular-nums transition-colors"
                style={{ color: '#ffffff' }}
              />
              <button
                onClick={() => setValue((v) => String((parseInt(v, 10) || 0) + 1))}
                className="w-10 h-10 rounded-r-xl bg-[#1f2d4e] hover:bg-[#263d6e] text-[#9ca3af] flex items-center justify-center text-sm transition-colors border border-[#1f2d4e]"
              >
                <span className="material-symbols-outlined text-sm">add</span>
              </button>
            </div>
          </div>

          {/* Preview — single row only */}
          {!isBulk && singleRow && !isNaN(numValue) && (
            <div
              className="flex items-center gap-3 px-4 py-3 rounded-xl border"
              style={{
                backgroundColor: '#d4a84308',
                borderColor: '#d4a84330',
              }}
            >
              <span className="material-symbols-outlined text-[#d4a843] text-base">preview</span>
              <p className="text-sm" style={{ color: '#e5e7eb' }}>
                Available will be:{' '}
                <strong style={{ color: '#d4a843' }}>{previewQty(singleRow.available)}</strong>{' '}
                units
              </p>
            </div>
          )}

          {/* Reason */}
          <div>
            <p className="text-[#6b7280] text-xs font-medium uppercase tracking-wider mb-2">
              Reason
            </p>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value as InventoryAdjustmentReason)}
              className="w-full bg-[#0a0f1e] border border-[#1f2d4e] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#d4a843] transition-colors appearance-none"
              style={{ color: '#e5e7eb' }}
            >
              {REASON_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value} style={{ backgroundColor: '#0a0f1e' }}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Note */}
          <div>
            <p className="text-[#6b7280] text-xs font-medium uppercase tracking-wider mb-2">
              Note{' '}
              <span className="text-[#374151] normal-case font-normal tracking-normal">
                (optional)
              </span>
            </p>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Internal note about this adjustment…"
              rows={2}
              className="w-full bg-[#0a0f1e] border border-[#1f2d4e] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#d4a843] transition-colors resize-none placeholder-[#374151]"
              style={{ color: '#e5e7eb' }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#1f2d4e]">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#1f2d4e] hover:bg-[#263d6e] text-[#9ca3af] hover:text-white text-sm font-medium transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!isValid || saving}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#d4a843]/15 hover:bg-[#d4a843]/25 disabled:opacity-40 disabled:cursor-not-allowed text-[#d4a843] text-sm font-medium transition-all border border-[#d4a843]/30"
          >
            {saving ? (
              <span className="material-symbols-outlined text-sm animate-spin">
                progress_activity
              </span>
            ) : (
              <span className="material-symbols-outlined text-sm">check</span>
            )}
            {isBulk ? `Update ${rows.length} items` : 'Save changes'}
          </button>
        </div>
      </div>
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
      {/* checkbox, Product, SKU, Variant, Available, On Hand, Committed, Incoming, Location, Status, Actions */}
      {[24, 180, 90, 100, 60, 60, 60, 60, 100, 80, 70].map((w, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-[#1f2d4e] rounded animate-pulse" style={{ width: `${w}px` }} />
        </td>
      ))}
    </tr>
  );
}

// ─── Page constants ──────────────────────────────────────────────────────────────

const STOCK_FILTERS: { value: StockFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'in_stock', label: 'In Stock' },
  { value: 'low_stock', label: 'Low Stock' },
  { value: 'out_of_stock', label: 'Out of Stock' },
];

const PAGE_SIZE = 50;

// ─── Page ───────────────────────────────────────────────────────────────────────

export default function InventoryPage() {
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rows, setRows] = useState<InventoryRow[]>([]);

  const [search, setSearch] = useState('');
  const [stockFilter, setStockFilter] = useState<StockFilter>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(1);

  const [alertsOpen, setAlertsOpen] = useState(true);

  // Modal state
  const [adjustTarget, setAdjustTarget] = useState<AdjustTarget | null>(null);
  const [saving, setSaving] = useState(false);

  // Bulk selection
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

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
      setSelectedKeys(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load inventory');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  // ── Locations ─────────────────────────────────────────────────────────────────

  const locations = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of rows) {
      if (r.locationId && r.locationName !== '—') {
        map.set(r.locationId, r.locationName);
      }
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [rows]);

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
        (r) =>
          r.productTitle.toLowerCase().includes(q) ||
          r.variantTitle.toLowerCase().includes(q) ||
          r.sku.toLowerCase().includes(q) ||
          (r.barcode ?? '').toLowerCase().includes(q),
      );
    }

    if (stockFilter !== 'all') {
      result = result.filter((r) => stockStatus(r.available) === stockFilter);
    }

    if (locationFilter !== 'all') {
      result = result.filter((r) => r.locationId === locationFilter);
    }

    if (sortField) {
      result = [...result].sort((a, b) => {
        let cmp = 0;
        if (sortField === 'product') cmp = a.productTitle.localeCompare(b.productTitle);
        else if (sortField === 'sku') cmp = a.sku.localeCompare(b.sku);
        else if (sortField === 'variant') cmp = a.variantTitle.localeCompare(b.variantTitle);
        else if (sortField === 'available') cmp = a.available - b.available;
        else if (sortField === 'on_hand') cmp = a.onHand - b.onHand;
        else if (sortField === 'committed') cmp = a.committed - b.committed;
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }

    return result;
  }, [rows, search, stockFilter, locationFilter, sortField, sortDir]);

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

  // ── Row key ───────────────────────────────────────────────────────────────────

  function rowKey(row: InventoryRow) {
    return `${row.inventoryItemId ?? row.variantId}::${row.locationId}`;
  }

  // ── Bulk selection ────────────────────────────────────────────────────────────

  const allPageKeys = useMemo(() => pagedRows.map(rowKey), [pagedRows]);
  const allSelected = allPageKeys.length > 0 && allPageKeys.every((k) => selectedKeys.has(k));
  const someSelected = selectedKeys.size > 0;

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedKeys((prev) => {
        const next = new Set(prev);
        allPageKeys.forEach((k) => next.delete(k));
        return next;
      });
    } else {
      setSelectedKeys((prev) => {
        const next = new Set(prev);
        allPageKeys.forEach((k) => next.add(k));
        return next;
      });
    }
  }

  function toggleRow(row: InventoryRow) {
    const k = rowKey(row);
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  }

  const selectedRows = useMemo(
    () => filteredRows.filter((r) => selectedKeys.has(rowKey(r))),

    [filteredRows, selectedKeys],
  );

  // ── Inventory update ──────────────────────────────────────────────────────────

  async function handleSaveAdjustments(
    params: {
      inventoryItemId: string;
      locationId: string;
      value: number;
      mode: 'set' | 'adjust';
      reason: InventoryAdjustmentReason;
      note: string;
    }[],
  ) {
    setSaving(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      // Process in batches of 5 to avoid overwhelming the API
      const BATCH = 5;
      for (let i = 0; i < params.length; i += BATCH) {
        const batch = params.slice(i, i + BATCH);
        await Promise.all(
          batch.map(async (p) => {
            const body =
              p.mode === 'set'
                ? {
                    inventoryItemId: p.inventoryItemId,
                    locationId: p.locationId,
                    quantity: p.value,
                    reason: p.reason,
                    note: p.note || undefined,
                  }
                : {
                    inventoryItemId: p.inventoryItemId,
                    locationId: p.locationId,
                    delta: p.value,
                    reason: p.reason,
                    note: p.note || undefined,
                  };

            const res = await fetch('/api/admin/inventory', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(body),
            });

            const data = (await res.json()) as {
              success?: boolean;
              message?: string;
              error?: string;
            };

            if (!res.ok) {
              errorCount++;
              console.error('Inventory update error:', data.error);
            } else {
              successCount++;
            }
          }),
        );
      }

      if (errorCount === 0) {
        toast.success(
          params.length === 1
            ? 'Inventory updated'
            : `${successCount} of ${params.length} items updated`,
        );
      } else {
        toast.error(`${errorCount} update(s) failed, ${successCount} succeeded`);
      }

      setAdjustTarget(null);
      setSelectedKeys(new Set());
      await fetchInventory();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update inventory');
    } finally {
      setSaving(false);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ fontFamily: 'var(--font-heading)', color: '#ffffff' }}
          >
            Inventory
          </h1>
          <p className="text-[#6b7280] text-sm mt-1">
            {loading
              ? 'Loading…'
              : `${stats.totalSKUs} SKU${stats.totalSKUs !== 1 ? 's' : ''} across all locations`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => exportToCsv(filteredRows)}
            disabled={loading || filteredRows.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#1f2d4e] bg-[#111827] hover:border-[#263d6e] text-[#9ca3af] hover:text-white text-sm font-medium transition-all disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-base">download</span>
            Export
          </button>
          <button
            onClick={fetchInventory}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#1f2d4e] bg-[#111827] hover:border-[#263d6e] text-[#9ca3af] hover:text-white text-sm font-medium transition-all disabled:opacity-50"
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
                        onUpdate={(row) => setAdjustTarget({ type: 'single', row })}
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
                        onUpdate={(row) => setAdjustTarget({ type: 'single', row })}
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
            placeholder="Search products, variants, SKU, barcode…"
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

        {/* Location filter */}
        {locations.length > 0 && (
          <select
            value={locationFilter}
            onChange={(e) => {
              setLocationFilter(e.target.value);
              setPage(1);
            }}
            className="bg-[#111827] border border-[#1f2d4e] focus:border-[#d4a843] rounded-xl px-3 py-2.5 text-sm outline-none transition-colors appearance-none"
            style={{ color: locationFilter === 'all' ? '#6b7280' : '#e5e7eb' }}
          >
            <option value="all" style={{ backgroundColor: '#111827' }}>
              All locations
            </option>
            {locations.map(({ id, name }) => (
              <option key={id} value={id} style={{ backgroundColor: '#111827' }}>
                {name}
              </option>
            ))}
          </select>
        )}

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
                  {/* Checkbox */}
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-[#1f2d4e] bg-[#0a0f1e] accent-[#d4a843] cursor-pointer"
                      title="Select all on this page"
                    />
                  </th>
                  <SortTh
                    field="product"
                    label="Product"
                    activeField={sortField}
                    direction={sortDir}
                    onSort={handleSort}
                  />
                  <SortTh
                    field="sku"
                    label="SKU"
                    activeField={sortField}
                    direction={sortDir}
                    onSort={handleSort}
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
                    Incoming
                  </th>
                  <th className="text-left text-xs font-medium uppercase tracking-wider px-4 py-3 text-[#6b7280]">
                    Location
                  </th>
                  <th className="text-left text-xs font-medium uppercase tracking-wider px-4 py-3 text-[#6b7280]">
                    Status
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
                    <td colSpan={11} className="text-center py-16">
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
                    const k = rowKey(row);
                    const isSelected = selectedKeys.has(k);

                    return (
                      <tr
                        key={`${row.variantId}-${row.locationId}`}
                        className={`transition-colors ${
                          isSelected
                            ? 'bg-[#d4a843]/5 border-l-2 border-l-[#d4a843]/30'
                            : 'hover:bg-[#1f2d4e]/20'
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleRow(row)}
                            className="w-4 h-4 rounded border-[#1f2d4e] bg-[#0a0f1e] accent-[#d4a843] cursor-pointer"
                          />
                        </td>

                        {/* Product */}
                        <td className="px-4 py-3">
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
                            <p
                              className="text-sm font-medium line-clamp-1 max-w-[160px]"
                              style={{ color: '#ffffff' }}
                            >
                              {row.productTitle}
                            </p>
                          </div>
                        </td>

                        {/* SKU (with barcode tooltip) */}
                        <td className="px-4 py-3">
                          {row.sku ? (
                            <span
                              className="text-[#9ca3af] text-xs font-mono cursor-default"
                              title={row.barcode ? `Barcode: ${row.barcode}` : undefined}
                            >
                              {row.sku}
                            </span>
                          ) : (
                            <span className="text-[#374151] text-xs">—</span>
                          )}
                        </td>

                        {/* Variant */}
                        <td className="px-4 py-3">
                          <span className="text-[#9ca3af] text-sm">
                            {row.variantTitle === 'Default Title' ? '—' : row.variantTitle}
                          </span>
                        </td>

                        {/* Available */}
                        <td className="px-4 py-3">
                          <QtyText qty={row.available} />
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

                        {/* Incoming */}
                        <td className="px-4 py-3">
                          {row.incoming > 0 ? (
                            <span className="text-[#6366f1] text-sm tabular-nums font-medium">
                              +{row.incoming}
                            </span>
                          ) : (
                            <span className="text-[#374151] text-sm tabular-nums">0</span>
                          )}
                        </td>

                        {/* Location */}
                        <td className="px-4 py-3">
                          <span className="text-[#6b7280] text-xs">{row.locationName}</span>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3">
                          {row.tracked ? <StockBadge qty={row.available} /> : <NotTrackedBadge />}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end">
                            <button
                              onClick={() => setAdjustTarget({ type: 'single', row })}
                              disabled={!row.inventoryItemId || !row.locationId}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#1f2d4e] hover:bg-[#263d6e] text-[#9ca3af] hover:text-white text-xs font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              <span className="material-symbols-outlined text-sm">edit</span>
                              Update
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

      {/* ── Bulk Action Bar ───────────────────────────────────────────────────── */}
      {someSelected && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-5 py-3 rounded-2xl border border-[#d4a843]/30 shadow-2xl"
          style={{ backgroundColor: '#0d1526' }}
        >
          <span className="material-symbols-outlined text-[#d4a843] text-base">check_box</span>
          <span className="text-sm font-medium" style={{ color: '#e5e7eb' }}>
            {selectedKeys.size} item{selectedKeys.size !== 1 ? 's' : ''} selected
          </span>
          <div className="w-px h-5 bg-[#1f2d4e]" />
          <button
            onClick={() => setAdjustTarget({ type: 'bulk', rows: selectedRows })}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#d4a843]/15 hover:bg-[#d4a843]/25 text-[#d4a843] text-xs font-medium transition-all border border-[#d4a843]/30"
          >
            <span className="material-symbols-outlined text-sm">inventory_2</span>
            Bulk Set Quantity
          </button>
          <button
            onClick={() => setSelectedKeys(new Set())}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#1f2d4e] hover:bg-[#263d6e] text-[#6b7280] hover:text-white text-xs font-medium transition-all"
          >
            <span className="material-symbols-outlined text-sm">close</span>
            Deselect All
          </button>
        </div>
      )}

      {/* ── Adjustment Modal ──────────────────────────────────────────────────── */}
      {adjustTarget && (
        <AdjustmentModal
          target={adjustTarget}
          onSave={handleSaveAdjustments}
          onClose={() => setAdjustTarget(null)}
          saving={saving}
        />
      )}
    </div>
  );
}
