'use client';

/**
 * Research Board — Phase 4
 *
 * Migrated to use admin design tokens. Zero hardcoded hex colors.
 * Main page to manage product research candidates.
 * Fetches from GET /api/admin/research.
 * Actions: edit prices, save, import to Shopify, discard, delete.
 * Bulk: import selected / discard selected.
 */

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { ScoreRing } from '@/components/admin/trends/ScoreRing';
import { TrendStateBadge } from '@/components/admin/trends/TrendStateBadge';
import { MarginBadge } from '@/components/admin/research/MarginBadge';
import { AiScoreBadge } from '@/components/admin/research/AiScoreBadge';
import { useToastContext } from '@/components/ui/ToastProvider';
import type { ResearchItem, ResearchItemStatus } from '@/lib/research/types';

// ─── Types ────────────────────────────────────────────────────────────────────

type SortKey = 'keyword' | 'trendScore' | 'margin' | 'aiScore' | 'createdAt';
type SortDir = 'asc' | 'desc';

type FilterTab = 'all' | ResearchItemStatus;

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_TABS: { id: FilterTab; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'candidate', label: 'Candidates' },
  { id: 'saved', label: 'Saved' },
  { id: 'imported', label: 'Imported' },
  { id: 'discarded', label: 'Discarded' },
];

const STATUS_CONFIG: Record<
  ResearchItemStatus,
  { color: string; bg: string; border: string; label: string }
