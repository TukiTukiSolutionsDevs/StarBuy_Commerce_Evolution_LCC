'use client';

/**
 * Admin Products Page
 *
 * Full CRUD: list, create, edit, delete products.
 * Calls /api/admin/products via fetch — no direct Shopify calls from client.
 */

import { useEffect, useRef, useState, useCallback } from 'react';

// ─── Types ─────────────────────────────────────────────────────────────────────

type Product = {
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

type ProductFormData = {
  title: string;
  descriptionHtml: string;
  vendor: string;
  productType: string;
  price: string;
  tags: string;
  status: 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
};

// ─── Toast ─────────────────────────────────────────────────────────────────────

type Toast = { id: number; message: string; type: 'success' | 'error' };

function ToastContainer({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex flex-col gap-2 z-[70] pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium shadow-lg pointer-events-auto transition-all ${
            t.type === 'success'
              ? 'bg-[#10b981] text-white'
              : 'bg-[#ef4444] text-white'
          }`}
        >
          <span className="material-symbols-outlined text-base">
            {t.type === 'success' ? 'check_circle' : 'error'}
          </span>
          {t.message}
        </div>
      ))}
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
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.color }} />
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

// ─── Skeleton Row ───────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr className="border-b border-[#1f2d4e]">
      {[1, 2, 3, 4, 5].map((i) => (
        <td key={i} className="px-6 py-4">
          <div className="h-4 bg-[#1f2d4e] rounded animate-pulse" style={{ width: i === 1 ? '180px' : '80px' }} />
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
  tags: '',
  status: 'ACTIVE',
};

function ProductForm({
  initial,
  onSubmit,
  loading,
  submitLabel,
}: {
  initial: ProductFormData;
  onSubmit: (data: ProductFormData) => void;
  loading: boolean;
  submitLabel: string;
}) {
  const [form, setForm] = useState<ProductFormData>(initial);

  useEffect(() => {
    setForm(initial);
  }, [initial]);

  function set(key: keyof ProductFormData, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit(form);
  }

  const inputClass =
    'w-full bg-[#0f1729] border border-[#1f2d4e] focus:border-[#d4a843] focus:ring-1 focus:ring-[#d4a843] text-white placeholder-[#374151] rounded-xl px-4 py-2.5 text-sm outline-none transition-colors';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-[#9ca3af] mb-1.5">
          Title <span className="text-[#ef4444]">*</span>
        </label>
        <input
          required
          value={form.title}
          onChange={(e) => set('title', e.target.value)}
          placeholder="Product title"
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-[#9ca3af] mb-1.5">Vendor</label>
          <input
            value={form.vendor}
            onChange={(e) => set('vendor', e.target.value)}
            placeholder="Brand / Vendor"
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-[#9ca3af] mb-1.5">Type</label>
          <input
            value={form.productType}
            onChange={(e) => set('productType', e.target.value)}
            placeholder="e.g. Electronics"
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-[#9ca3af] mb-1.5">Price (USD)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.price}
            onChange={(e) => set('price', e.target.value)}
            placeholder="0.00"
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-[#9ca3af] mb-1.5">Status</label>
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
      </div>

      <div>
        <label className="block text-xs font-medium text-[#9ca3af] mb-1.5">Tags</label>
        <input
          value={form.tags}
          onChange={(e) => set('tags', e.target.value)}
          placeholder="tag1, tag2, tag3"
          className={inputClass}
        />
        <p className="text-[#374151] text-xs mt-1">Separate tags with commas</p>
      </div>

      <div>
        <label className="block text-xs font-medium text-[#9ca3af] mb-1.5">Description</label>
        <textarea
          rows={4}
          value={form.descriptionHtml}
          onChange={(e) => set('descriptionHtml', e.target.value)}
          placeholder="Product description (HTML supported)"
          className={`${inputClass} resize-none`}
        />
      </div>

      <button
        type="submit"
        disabled={loading || !form.title.trim()}
        className="w-full bg-[#d4a843] hover:bg-[#e4c06a] disabled:bg-[#1f2d4e] disabled:cursor-not-allowed text-[#0a0f1e] font-semibold rounded-xl py-3 text-sm transition-colors flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>
            Saving…
          </>
        ) : (
          <>
            <span className="material-symbols-outlined text-base">save</span>
            {submitLabel}
          </>
        )}
      </button>
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
  addToast,
}: {
  productId: string;
  addToast: (msg: string, type: 'success' | 'error') => void;
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
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [pid]);

  useEffect(() => { fetchImages(); }, [fetchImages]);

  async function handleUpload(file: File) {
    if (file.size > 10 * 1024 * 1024) {
      addToast('Image too large (max 10MB)', 'error');
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
      addToast('Image uploaded', 'success');
      fetchImages();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Upload failed', 'error');
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
      addToast('Image deleted', 'success');
    } catch {
      addToast('Failed to delete image', 'error');
    }
  }

  return (
    <div className="mb-5">
      <label className="block text-xs font-medium text-[#9ca3af] mb-2">Product Images</label>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {loading && (
          <div className="w-20 h-20 rounded-lg bg-[#1f2d4e] animate-pulse flex-none" />
        )}

        {images.map((img) => (
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
            <span className="material-symbols-outlined text-xl animate-spin">progress_activity</span>
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
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
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

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div className="bg-[#111827] border border-[#1f2d4e] rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl shadow-black/60">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1f2d4e]">
          <h2
            className="text-white font-semibold"
            style={{ fontFamily: 'var(--font-heading)' }}
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
                <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>
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

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(0);

  const [createOpen, setCreateOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [deleteProduct, setDeleteProduct] = useState<Product | null>(null);

  const [createLoading, setCreateLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [search, setSearch] = useState('');

  // ── Toast ────────────────────────────────────────────────────────────────────

  function addToast(message: string, type: 'success' | 'error') {
    const id = ++toastId.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  }

  // ── Fetch products ────────────────────────────────────────────────────────────

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const qs = search ? `?q=${encodeURIComponent(search)}` : '';
      const res = await fetch(`/api/admin/products${qs}`);
      const data = await res.json() as { products?: Product[]; error?: string };
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
          tags: form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
        }),
      });
      const data = await res.json() as { product?: Product; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Failed to create');
      setCreateOpen(false);
      addToast(`"${form.title}" created successfully`, 'success');
      fetchProducts();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Create failed', 'error');
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
          tags: form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
          status: form.status,
        }),
      });
      const data = await res.json() as { product?: Product; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Failed to update');
      setEditProduct(null);
      addToast(`"${form.title}" updated successfully`, 'success');
      fetchProducts();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Update failed', 'error');
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
      const data = await res.json() as { success?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Failed to delete');
      const title = deleteProduct.title;
      setDeleteProduct(null);
      addToast(`"${title}" deleted`, 'success');
      fetchProducts();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Delete failed', 'error');
    } finally {
      setDeleteLoading(false);
    }
  }

  // ── Edit initial form ─────────────────────────────────────────────────────────

  function productToForm(p: Product): ProductFormData {
    const price = p.variants.edges[0]?.node.price ?? '';
    return {
      title: p.title,
      descriptionHtml: p.descriptionHtml ?? '',
      vendor: p.vendor ?? '',
      productType: p.productType ?? '',
      price,
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
            className="text-2xl font-bold text-white"
            style={{ fontFamily: 'var(--font-heading)' }}
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
                  {['Product', 'Status', 'Price', 'Inventory', 'Actions'].map((h) => (
                    <th
                      key={h}
                      className={`text-left text-[#6b7280] text-xs font-medium uppercase tracking-wider px-6 py-3 ${
                        h === 'Actions' ? 'text-right' : ''
                      }`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1f2d4e]">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-16">
                      <div className="flex flex-col items-center gap-3">
                        <span className="material-symbols-outlined text-[#374151] text-4xl">inventory_2</span>
                        <p className="text-[#6b7280] text-sm">
                          {search ? 'No products match your search' : 'No products yet'}
                        </p>
                        {!search && (
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
                  products.map((product) => {
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
                                <span className="material-symbols-outlined text-[#374151] text-base">image</span>
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
                            {inventoryTotal} units
                          </span>
                        </td>
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
        <Modal title="Add Product" onClose={() => setCreateOpen(false)}>
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
        <Modal title="Edit Product" onClose={() => setEditProduct(null)}>
          <ImageGallery productId={editProduct.id} addToast={addToast} />
          <ProductForm
            initial={productToForm(editProduct)}
            onSubmit={handleEdit}
            loading={editLoading}
            submitLabel="Save Changes"
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

      {/* Toasts */}
      <ToastContainer toasts={toasts} />
    </div>
  );
}
