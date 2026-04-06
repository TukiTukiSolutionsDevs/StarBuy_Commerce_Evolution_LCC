'use client';

/**
 * Admin Products Page
 *
 * Full CRUD + sorting + status filtering + bulk actions + inline price editing.
 * Calls /api/admin/products via fetch — no direct Shopify calls from client.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useToast } from '@/components/ui/useToast';
import { useProductsTable } from '@/hooks/useProductsTable';
import type { Product, SortField, StatusFilter } from '@/hooks/useProductsTable';

// ─── Types ─────────────────────────────────────────────────────────────────────

type ProductFormData = {
  title: string;
  descriptionHtml: string;
  vendor: string;
  productType: string;
  price: string;
  compareAtPrice: string;
  tags: string;
  status: 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
};

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
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.color }} />
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

// ─── Sort Header Cell ───────────────────────────────────────────────────────────

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
  direction: 'asc' | 'desc';
  onSort: (f: SortField) => void;
  className?: string;
}) {
  const isActive = activeField === field;
  return (
    <th
      className={`text-left text-xs font-medium uppercase tracking-wider px-6 py-3 cursor-pointer select-none group ${className ?? ''}`}
      onClick={() => onSort(field)}
    >
      <span
        className={`inline-flex items-center gap-1 transition-colors ${
          isActive ? 'text-[#d4a843]' : 'text-[#6b7280] group-hover:text-[#9ca3af]'
        }`}
      >
        {label}
        {isActive ? (
          <span className="material-symbols-outlined text-sm">
            {direction === 'asc' ? 'arrow_upward' : 'arrow_downward'}
          </span>
        ) : (
          <span className="material-symbols-outlined text-sm opacity-0 group-hover:opacity-40">
            unfold_more
          </span>
        )}
      </span>
    </th>
  );
}

// ─── Skeleton Row ───────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr className="border-b border-[#1f2d4e]">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <td key={i} className="px-6 py-4">
          <div
            className="h-4 bg-[#1f2d4e] rounded animate-pulse"
            style={{ width: i === 1 ? '24px' : i === 2 ? '180px' : '80px' }}
          />
        </td>
      ))}
    </tr>
  );
}

// ─── Product Form ───────────────────────────────────────────────────────────────

const EMPTY_FORM: ProductFormData = {
  title: '',
  descriptionHtml: '',
  vendor: '',
  productType: '',
  price: '',
  compareAtPrice: '',
  tags: '',
  status: 'ACTIVE',
};

function ProductForm({
  initial,
  onSubmit,
  loading,
  submitLabel,
  imageSlot,
}: {
  initial: ProductFormData;
  onSubmit: (data: ProductFormData) => void;
  loading: boolean;
  submitLabel: string;
  imageSlot?: React.ReactNode;
}) {
  const [form, setForm] = useState<ProductFormData>(initial);
  const [descMode, setDescMode] = useState<'edit' | 'preview'>('edit');
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    setForm(initial);
  }, [initial]);

  function set(key: keyof ProductFormData, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function addTag() {
    const newTag = tagInput.trim();
    if (!newTag) return;
    const existing = form.tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    if (existing.includes(newTag)) {
      setTagInput('');
      return;
    }
    const updated = [...existing, newTag].join(', ');
    set('tags', updated);
    setTagInput('');
  }

  function removeTag(tag: string) {
    const updated = form.tags
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t && t !== tag)
      .join(', ');
    set('tags', updated);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit(form);
  }

  const inputClass =
    'w-full bg-[#0a0f1e] border border-[#1f2d4e] focus:border-[#d4a843]/50 focus:outline-none text-white placeholder:text-[#374151] rounded-xl px-4 py-2.5 text-sm transition-colors';

  const labelClass = 'block text-xs font-medium mb-1.5' as const;

  const statusColor: Record<string, string> = {
    ACTIVE: '#10b981',
    DRAFT: '#d4a843',
    ARCHIVED: '#6b7280',
  };

  const currentTags = form.tags
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  return (
    <form onSubmit={handleSubmit}>
      {/* ── Two-column grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── LEFT COLUMN (2/3) ── */}
        <div className="lg:col-span-2 space-y-5">
          {/* Media card */}
          <div className="bg-[#0a0f1e] border border-[#1f2d4e] rounded-xl p-4">
            <h4
              className="text-xs font-semibold uppercase tracking-wider mb-3"
              style={{ color: '#9ca3af' }}
            >
              Media
            </h4>
            {imageSlot ?? (
              <p className="text-xs" style={{ color: '#374151' }}>
                Save the product first to upload images.
              </p>
            )}
          </div>

          {/* Title */}
          <div className="bg-[#0a0f1e] border border-[#1f2d4e] rounded-xl p-4">
            <h4
              className="text-xs font-semibold uppercase tracking-wider mb-3"
              style={{ color: '#9ca3af' }}
            >
              Product Details
            </h4>
            <div>
              <label className={labelClass} style={{ color: '#9ca3af' }}>
                Title <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                required
                value={form.title}
                onChange={(e) => set('title', e.target.value)}
                placeholder="Product title"
                className={inputClass}
              />
            </div>
          </div>

          {/* Description */}
          <div className="bg-[#0a0f1e] border border-[#1f2d4e] rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h4
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: '#9ca3af' }}
              >
                Description
              </h4>
              <div className="flex items-center gap-1 bg-[#111827] border border-[#1f2d4e] rounded-lg p-0.5">
                <button
                  type="button"
                  onClick={() => setDescMode('edit')}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    descMode === 'edit'
                      ? 'bg-[#1f2d4e] text-white'
                      : 'text-[#6b7280] hover:text-[#9ca3af]'
                  }`}
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => setDescMode('preview')}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    descMode === 'preview'
                      ? 'bg-[#1f2d4e] text-white'
                      : 'text-[#6b7280] hover:text-[#9ca3af]'
                  }`}
                >
                  Preview
                </button>
              </div>
            </div>

            {descMode === 'edit' ? (
              <textarea
                rows={6}
                value={form.descriptionHtml}
                onChange={(e) => set('descriptionHtml', e.target.value)}
                placeholder="Product description (HTML supported)"
                className={`${inputClass} resize-none`}
              />
            ) : (
              <div
                className="prose prose-invert prose-sm max-w-none bg-[#111827] border border-[#1f2d4e] rounded-xl p-4 min-h-[120px]"
                dangerouslySetInnerHTML={{
                  __html:
                    form.descriptionHtml ||
                    '<p style="color:#374151;font-size:0.875rem">No description yet.</p>',
                }}
              />
            )}
          </div>
        </div>

        {/* ── RIGHT COLUMN (1/3) ── */}
        <div className="lg:col-span-1 space-y-4">
          {/* Status */}
          <div className="bg-[#0a0f1e] border border-[#1f2d4e] rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: '#9ca3af' }}
              >
                Status
              </h4>
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                style={{
                  backgroundColor: `${statusColor[form.status] ?? '#6b7280'}18`,
                  color: statusColor[form.status] ?? '#6b7280',
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: statusColor[form.status] ?? '#6b7280' }}
                />
                {form.status.charAt(0) + form.status.slice(1).toLowerCase()}
              </span>
            </div>
            <select
              value={form.status}
              onChange={(e) => set('status', e.target.value as ProductFormData['status'])}
              className={inputClass}
            >
              <option value="ACTIVE">Active</option>
              <option value="DRAFT">Draft</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>

          {/* Pricing */}
          <div className="bg-[#0a0f1e] border border-[#1f2d4e] rounded-xl p-4 space-y-3">
            <h4
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: '#9ca3af' }}
            >
              Pricing
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass} style={{ color: '#9ca3af' }}>
                  Price (USD) <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div className="relative">
                  <span
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-sm"
                    style={{ color: '#6b7280' }}
                  >
                    $
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.price}
                    onChange={(e) => set('price', e.target.value)}
                    placeholder="0.00"
                    className={`${inputClass} pl-7`}
                  />
                </div>
              </div>
              <div>
                <label className={labelClass} style={{ color: '#9ca3af' }}>
                  Compare at
                </label>
                <div className="relative">
                  <span
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-sm"
                    style={{ color: '#6b7280' }}
                  >
                    $
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.compareAtPrice}
                    onChange={(e) => set('compareAtPrice', e.target.value)}
                    placeholder="0.00"
                    className={`${inputClass} pl-7`}
                  />
                </div>
              </div>
            </div>
            <p className="text-xs" style={{ color: '#374151' }}>
              Compare at price shows as crossed-out original price.
            </p>
          </div>

          {/* Organization */}
          <div className="bg-[#0a0f1e] border border-[#1f2d4e] rounded-xl p-4 space-y-3">
            <h4
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: '#9ca3af' }}
            >
              Organization
            </h4>
            <div>
              <label className={labelClass} style={{ color: '#9ca3af' }}>
                Vendor
              </label>
              <input
                value={form.vendor}
                onChange={(e) => set('vendor', e.target.value)}
                placeholder="Brand / Vendor"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass} style={{ color: '#9ca3af' }}>
                Type
              </label>
              <input
                value={form.productType}
                onChange={(e) => set('productType', e.target.value)}
                placeholder="e.g. Electronics"
                className={inputClass}
              />
            </div>
          </div>

          {/* Tags */}
          <div className="bg-[#0a0f1e] border border-[#1f2d4e] rounded-xl p-4 space-y-3">
            <h4
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: '#9ca3af' }}
            >
              Tags
            </h4>

            {/* Chips */}
            {currentTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {currentTags.map((tag, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs"
                    style={{ backgroundColor: '#1f2d4e', color: '#e5e7eb' }}
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="transition-colors"
                      style={{ color: '#6b7280' }}
                      onMouseEnter={(e) =>
                        ((e.currentTarget as HTMLButtonElement).style.color = '#ef4444')
                      }
                      onMouseLeave={(e) =>
                        ((e.currentTarget as HTMLButtonElement).style.color = '#6b7280')
                      }
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>
                        close
                      </span>
                    </button>
                  </span>
                ))}
              </div>
            )}

            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addTag();
                }
              }}
              placeholder="Add tag and press Enter…"
              className={inputClass}
            />
          </div>
        </div>
      </div>

      {/* ── Save Button ── */}
      <div className="mt-6 flex items-center gap-3">
        <button
          type="submit"
          disabled={loading || !form.title.trim()}
          className="flex-1 bg-[#d4a843] hover:bg-[#e4c06a] disabled:bg-[#1f2d4e] disabled:cursor-not-allowed text-[#0a0f1e] font-semibold rounded-xl py-3 text-sm transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <span className="material-symbols-outlined text-base animate-spin">
                progress_activity
              </span>
              Saving…
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-base">save</span>
              {submitLabel}
            </>
          )}
        </button>
        <span
          className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-medium flex-none"
          style={{
            backgroundColor: `${statusColor[form.status] ?? '#6b7280'}18`,
            color: statusColor[form.status] ?? '#6b7280',
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: statusColor[form.status] ?? '#6b7280' }}
          />
          {form.status.charAt(0) + form.status.slice(1).toLowerCase()}
        </span>
      </div>
    </form>
  );
}