> = {
  candidate: {
    color: 'var(--admin-info)',
    bg: 'color-mix(in srgb, var(--admin-info) 15%, transparent)',
    border: 'color-mix(in srgb, var(--admin-info) 30%, transparent)',
    label: 'Candidate',
  },
  saved: {
    color: 'var(--admin-success)',
    bg: 'color-mix(in srgb, var(--admin-success) 15%, transparent)',
    border: 'color-mix(in srgb, var(--admin-success) 30%, transparent)',
    label: 'Saved',
  },
  imported: {
    color: 'var(--admin-brand)',
    bg: 'color-mix(in srgb, var(--admin-brand) 15%, transparent)',
    border: 'color-mix(in srgb, var(--admin-brand) 30%, transparent)',
    label: 'Imported',
  },
  discarded: {
    color: 'var(--admin-text-muted)',
    bg: 'color-mix(in srgb, var(--admin-text-muted) 15%, transparent)',
    border: 'color-mix(in srgb, var(--admin-text-muted) 30%, transparent)',
    label: 'Discarded',
  },
  importing: {
    color: 'var(--admin-warning)',
    bg: 'color-mix(in srgb, var(--admin-warning) 15%, transparent)',
    border: 'color-mix(in srgb, var(--admin-warning) 30%, transparent)',
    label: 'Importing…',
  },
  published: {
    color: 'var(--admin-success)',
    bg: 'color-mix(in srgb, var(--admin-success) 15%, transparent)',
    border: 'color-mix(in srgb, var(--admin-success) 30%, transparent)',
    label: 'Published',
  },
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="space-y-2" data-testid="table-skeleton">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="h-14 rounded-xl animate-pulse"
          style={{
            backgroundColor: 'var(--admin-bg-card)',
            border: '1px solid var(--admin-border)',
          }}
        />
      ))}
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: string;
  color: string;
}) {
  return (
    <div
      className="rounded-2xl px-4 py-3 flex items-center gap-3"
      style={{
        backgroundColor: 'var(--admin-bg-card)',
        border: '1px solid var(--admin-border)',
      }}
    >
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center flex-none"
        style={{ backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)` }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 18, color }}>
          {icon}
        </span>
      </div>
      <div className="min-w-0">
        <p className="font-semibold text-lg leading-tight" style={{ color: 'var(--admin-text)' }}>
          {value}
        </p>
        <p className="text-xs truncate" style={{ color: 'var(--admin-text-muted)' }}>
          {label}
        </p>
      </div>
    </div>
  );
}

// ─── Sort Header ──────────────────────────────────────────────────────────────

function SortTh({
  col,
  label,
  sortKey,
  sortDir,
  onSort,
}: {
  col: SortKey;
  label: string;
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (k: SortKey) => void;
}) {
  const active = sortKey === col;
  return (
    <th className="text-left">
      <button
        type="button"
        onClick={() => onSort(col)}
        className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider transition-colors group"
        style={{ color: 'var(--admin-text-muted)' }}
      >
        {label}
        <span
          className="material-symbols-outlined transition-colors"
          style={{ fontSize: 12, color: active ? 'var(--admin-brand)' : 'transparent' }}
        >
          {sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward'}
        </span>
      </button>
    </th>
  );
}

// ─── Inline Edit Prices ───────────────────────────────────────────────────────

interface EditPricesInlineProps {
  item: ResearchItem;
  onSave: (id: string, costPrice: number, salePrice: number) => Promise<void>;
  onCancel: () => void;
}

function EditPricesInline({ item, onSave, onCancel }: EditPricesInlineProps) {
  const [cost, setCost] = useState(String(item.costPrice));
  const [sale, setSale] = useState(String(item.salePrice));
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    const c = parseFloat(cost);
    const s = parseFloat(sale);
    if (!isFinite(c) || c <= 0 || !isFinite(s) || s <= 0) return;
    setSaving(true);
    await onSave(item.id, c, s);
    setSaving(false);
  }

  const inputStyle: React.CSSProperties = {
    backgroundColor: 'var(--admin-bg-elevated)',
    border: '1px solid var(--admin-border)',
    color: 'var(--admin-text)',
  };

  return (
    <div className="flex items-center gap-1.5" data-testid="edit-prices-inline">
      <div className="relative">
        <span
          className="absolute left-2 top-1/2 -translate-y-1/2 text-xs"
          style={{ color: 'var(--admin-text-muted)' }}
        >
          $
        </span>
        <input
          type="number"
          min="0.01"
          step="0.01"
          value={cost}
          onChange={(e) => setCost(e.target.value)}
          className="w-20 rounded-lg pl-5 pr-2 py-1 text-xs outline-none"
          style={inputStyle}
          data-testid="edit-cost-input"
        />
      </div>
      <div className="relative">
        <span
          className="absolute left-2 top-1/2 -translate-y-1/2 text-xs"
          style={{ color: 'var(--admin-text-muted)' }}
        >
          $
        </span>
        <input
          type="number"
          min="0.01"
          step="0.01"
          value={sale}
          onChange={(e) => setSale(e.target.value)}
          className="w-20 rounded-lg pl-5 pr-2 py-1 text-xs outline-none"
          style={inputStyle}
          data-testid="edit-sale-input"
        />
      </div>
      <button
        onClick={handleSave}
        disabled={saving}
        className="disabled:opacity-50 transition-colors"
        style={{ color: 'var(--admin-success)' }}
        aria-label="Save prices"
      >
        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
          check
        </span>
      </button>
      <button
        onClick={onCancel}
        className="transition-colors"
        style={{ color: 'var(--admin-text-muted)' }}
        aria-label="Cancel"
      >
        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
          close
        </span>
      </button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ResearchBoardPage() {
  const { addToast } = useToastContext();

  // ── Data ─────────────────────────────────────────────────────────────────────
  const [items, setItems] = useState<ResearchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  // ── UI state ─────────────────────────────────────────────────────────────────
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);

  const [actioning, setActioning] = useState<Set<string>>(new Set());

  // ── Fetch ─────────────────────────────────────────────────────────────────────

  async function fetchItems() {
    setLoading(true);
    setFetchError('');
    try {
      const res = await fetch('/api/admin/research');
      const data = (await res.json()) as { items?: ResearchItem[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Failed to load');
      setItems(data.items ?? []);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'Failed to load research items');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchItems();
  }, []);

  // ── Derived stats ─────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const candidates = items.filter((i) => i.status === 'candidate').length;
    const saved = items.filter((i) => i.status === 'saved').length;
    const imported = items.filter((i) => i.status === 'imported').length;
    const avgMargin = items.length
      ? items.reduce((s, i) => s + i.marginPercent, 0) / items.length
      : 0;
    const avgAi = items.length ? items.reduce((s, i) => s + i.aiScore, 0) / items.length : 0;
    return { candidates, saved, imported, avgMargin, avgAi };
  }, [items]);

  // ── Filtered + sorted ─────────────────────────────────────────────────────────

  const displayed = useMemo(() => {
    let list = items;

    if (filterTab !== 'all') {
      list = list.filter((i) => i.status === filterTab);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((i) => i.keyword.toLowerCase().includes(q));
    }

    list = [...list].sort((a, b) => {
      let av: number | string = 0;
      let bv: number | string = 0;
      if (sortKey === 'keyword') {
        av = a.keyword;
        bv = b.keyword;
      }
      if (sortKey === 'trendScore') {
        av = a.trendScore;
        bv = b.trendScore;
      }
      if (sortKey === 'margin') {
        av = a.marginPercent;
        bv = b.marginPercent;
      }
      if (sortKey === 'aiScore') {
        av = a.aiScore;
        bv = b.aiScore;
      }
      if (sortKey === 'createdAt') {
        av = a.addedAt;
        bv = b.addedAt;
      }

      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }, [items, filterTab, search, sortKey, sortDir]);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  const allSelected = displayed.length > 0 && displayed.every((i) => selected.has(i.id));

  function toggleSelectAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(displayed.map((i) => i.id)));
    }
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  // ── Actions ───────────────────────────────────────────────────────────────────

  function setItemActioning(id: string, on: boolean) {
    setActioning((prev) => {
      const next = new Set(prev);
      on ? next.add(id) : next.delete(id);
      return next;
    });
  }

  async function patchStatus(id: string, status: ResearchItemStatus) {
    setItemActioning(id, true);
    try {
      const res = await fetch(`/api/admin/research/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Failed to update');
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, status } : i)));
      addToast({ type: 'success', message: `Marked as ${STATUS_CONFIG[status].label}` });
    } catch {
      addToast({ type: 'error', message: 'Failed to update status' });
    } finally {
      setItemActioning(id, false);
    }
  }

  async function patchPrices(id: string, costPrice: number, salePrice: number) {
    setItemActioning(id, true);
    try {
      const res = await fetch(`/api/admin/research/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ costPrice, salePrice }),
      });
      const data = (await res.json()) as { item?: ResearchItem; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Failed to update');
      if (data.item) {
        setItems((prev) => prev.map((i) => (i.id === id ? data.item! : i)));
      }
      setEditingId(null);
      addToast({ type: 'success', message: 'Prices updated' });
    } catch {
      addToast({ type: 'error', message: 'Failed to update prices' });
    } finally {
      setItemActioning(id, false);
    }
  }

  async function importItem(id: string) {
    setItemActioning(id, true);
    try {
      const res = await fetch(`/api/admin/research/${id}/import`, { method: 'POST' });
      if (!res.ok) throw new Error('Import failed');
      setItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, status: 'imported' as const } : i)),
      );
      addToast({ type: 'success', message: 'Imported to Shopify as draft' });
    } catch {
      addToast({ type: 'error', message: 'Import to Shopify failed' });
    } finally {
      setItemActioning(id, false);
    }
  }

  async function deleteItem(id: string) {
    if (!confirm('Delete this research item?')) return;
    setItemActioning(id, true);
    try {
      const res = await fetch(`/api/admin/research/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      setItems((prev) => prev.filter((i) => i.id !== id));
      setSelected((prev) => {
        const n = new Set(prev);
        n.delete(id);
        return n;
      });
      addToast({ type: 'success', message: 'Item deleted' });
    } catch {
      addToast({ type: 'error', message: 'Failed to delete item' });
    } finally {
      setItemActioning(id, false);
    }
  }

  async function bulkAction(action: 'import' | 'discard') {
    const ids = [...selected];
    if (!ids.length) return;
    for (const id of ids) {
      if (action === 'import') {
        await importItem(id);
      } else {
        await patchStatus(id, 'discarded');
      }
    }
    setSelected(new Set());
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6" data-testid="research-board-page">
      {/* ── Header ── */}
      <div className="flex items-start gap-4">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center flex-none"
          style={{ backgroundColor: 'color-mix(in srgb, var(--admin-brand) 15%, transparent)' }}
        >
          <span
            className="material-symbols-outlined"
            style={{ fontSize: 24, color: 'var(--admin-brand)' }}
          >
            science
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="admin-h1 text-2xl">Research Board</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>
            Manage product candidates before importing to Shopify
          </p>
        </div>
      </div>

      {/* ── Stat cards ── */}
      {!loading && !fetchError && (
        <div
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3"
          data-testid="stat-cards"
        >
          <StatCard
            label="Total Items"
            value={items.length}
            icon="inventory_2"
            color="var(--admin-accent)"
          />
          <StatCard
            label="Candidates"
            value={stats.candidates}
            icon="search"
            color="var(--admin-info)"
          />
          <StatCard
            label="Saved"
            value={stats.saved}
            icon="bookmark"
            color="var(--admin-success)"
          />
          <StatCard
            label="Imported"
            value={stats.imported}
            icon="cloud_upload"
            color="var(--admin-brand)"
          />
          <StatCard
            label="Avg Margin"
            value={`${stats.avgMargin.toFixed(1)}%`}
            icon="percent"
            color="var(--admin-success)"
          />
          <StatCard
            label="Avg AI Score"
            value={Math.round(stats.avgAi)}
            icon="auto_awesome"
            color="var(--admin-accent)"
          />
        </div>
      )}

      {/* ── Filter tabs + search ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div
          className="flex items-center gap-1 rounded-xl p-1 overflow-x-auto"
          style={{
            backgroundColor: 'var(--admin-bg-elevated)',
            border: '1px solid var(--admin-border)',
          }}
          data-testid="filter-tabs"
        >
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setFilterTab(tab.id);
                setSelected(new Set());
              }}
              data-testid={`filter-tab-${tab.id}`}
              className="px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all"
              style={{
                backgroundColor:
                  filterTab === tab.id
                    ? 'color-mix(in srgb, var(--admin-brand) 15%, transparent)'
                    : 'transparent',
                border:
                  filterTab === tab.id
                    ? '1px solid color-mix(in srgb, var(--admin-brand) 30%, transparent)'
                    : '1px solid transparent',
                color: filterTab === tab.id ? 'var(--admin-brand)' : 'var(--admin-text-muted)',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative flex-1 min-w-0 w-full sm:w-auto">
          <span
            className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2"
            style={{ fontSize: 16, color: 'var(--admin-text-disabled)' }}
          >
            search
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by keyword…"
            data-testid="search-input"
            className="w-full rounded-xl pl-9 pr-4 py-2 text-sm outline-none transition-colors"
            style={{
              backgroundColor: 'var(--admin-bg-card)',
              border: '1px solid var(--admin-border)',
              color: 'var(--admin-text)',
            }}
          />
        </div>
      </div>

      {/* ── Bulk actions bar ��─ */}
      {selected.size > 0 && (
        <div
          data-testid="bulk-actions-bar"
          className="flex items-center gap-3 rounded-xl px-4 py-3"
          style={{
            backgroundColor: 'var(--admin-bg-card)',
            border: '1px solid color-mix(in srgb, var(--admin-brand) 30%, transparent)',
          }}
        >
          <span className="text-sm font-medium" style={{ color: 'var(--admin-brand)' }}>
            {selected.size} selected
          </span>
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={() => bulkAction('import')}
              className="flex items-center gap-1.5 font-semibold rounded-xl px-4 py-2 text-xs transition-colors"
              style={{ backgroundColor: 'var(--admin-brand)', color: 'var(--admin-bg)' }}
            >
              <span className="material-symbols-outlined text-sm">cloud_upload</span>
              Import Selected
            </button>
            <button
              onClick={() => bulkAction('discard')}
              className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs transition-colors"
              style={{
                backgroundColor: 'var(--admin-border)',
                color: 'var(--admin-text-secondary)',
              }}
            >
              <span className="material-symbols-outlined text-sm">delete_sweep</span>
              Discard Selected
            </button>
            <button
              onClick={() => setSelected(new Set())}
              className="transition-colors"
              style={{ color: 'var(--admin-text-muted)' }}
              aria-label="Clear selection"
            >
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Content ── */}
      {loading && <TableSkeleton />}

      {!loading && fetchError && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <span
            className="material-symbols-outlined text-5xl mb-3"
            style={{ color: 'var(--admin-error)' }}
          >
            error
          </span>
          <p className="font-medium mb-1" style={{ color: 'var(--admin-error)' }}>
            Failed to load research items
          </p>
          <p className="text-sm mb-4" style={{ color: 'var(--admin-text-muted)' }}>
            {fetchError}
          </p>
          <button
            onClick={fetchItems}
            className="flex items-center gap-2 font-semibold rounded-xl px-5 py-2.5 text-sm transition-colors"
            style={{ backgroundColor: 'var(--admin-brand)', color: 'var(--admin-bg)' }}
          >
            <span className="material-symbols-outlined text-base">refresh</span>
            Retry
          </button>
        </div>
      )}

      {!loading && !fetchError && items.length === 0 && (
        <div
          data-testid="empty-state"
          className="flex flex-col items-center justify-center py-24 text-center rounded-2xl"
          style={{ border: '1px dashed var(--admin-border)' }}
        >
          <span
            className="material-symbols-outlined text-5xl mb-4"
            style={{ color: 'var(--admin-text-disabled)' }}
          >
            science
          </span>
          <p className="font-semibold text-lg mb-2" style={{ color: 'var(--admin-text)' }}>
            No items yet
          </p>
          <p className="text-sm mb-6" style={{ color: 'var(--admin-text-muted)' }}>
            Browse the Explorer to find trending products and add them here.
          </p>
          <Link
            href="/admin/explorer"
            className="flex items-center gap-2 font-semibold rounded-xl px-5 py-2.5 text-sm transition-colors"
            style={{ backgroundColor: 'var(--admin-brand)', color: 'var(--admin-bg)' }}
          >
            <span className="material-symbols-outlined text-base">explore</span>
            Open Explorer
          </Link>
        </div>
      )}

      {!loading && !fetchError && items.length > 0 && displayed.length === 0 && (
        <div
          data-testid="no-results-state"
          className="flex flex-col items-center justify-center py-16 text-center"
        >
          <span
            className="material-symbols-outlined text-5xl mb-3"
            style={{ color: 'var(--admin-text-disabled)' }}
          >
            search_off
          </span>
          <p className="font-medium mb-1" style={{ color: 'var(--admin-text)' }}>
            No items match your filter
          </p>
          <p className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>
            Try a different tab or search query
          </p>
        </div>
      )}

      {!loading && !fetchError && displayed.length > 0 && (
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            backgroundColor: 'var(--admin-bg-card)',
            border: '1px solid var(--admin-border)',
          }}
          data-testid="research-table"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--admin-border)' }}>
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      data-testid="select-all-checkbox"
                      className="w-4 h-4 rounded cursor-pointer"
                      style={{ accentColor: 'var(--admin-brand)' }}
                    />
                  </th>
                  <SortTh
                    col="keyword"
                    label="Keyword"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={handleSort}
                  />
                  <th
                    className="text-left text-xs font-semibold uppercase tracking-wider px-2 py-3"
                    style={{ color: 'var(--admin-text-muted)' }}
                  >
                    State
                  </th>
                  <SortTh
                    col="trendScore"
                    label="Trend"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={handleSort}
                  />
                  <th
                    className="text-left text-xs font-semibold uppercase tracking-wider px-2 py-3"
                    style={{ color: 'var(--admin-text-muted)' }}
                  >
                    Prices
                  </th>
                  <SortTh
                    col="margin"
                    label="Margin"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={handleSort}
                  />
                  <SortTh
                    col="aiScore"
                    label="AI Score"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={handleSort}
                  />
                  <th
                    className="text-left text-xs font-semibold uppercase tracking-wider px-2 py-3"
                    style={{ color: 'var(--admin-text-muted)' }}
                  >
                    Status
                  </th>
                  <th
                    className="text-right text-xs font-semibold uppercase tracking-wider px-4 py-3"
                    style={{ color: 'var(--admin-text-muted)' }}
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {displayed.map((item) => {
                  const sc = STATUS_CONFIG[item.status];
                  const busy = actioning.has(item.id);
                  const isEditing = editingId === item.id;

                  return (
                    <tr
                      key={item.id}
                      data-testid="research-row"
                      className="group transition-colors"
                      style={{
                        borderBottom: '1px solid var(--admin-border)',
                        backgroundColor: selected.has(item.id)
                          ? 'color-mix(in srgb, var(--admin-brand) 5%, transparent)'
                          : 'transparent',
                      }}
                      onMouseEnter={(e) => {
                        if (!selected.has(item.id))
                          e.currentTarget.style.backgroundColor = 'var(--admin-bg-hover)';
                      }}
                      onMouseLeave={(e) => {
                        if (!selected.has(item.id))
                          e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selected.has(item.id)}
                          onChange={() => toggleSelect(item.id)}
                          className="w-4 h-4 rounded cursor-pointer"
                          style={{ accentColor: 'var(--admin-brand)' }}
                        />
                      </td>
                      <td className="px-2 py-3 max-w-[160px]">
                        <p
                          className="font-medium text-xs truncate"
                          style={{ color: 'var(--admin-text)' }}
                        >
                          {item.keyword}
                        </p>
                        {item.category && (
                          <p
                            className="text-[10px] truncate"
                            style={{ color: 'var(--admin-text-muted)' }}
                          >
                            {item.category}
                          </p>
                        )}
                      </td>
                      <td className="px-2 py-3">
                        <TrendStateBadge state={item.trendState} size="sm" />
                      </td>
                      <td className="px-2 py-3">
                        <ScoreRing score={item.trendScore} state={item.trendState} size="sm" />
                      </td>
                      <td className="px-2 py-3">
                        {isEditing ? (
                          <EditPricesInline
                            item={item}
                            onSave={patchPrices}
                            onCancel={() => setEditingId(null)}
                          />
                        ) : (
                          <div
                            className="text-xs whitespace-nowrap"
                            style={{ color: 'var(--admin-text-secondary)' }}
                          >
                            <span style={{ color: 'var(--admin-text-muted)' }}>C</span> $
                            {item.costPrice.toFixed(2)}
                            {' / '}
                            <span style={{ color: 'var(--admin-text-muted)' }}>S</span> $
                            {item.salePrice.toFixed(2)}
                          </div>
                        )}
                      </td>
                      <td className="px-2 py-3">
                        <MarginBadge margin={item.marginPercent} />
                      </td>
                      <td className="px-2 py-3">
                        <AiScoreBadge
                          score={item.aiScore}
                          label={item.aiScoreLabel}
                          breakdown={item.aiScoreBreakdown}
                        />
                      </td>
                      <td className="px-2 py-3">
                        <span
                          className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium"
                          style={{
                            color: sc.color,
                            backgroundColor: sc.bg,
                            border: `1px solid ${sc.border}`,
                          }}
                        >
                          {sc.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {!isEditing && (
                            <button
                              onClick={() => setEditingId(item.id)}
                              disabled={busy}
                              title="Edit prices"
                              className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors disabled:opacity-40"
                              style={{ color: 'var(--admin-text-muted)' }}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                                edit
                              </span>
                            </button>
                          )}
                          {item.status === 'candidate' && (
                            <button
                              onClick={() => patchStatus(item.id, 'saved')}
                              disabled={busy}
                              title="Save"
                              className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors disabled:opacity-40"
                              style={{ color: 'var(--admin-text-muted)' }}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                                bookmark
                              </span>
                            </button>
                          )}
                          {item.status !== 'imported' && (
                            <button
                              onClick={() => importItem(item.id)}
                              disabled={busy}
                              title="Import to Shopify"
                              className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors disabled:opacity-40"
                              style={{ color: 'var(--admin-text-muted)' }}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                                cloud_upload
                              </span>
                            </button>
                          )}
                          {item.status !== 'discarded' && (
                            <button
                              onClick={() => patchStatus(item.id, 'discarded')}
                              disabled={busy}
                              title="Discard"
                              className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors disabled:opacity-40"
                              style={{ color: 'var(--admin-text-muted)' }}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                                archive
                              </span>
                            </button>
                          )}
                          <button
                            onClick={() => deleteItem(item.id)}
                            disabled={busy}
                            title="Delete"
                            className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors disabled:opacity-40"
                            style={{ color: 'var(--admin-text-muted)' }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                              delete
                            </span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="px-4 py-3" style={{ borderTop: '1px solid var(--admin-border)' }}>
            <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
              Showing {displayed.length} of {items.length} item{items.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
