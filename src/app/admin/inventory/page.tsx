'use client';

/**
 * Admin Inventory Page — Phase 3
 *
 * Migrated to use admin design tokens. Zero hardcoded hex colors.
 * Full inventory management: stats, alerts, table with modal quantity editing,
 * bulk update, CSV export, location filter, SKU/barcode, tracked indicator.
 * Calls /api/admin/inventory — no direct Shopify calls from client.
 */

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useToast } from '@/components/ui/useToast';
import { AdminHelpBanner } from '@/components/admin/ui';
import type { InventoryAdjustmentReason } from '@/lib/shopify/admin/tools/inventory';

// ─── Types ──────────────────────────────────────────────────────────────────────

type InventoryLevel = {
  location: { id: string; name: string };
  quantities: Array<{ name: string; quantity: number }>;
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
    'Producto',
    'SKU',
    'Código de Barras',
    'Variante',
    'Disponible',
    'En Mano',
    'Comprometido',
    'En Camino',
    'Ubicación',
    'Estado',
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
              ? 'Sin Stock'
              : r.available <= 10
                ? 'Stock Bajo'
                : 'Con Stock'
            : 'Sin Seguimiento',
        ),
      ].join(','),
    ),
  ].join('\n');
  const blob = new Blob([lines], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `inventory-export-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Reason options ──────────────────────────────────────────────────────────────

const REASON_OPTIONS: { value: InventoryAdjustmentReason; label: string }[] = [
  { value: 'correction', label: 'Corrección' },
  { value: 'cycle_count_available', label: 'Conteo de inventario' },
  { value: 'damaged', label: 'Dañado' },
  { value: 'promotion_or_exchange', label: 'Promoción / Cambio' },
  { value: 'received', label: 'Recibido' },
  { value: 'restock', label: 'Reposición' },
  { value: 'safety_stock', label: 'Stock de seguridad' },
  { value: 'shrinkage', label: 'Merma' },
  { value: 'quality_control', label: 'Control de calidad' },
  { value: 'other', label: 'Otro' },
];

// ─── Stock Badge ────────────────────────────────────────────────────────────────

function StockBadge({ qty }: { qty: number }) {
  const status = stockStatus(qty);
  const map = {
    in_stock: { token: 'var(--admin-success)', label: 'Con Stock' },
    low_stock: { token: 'var(--admin-brand)', label: 'Stock Bajo' },
    out_of_stock: { token: 'var(--admin-error)', label: 'Sin Stock' },
  };
  const { token, label } = map[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ backgroundColor: `color-mix(in srgb, ${token} 10%, transparent)`, color: token }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: token }} />
      {label}
    </span>
  );
}

function NotTrackedBadge() {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{
        backgroundColor: 'color-mix(in srgb, var(--admin-text-muted) 12%, transparent)',
        color: 'var(--admin-text-muted)',
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: 'var(--admin-text-muted)' }}
      />
      Sin seguimiento
    </span>
  );
}

// ─── Qty Color ──────────────────────────────────────────────────────────────────

function QtyText({ qty }: { qty: number }) {
  const token =
    qty === 0 ? 'var(--admin-error)' : qty <= 10 ? 'var(--admin-brand)' : 'var(--admin-success)';
  return (
    <span className="text-sm font-semibold tabular-nums" style={{ color: token }}>
      {qty}
    </span>
  );
}

// ─── Stat Card ──────────────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  colorToken,
  onClick,
  active,
}: {
  icon: string;
  label: string;
  value: number;
  colorToken: string;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="flex-1 min-w-[150px] rounded-2xl p-5 text-left transition-all"
      style={{
        backgroundColor: 'var(--admin-bg-card)',
        border: active
          ? '1px solid color-mix(in srgb, var(--admin-brand) 40%, transparent)'
          : '1px solid var(--admin-border)',
        boxShadow: active
          ? '0 0 0 1px color-mix(in srgb, var(--admin-brand) 20%, transparent)'
          : 'none',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p
            className="text-xs font-medium uppercase tracking-wider mb-1"
            style={{ color: 'var(--admin-text-muted)' }}
          >
            {label}
          </p>
          <p className="text-2xl font-bold tabular-nums" style={{ color: 'var(--admin-text)' }}>
            {value}
          </p>
        </div>
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-none"
          style={{ backgroundColor: `color-mix(in srgb, ${colorToken} 10%, transparent)` }}
        >
          <span className="material-symbols-outlined text-xl" style={{ color: colorToken }}>
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
  const token = isOutOfStock ? 'var(--admin-error)' : 'var(--admin-brand)';

  return (
    <div
      className="flex items-center gap-3 p-3 rounded-xl"
      style={{
        backgroundColor: `color-mix(in srgb, ${token} 5%, transparent)`,
        border: '1px solid var(--admin-border)',
        borderLeftWidth: '3px',
        borderLeftColor: token,
      }}
    >
      {row.productImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={row.productImage.url}
          alt={row.productImage.altText ?? row.productTitle}
          className="w-10 h-10 rounded-lg object-cover flex-none"
          style={{ backgroundColor: 'var(--admin-border)' }}
        />
      ) : (
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center flex-none"
          style={{ backgroundColor: 'var(--admin-border)' }}
        >
          <span
            className="material-symbols-outlined text-base"
            style={{ color: 'var(--admin-text-disabled)' }}
          >
            image
          </span>
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium line-clamp-1" style={{ color: 'var(--admin-text)' }}>
          {row.productTitle}
        </p>
        <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
          {row.variantTitle !== 'Default Title' ? row.variantTitle : 'Variante única'} ·{' '}
          <span style={{ color: token }} className="font-semibold">
            {row.available} unidades
          </span>
        </p>
      </div>
      <button
        onClick={() => onUpdate(row)}
        className="flex-none flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
        style={{ backgroundColor: `color-mix(in srgb, ${token} 10%, transparent)`, color: token }}
      >
        <span className="material-symbols-outlined text-sm">edit</span>
        Actualizar
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

  const inputStyle: React.CSSProperties = {
    backgroundColor: 'var(--admin-bg-input)',
    border: '1px solid var(--admin-border)',
    color: 'var(--admin-text)',
  };

  useEffect(() => {
    if (singleRow && mode === 'set') setValue(String(singleRow.available));
    else if (mode === 'adjust') setValue('0');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);
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
      style={{ backgroundColor: 'var(--admin-overlay)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-lg rounded-2xl flex flex-col"
        style={{
          maxHeight: '90vh',
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
          <div>
            <h2 className="admin-h2">
              {isBulk ? `Actualizar ${rows.length} items` : 'Actualizar inventario'}
            </h2>
            {!isBulk && singleRow && (
              <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>
                {singleRow.productTitle}
                {singleRow.variantTitle !== 'Default Title' ? ` · ${singleRow.variantTitle}` : ''}
                {singleRow.locationName !== '—' ? ` · ${singleRow.locationName}` : ''}
              </p>
            )}
            {isBulk && (
              <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>
                {rows.length} variantes seleccionadas
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ backgroundColor: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}
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
                { label: 'Disponible', value: singleRow.available, token: 'var(--admin-success)' },
                { label: 'En Mano', value: singleRow.onHand, token: 'var(--admin-text-secondary)' },
                {
                  label: 'Comprometido',
                  value: singleRow.committed,
                  token: 'var(--admin-text-muted)',
                },
              ].map(({ label, value: v, token }) => (
                <div
                  key={label}
                  className="rounded-xl p-3 text-center"
                  style={{
                    backgroundColor: 'var(--admin-bg-input)',
                    border: '1px solid var(--admin-border)',
                  }}
                >
                  <p className="text-xs mb-1" style={{ color: 'var(--admin-text-muted)' }}>
                    {label}
                  </p>
                  <p className="text-lg font-bold tabular-nums" style={{ color: token }}>
                    {v}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Mode toggle */}
          <div>
            <p className="admin-label mb-2">Tipo de ajuste</p>
            <div
              className="flex rounded-xl overflow-hidden"
              style={{ border: '1px solid var(--admin-border)' }}
            >
              {(['set', 'adjust'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className="flex-1 px-4 py-2.5 text-sm font-medium transition-colors"
                  style={{
                    backgroundColor: mode === m ? 'var(--admin-brand-bg)' : 'var(--admin-bg-input)',
                    color: mode === m ? 'var(--admin-brand)' : 'var(--admin-text-muted)',
                  }}
                >
                  {m === 'set' ? 'Establecer en' : 'Ajustar en'}
                </button>
              ))}
            </div>
          </div>

          {/* Quantity input */}
          <div>
            <p className="admin-label mb-2">
              {mode === 'set' ? 'Nueva cantidad' : 'Diferencia (+ o −)'}
            </p>
            <div className="flex items-center gap-0">
              <button
                onClick={() => setValue((v) => String((parseInt(v, 10) || 0) - 1))}
                className="w-10 h-10 rounded-l-xl flex items-center justify-center text-sm transition-colors"
                style={{
                  backgroundColor: 'var(--admin-border)',
                  color: 'var(--admin-text-secondary)',
                  border: '1px solid var(--admin-border)',
                }}
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
                className="flex-1 h-10 text-center text-base font-semibold outline-none tabular-nums transition-colors"
                style={{
                  backgroundColor: 'var(--admin-bg-input)',
                  borderTop: '1px solid var(--admin-border)',
                  borderBottom: '1px solid var(--admin-border)',
                  color: 'var(--admin-text)',
                }}
              />
              <button
                onClick={() => setValue((v) => String((parseInt(v, 10) || 0) + 1))}
                className="w-10 h-10 rounded-r-xl flex items-center justify-center text-sm transition-colors"
                style={{
                  backgroundColor: 'var(--admin-border)',
                  color: 'var(--admin-text-secondary)',
                  border: '1px solid var(--admin-border)',
                }}
              >
                <span className="material-symbols-outlined text-sm">add</span>
              </button>
            </div>
          </div>

          {/* Preview — single row only */}
          {!isBulk && singleRow && !isNaN(numValue) && (
            <div
              className="flex items-center gap-3 px-4 py-3 rounded-xl"
              style={{
                backgroundColor: 'var(--admin-brand-bg)',
                border: '1px solid var(--admin-brand-border)',
              }}
            >
              <span
                className="material-symbols-outlined text-base"
                style={{ color: 'var(--admin-brand)' }}
              >
                preview
              </span>
              <p className="text-sm" style={{ color: 'var(--admin-text-body)' }}>
                Disponible quedará en:{' '}
                <strong style={{ color: 'var(--admin-brand)' }}>
                  {previewQty(singleRow.available)}
                </strong>{' '}
                unidades
              </p>
            </div>
          )}

          {/* Reason */}
          <div>
            <p className="admin-label mb-2">Motivo</p>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value as InventoryAdjustmentReason)}
              className="w-full rounded-xl px-4 py-2.5 text-sm outline-none transition-colors appearance-none"
              style={inputStyle}
            >
              {REASON_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Note */}
          <div>
            <p className="admin-label mb-2">
              Nota{' '}
              <span
                style={{ color: 'var(--admin-text-disabled)' }}
                className="normal-case font-normal tracking-normal"
              >
                (opcional)
              </span>
            </p>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Nota interna sobre este ajuste…"
              rows={2}
              className="w-full rounded-xl px-4 py-2.5 text-sm outline-none transition-colors resize-none"
              style={inputStyle}
            />
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-end gap-3 px-6 py-4"
          style={{ borderTop: '1px solid var(--admin-border)' }}
        >
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
            style={{ backgroundColor: 'var(--admin-border)', color: 'var(--admin-text-secondary)' }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={!isValid || saving}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              backgroundColor: 'var(--admin-brand-bg)',
              color: 'var(--admin-brand)',
              border: '1px solid var(--admin-brand-border)',
            }}
          >
            {saving ? (
              <span className="material-symbols-outlined text-sm animate-spin">
                progress_activity
              </span>
            ) : (
              <span className="material-symbols-outlined text-sm">check</span>
            )}
            {isBulk ? `Actualizar ${rows.length} items` : 'Guardar cambios'}
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
        className="inline-flex items-center gap-1 transition-colors"
        style={{ color: isActive ? 'var(--admin-brand)' : 'var(--admin-text-muted)' }}
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
    <tr style={{ borderBottom: '1px solid var(--admin-border)' }}>
      {[24, 180, 90, 100, 60, 60, 60, 60, 100, 80, 70].map((w, i) => (
        <td key={i} className="px-4 py-3">
          <div
            className="h-4 rounded animate-pulse"
            style={{ width: `${w}px`, backgroundColor: 'var(--admin-border)' }}
          />
        </td>
      ))}
    </tr>
  );
}

// ─── Page constants ──────────────────────────────────────────────────────────────

const STOCK_FILTERS: { value: StockFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'in_stock', label: 'Con Stock' },
  { value: 'low_stock', label: 'Stock Bajo' },
  { value: 'out_of_stock', label: 'Sin Stock' },
];

const STOCK_FILTER_LABELS: Record<string, string> = {
  in_stock: 'con stock',
  low_stock: 'con stock bajo',
  out_of_stock: 'sin stock',
};

const PAGE_SIZE = 50;

// ─── Simple Inventory Card ──────────────────────────────────────────────────────

function SimpleInventoryCard({
  row,
  onUpdate,
  isSelected,
  onToggleSelect,
}: {
  row: InventoryRow;
  onUpdate: (row: InventoryRow) => void;
  isSelected: boolean;
  onToggleSelect: () => void;
}) {
  const stockSt = stockStatus(row.available);
  const borderToken =
    stockSt === 'out_of_stock'
      ? 'var(--admin-error)'
      : stockSt === 'low_stock'
        ? 'var(--admin-brand)'
        : 'var(--admin-border)';
  const bgToken =
    stockSt === 'out_of_stock'
      ? 'color-mix(in srgb, var(--admin-error) 3%, transparent)'
      : stockSt === 'low_stock'
        ? 'color-mix(in srgb, var(--admin-brand) 3%, transparent)'
        : 'var(--admin-bg-card)';

  return (
    <div
      className="rounded-xl p-4 transition-all"
      style={{
        backgroundColor: isSelected ? 'var(--admin-brand-bg)' : bgToken,
        border: `1px solid ${isSelected ? 'var(--admin-brand)' : borderToken}`,
        borderLeftWidth: '3px',
        borderLeftColor: isSelected ? 'var(--admin-brand)' : borderToken,
      }}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelect}
          className="w-4 h-4 rounded cursor-pointer mt-1 flex-none"
          style={{ accentColor: 'var(--admin-brand)' }}
        />

        {/* Image */}
        {row.productImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={row.productImage.url}
            alt={row.productImage.altText ?? row.productTitle}
            className="w-12 h-12 rounded-lg object-cover flex-none"
            style={{ backgroundColor: 'var(--admin-border)' }}
          />
        ) : (
          <div
            className="w-12 h-12 rounded-lg flex items-center justify-center flex-none"
            style={{ backgroundColor: 'var(--admin-bg-elevated)' }}
          >
            <span
              className="material-symbols-outlined text-lg"
              style={{ color: 'var(--admin-text-disabled)' }}
            >
              image
            </span>
          </div>
        )}

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm font-medium line-clamp-1" style={{ color: 'var(--admin-text)' }}>
              {row.productTitle}
            </p>
            {row.tracked ? <StockBadge qty={row.available} /> : <NotTrackedBadge />}
          </div>
          <div
            className="flex items-center gap-3 text-xs"
            style={{ color: 'var(--admin-text-muted)' }}
          >
            {row.variantTitle !== 'Default Title' && <span>{row.variantTitle}</span>}
            {row.sku && <span className="font-mono">SKU: {row.sku}</span>}
            {row.locationName !== '—' && (
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>
                  location_on
                </span>
                {row.locationName}
              </span>
            )}
          </div>

          {/* Quantities row */}
          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center gap-1.5">
              <span className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                Disponible:
              </span>
              <QtyText qty={row.available} />
            </div>
            {row.onHand !== row.available && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                  En mano:
                </span>
                <span
                  className="text-sm tabular-nums font-medium"
                  style={{ color: 'var(--admin-text-secondary)' }}
                >
                  {row.onHand}
                </span>
              </div>
            )}
            {row.committed > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                  Comprometido:
                </span>
                <span
                  className="text-sm tabular-nums font-medium"
                  style={{ color: 'var(--admin-text-secondary)' }}
                >
                  {row.committed}
                </span>
              </div>
            )}
            {row.incoming > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                  En camino:
                </span>
                <span
                  className="text-sm tabular-nums font-medium"
                  style={{ color: 'var(--admin-accent)' }}
                >
                  +{row.incoming}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Action */}
        <button
          onClick={() => onUpdate(row)}
          disabled={!row.inventoryItemId || !row.locationId}
          className="flex-none flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            backgroundColor: 'var(--admin-bg-elevated)',
            color: 'var(--admin-text-secondary)',
            border: '1px solid var(--admin-border)',
          }}
        >
          <span className="material-symbols-outlined text-sm">edit</span>
          Actualizar
        </button>
      </div>
    </div>
  );
}

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
  const [adjustTarget, setAdjustTarget] = useState<AdjustTarget | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'simple' | 'advanced'>('simple');

  const fetchInventory = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/inventory');
      const data = (await res.json()) as { products?: InventoryProduct[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Failed to load');
      setRows(flattenProducts(data.products ?? []));
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

  const locations = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of rows) {
      if (r.locationId && r.locationName !== '—') map.set(r.locationId, r.locationName);
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [rows]);

  const stats = useMemo(() => {
    const uniqueVariants = new Map<string, InventoryRow>();
    for (const r of rows) {
      if (!uniqueVariants.has(r.variantId)) uniqueVariants.set(r.variantId, r);
    }
    const variants = Array.from(uniqueVariants.values());
    return {
      totalSKUs: variants.length,
      inStock: variants.filter((v) => v.available > 10).length,
      lowStock: variants.filter((v) => v.available > 0 && v.available <= 10).length,
      outOfStock: variants.filter((v) => v.available === 0).length,
    };
  }, [rows]);

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
    if (stockFilter !== 'all')
      result = result.filter((r) => stockStatus(r.available) === stockFilter);
    if (locationFilter !== 'all') result = result.filter((r) => r.locationId === locationFilter);
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
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortField(field);
      setSortDir('desc');
    }
    setPage(1);
  }

  function rowKey(row: InventoryRow) {
    return `${row.inventoryItemId ?? row.variantId}::${row.locationId}`;
  }

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
      if (errorCount === 0)
        toast.success(
          params.length === 1
            ? 'Inventario actualizado'
            : `${successCount} de ${params.length} items actualizados`,
        );
      else toast.error(`${errorCount} actualización(es) fallaron, ${successCount} exitosas`);
      setAdjustTarget(null);
      setSelectedKeys(new Set());
      await fetchInventory();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al actualizar el inventario');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="admin-h1 text-2xl">Inventario</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--admin-text-muted)' }}>
            {loading
              ? 'Cargando…'
              : `${stats.totalSKUs} variante${stats.totalSKUs !== 1 ? 's' : ''} en todas las ubicaciones`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {[
            {
              icon: 'download',
              label: 'Exportar',
              onClick: () => exportToCsv(filteredRows),
              disabled: loading || filteredRows.length === 0,
            },
            {
              icon: loading ? 'progress_activity' : 'refresh',
              label: 'Actualizar',
              onClick: fetchInventory,
              disabled: loading,
            },
          ].map(({ icon, label, onClick, disabled }) => (
            <button
              key={label}
              onClick={onClick}
              disabled={disabled}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
              style={{
                backgroundColor: 'var(--admin-bg-card)',
                border: '1px solid var(--admin-border)',
                color: 'var(--admin-text-secondary)',
              }}
            >
              <span
                className={`material-symbols-outlined text-base ${icon === 'progress_activity' ? 'animate-spin' : ''}`}
              >
                {icon}
              </span>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Row */}
      <div className="flex gap-4 flex-wrap">
        <StatCard
          icon="package_2"
          label="Total de Variantes"
          value={stats.totalSKUs}
          colorToken="var(--admin-accent)"
          onClick={() => {
            setStockFilter('all');
            setPage(1);
          }}
          active={stockFilter === 'all'}
        />
        <StatCard
          icon="check_circle"
          label="Con Stock"
          value={stats.inStock}
          colorToken="var(--admin-success)"
          onClick={() => {
            setStockFilter('in_stock');
            setPage(1);
          }}
          active={stockFilter === 'in_stock'}
        />
        <StatCard
          icon="warning"
          label="Stock Bajo"
          value={stats.lowStock}
          colorToken="var(--admin-brand)"
          onClick={() => {
            setStockFilter('low_stock');
            setPage(1);
          }}
          active={stockFilter === 'low_stock'}
        />
        <StatCard
          icon="error"
          label="Sin Stock"
          value={stats.outOfStock}
          colorToken="var(--admin-error)"
          onClick={() => {
            setStockFilter('out_of_stock');
            setPage(1);
          }}
          active={stockFilter === 'out_of_stock'}
        />
      </div>

      {/* Help Banner */}
      <AdminHelpBanner
        icon="warehouse"
        title="¿Qué es el Inventario?"
        description="El inventario muestra cuántas unidades tenés de cada producto. Desde acá podés ver qué productos se están agotando y actualizar las cantidades cuando recibís mercadería nueva o hacés un ajuste."
      />

      {/* Alerts Section */}
      {!loading && (alertRows.out.length > 0 || alertRows.low.length > 0) && (
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            backgroundColor: 'var(--admin-bg-card)',
            border: '1px solid var(--admin-border)',
          }}
        >
          <button
            onClick={() => setAlertsOpen((v) => !v)}
            className="w-full flex items-center justify-between px-5 py-4 transition-colors"
            style={{ backgroundColor: 'transparent' }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--admin-bg-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <div className="flex items-center gap-3">
              <span
                className="material-symbols-outlined text-xl"
                style={{ color: 'var(--admin-brand)' }}
              >
                notifications_active
              </span>
              <span className="admin-h3">Alertas de Stock</span>
              <span
                className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ backgroundColor: 'var(--admin-error-bg)', color: 'var(--admin-error)' }}
              >
                {alertRows.out.length} agotados
              </span>
              {alertRows.low.length > 0 && (
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ backgroundColor: 'var(--admin-brand-bg)', color: 'var(--admin-brand)' }}
                >
                  {alertRows.low.length} bajos
                </span>
              )}
            </div>
            <span
              className="material-symbols-outlined text-xl"
              style={{ color: 'var(--admin-text-muted)' }}
            >
              {alertsOpen ? 'expand_less' : 'expand_more'}
            </span>
          </button>
          {alertsOpen && (
            <div className="px-5 pb-5 space-y-4">
              {alertRows.out.length > 0 && (
                <div>
                  <p
                    className="text-xs font-semibold uppercase tracking-wider mb-2"
                    style={{ color: 'var(--admin-error)' }}
                  >
                    Sin Stock ({alertRows.out.length})
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
              {alertRows.low.length > 0 && (
                <div>
                  <p
                    className="text-xs font-semibold uppercase tracking-wider mb-2"
                    style={{ color: 'var(--admin-brand)' }}
                  >
                    Stock Bajo ≤ 10 unidades ({alertRows.low.length})
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

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <span
            className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-xl"
            style={{ color: 'var(--admin-text-disabled)' }}
          >
            search
          </span>
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Buscar productos, variantes, SKU, código de barras…"
            className="w-full rounded-xl pl-12 pr-4 py-2.5 text-sm outline-none transition-colors"
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
              onClick={() => {
                setSearch('');
                setPage(1);
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 transition-colors"
              style={{ color: 'var(--admin-text-disabled)' }}
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          )}
        </div>

        {locations.length > 0 && (
          <select
            value={locationFilter}
            onChange={(e) => {
              setLocationFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-xl px-3 py-2.5 text-sm outline-none transition-colors appearance-none"
            style={{
              backgroundColor: 'var(--admin-bg-card)',
              border: '1px solid var(--admin-border)',
              color:
                locationFilter === 'all' ? 'var(--admin-text-muted)' : 'var(--admin-text-body)',
            }}
          >
            <option value="all">Todas las ubicaciones</option>
            {locations.map(({ id, name }) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        )}

        <div className="flex items-center gap-1.5 flex-wrap">
          {STOCK_FILTERS.map(({ value, label }) => {
            const counts = {
              all: rows.length,
              in_stock: rows.filter((r) => stockStatus(r.available) === 'in_stock').length,
              low_stock: rows.filter((r) => stockStatus(r.available) === 'low_stock').length,
              out_of_stock: rows.filter((r) => stockStatus(r.available) === 'out_of_stock').length,
            };
            const isActive = stockFilter === value;
            return (
              <button
                key={value}
                onClick={() => {
                  setStockFilter(value);
                  setPage(1);
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all"
                style={{
                  backgroundColor: isActive ? 'var(--admin-brand-bg)' : 'var(--admin-bg-card)',
                  border: isActive
                    ? '1px solid var(--admin-brand-border)'
                    : '1px solid var(--admin-border)',
                  color: isActive ? 'var(--admin-brand)' : 'var(--admin-text-muted)',
                }}
              >
                {label}
                <span
                  className="text-xs px-1.5 py-0.5 rounded-full"
                  style={{
                    backgroundColor: isActive
                      ? 'color-mix(in srgb, var(--admin-brand) 20%, transparent)'
                      : 'var(--admin-border)',
                    color: isActive ? 'var(--admin-brand)' : 'var(--admin-text-disabled)',
                  }}
                >
                  {counts[value]}
                </span>
              </button>
            );
          })}
        </div>

        {/* View Toggle */}
        <div
          className="flex items-center rounded-xl p-0.5"
          style={{
            backgroundColor: 'var(--admin-bg-card)',
            border: '1px solid var(--admin-border)',
          }}
        >
          {(['simple', 'advanced'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                backgroundColor: viewMode === mode ? 'var(--admin-brand-bg)' : 'transparent',
                color: viewMode === mode ? 'var(--admin-brand)' : 'var(--admin-text-muted)',
              }}
            >
              <span className="material-symbols-outlined text-sm">
                {mode === 'simple' ? 'view_agenda' : 'table_chart'}
              </span>
              {mode === 'simple' ? 'Vista Simple' : 'Vista Avanzada'}
            </button>
          ))}
        </div>
      </div>

      {/* Inventory Content */}
      {viewMode === 'simple' ? (
        /* Simple Card View */
        <div className="space-y-2">
          {error ? (
            <div
              className="rounded-2xl p-16 text-center"
              style={{
                backgroundColor: 'var(--admin-bg-card)',
                border: '1px solid var(--admin-border)',
              }}
            >
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
                onClick={fetchInventory}
                className="mt-4 text-sm transition-colors"
                style={{ color: 'var(--admin-brand)' }}
              >
                Intentar de nuevo
              </button>
            </div>
          ) : loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="rounded-xl p-4 animate-pulse"
                style={{
                  backgroundColor: 'var(--admin-bg-card)',
                  border: '1px solid var(--admin-border)',
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-lg"
                    style={{ backgroundColor: 'var(--admin-border)' }}
                  />
                  <div className="flex-1 space-y-2">
                    <div
                      className="h-4 rounded w-48"
                      style={{ backgroundColor: 'var(--admin-border)' }}
                    />
                    <div
                      className="h-3 rounded w-32"
                      style={{ backgroundColor: 'var(--admin-border)' }}
                    />
                  </div>
                </div>
              </div>
            ))
          ) : pagedRows.length === 0 ? (
            <div
              className="rounded-2xl p-16 text-center"
              style={{
                backgroundColor: 'var(--admin-bg-card)',
                border: '1px solid var(--admin-border)',
              }}
            >
              <span
                className="material-symbols-outlined text-5xl mb-4"
                style={{ color: 'var(--admin-text-disabled)' }}
              >
                warehouse
              </span>
              <p className="font-medium mb-1" style={{ color: 'var(--admin-text)' }}>
                {search
                  ? 'No se encontraron resultados'
                  : stockFilter !== 'all'
                    ? `No hay items ${STOCK_FILTER_LABELS[stockFilter] ?? stockFilter}`
                    : 'No hay datos de inventario'}
              </p>
              <p className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>
                {search
                  ? 'Probá con otros términos de búsqueda.'
                  : 'Los productos con inventario activo aparecerán acá.'}
              </p>
              {!search && stockFilter === 'all' && (
                <div
                  className="mt-4 flex items-center justify-center gap-6 text-xs"
                  style={{ color: 'var(--admin-text-muted)' }}
                >
                  <div className="flex flex-col items-center gap-1">
                    <span
                      className="material-symbols-outlined text-2xl"
                      style={{ color: 'var(--admin-brand)' }}
                    >
                      add_shopping_cart
                    </span>
                    <span>Creá productos</span>
                  </div>
                  <span
                    className="material-symbols-outlined text-lg"
                    style={{ color: 'var(--admin-text-disabled)' }}
                  >
                    arrow_forward
                  </span>
                  <div className="flex flex-col items-center gap-1">
                    <span
                      className="material-symbols-outlined text-2xl"
                      style={{ color: 'var(--admin-brand)' }}
                    >
                      inventory
                    </span>
                    <span>Cargá stock</span>
                  </div>
                  <span
                    className="material-symbols-outlined text-lg"
                    style={{ color: 'var(--admin-text-disabled)' }}
                  >
                    arrow_forward
                  </span>
                  <div className="flex flex-col items-center gap-1">
                    <span
                      className="material-symbols-outlined text-2xl"
                      style={{ color: 'var(--admin-success)' }}
                    >
                      storefront
                    </span>
                    <span>¡A vender!</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              {pagedRows.map((row) => {
                const k = rowKey(row);
                return (
                  <SimpleInventoryCard
                    key={`${row.variantId}-${row.locationId}`}
                    row={row}
                    onUpdate={(r) => setAdjustTarget({ type: 'single', row: r })}
                    isSelected={selectedKeys.has(k)}
                    onToggleSelect={() => toggleRow(row)}
                  />
                );
              })}
              {/* Pagination for simple view */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-2 py-3">
                  <span className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                    Mostrando {(page - 1) * PAGE_SIZE + 1}–
                    {Math.min(page * PAGE_SIZE, filteredRows.length)} de {filteredRows.length}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="w-8 h-8 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                      style={{
                        backgroundColor: 'var(--admin-border)',
                        color: 'var(--admin-text-secondary)',
                      }}
                    >
                      <span className="material-symbols-outlined text-sm">chevron_left</span>
                    </button>
                    <span
                      className="text-xs px-2 tabular-nums"
                      style={{ color: 'var(--admin-text-muted)' }}
                    >
                      {page} / {totalPages}
                    </span>
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="w-8 h-8 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                      style={{
                        backgroundColor: 'var(--admin-border)',
                        color: 'var(--admin-text-secondary)',
                      }}
                    >
                      <span className="material-symbols-outlined text-sm">chevron_right</span>
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        /* Advanced Table View */
        <>
          {/* Column Glossary — only in advanced view */}
          <div
            className="rounded-xl p-3 flex items-start gap-3 mb-4"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--admin-accent) 5%, transparent)',
              border: '1px solid var(--admin-border)',
            }}
          >
            <span
              className="material-symbols-outlined text-base flex-none mt-0.5"
              style={{ color: 'var(--admin-accent)' }}
            >
              info
            </span>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--admin-text-secondary)' }}>
              <strong>Disponible</strong> = unidades listas para vender · <strong>En Mano</strong> =
              todo lo que tenés físicamente · <strong>Comprometido</strong> = reservado por pedidos
              pendientes · <strong>En Camino</strong> = mercadería que pediste y todavía no llegó
            </p>
          </div>
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
                  onClick={fetchInventory}
                  className="mt-4 text-sm transition-colors"
                  style={{ color: 'var(--admin-brand)' }}
                >
                  Intentar de nuevo
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr
                      style={{
                        borderBottom: '1px solid var(--admin-border)',
                        backgroundColor: 'var(--admin-bg-elevated)',
                      }}
                    >
                      <th className="px-4 py-3 w-10">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          onChange={toggleSelectAll}
                          className="w-4 h-4 rounded cursor-pointer"
                          style={{ accentColor: 'var(--admin-brand)' }}
                          title="Seleccionar todo en esta página"
                        />
                      </th>
                      <SortTh
                        field="product"
                        label="Producto"
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
                        label="Variante"
                        activeField={sortField}
                        direction={sortDir}
                        onSort={handleSort}
                      />
                      <SortTh
                        field="available"
                        label="Disponible"
                        activeField={sortField}
                        direction={sortDir}
                        onSort={handleSort}
                      />
                      <SortTh
                        field="on_hand"
                        label="En Mano"
                        activeField={sortField}
                        direction={sortDir}
                        onSort={handleSort}
                      />
                      <SortTh
                        field="committed"
                        label="Comprometido"
                        activeField={sortField}
                        direction={sortDir}
                        onSort={handleSort}
                      />
                      {['En Camino', 'Ubicación', 'Estado'].map((h) => (
                        <th
                          key={h}
                          className="text-left text-xs font-medium uppercase tracking-wider px-4 py-3"
                          style={{ color: 'var(--admin-text-muted)' }}
                        >
                          {h}
                        </th>
                      ))}
                      <th
                        className="text-right text-xs font-medium uppercase tracking-wider px-4 py-3"
                        style={{ color: 'var(--admin-text-muted)' }}
                      >
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
                    ) : pagedRows.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="text-center py-16">
                          <div className="flex flex-col items-center gap-3">
                            <span
                              className="material-symbols-outlined text-4xl"
                              style={{ color: 'var(--admin-text-disabled)' }}
                            >
                              warehouse
                            </span>
                            <p className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>
                              {search
                                ? 'No se encontraron resultados para tu búsqueda'
                                : stockFilter !== 'all'
                                  ? `No hay items ${STOCK_FILTER_LABELS[stockFilter] ?? stockFilter}`
                                  : 'No hay datos de inventario'}
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
                            className="transition-colors"
                            style={{
                              borderBottom: '1px solid var(--admin-border)',
                              backgroundColor: isSelected ? 'var(--admin-brand-bg)' : 'transparent',
                              borderLeft: isSelected
                                ? '2px solid color-mix(in srgb, var(--admin-brand) 30%, transparent)'
                                : 'none',
                            }}
                            onMouseEnter={(e) => {
                              if (!isSelected)
                                e.currentTarget.style.backgroundColor = 'var(--admin-bg-hover)';
                            }}
                            onMouseLeave={(e) => {
                              if (!isSelected)
                                e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                          >
                            <td className="px-4 py-3">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleRow(row)}
                                className="w-4 h-4 rounded cursor-pointer"
                                style={{ accentColor: 'var(--admin-brand)' }}
                              />
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                {row.productImage ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={row.productImage.url}
                                    alt={row.productImage.altText ?? row.productTitle}
                                    className="w-9 h-9 rounded-lg object-cover flex-none"
                                    style={{ backgroundColor: 'var(--admin-border)' }}
                                  />
                                ) : (
                                  <div
                                    className="w-9 h-9 rounded-lg flex items-center justify-center flex-none"
                                    style={{ backgroundColor: 'var(--admin-border)' }}
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
                                  className="text-sm font-medium line-clamp-1 max-w-[160px]"
                                  style={{ color: 'var(--admin-text)' }}
                                >
                                  {row.productTitle}
                                </p>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              {row.sku ? (
                                <span
                                  className="text-xs font-mono cursor-default"
                                  style={{ color: 'var(--admin-text-secondary)' }}
                                  title={
                                    row.barcode ? `Código de barras: ${row.barcode}` : undefined
                                  }
                                >
                                  {row.sku}
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
                            <td className="px-4 py-3">
                              <span
                                className="text-sm"
                                style={{ color: 'var(--admin-text-secondary)' }}
                              >
                                {row.variantTitle === 'Default Title' ? '—' : row.variantTitle}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <QtyText qty={row.available} />
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className="text-sm tabular-nums"
                                style={{ color: 'var(--admin-text-secondary)' }}
                              >
                                {row.onHand}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className="text-sm tabular-nums"
                                style={{ color: 'var(--admin-text-secondary)' }}
                              >
                                {row.committed}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              {row.incoming > 0 ? (
                                <span
                                  className="text-sm tabular-nums font-medium"
                                  style={{ color: 'var(--admin-accent)' }}
                                >
                                  +{row.incoming}
                                </span>
                              ) : (
                                <span
                                  className="text-sm tabular-nums"
                                  style={{ color: 'var(--admin-text-disabled)' }}
                                >
                                  0
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className="text-xs"
                                style={{ color: 'var(--admin-text-muted)' }}
                              >
                                {row.locationName}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              {row.tracked ? (
                                <StockBadge qty={row.available} />
                              ) : (
                                <NotTrackedBadge />
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-end">
                                <button
                                  onClick={() => setAdjustTarget({ type: 'single', row })}
                                  disabled={!row.inventoryItemId || !row.locationId}
                                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                  style={{
                                    backgroundColor: 'var(--admin-border)',
                                    color: 'var(--admin-text-secondary)',
                                  }}
                                >
                                  <span className="material-symbols-outlined text-sm">edit</span>
                                  Actualizar
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
              <div
                className="flex items-center justify-between px-5 py-3"
                style={{ borderTop: '1px solid var(--admin-border)' }}
              >
                <span className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                  Mostrando {(page - 1) * PAGE_SIZE + 1}–
                  {Math.min(page * PAGE_SIZE, filteredRows.length)} de {filteredRows.length} filas
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="w-8 h-8 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                    style={{
                      backgroundColor: 'var(--admin-border)',
                      color: 'var(--admin-text-secondary)',
                    }}
                  >
                    <span className="material-symbols-outlined text-sm">chevron_left</span>
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                    const isCurrent = p === page;
                    return (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className="w-8 h-8 rounded-lg text-xs font-medium transition-colors"
                        style={{
                          backgroundColor: isCurrent
                            ? 'var(--admin-brand-bg)'
                            : 'var(--admin-border)',
                          color: isCurrent ? 'var(--admin-brand)' : 'var(--admin-text-muted)',
                          border: isCurrent ? '1px solid var(--admin-brand-border)' : 'none',
                        }}
                      >
                        {p}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="w-8 h-8 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                    style={{
                      backgroundColor: 'var(--admin-border)',
                      color: 'var(--admin-text-secondary)',
                    }}
                  >
                    <span className="material-symbols-outlined text-sm">chevron_right</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Bulk Action Bar */}
      {someSelected && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-5 py-3 rounded-2xl"
          style={{
            backgroundColor: 'var(--admin-bg-elevated)',
            border: '1px solid var(--admin-brand-border)',
            boxShadow: 'var(--admin-shadow-dropdown)',
          }}
        >
          <span
            className="material-symbols-outlined text-base"
            style={{ color: 'var(--admin-brand)' }}
          >
            check_box
          </span>
          <span className="text-sm font-medium" style={{ color: 'var(--admin-text-body)' }}>
            {selectedKeys.size} item{selectedKeys.size !== 1 ? 's' : ''} seleccionado
            {selectedKeys.size !== 1 ? 's' : ''}
          </span>
          <div className="w-px h-5" style={{ backgroundColor: 'var(--admin-border)' }} />
          <button
            onClick={() => setAdjustTarget({ type: 'bulk', rows: selectedRows })}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
            style={{
              backgroundColor: 'var(--admin-brand-bg)',
              color: 'var(--admin-brand)',
              border: '1px solid var(--admin-brand-border)',
            }}
          >
            <span className="material-symbols-outlined text-sm">inventory_2</span>
            Establecer Cantidad
          </button>
          <button
            onClick={() => setSelectedKeys(new Set())}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
            style={{ backgroundColor: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}
          >
            <span className="material-symbols-outlined text-sm">close</span>
            Deseleccionar Todo
          </button>
        </div>
      )}

      {/* Adjustment Modal */}
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
