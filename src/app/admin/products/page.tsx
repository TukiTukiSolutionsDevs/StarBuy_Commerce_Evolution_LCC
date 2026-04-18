'use client';

/**
 * Admin Products Page — Phase 3
 *
 * Full CRUD + sorting + status filtering + bulk actions + inline price editing.
 * Migrated to admin design tokens. Zero hardcoded hex colors.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useToast } from '@/components/ui/useToast';
import { useProductsTable } from '@/hooks/useProductsTable';
import type { Product, SortField, StatusFilter } from '@/hooks/useProductsTable';
import {
  AdminPageHeader,
  AdminCard,
  AdminBadge,
  AdminSkeleton,
  AdminEmptyState,
  AdminErrorState,
  AdminSearchInput,
  AdminHelpBanner,
  AdminFieldLabel,
} from '@/components/admin/ui';

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

// ─── Status helpers ─────────────────────────────────────────────────────────────

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'brand';

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  ACTIVE: 'success',
  DRAFT: 'brand',
  ARCHIVED: 'neutral',
  PAID: 'success',
  PENDING: 'warning',
  REFUNDED: 'error',
  VOIDED: 'info',
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Activo',
  DRAFT: 'Borrador',
  ARCHIVED: 'Archivado',
};

const STATUS_LABELS_LOWER: Record<string, string> = {
  ACTIVE: 'activos',
  DRAFT: 'en borrador',
  ARCHIVED: 'archivados',
};

function statusLabel(status: string): string {
  if (!status) return '—';
  return STATUS_LABELS[status] ?? status.charAt(0) + status.slice(1).toLowerCase();
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
        className="inline-flex items-center gap-1 transition-colors"
        style={{ color: isActive ? 'var(--admin-brand)' : 'var(--admin-text-muted)' }}
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

// ─── Input styles helper ────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  backgroundColor: 'var(--admin-bg-input)',
  border: '1px solid var(--admin-border)',
  color: 'var(--admin-text)',
};

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

  const inputClass = 'w-full rounded-xl px-4 py-2.5 text-sm transition-colors outline-none';

  const currentTags = form.tags
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── LEFT COLUMN (2/3) ── */}
        <div className="lg:col-span-2 space-y-5">
          {/* Media card */}
          <div
            className="rounded-xl p-4"
            style={{
              backgroundColor: 'var(--admin-bg-input)',
              border: '1px solid var(--admin-border)',
            }}
          >
            <h4 className="admin-label mb-3">Imágenes</h4>
            {imageSlot ?? (
              <p className="text-xs" style={{ color: 'var(--admin-text-disabled)' }}>
                Guardá el producto primero para poder subir imágenes.
              </p>
            )}
          </div>

          {/* Title */}
          <div
            className="rounded-xl p-4"
            style={{
              backgroundColor: 'var(--admin-bg-input)',
              border: '1px solid var(--admin-border)',
            }}
          >
            <h4 className="admin-label mb-3">Detalles del Producto</h4>
            <div>
              <AdminFieldLabel
                label="Título"
                tooltip="El nombre que van a ver tus clientes en la tienda. Elegí algo claro y descriptivo."
                required
              />
              <input
                required
                value={form.title}
                onChange={(e) => set('title', e.target.value)}
                placeholder="Nombre del producto"
                className={inputClass}
                style={inputStyle}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'var(--admin-brand)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'var(--admin-border)';
                }}
              />
            </div>
          </div>

          {/* Description */}
          <div
            className="rounded-xl p-4"
            style={{
              backgroundColor: 'var(--admin-bg-input)',
              border: '1px solid var(--admin-border)',
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <h4 className="admin-label">Descripción</h4>
              <div
                className="flex items-center gap-1 rounded-lg p-0.5"
                style={{
                  backgroundColor: 'var(--admin-bg-card)',
                  border: '1px solid var(--admin-border)',
                }}
              >
                {(['edit', 'preview'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setDescMode(mode)}
                    className="px-2.5 py-1 rounded-md text-xs font-medium transition-colors"
                    style={{
                      backgroundColor: descMode === mode ? 'var(--admin-bg-hover)' : 'transparent',
                      color: descMode === mode ? 'var(--admin-text)' : 'var(--admin-text-muted)',
                    }}
                  >
                    {mode === 'edit' ? 'Editar' : 'Vista previa'}
                  </button>
                ))}
              </div>
            </div>

            {descMode === 'edit' ? (
              <textarea
                rows={6}
                value={form.descriptionHtml}
                onChange={(e) => set('descriptionHtml', e.target.value)}
                placeholder="Describí tu producto (se acepta HTML)"
                className={`${inputClass} resize-none`}
                style={inputStyle}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'var(--admin-brand)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'var(--admin-border)';
                }}
              />
            ) : (
              <div
                className="prose prose-invert prose-sm max-w-none rounded-xl p-4 min-h-[120px]"
                style={{
                  backgroundColor: 'var(--admin-bg-card)',
                  border: '1px solid var(--admin-border)',
                }}
                dangerouslySetInnerHTML={{
                  __html:
                    form.descriptionHtml ||
                    `<p style="color:var(--admin-text-disabled);font-size:0.875rem">Todavía no hay descripción.</p>`,
                }}
              />
            )}
          </div>
        </div>

        {/* ── RIGHT COLUMN (1/3) ── */}
        <div className="lg:col-span-1 space-y-4">
          {/* Status */}
          <div
            className="rounded-xl p-4 space-y-3"
            style={{
              backgroundColor: 'var(--admin-bg-input)',
              border: '1px solid var(--admin-border)',
            }}
          >
            <div className="flex items-center justify-between">
              <h4 className="admin-label">Estado</h4>
              <AdminBadge variant={STATUS_VARIANT[form.status] ?? 'neutral'}>
                {statusLabel(form.status)}
              </AdminBadge>
            </div>
            <select
              value={form.status}
              onChange={(e) => set('status', e.target.value as ProductFormData['status'])}
              className={inputClass}
              style={inputStyle}
            >
              <option value="ACTIVE">Activo</option>
              <option value="DRAFT">Borrador</option>
              <option value="ARCHIVED">Archivado</option>
            </select>
          </div>

          {/* Pricing */}
          <div
            className="rounded-xl p-4 space-y-3"
            style={{
              backgroundColor: 'var(--admin-bg-input)',
              border: '1px solid var(--admin-border)',
            }}
          >
            <h4 className="admin-label">Precios</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <AdminFieldLabel
                  label="Precio (USD)"
                  tooltip="El precio de venta al público. Es lo que va a pagar el cliente."
                  required
                />
                <div className="relative">
                  <span
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-sm"
                    style={{ color: 'var(--admin-text-muted)' }}
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
                    style={inputStyle}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = 'var(--admin-brand)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = 'var(--admin-border)';
                    }}
                  />
                </div>
              </div>
              <div>
                <AdminFieldLabel
                  label="Precio anterior"
                  tooltip="Si ponés un precio anterior, se va a mostrar tachado al lado del precio actual. Sirve para mostrar descuentos."
                />
                <div className="relative">
                  <span
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-sm"
                    style={{ color: 'var(--admin-text-muted)' }}
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
                    style={inputStyle}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = 'var(--admin-brand)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = 'var(--admin-border)';
                    }}
                  />
                </div>
              </div>
            </div>
            <p className="text-xs" style={{ color: 'var(--admin-text-disabled)' }}>
              El precio anterior se muestra tachado para que el cliente vea el descuento.
            </p>
          </div>

          {/* Organization */}
          <div
            className="rounded-xl p-4 space-y-3"
            style={{
              backgroundColor: 'var(--admin-bg-input)',
              border: '1px solid var(--admin-border)',
            }}
          >
            <h4 className="admin-label">Organización</h4>
            <div>
              <AdminFieldLabel
                label="Marca / Proveedor"
                tooltip="La marca o empresa que fabrica este producto. Ayuda a los clientes a filtrar por marca."
              />
              <input
                value={form.vendor}
                onChange={(e) => set('vendor', e.target.value)}
                placeholder="Ej: Nike, Samsung, etc."
                className={inputClass}
                style={inputStyle}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'var(--admin-brand)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'var(--admin-border)';
                }}
              />
            </div>
            <div>
              <AdminFieldLabel
                label="Tipo de producto"
                tooltip="Una categoría general. Ej: Electrónica, Ropa, Accesorios. Sirve para organizar y filtrar."
              />
              <input
                value={form.productType}
                onChange={(e) => set('productType', e.target.value)}
                placeholder="Ej: Electrónica, Ropa, etc."
                className={inputClass}
                style={inputStyle}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'var(--admin-brand)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'var(--admin-border)';
                }}
              />
            </div>
          </div>

          {/* Tags */}
          <div
            className="rounded-xl p-4 space-y-3"
            style={{
              backgroundColor: 'var(--admin-bg-input)',
              border: '1px solid var(--admin-border)',
            }}
          >
            <h4 className="admin-label">Etiquetas</h4>

            {currentTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {currentTags.map((tag, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs"
                    style={{
                      backgroundColor: 'var(--admin-bg-hover)',
                      color: 'var(--admin-text-body)',
                    }}
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="transition-colors"
                      style={{ color: 'var(--admin-text-muted)' }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = 'var(--admin-error)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = 'var(--admin-text-muted)';
                      }}
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
              placeholder="Escribí una etiqueta y presioná Enter…"
              className={inputClass}
              style={inputStyle}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--admin-brand)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--admin-border)';
              }}
            />
          </div>
        </div>
      </div>

      {/* ── Save Button ── */}
      <div className="mt-6 flex items-center gap-3">
        <button
          type="submit"
          disabled={loading || !form.title.trim()}
          className="flex-1 font-semibold rounded-xl py-3 text-sm transition-colors flex items-center justify-center gap-2 disabled:cursor-not-allowed"
          style={{
            backgroundColor:
              loading || !form.title.trim() ? 'var(--admin-bg-hover)' : 'var(--admin-brand)',
            color: loading || !form.title.trim() ? 'var(--admin-text-disabled)' : 'var(--admin-bg)',
          }}
        >
          {loading ? (
            <>
              <span className="material-symbols-outlined text-base animate-spin">
                progress_activity
              </span>
              Guardando…
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-base">save</span>
              {submitLabel}
            </>
          )}
        </button>
        <AdminBadge variant={STATUS_VARIANT[form.status] ?? 'neutral'}>
          {statusLabel(form.status)}
        </AdminBadge>
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
      onError('La imagen es muy grande (máximo 10MB)');
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
        throw new Error(err.error ?? 'Error al subir');
      }
      onSuccess('Imagen subida');
      fetchImages();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Error al subir');
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
      if (!res.ok) throw new Error('Error al eliminar');
      setImages((prev) => prev.filter((img) => img.id !== mediaId));
      onSuccess('Imagen eliminada');
    } catch {
      onError('Error al eliminar imagen');
    }
  }

  return (
    <div>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {loading && (
          <div
            className="w-20 h-20 rounded-lg animate-pulse flex-none"
            style={{ backgroundColor: 'var(--admin-bg-hover)' }}
          />
        )}

        {images
          .filter((img) => img.image?.url)
          .map((img) => (
            <div key={img.id} className="relative group flex-none">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.image.url}
                alt={img.image.altText ?? ''}
                className="w-20 h-20 rounded-lg object-cover"
                style={{ border: '1px solid var(--admin-border)' }}
              />
              <button
                type="button"
                onClick={() => handleDelete(img.id)}
                className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                style={{ backgroundColor: 'var(--admin-overlay)' }}
              >
                <span
                  className="material-symbols-outlined text-xl"
                  style={{ color: 'var(--admin-error)' }}
                >
                  delete
                </span>
              </button>
            </div>
          ))}

        {/* Upload button */}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="w-20 h-20 rounded-lg border-2 border-dashed flex flex-col items-center justify-center transition-colors flex-none"
          style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--admin-brand)';
            e.currentTarget.style.color = 'var(--admin-brand)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--admin-border)';
            e.currentTarget.style.color = 'var(--admin-text-muted)';
          }}
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
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 backdrop-blur-sm"
      style={{ backgroundColor: 'var(--admin-overlay)' }}
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div
        className={`rounded-2xl w-full ${maxW} max-h-[90vh] flex flex-col`}
        style={{
          backgroundColor: 'var(--admin-bg-card)',
          border: '1px solid var(--admin-border)',
          boxShadow: 'var(--admin-shadow-dropdown)',
        }}
      >
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid var(--admin-border)' }}
        >
          <h2 className="admin-h2">{title}</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg transition-colors"
            style={{ color: 'var(--admin-text-muted)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--admin-text)';
              e.currentTarget.style.backgroundColor = 'var(--admin-bg-hover)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--admin-text-muted)';
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
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
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 backdrop-blur-sm"
      style={{ backgroundColor: 'var(--admin-overlay)' }}
    >
      <div
        className="rounded-2xl w-full max-w-sm p-6"
        style={{
          backgroundColor: 'var(--admin-bg-card)',
          border: '1px solid var(--admin-border)',
          boxShadow: 'var(--admin-shadow-dropdown)',
        }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: 'var(--admin-error-bg)' }}
          >
            <span
              className="material-symbols-outlined text-xl"
              style={{ color: 'var(--admin-error)' }}
            >
              delete
            </span>
          </div>
          <div>
            <p className="font-semibold" style={{ color: 'var(--admin-text)' }}>
              Eliminar Producto
            </p>
            <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
              Esta acción no se puede deshacer
            </p>
          </div>
        </div>
        <p className="text-sm mb-6" style={{ color: 'var(--admin-text-secondary)' }}>
          ¿Estás seguro de que querés eliminar{' '}
          <span className="font-medium" style={{ color: 'var(--admin-text)' }}>
            &ldquo;{product.title}&rdquo;
          </span>
          ?
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 rounded-xl py-2.5 text-sm font-medium transition-colors"
            style={{ backgroundColor: 'var(--admin-bg-hover)', color: 'var(--admin-text)' }}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 rounded-xl py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ backgroundColor: 'var(--admin-error)', color: 'white' }}
          >
            {loading ? (
              <>
                <span className="material-symbols-outlined text-base animate-spin">
                  progress_activity
                </span>
                Eliminando…
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-base">delete</span>
                Eliminar
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
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-3 rounded-2xl px-5 py-3 backdrop-blur-sm"
      style={{
        backgroundColor: 'var(--admin-bg-card)',
        border: '1px solid var(--admin-border)',
        boxShadow: 'var(--admin-shadow-dropdown)',
      }}
    >
      {progress ? (
        <span
          className="text-sm font-medium flex items-center gap-2"
          style={{ color: 'var(--admin-brand)' }}
        >
          <span className="material-symbols-outlined text-base animate-spin">
            progress_activity
          </span>
          {progress}
        </span>
      ) : (
        <>
          <span
            className="text-sm font-medium min-w-[80px]"
            style={{ color: 'var(--admin-text-secondary)' }}
          >
            {count} seleccionados
          </span>
          <div className="w-px h-5" style={{ backgroundColor: 'var(--admin-border)' }} />
          <button
            onClick={onSetActive}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={{ backgroundColor: 'var(--admin-success-bg)', color: 'var(--admin-success)' }}
          >
            <span className="material-symbols-outlined text-sm">check_circle</span>
            Activar
          </button>
          <button
            onClick={onArchive}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--admin-text-muted) 10%, transparent)',
              color: 'var(--admin-text-muted)',
            }}
          >
            <span className="material-symbols-outlined text-sm">archive</span>
            Archivar
          </button>
          <button
            onClick={onDelete}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={{ backgroundColor: 'var(--admin-error-bg)', color: 'var(--admin-error)' }}
          >
            <span className="material-symbols-outlined text-sm">delete</span>
            Eliminar
          </button>
          <div className="w-px h-5" style={{ backgroundColor: 'var(--admin-border)' }} />
          <button
            onClick={onClear}
            className="transition-colors"
            style={{ color: 'var(--admin-text-disabled)' }}
            title="Deseleccionar todo"
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--admin-text-muted)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--admin-text-disabled)';
            }}
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
  { value: 'ALL', label: 'Todos' },
  { value: 'ACTIVE', label: 'Activos' },
  { value: 'DRAFT', label: 'Borradores' },
  { value: 'ARCHIVED', label: 'Archivados' },
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
      if (!res.ok) throw new Error(data.error ?? 'Error al cargar');
      setProducts(data.products ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar productos');
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
      if (!res.ok) throw new Error(data.error ?? 'Error al crear');
      setCreateOpen(false);
      toast.success(`"${form.title}" creado con éxito`);
      fetchProducts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al crear');
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
      const body: Record<string, unknown> = {
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
      };
      if (form.price) body.price = form.price;
      if (form.compareAtPrice) body.compareAtPrice = form.compareAtPrice;

      const res = await fetch(`/api/admin/products/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { product?: Product; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Error al actualizar');
      setEditProduct(null);
      toast.success(`"${form.title}" actualizado con éxito`);
      fetchProducts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al actualizar');
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
      if (!res.ok) throw new Error(data.error ?? 'Error al eliminar');
      const title = deleteProduct.title;
      setDeleteProduct(null);
      toast.success(`"${title}" eliminado`);
      fetchProducts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar');
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
      if (!res.ok) throw new Error(data.error ?? 'Error al actualizar precio');
      toast.success(`Precio actualizado a $${parseFloat(newPrice).toFixed(2)}`);
      fetchProducts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al actualizar precio');
    }
  }

  // ── Bulk Actions ──────────────────────────────────────────────────────────────

  async function handleBulkStatusChange(status: 'ACTIVE' | 'ARCHIVED') {
    const ids = Array.from(selectedIds);
    const label = status === 'ACTIVE' ? 'activados' : 'archivados';
    let succeeded = 0;
    let failed = 0;

    for (let i = 0; i < ids.length; i++) {
      setBulkProgress(`Procesando ${i + 1}/${ids.length}…`);
      const numericId = ids[i].replace('gid://shopify/Product/', '');
      try {
        const res = await fetch(`/api/admin/products/${numericId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        });
        if (res.ok) succeeded++;
        else failed++;
      } catch {
        failed++;
      }
    }

    setBulkProgress(null);
    clearSelection();

    if (succeeded > 0) toast.success(`${succeeded} producto${succeeded !== 1 ? 's' : ''} ${label}`);
    if (failed > 0) toast.error(`${failed} producto${failed !== 1 ? 's' : ''} fallaron`);

    fetchProducts();
  }

  async function handleBulkDelete() {
    const ids = Array.from(selectedIds);
    let succeeded = 0;
    let failed = 0;

    for (let i = 0; i < ids.length; i++) {
      setBulkProgress(`Eliminando ${i + 1}/${ids.length}…`);
      const numericId = ids[i].replace('gid://shopify/Product/', '');
      try {
        const res = await fetch(`/api/admin/products/${numericId}`, { method: 'DELETE' });
        if (res.ok) succeeded++;
        else failed++;
      } catch {
        failed++;
      }
    }

    setBulkProgress(null);
    clearSelection();

    if (succeeded > 0)
      toast.success(
        `${succeeded} producto${succeeded !== 1 ? 's' : ''} eliminado${succeeded !== 1 ? 's' : ''}`,
      );
    if (failed > 0)
      toast.error(`${failed} producto${failed !== 1 ? 's' : ''} fallaron al eliminar`);

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
      <AdminPageHeader
        title="Productos"
        subtitle={
          loading ? 'Cargando…' : `${products.length} producto${products.length !== 1 ? 's' : ''}`
        }
        actions={
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 font-semibold rounded-xl px-5 py-2.5 text-sm transition-colors"
            style={{ backgroundColor: 'var(--admin-brand)', color: 'var(--admin-bg)' }}
          >
            <span className="material-symbols-outlined text-base">add</span>
            Agregar Producto
          </button>
        }
      />

      <AdminHelpBanner
        icon="store"
        title="Gestión de Productos"
        description="Acá podés crear, editar y organizar todos los productos de tu tienda. Cada producto tiene un precio, estado (activo, borrador o archivado), imágenes y etiquetas para organizarlo."
      />

      {/* Search */}
      <AdminSearchInput value={search} onChange={setSearch} placeholder="Buscar productos…" />

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {STATUS_FILTERS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setStatusFilter(value)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all"
            style={
              statusFilter === value
                ? {
                    backgroundColor: 'var(--admin-brand-bg)',
                    color: 'var(--admin-brand)',
                    border: '1px solid var(--admin-brand-border)',
                  }
                : {
                    backgroundColor: 'var(--admin-bg-card)',
                    color: 'var(--admin-text-muted)',
                    border: '1px solid var(--admin-border)',
                  }
            }
          >
            {label}
            <span
              className="text-xs px-1.5 py-0.5 rounded-full"
              style={
                statusFilter === value
                  ? { backgroundColor: 'var(--admin-brand-border)', color: 'var(--admin-brand)' }
                  : {
                      backgroundColor: 'var(--admin-bg-hover)',
                      color: 'var(--admin-text-disabled)',
                    }
              }
            >
              {statusCounts[value]}
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      <AdminCard padding="none">
        {error ? (
          <AdminErrorState message={error} onRetry={fetchProducts} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--admin-border)' }}>
                  <th className="px-6 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded cursor-pointer"
                      style={{ accentColor: 'var(--admin-brand)' }}
                    />
                  </th>
                  <SortTh
                    field="title"
                    label="Producto"
                    activeField={sortField}
                    direction={sortDirection}
                    onSort={toggleSort}
                  />
                  <SortTh
                    field="status"
                    label="Estado"
                    activeField={sortField}
                    direction={sortDirection}
                    onSort={toggleSort}
                  />
                  <SortTh
                    field="price"
                    label="Precio"
                    activeField={sortField}
                    direction={sortDirection}
                    onSort={toggleSort}
                  />
                  <SortTh
                    field="inventory"
                    label="Inventario"
                    activeField={sortField}
                    direction={sortDirection}
                    onSort={toggleSort}
                  />
                  <th
                    className="text-right text-xs font-medium uppercase tracking-wider px-6 py-3"
                    style={{ color: 'var(--admin-text-muted)' }}
                  >
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--admin-border)' }}>
                      {[1, 2, 3, 4, 5, 6].map((j) => (
                        <td key={j} className="px-6 py-4">
                          <AdminSkeleton variant="text" className={j === 2 ? 'w-44' : 'w-20'} />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : displayedProducts.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <AdminEmptyState
                        icon="inventory_2"
                        title={
                          search
                            ? 'No se encontraron productos para tu búsqueda'
                            : statusFilter !== 'ALL'
                              ? `No hay productos ${STATUS_LABELS_LOWER[statusFilter] ?? statusFilter.toLowerCase()}`
                              : 'Todavía no hay productos'
                        }
                        action={
                          !search && statusFilter === 'ALL' ? (
                            <button
                              onClick={() => setCreateOpen(true)}
                              className="text-sm transition-colors"
                              style={{ color: 'var(--admin-brand)' }}
                            >
                              Agregá tu primer producto
                            </button>
                          ) : undefined
                        }
                      />
                    </td>
                  </tr>
                ) : (
                  displayedProducts.map((product, idx) => {
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
                        className="transition-colors"
                        style={{
                          borderBottom: '1px solid var(--admin-border)',
                          backgroundColor: isSelected
                            ? 'var(--admin-brand-bg)'
                            : idx % 2 === 1
                              ? 'var(--admin-bg-elevated)'
                              : 'transparent',
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected)
                            e.currentTarget.style.backgroundColor = 'var(--admin-bg-hover)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = isSelected
                            ? 'var(--admin-brand-bg)'
                            : idx % 2 === 1
                              ? 'var(--admin-bg-elevated)'
                              : 'transparent';
                        }}
                      >
                        <td className="px-6 py-4 w-10">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectOne(product.id)}
                            className="w-4 h-4 rounded cursor-pointer"
                            style={{ accentColor: 'var(--admin-brand)' }}
                          />
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {product.featuredImage ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={product.featuredImage.url}
                                alt={product.featuredImage.altText ?? product.title}
                                className="w-10 h-10 rounded-lg object-cover flex-none"
                                style={{ backgroundColor: 'var(--admin-bg-elevated)' }}
                              />
                            ) : (
                              <div
                                className="w-10 h-10 rounded-lg flex items-center justify-center flex-none"
                                style={{ backgroundColor: 'var(--admin-bg-elevated)' }}
                              >
                                <span
                                  className="material-symbols-outlined text-base"
                                  style={{ color: 'var(--admin-text-disabled)' }}
                                >
                                  image
                                </span>
                              </div>
                            )}
                            <div>
                              <p
                                className="text-sm font-medium line-clamp-1 max-w-[200px]"
                                style={{ color: 'var(--admin-text)' }}
                              >
                                {product.title}
                              </p>
                              {product.vendor && (
                                <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                                  {product.vendor}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <AdminBadge
                            variant={STATUS_VARIANT[product.status?.toUpperCase()] ?? 'neutral'}
                          >
                            {statusLabel(product.status)}
                          </AdminBadge>
                        </td>

                        <td className="px-6 py-4">
                          {isEditingPrice ? (
                            <div className="flex items-center gap-1">
                              <span
                                className="text-sm"
                                style={{ color: 'var(--admin-text-muted)' }}
                              >
                                $
                              </span>
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
                                className="w-24 rounded-lg px-2 py-1 text-sm outline-none"
                                style={{
                                  backgroundColor: 'var(--admin-bg-input)',
                                  border: '1px solid var(--admin-brand)',
                                  color: 'var(--admin-text)',
                                }}
                              />
                            </div>
                          ) : (
                            <button
                              onClick={() => startPriceEdit(product.id, currentVariantPrice)}
                              className="group flex items-center gap-1 text-sm transition-colors"
                              style={{ color: 'var(--admin-text-body)' }}
                              title="Hacé clic para editar el precio"
                              onMouseEnter={(e) => {
                                e.currentTarget.style.color = 'var(--admin-brand)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.color = 'var(--admin-text-body)';
                              }}
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

                        <td className="px-6 py-4">
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
                            {inventoryTotal} unidades
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setEditProduct(product)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                              style={{
                                backgroundColor: 'var(--admin-bg-hover)',
                                color: 'var(--admin-text-secondary)',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.color = 'var(--admin-text)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.color = 'var(--admin-text-secondary)';
                              }}
                            >
                              <span className="material-symbols-outlined text-sm">edit</span>
                              Editar
                            </button>
                            <button
                              onClick={() => setDeleteProduct(product)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                              style={{
                                backgroundColor: 'var(--admin-error-bg)',
                                color: 'var(--admin-error)',
                              }}
                            >
                              <span className="material-symbols-outlined text-sm">delete</span>
                              Eliminar
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
      </AdminCard>

      {/* Create Modal */}
      {createOpen && (
        <Modal title="Nuevo Producto" onClose={() => setCreateOpen(false)} size="wide">
          <ProductForm
            initial={EMPTY_FORM}
            onSubmit={handleCreate}
            loading={createLoading}
            submitLabel="Crear Producto"
          />
        </Modal>
      )}

      {/* Edit Modal */}
      {editProduct && (
        <Modal
          title={`Editar: ${editProduct.title}`}
          onClose={() => setEditProduct(null)}
          size="wide"
        >
          <ProductForm
            initial={productToForm(editProduct)}
            onSubmit={handleEdit}
            loading={editLoading}
            submitLabel="Guardar Cambios"
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
