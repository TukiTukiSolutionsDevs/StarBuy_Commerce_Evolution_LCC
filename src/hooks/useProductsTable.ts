'use client';

/**
 * useProductsTable
 *
 * Encapsulates sorting, status-filtering, bulk selection, and inline price
 * editing state for the Admin Products page.
 */

import { useState, useMemo, useCallback } from 'react';

// ─── Types ─────────────────────────────────────────────────────────────────────

export type Product = {
  id: string;
  title: string;
  handle: string;
  status: 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
  vendor: string;
  productType: string;
  tags: string[];
  descriptionHtml: string;
  priceRangeV2: {
    minVariantPrice: { amount: string; currencyCode: string };
    maxVariantPrice: { amount: string; currencyCode: string };
  };
  featuredImage: { url: string; altText: string | null } | null;
  variants: {
    edges: Array<{
      node: {
        id: string;
        title: string;
        price: string;
        compareAtPrice: string | null;
        inventoryQuantity: number | null;
      };
    }>;
  };
  createdAt: string;
  updatedAt: string;
};

export type SortField = 'title' | 'status' | 'price' | 'inventory';
export type SortDirection = 'asc' | 'desc';
export type StatusFilter = 'ALL' | 'ACTIVE' | 'DRAFT' | 'ARCHIVED';

// ─── Status sort order (A → D → AR) ───────────────────────────────────────────

const STATUS_ORDER: Record<string, number> = {
  ACTIVE: 0,
  DRAFT: 1,
  ARCHIVED: 2,
};

// ─── Hook ──────────────────────────────────────────────────────────────────────

export function useProductsTable(products: Product[]) {
  // ── Sorting ─────────────────────────────────────────────────────────────────

  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }

  // ── Status filter ────────────────────────────────────────────────────────────

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');

  const statusCounts = useMemo(
    () => ({
      ALL: products.length,
      ACTIVE: products.filter((p) => p.status === 'ACTIVE').length,
      DRAFT: products.filter((p) => p.status === 'DRAFT').length,
      ARCHIVED: products.filter((p) => p.status === 'ARCHIVED').length,
    }),
    [products],
  );

  // ── Filtered + sorted products ───────────────────────────────────────────────

  const displayedProducts = useMemo(() => {
    let result = products;

    // Filter by status
    if (statusFilter !== 'ALL') {
      result = result.filter((p) => p.status === statusFilter);
    }

    // Sort
    if (sortField) {
      result = [...result].sort((a, b) => {
        let cmp = 0;

        if (sortField === 'title') {
          cmp = a.title.localeCompare(b.title);
        } else if (sortField === 'status') {
          cmp = (STATUS_ORDER[a.status] ?? 0) - (STATUS_ORDER[b.status] ?? 0);
        } else if (sortField === 'price') {
          const pa = parseFloat(a.priceRangeV2.minVariantPrice.amount) || 0;
          const pb = parseFloat(b.priceRangeV2.minVariantPrice.amount) || 0;
          cmp = pa - pb;
        } else if (sortField === 'inventory') {
          const ia = a.variants.edges.reduce((s, e) => s + (e.node.inventoryQuantity ?? 0), 0);
          const ib = b.variants.edges.reduce((s, e) => s + (e.node.inventoryQuantity ?? 0), 0);
          cmp = ia - ib;
        }

        return sortDirection === 'asc' ? cmp : -cmp;
      });
    }

    return result;
  }, [products, statusFilter, sortField, sortDirection]);

  // ── Bulk selection ───────────────────────────────────────────────────────────

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const allSelected =
    displayedProducts.length > 0 && displayedProducts.every((p) => selectedIds.has(p.id));

  const someSelected = selectedIds.size > 0;

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(displayedProducts.map((p) => p.id)));
    }
  }

  function toggleSelectOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  // ── Inline price editing ─────────────────────────────────────────────────────

  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [editingPriceValue, setEditingPriceValue] = useState('');

  const startPriceEdit = useCallback((productId: string, currentPrice: string) => {
    setEditingPriceId(productId);
    setEditingPriceValue(currentPrice);
  }, []);

  const cancelPriceEdit = useCallback(() => {
    setEditingPriceId(null);
    setEditingPriceValue('');
  }, []);

  return {
    // Sort
    sortField,
    sortDirection,
    toggleSort,

    // Filter
    statusFilter,
    setStatusFilter,
    statusCounts,

    // Processed list
    displayedProducts,

    // Bulk select
    selectedIds,
    allSelected,
    someSelected,
    toggleSelectAll,
    toggleSelectOne,
    clearSelection,

    // Inline price edit
    editingPriceId,
    editingPriceValue,
    setEditingPriceValue,
    startPriceEdit,
    cancelPriceEdit,
  };
}
