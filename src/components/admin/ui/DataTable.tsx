'use client';

/**
 * AdminDataTable — Phase 1
 *
 * Sortable table with built-in empty state, loading skeleton, and pagination.
 * Replaces all the custom table implementations across admin pages.
 *
 * Usage:
 *   <AdminDataTable
 *     columns={[
 *       { key: 'name', label: 'Name' },
 *       { key: 'status', label: 'Status', render: (row) => <AdminBadge>...</AdminBadge> },
 *     ]}
 *     data={products}
 *     loading={isLoading}
 *     emptyIcon="inventory_2"
 *     emptyTitle="No products found"
 *   />
 */

import { useState, useCallback, type ReactNode } from 'react';
import { AdminSkeleton } from './Skeleton';
import { AdminEmptyState } from './EmptyState';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  /** Custom cell renderer. Falls back to row[key] as string. */
  render?: (row: T, index: number) => ReactNode;
  /** Header alignment */
  align?: 'left' | 'center' | 'right';
  /** Column width hint */
  width?: string;
}

interface AdminDataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  /** Number of skeleton rows to show while loading */
  skeletonRows?: number;
  /** Row key extractor — defaults to index */
  rowKey?: (row: T, index: number) => string;
  emptyIcon?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  onRowClick?: (row: T, index: number) => void;
}

type SortDir = 'asc' | 'desc';

// ─── Component ──────────────────────────────────────────────────────────────

export function AdminDataTable<T extends Record<string, unknown>>({
  columns,
  data,
  loading = false,
  skeletonRows = 5,
  rowKey,
  emptyIcon = 'search_off',
  emptyTitle = 'No results found',
  emptyDescription,
  emptyAction,
  onRowClick,
}: AdminDataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const handleSort = useCallback(
    (key: string) => {
      if (sortKey === key) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortKey(key);
        setSortDir('asc');
      }
    },
    [sortKey],
  );

  // Sort data
  const sorted = sortKey
    ? [...data].sort((a, b) => {
        const aVal = a[sortKey];
        const bVal = b[sortKey];
        if (aVal == null || bVal == null) return 0;
        const cmp = String(aVal).localeCompare(String(bVal), undefined, { numeric: true });
        return sortDir === 'asc' ? cmp : -cmp;
      })
    : data;

  const alignClass = (align?: string) =>
    align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';

  return (
    <div
      className="rounded-2xl border overflow-hidden"
      style={{
        backgroundColor: 'var(--admin-bg-card)',
        borderColor: 'var(--admin-border)',
      }}
    >
      <div className="overflow-x-auto">
        <table className="w-full">
          {/* Header */}
          <thead>
            <tr style={{ borderBottom: '1px solid var(--admin-border)' }}>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-6 py-3 text-xs font-medium uppercase tracking-wider ${alignClass(col.align)} ${
                    col.sortable ? 'cursor-pointer select-none' : ''
                  }`}
                  style={{ color: 'var(--admin-text-muted)', width: col.width }}
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {col.sortable && sortKey === col.key && (
                      <span className="material-symbols-outlined text-xs">
                        {sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                      </span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>

          {/* Body */}
          <tbody>
            {loading
              ? Array.from({ length: skeletonRows }, (_, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--admin-border)' }}>
                    {columns.map((col) => (
                      <td key={col.key} className="px-6 py-3">
                        <AdminSkeleton variant="text" className="h-4 w-3/4" />
                      </td>
                    ))}
                  </tr>
                ))
              : sorted.map((row, i) => (
                  <tr
                    key={rowKey ? rowKey(row, i) : i}
                    className={`transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
                    style={{ borderBottom: '1px solid var(--admin-border)' }}
                    onClick={onRowClick ? () => onRowClick(row, i) : undefined}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.backgroundColor =
                        'var(--admin-bg-hover)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                    }}
                  >
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={`px-6 py-3 text-sm ${alignClass(col.align)}`}
                        style={{ color: 'var(--admin-text-body)' }}
                      >
                        {col.render ? col.render(row, i) : String(row[col.key] ?? '—')}
                      </td>
                    ))}
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      {/* Empty state */}
      {!loading && sorted.length === 0 && (
        <AdminEmptyState
          icon={emptyIcon}
          title={emptyTitle}
          description={emptyDescription}
          action={emptyAction}
        />
      )}
    </div>
  );
}