// ─── Image Gallery (for Edit modal) ─────────────────────────────────────────────

type ImageItem = {
  id: string;
  image: { url: string; altText: string | null };
  status: string;
};

function ImageGallery({
  productId,
  onSuccess,
  onError,
}: {
  productId: string;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const pid = productId.replace('gid://shopify/Product/', '');

  const fetchImages = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/products/${pid}/images`);
      if (res.ok) {
        const data = await res.json();
        setImages(Array.isArray(data) ? data : []);
      }
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, [pid]);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  async function handleUpload(file: File) {
    if (file.size > 10 * 1024 * 1024) {
      onError('Image too large (max 10MB)');
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`/api/admin/products/${pid}/images`, {
        method: 'POST',
        body: fd,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Upload failed');
      }
      onSuccess('Image uploaded');
      fetchImages();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(mediaId: string) {
    try {
      const res = await fetch(`/api/admin/products/${pid}/images`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mediaId }),
      });
      if (!res.ok) throw new Error('Delete failed');
      setImages((prev) => prev.filter((img) => img.id !== mediaId));
      onSuccess('Image deleted');
    } catch {
      onError('Failed to delete image');
    }
  }

  return (
    <div>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {loading && <div className="w-20 h-20 rounded-lg bg-[#1f2d4e] animate-pulse flex-none" />}

        {images
          .filter((img) => img.image?.url)
          .map((img) => (
            <div key={img.id} className="relative group flex-none">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.image.url}
                alt={img.image.altText ?? ''}
                className="w-20 h-20 rounded-lg object-cover border border-[#1f2d4e]"
              />
              <button
                type="button"
                onClick={() => handleDelete(img.id)}
                className="absolute inset-0 bg-black/60 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-red-400 text-xl">delete</span>
              </button>
            </div>
          ))}

        {/* Upload button */}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="w-20 h-20 rounded-lg border-2 border-dashed border-[#1f2d4e] hover:border-[#d4a843] flex flex-col items-center justify-center text-[#6b7280] hover:text-[#d4a843] transition-colors flex-none"
        >
          {uploading ? (
            <span className="material-symbols-outlined text-xl animate-spin">
              progress_activity
            </span>
          ) : (
            <>
              <span className="material-symbols-outlined text-xl">add_photo_alternate</span>
              <span className="text-[9px] mt-0.5">Add</span>
            </>
          )}
        </button>

        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleUpload(f);
            e.target.value = '';
          }}
        />
      </div>
    </div>
  );
}

// ─── Modal ──────────────────────────────────────────────────────────────────────

function Modal({
  title,
  onClose,
  children,
  size = 'default',
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  size?: 'default' | 'wide';
}) {
  const overlayRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const maxW = size === 'wide' ? 'max-w-5xl' : 'max-w-lg';

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div
        className={`bg-[#111827] border border-[#1f2d4e] rounded-2xl w-full ${maxW} max-h-[90vh] flex flex-col shadow-2xl shadow-black/60`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1f2d4e]">
          <h2
            className="font-semibold"
            style={{ fontFamily: 'var(--font-heading)', color: '#ffffff' }}
          >
            {title}
          </h2>
          <button
            onClick={onClose}
            className="text-[#6b7280] hover:text-white transition-colors p-1 rounded-lg hover:bg-[#1f2d4e]"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

// ─── Delete Confirm Modal ───────────────────────────────────────────────────────

function DeleteConfirmModal({
  product,
  onConfirm,
  onCancel,
  loading,
}: {
  product: Product;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#111827] border border-[#1f2d4e] rounded-2xl w-full max-w-sm p-6 shadow-2xl shadow-black/60">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-[#ef4444]/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-[#ef4444] text-xl">delete</span>
          </div>
          <div>
            <p className="text-white font-semibold">Delete Product</p>
            <p className="text-[#6b7280] text-xs">This action cannot be undone</p>
          </div>
        </div>
        <p className="text-[#9ca3af] text-sm mb-6">
          Are you sure you want to delete{' '}
          <span className="text-white font-medium">&ldquo;{product.title}&rdquo;</span>?
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 bg-[#1f2d4e] hover:bg-[#263d6e] text-white rounded-xl py-2.5 text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 bg-[#ef4444] hover:bg-[#dc2626] disabled:bg-[#374151] text-white rounded-xl py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="material-symbols-outlined text-base animate-spin">
                  progress_activity
                </span>
                Deleting…
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-base">delete</span>
                Delete
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Bulk Action Bar ────────────────────────────────────────────────────────────

function BulkActionBar({
  count,
  progress,
  onSetActive,
  onArchive,
  onDelete,
  onClear,
}: {
  count: number;
  progress: string | null;
  onSetActive: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onClear: () => void;
}) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-3 bg-[#111827] border border-[#1f2d4e] rounded-2xl px-5 py-3 shadow-2xl shadow-black/60 backdrop-blur-sm">
      {progress ? (
        <span className="text-[#d4a843] text-sm font-medium flex items-center gap-2">
          <span className="material-symbols-outlined text-base animate-spin">
            progress_activity
          </span>
          {progress}
        </span>
      ) : (
        <>
          <span className="text-[#9ca3af] text-sm font-medium min-w-[80px]">{count} selected</span>
          <div className="w-px h-5 bg-[#1f2d4e]" />
          <button
            onClick={onSetActive}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#10b981]/10 hover:bg-[#10b981]/20 text-[#10b981] text-xs font-medium transition-colors"
          >
            <span className="material-symbols-outlined text-sm">check_circle</span>
            Set Active
          </button>
          <button
            onClick={onArchive}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#6b7280]/10 hover:bg-[#6b7280]/20 text-[#6b7280] hover:text-[#9ca3af] text-xs font-medium transition-colors"
          >
            <span className="material-symbols-outlined text-sm">archive</span>
            Archive
          </button>
          <button
            onClick={onDelete}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#ef4444]/10 hover:bg-[#ef4444]/20 text-[#ef4444] text-xs font-medium transition-colors"
          >
            <span className="material-symbols-outlined text-sm">delete</span>
            Delete
          </button>
          <div className="w-px h-5 bg-[#1f2d4e]" />
          <button
            onClick={onClear}
            className="text-[#374151] hover:text-[#6b7280] transition-colors"
            title="Deselect all"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </>
      )}
    </div>
  );
}

// ─── Status Filter Tabs ─────────────────────────────────────────────────────────

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'ARCHIVED', label: 'Archived' },
];

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function ProductsPage() {
  const { toast } = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [deleteProduct, setDeleteProduct] = useState<Product | null>(null);

  const [createLoading, setCreateLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [search, setSearch] = useState('');
  const [bulkProgress, setBulkProgress] = useState<string | null>(null);

  // ── Table logic from hook ─────────────────────────────────────────────────────

  const {
    sortField,
    sortDirection,
    toggleSort,
    statusFilter,
    setStatusFilter,
    statusCounts,
    displayedProducts,
    selectedIds,
    allSelected,
    someSelected,
    toggleSelectAll,
    toggleSelectOne,
    clearSelection,
    editingPriceId,
    editingPriceValue,
    setEditingPriceValue,
    startPriceEdit,
    cancelPriceEdit,
  } = useProductsTable(products);

  // ── Fetch products ────────────────────────────────────────────────────────────

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const qs = search ? `?q=${encodeURIComponent(search)}` : '';
      const res = await fetch(`/api/admin/products${qs}`);
      const data = (await res.json()) as { products?: Product[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Failed to load');
      setProducts(data.products ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(() => fetchProducts(), search ? 400 : 0);
    return () => clearTimeout(timer);
  }, [fetchProducts, search]);

  // ── Create ────────────────────────────────────────────────────────────────────

  async function handleCreate(form: ProductFormData) {
    setCreateLoading(true);
    try {
      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          tags: form.tags
            ? form.tags
                .split(',')
                .map((t) => t.trim())
                .filter(Boolean)
            : [],
        }),
      });
      const data = (await res.json()) as { product?: Product; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Failed to create');
      setCreateOpen(false);
      toast.success(`"${form.title}" created successfully`);
      fetchProducts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Create failed');
    } finally {
      setCreateLoading(false);
    }
  }

  // ── Edit ──────────────────────────────────────────────────────────────────────

  async function handleEdit(form: ProductFormData) {
    if (!editProduct) return;
    setEditLoading(true);
    try {
      const id = editProduct.id.replace('gid://shopify/Product/', '');
      const res = await fetch(`/api/admin/products/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          descriptionHtml: form.descriptionHtml,
          vendor: form.vendor,
          productType: form.productType,
          tags: form.tags
            ? form.tags
                .split(',')
                .map((t) => t.trim())
                .filter(Boolean)
            : [],
          status: form.status,
        }),
      });
      const data = (await res.json()) as { product?: Product; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Failed to update');
      setEditProduct(null);
      toast.success(`"${form.title}" updated successfully`);
      fetchProducts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setEditLoading(false);
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────────

  async function handleDelete() {
    if (!deleteProduct) return;
    setDeleteLoading(true);
    try {
      const id = deleteProduct.id.replace('gid://shopify/Product/', '');
      const res = await fetch(`/api/admin/products/${id}`, { method: 'DELETE' });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Failed to delete');
      const title = deleteProduct.title;
      setDeleteProduct(null);
      toast.success(`"${title}" deleted`);
      fetchProducts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setDeleteLoading(false);
    }
  }

  // ── Inline Price Edit ─────────────────────────────────────────────────────────

  async function commitPriceEdit(product: Product) {
    const newPrice = editingPriceValue.trim();
    if (!newPrice || isNaN(parseFloat(newPrice))) {
      cancelPriceEdit();
      return;
    }
    const id = product.id.replace('gid://shopify/Product/', '');
    cancelPriceEdit();
    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ price: newPrice }),
      });
      const data = (await res.json()) as { product?: Product; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Price update failed');
      toast.success(`Price updated to $${parseFloat(newPrice).toFixed(2)}`);
      fetchProducts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Price update failed');
    }
  }

  // ── Bulk Actions ──────────────────────────────────────────────────────────────

  async function handleBulkStatusChange(status: 'ACTIVE' | 'ARCHIVED') {
    const ids = Array.from(selectedIds);
    const label = status === 'ACTIVE' ? 'activated' : 'archived';
    let succeeded = 0;
    let failed = 0;

    for (let i = 0; i < ids.length; i++) {
      setBulkProgress(`Processing ${i + 1}/${ids.length}…`);
      const numericId = ids[i].replace('gid://shopify/Product/', '');
      try {
        const res = await fetch(`/api/admin/products/${numericId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        });
        if (res.ok) {
          succeeded++;
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
    }

    setBulkProgress(null);
    clearSelection();

    if (succeeded > 0) {
      toast.success(`${succeeded} product${succeeded !== 1 ? 's' : ''} ${label}`);
    }
    if (failed > 0) {
      toast.error(`${failed} product${failed !== 1 ? 's' : ''} failed`);
    }

    fetchProducts();
  }

  async function handleBulkDelete() {
    const ids = Array.from(selectedIds);
    let succeeded = 0;
    let failed = 0;

    for (let i = 0; i < ids.length; i++) {
      setBulkProgress(`Deleting ${i + 1}/${ids.length}…`);
      const numericId = ids[i].replace('gid://shopify/Product/', '');
      try {
        const res = await fetch(`/api/admin/products/${numericId}`, { method: 'DELETE' });
        if (res.ok) {
          succeeded++;
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
    }

    setBulkProgress(null);
    clearSelection();

    if (succeeded > 0) {
      toast.success(`${succeeded} product${succeeded !== 1 ? 's' : ''} deleted`);
    }
    if (failed > 0) {
      toast.error(`${failed} product${failed !== 1 ? 's' : ''} failed to delete`);
    }

    fetchProducts();
  }

  // ── Edit initial form ─────────────────────────────────────────────────────────

  function productToForm(p: Product): ProductFormData {
    const price = p.variants.edges[0]?.node.price ?? '';
    const compareAtPrice = p.variants.edges[0]?.node.compareAtPrice ?? '';
    return {
      title: p.title,
      descriptionHtml: p.descriptionHtml ?? '',
      vendor: p.vendor ?? '',
      productType: p.productType ?? '',
      price,
      compareAtPrice: compareAtPrice ?? '',
      tags: (p.tags ?? []).join(', '),
      status: p.status as ProductFormData['status'],
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ fontFamily: 'var(--font-heading)', color: '#ffffff' }}
          >
            Products
          </h1>
          <p className="text-[#6b7280] text-sm mt-1">
            {loading ? 'Loading…' : `${products.length} product${products.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-2 bg-[#d4a843] hover:bg-[#e4c06a] text-[#0a0f1e] font-semibold rounded-xl px-5 py-2.5 text-sm transition-colors"
        >
          <span className="material-symbols-outlined text-base">add</span>
          Add Product
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-[#374151] text-xl">
          search
        </span>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products…"
          className="w-full bg-[#111827] border border-[#1f2d4e] focus:border-[#d4a843] focus:ring-1 focus:ring-[#d4a843] text-white placeholder-[#374151] rounded-xl pl-12 pr-4 py-3 text-sm outline-none transition-colors"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-[#374151] hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        )}
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {STATUS_FILTERS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setStatusFilter(value)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              statusFilter === value
                ? 'bg-[#d4a843]/10 text-[#d4a843] border border-[#d4a843]/30'
                : 'bg-[#111827] border border-[#1f2d4e] text-[#6b7280] hover:text-[#9ca3af] hover:border-[#374151]'
            }`}
          >
            {label}
            <span
              className={`text-xs px-1.5 py-0.5 rounded-full ${
                statusFilter === value
                  ? 'bg-[#d4a843]/20 text-[#d4a843]'
                  : 'bg-[#1f2d4e] text-[#374151]'
              }`}
            >
              {statusCounts[value]}
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-[#111827] border border-[#1f2d4e] rounded-2xl overflow-hidden">
        {error ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="material-symbols-outlined text-[#ef4444] text-4xl mb-3">error</span>
            <p className="text-[#ef4444] text-sm">{error}</p>
            <button
              onClick={fetchProducts}
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
                  {/* Checkbox header */}
                  <th className="px-6 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-[#1f2d4e] bg-[#0a0f1e] accent-[#d4a843] cursor-pointer"
                    />
                  </th>
                  <SortTh
                    field="title"
                    label="Product"
                    activeField={sortField}
                    direction={sortDirection}
                    onSort={toggleSort}
                  />
                  <SortTh
                    field="status"
                    label="Status"
                    activeField={sortField}
                    direction={sortDirection}
                    onSort={toggleSort}
                  />
                  <SortTh
                    field="price"
                    label="Price"
                    activeField={sortField}
                    direction={sortDirection}
                    onSort={toggleSort}
                  />
                  <SortTh
                    field="inventory"
                    label="Inventory"
                    activeField={sortField}
                    direction={sortDirection}
                    onSort={toggleSort}
                  />
                  <th className="text-right text-[#6b7280] text-xs font-medium uppercase tracking-wider px-6 py-3">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1f2d4e]">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                ) : displayedProducts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-16">
                      <div className="flex flex-col items-center gap-3">
                        <span className="material-symbols-outlined text-[#374151] text-4xl">
                          inventory_2
                        </span>
                        <p className="text-[#6b7280] text-sm">
                          {search
                            ? 'No products match your search'
                            : statusFilter !== 'ALL'
                              ? `No ${statusFilter.toLowerCase()} products`
                              : 'No products yet'}
                        </p>
                        {!search && statusFilter === 'ALL' && (
                          <button
                            onClick={() => setCreateOpen(true)}
                            className="text-[#d4a843] text-sm hover:text-[#e4c06a] transition-colors"
                          >
                            Add your first product
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  displayedProducts.map((product) => {
                    const price = product.priceRangeV2.minVariantPrice;
                    const inventoryTotal = product.variants.edges.reduce(
                      (sum, e) => sum + (e.node.inventoryQuantity ?? 0),
                      0,
                    );
                    const isSelected = selectedIds.has(product.id);
                    const isEditingPrice = editingPriceId === product.id;
                    const currentVariantPrice = product.variants.edges[0]?.node.price ?? '';

                    return (
                      <tr
                        key={product.id}
                        className={`transition-colors ${
                          isSelected
                            ? 'bg-[#d4a843]/5 hover:bg-[#d4a843]/8'
                            : 'hover:bg-[#1f2d4e]/20'
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="px-6 py-4 w-10">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectOne(product.id)}
                            className="w-4 h-4 rounded border-[#1f2d4e] bg-[#0a0f1e] accent-[#d4a843] cursor-pointer"
                          />
                        </td>

                        {/* Product */}
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
                              <p className="text-white text-sm font-medium line-clamp-1 max-w-[200px]">
                                {product.title}
                              </p>
                              {product.vendor && (
                                <p className="text-[#6b7280] text-xs">{product.vendor}</p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-6 py-4">
                          <StatusBadge status={product.status} />
                        </td>

                        {/* Price — inline editable */}
                        <td className="px-6 py-4">
                          {isEditingPrice ? (
                            <div className="flex items-center gap-1">
                              <span className="text-[#6b7280] text-sm">$</span>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                autoFocus
                                value={editingPriceValue}
                                onChange={(e) => setEditingPriceValue(e.target.value)}
                                onBlur={() => commitPriceEdit(product)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') commitPriceEdit(product);
                                  if (e.key === 'Escape') cancelPriceEdit();
                                }}
                                className="w-24 bg-[#0f1729] border border-[#d4a843]/50 focus:border-[#d4a843] text-white rounded-lg px-2 py-1 text-sm outline-none"
                              />
                            </div>
                          ) : (
                            <button
                              onClick={() => startPriceEdit(product.id, currentVariantPrice)}
                              className="group flex items-center gap-1 text-[#e5e7eb] text-sm hover:text-[#d4a843] transition-colors"
                              title="Click to edit price"
                            >
                              {parseFloat(price.amount) > 0
                                ? `${price.currencyCode} ${parseFloat(price.amount).toFixed(2)}`
                                : '—'}
                              <span className="material-symbols-outlined text-sm opacity-0 group-hover:opacity-60 transition-opacity">
                                edit
                              </span>
                            </button>
                          )}
                        </td>

                        {/* Inventory */}
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
                            {inventoryTotal} units
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setEditProduct(product)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1f2d4e] hover:bg-[#263d6e] text-[#9ca3af] hover:text-white text-xs font-medium transition-all"
                            >
                              <span className="material-symbols-outlined text-sm">edit</span>
                              Edit
                            </button>
                            <button
                              onClick={() => setDeleteProduct(product)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#ef4444]/10 hover:bg-[#ef4444]/20 text-[#ef4444] text-xs font-medium transition-all"
                            >
                              <span className="material-symbols-outlined text-sm">delete</span>
                              Delete
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
      </div>

      {/* Create Modal */}
      {createOpen && (
        <Modal title="Add Product" onClose={() => setCreateOpen(false)} size="wide">
          <ProductForm
            initial={EMPTY_FORM}
            onSubmit={handleCreate}
            loading={createLoading}
            submitLabel="Create Product"
          />
        </Modal>
      )}

      {/* Edit Modal */}
      {editProduct && (
        <Modal title="Edit Product" onClose={() => setEditProduct(null)} size="wide">
          <ProductForm
            initial={productToForm(editProduct)}
            onSubmit={handleEdit}
            loading={editLoading}
            submitLabel="Save Changes"
            imageSlot={
              <ImageGallery
                productId={editProduct.id}
                onSuccess={(msg) => toast.success(msg)}
                onError={(msg) => toast.error(msg)}
              />
            }
          />
        </Modal>
      )}

      {/* Delete Confirm */}
      {deleteProduct && (
        <DeleteConfirmModal
          product={deleteProduct}
          onConfirm={handleDelete}
          onCancel={() => setDeleteProduct(null)}
          loading={deleteLoading}
        />
      )}

      {/* Bulk Action Bar */}
      {someSelected && (
        <BulkActionBar
          count={selectedIds.size}
          progress={bulkProgress}
          onSetActive={() => handleBulkStatusChange('ACTIVE')}
          onArchive={() => handleBulkStatusChange('ARCHIVED')}
          onDelete={handleBulkDelete}
          onClear={clearSelection}
        />
      )}
    </div>
  );
}
