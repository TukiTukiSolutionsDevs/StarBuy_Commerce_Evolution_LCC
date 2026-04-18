'use client';

/**
 * Admin Product Metafields Page — Phase 3
 *
 * Route: /admin/products/{id}/metafields
 *
 * Migrated to use admin design tokens. Zero hardcoded hex colors.
 * Manage all metafields for a product:
 * view existing, add new, edit values, delete.
 */

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/components/ui/useToast';

// ─── Types ─────────────────────────────────────────────────────────────────────

type Metafield = {
  id: string;
  namespace: string;
  key: string;
  value: string;
  type: string;
  updatedAt: string;
};

type MetafieldType =
  | 'single_line_text_field'
  | 'number_integer'
  | 'number_decimal'
  | 'json'
  | 'boolean'
  | 'date'
  | 'color';

type MetafieldFormData = {
  namespace: string;
  key: string;
  type: MetafieldType;
  value: string;
};

const EMPTY_FORM: MetafieldFormData = {
  namespace: 'custom',
  key: '',
  type: 'single_line_text_field',
  value: '',
};

const TYPE_OPTIONS: Array<{ value: MetafieldType; label: string; icon: string }> = [
  { value: 'single_line_text_field', label: 'Text', icon: 'text_fields' },
  { value: 'number_integer', label: 'Integer', icon: 'tag' },
  { value: 'number_decimal', label: 'Decimal', icon: 'calculate' },
  { value: 'json', label: 'JSON', icon: 'data_object' },
  { value: 'boolean', label: 'Boolean', icon: 'toggle_on' },
  { value: 'date', label: 'Date', icon: 'calendar_today' },
  { value: 'color', label: 'Color', icon: 'palette' },
];

// ─── Shared input style ────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  backgroundColor: 'var(--admin-bg)',
  border: '1px solid var(--admin-border)',
  color: 'var(--admin-text)',
};

// ─── Metafield Modal ───────────────────────────────────────────────────────────

function MetafieldModal({
  mode,
  initialData,
  onClose,
  onSave,
}: {
  mode: 'create' | 'edit';
  initialData?: MetafieldFormData;
  onClose: () => void;
  onSave: (data: MetafieldFormData) => Promise<void>;
}) {
  const [form, setForm] = useState<MetafieldFormData>(initialData ?? EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  };

  const renderValueInput = () => {
    switch (form.type) {
      case 'boolean':
        return (
          <div className="flex gap-3">
            {(['true', 'false'] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setForm((f) => ({ ...f, value: v }))}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all capitalize"
                style={{
                  backgroundColor:
                    form.value === v
                      ? 'color-mix(in srgb, var(--admin-brand) 10%, transparent)'
                      : 'var(--admin-bg)',
                  border: `1px solid ${form.value === v ? 'var(--admin-brand)' : 'var(--admin-border)'}`,
                  color: form.value === v ? 'var(--admin-brand)' : 'var(--admin-text-muted)',
                }}
              >
                {v}
              </button>
            ))}
          </div>
        );

      case 'color':
        return (
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={form.value || '#000000'}
              onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
              className="w-12 h-10 rounded-lg cursor-pointer"
              style={{ border: '1px solid var(--admin-border)', backgroundColor: 'transparent' }}
            />
            <input
              type="text"
              value={form.value}
              onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
              placeholder="#000000"
              pattern="^#[0-9A-Fa-f]{6}$"
              className="flex-1 rounded-xl px-4 py-2.5 text-sm outline-none transition-colors font-mono"
              style={inputStyle}
            />
          </div>
        );

      case 'date':
        return (
          <input
            type="date"
            value={form.value}
            onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
            className="w-full rounded-xl px-4 py-2.5 text-sm outline-none transition-colors"
            style={inputStyle}
          />
        );

      case 'json':
        return (
          <textarea
            value={form.value}
            onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
            placeholder='{"key": "value"}'
            rows={5}
            spellCheck={false}
            className="w-full rounded-xl px-4 py-2.5 text-sm outline-none transition-colors resize-none font-mono"
            style={inputStyle}
          />
        );

      case 'number_integer':
      case 'number_decimal':
        return (
          <input
            type="number"
            step={form.type === 'number_decimal' ? 'any' : '1'}
            value={form.value}
            onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
            placeholder="0"
            className="w-full rounded-xl px-4 py-2.5 text-sm outline-none transition-colors"
            style={inputStyle}
          />
        );

      default:
        return (
          <input
            type="text"
            value={form.value}
            onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
            placeholder="Value..."
            className="w-full rounded-xl px-4 py-2.5 text-sm outline-none transition-colors"
            style={inputStyle}
          />
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 backdrop-blur-sm"
        style={{ backgroundColor: 'var(--admin-overlay)' }}
        onClick={onClose}
      />
      <div
        className="relative z-10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        style={{
          backgroundColor: 'var(--admin-bg-card)',
          border: '1px solid var(--admin-border)',
          boxShadow: 'var(--admin-shadow-dropdown)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-6 sticky top-0 z-10"
          style={{
            borderBottom: '1px solid var(--admin-border)',
            backgroundColor: 'var(--admin-bg-card)',
          }}
        >
          <h2 className="admin-h2 text-lg">
            {mode === 'create' ? 'Add Metafield' : 'Edit Metafield'}
          </h2>
          <button
            onClick={onClose}
            className="transition-colors p-1 rounded-lg"
            style={{ color: 'var(--admin-text-muted)' }}
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Namespace + Key row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="admin-label block mb-1.5">
                Namespace <span style={{ color: 'var(--admin-error)' }}>*</span>
              </label>
              <input
                type="text"
                required
                value={form.namespace}
                onChange={(e) => setForm((f) => ({ ...f, namespace: e.target.value }))}
                placeholder="custom"
                disabled={mode === 'edit'}
                className="w-full rounded-xl px-3 py-2.5 text-sm outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-mono"
                style={inputStyle}
              />
            </div>
            <div>
              <label className="admin-label block mb-1.5">
                Key <span style={{ color: 'var(--admin-error)' }}>*</span>
              </label>
              <input
                type="text"
                required
                value={form.key}
                onChange={(e) => setForm((f) => ({ ...f, key: e.target.value }))}
                placeholder="my_key"
                disabled={mode === 'edit'}
                className="w-full rounded-xl px-3 py-2.5 text-sm outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-mono"
                style={inputStyle}
              />
            </div>
          </div>

          {/* Type */}
          <div>
            <label className="admin-label block mb-2">Type</label>
            <div className="grid grid-cols-4 gap-2">
              {TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  disabled={mode === 'edit'}
                  onClick={() => setForm((f) => ({ ...f, type: opt.value, value: '' }))}
                  className="flex flex-col items-center gap-1 py-2.5 rounded-xl text-xs font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor:
                      form.type === opt.value
                        ? 'color-mix(in srgb, var(--admin-brand) 10%, transparent)'
                        : 'var(--admin-bg)',
                    border: `1px solid ${form.type === opt.value ? 'var(--admin-brand)' : 'var(--admin-border)'}`,
                    color:
                      form.type === opt.value ? 'var(--admin-brand)' : 'var(--admin-text-muted)',
                  }}
                >
                  <span className="material-symbols-outlined text-base">{opt.icon}</span>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Value */}
          <div>
            <label className="admin-label block mb-1.5">
              Value <span style={{ color: 'var(--admin-error)' }}>*</span>
            </label>
            {renderValueInput()}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{
                border: '1px solid var(--admin-border)',
                color: 'var(--admin-text-muted)',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{
                backgroundColor: 'var(--admin-brand)',
                color: 'var(--admin-bg)',
              }}
            >
              {saving ? (
                <>
                  <span className="material-symbols-outlined text-sm animate-spin">autorenew</span>
                  Saving...
                </>
              ) : mode === 'create' ? (
                'Add Metafield'
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Confirm Delete Modal ──────────────────────────────────────────────────────

function ConfirmDeleteModal({
  metafield,
  onClose,
  onConfirm,
}: {
  metafield: Metafield;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [deleting, setDeleting] = useState(false);

  const handleConfirm = async () => {
    setDeleting(true);
    try {
      await onConfirm();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 backdrop-blur-sm"
        style={{ backgroundColor: 'var(--admin-overlay)' }}
        onClick={onClose}
      />
      <div
        className="relative z-10 rounded-2xl w-full max-w-md p-6"
        style={{
          backgroundColor: 'var(--admin-bg-card)',
          border: '1px solid var(--admin-border)',
          boxShadow: 'var(--admin-shadow-dropdown)',
        }}
      >
        <div className="flex items-start gap-4 mb-6">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
            style={{ backgroundColor: 'var(--admin-error-bg)' }}
          >
            <span
              className="material-symbols-outlined text-xl"
              style={{ color: 'var(--admin-error)' }}
            >
              warning
            </span>
          </div>
          <div>
            <h2 className="admin-h2 text-lg mb-1">Delete Metafield</h2>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--admin-text-muted)' }}>
              Delete metafield{' '}
              <span
                className="font-mono text-xs px-1.5 py-0.5 rounded"
                style={{
                  color: 'var(--admin-text)',
                  backgroundColor: 'var(--admin-bg)',
                }}
              >
                {metafield.namespace}.{metafield.key}
              </span>
              ? This action cannot be undone.
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={{
              border: '1px solid var(--admin-border)',
              color: 'var(--admin-text-muted)',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={deleting}
            className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            style={{ backgroundColor: 'var(--admin-error)' }}
          >
            {deleting ? (
              <>
                <span className="material-symbols-outlined text-sm animate-spin">autorenew</span>
                Deleting...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-sm">delete</span>
                Delete
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Value Preview ─────────────────────────────────────────────────────────────

function ValuePreview({ type, value }: { type: string; value: string }) {
  if (type === 'color') {
    return (
      <div className="flex items-center gap-2">
        <span
          className="w-4 h-4 rounded-full flex-shrink-0"
          style={{ backgroundColor: value, border: '1px solid var(--admin-border)' }}
        />
        <span className="text-sm font-mono" style={{ color: 'var(--admin-text-secondary)' }}>
          {value}
        </span>
      </div>
    );
  }

  if (type === 'boolean') {
    return (
      <span
        className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
        style={{
          backgroundColor:
            value === 'true'
              ? 'var(--admin-success-bg)'
              : 'color-mix(in srgb, var(--admin-text-muted) 10%, transparent)',
          color: value === 'true' ? 'var(--admin-success)' : 'var(--admin-text-muted)',
        }}
      >
        <span className="material-symbols-outlined text-sm">
          {value === 'true' ? 'check_circle' : 'cancel'}
        </span>
        {value}
      </span>
    );
  }

  if (type === 'json') {
    return (
      <span
        className="text-xs font-mono line-clamp-1 max-w-xs"
        style={{ color: 'var(--admin-text-secondary)' }}
      >
        {value}
      </span>
    );
  }

  return (
    <span
      className="text-sm line-clamp-1 max-w-xs"
      style={{ color: 'var(--admin-text-secondary)' }}
    >
      {value || '\u2014'}
    </span>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function ProductMetafieldsPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();

  const productId = typeof params.id === 'string' ? params.id : '';

  const [productTitle, setProductTitle] = useState('');
  const [metafields, setMetafields] = useState<Metafield[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Metafield | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Metafield | null>(null);

  // ── Fetch ────────────────────────────────────────────────────────────────

  const fetchMetafields = useCallback(async () => {
    if (!productId) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/products/${encodeURIComponent(productId)}/metafields`);
      const data = (await res.json()) as {
        product?: { id: string; title: string };
        metafields?: Metafield[];
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? 'Failed to load metafields');
      setProductTitle(data.product?.title ?? '');
      setMetafields(data.metafields ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load metafields');
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    fetchMetafields();
  }, [fetchMetafields]);

  // ── Handlers ────────────────────────────────────────────────────────────

  const handleCreate = async (form: MetafieldFormData) => {
    const res = await fetch(`/api/admin/products/${encodeURIComponent(productId)}/metafields`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = (await res.json()) as { metafield?: Metafield; error?: string };

    if (!res.ok) {
      toast.error(data.error ?? 'Failed to create metafield');
      return;
    }

    toast.success(`Metafield "${form.namespace}.${form.key}" added`);
    setCreateOpen(false);
    fetchMetafields();
  };

  const handleEdit = async (form: MetafieldFormData) => {
    // Metafields upsert — same endpoint, same payload
    const res = await fetch(`/api/admin/products/${encodeURIComponent(productId)}/metafields`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = (await res.json()) as { metafield?: Metafield; error?: string };

    if (!res.ok) {
      toast.error(data.error ?? 'Failed to update metafield');
      return;
    }

    toast.success(`Metafield "${form.namespace}.${form.key}" updated`);
    setEditTarget(null);
    fetchMetafields();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    const res = await fetch(`/api/admin/products/${encodeURIComponent(productId)}/metafields`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ metafieldId: deleteTarget.id }),
    });
    const data = (await res.json()) as { success?: boolean; error?: string };

    if (!res.ok) {
      toast.error(data.error ?? 'Failed to delete metafield');
      return;
    }

    toast.success(`Metafield "${deleteTarget.namespace}.${deleteTarget.key}" deleted`);
    setDeleteTarget(null);
    fetchMetafields();
  };

  const metafieldToForm = (m: Metafield): MetafieldFormData => ({
    namespace: m.namespace,
    key: m.key,
    type: m.type as MetafieldType,
    value: m.value,
  });

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--admin-text-muted)' }}>
        <button
          onClick={() => router.push('/admin/products')}
          className="transition-colors"
          style={{ color: 'var(--admin-text-muted)' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--admin-text)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--admin-text-muted)')}
        >
          Products
        </button>
        <span className="material-symbols-outlined text-sm">chevron_right</span>
        {productTitle ? (
          <Link
            href={`/admin/products`}
            className="transition-colors line-clamp-1 max-w-[200px]"
            style={{ color: 'var(--admin-text-muted)' }}
            title={productTitle}
          >
            {productTitle}
          </Link>
        ) : (
          <span className="font-mono text-xs">{productId}</span>
        )}
        <span className="material-symbols-outlined text-sm">chevron_right</span>
        <span className="font-medium" style={{ color: 'var(--admin-text)' }}>
          Metafields
        </span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="admin-h1 text-2xl">Metafields</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--admin-text-muted)' }}>
            {loading
              ? 'Loading...'
              : `${metafields.length} metafield${metafields.length !== 1 ? 's' : ''}`}
            {productTitle && (
              <span style={{ color: 'var(--admin-text-disabled)' }}> \u2014 {productTitle}</span>
            )}
          </p>
        </div>

        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
          style={{ backgroundColor: 'var(--admin-brand)', color: 'var(--admin-bg)' }}
        >
          <span className="material-symbols-outlined text-lg">add</span>
          Add Metafield
        </button>
      </div>

      {/* Content */}
      {error ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
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
            onClick={() => fetchMetafields()}
            className="mt-4 text-sm transition-colors"
            style={{ color: 'var(--admin-brand)' }}
          >
            Try again
          </button>
        </div>
      ) : loading ? (
        <div
          className="rounded-2xl animate-pulse h-48"
          style={{
            backgroundColor: 'var(--admin-bg-card)',
            border: '1px solid var(--admin-border)',
          }}
        />
      ) : metafields.length === 0 ? (
        <div
          className="rounded-2xl flex flex-col items-center justify-center py-16 text-center"
          style={{
            backgroundColor: 'var(--admin-bg-card)',
            border: '1px solid var(--admin-border)',
          }}
        >
          <span
            className="material-symbols-outlined text-5xl mb-4"
            style={{ color: 'var(--admin-text-disabled)' }}
          >
            data_object
          </span>
          <p className="font-semibold mb-2" style={{ color: 'var(--admin-text)' }}>
            No metafields yet
          </p>
          <p className="text-sm mb-6" style={{ color: 'var(--admin-text-muted)' }}>
            Add custom metadata to this product for extended functionality.
          </p>
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
            style={{ backgroundColor: 'var(--admin-brand)', color: 'var(--admin-bg)' }}
          >
            <span className="material-symbols-outlined text-lg">add</span>
            Add First Metafield
          </button>
        </div>
      ) : (
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            backgroundColor: 'var(--admin-bg-card)',
            border: '1px solid var(--admin-border)',
          }}
        >
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--admin-border)' }}>
                {['Namespace', 'Key', 'Type', 'Value', 'Updated'].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--admin-text-muted)' }}
                  >
                    {h}
                  </th>
                ))}
                <th className="px-4 py-3 w-20" />
              </tr>
            </thead>
            <tbody>
              {metafields.map((mf) => (
                <tr
                  key={mf.id}
                  className="transition-colors group"
                  style={{ borderBottom: '1px solid var(--admin-border)' }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor = 'var(--admin-bg-hover)')
                  }
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <td className="px-4 py-3">
                    <span
                      className="text-xs font-mono px-2 py-1 rounded-lg"
                      style={{
                        color: 'var(--admin-text-secondary)',
                        backgroundColor: 'var(--admin-bg)',
                      }}
                    >
                      {mf.namespace}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-mono" style={{ color: 'var(--admin-text)' }}>
                      {mf.key}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="inline-flex items-center gap-1.5 text-xs"
                      style={{ color: 'var(--admin-text-muted)' }}
                    >
                      <span className="material-symbols-outlined text-sm">
                        {TYPE_OPTIONS.find((t) => t.value === mf.type)?.icon ?? 'text_fields'}
                      </span>
                      {TYPE_OPTIONS.find((t) => t.value === mf.type)?.label ?? mf.type}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <ValuePreview type={mf.type} value={mf.value} />
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--admin-text-disabled)' }}>
                    {new Date(mf.updatedAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setEditTarget(mf)}
                        className="transition-colors p-1 rounded"
                        style={{ color: 'var(--admin-brand)' }}
                        title="Edit metafield"
                      >
                        <span className="material-symbols-outlined text-lg">edit</span>
                      </button>
                      <button
                        onClick={() => setDeleteTarget(mf)}
                        className="transition-colors p-1 rounded"
                        style={{ color: 'var(--admin-error)' }}
                        title="Delete metafield"
                      >
                        <span className="material-symbols-outlined text-lg">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Info box */}
      <div
        className="rounded-xl p-4 flex gap-3"
        style={{
          backgroundColor: 'var(--admin-bg-elevated)',
          border: '1px solid var(--admin-border)',
        }}
      >
        <span
          className="material-symbols-outlined text-xl flex-shrink-0 mt-0.5"
          style={{ color: 'var(--admin-brand)' }}
        >
          info
        </span>
        <div>
          <p className="text-sm font-medium mb-1" style={{ color: 'var(--admin-text-secondary)' }}>
            About Metafields
          </p>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--admin-text-muted)' }}>
            Metafields let you store additional information about products. They are organized by{' '}
            <span className="font-mono" style={{ color: 'var(--admin-text-secondary)' }}>
              namespace.key
            </span>{' '}
            and support types like text, numbers, JSON, booleans, dates, and colors.
          </p>
        </div>
      </div>

      {/* Create Modal */}
      {createOpen && (
        <MetafieldModal mode="create" onClose={() => setCreateOpen(false)} onSave={handleCreate} />
      )}

      {/* Edit Modal */}
      {editTarget && (
        <MetafieldModal
          mode="edit"
          initialData={metafieldToForm(editTarget)}
          onClose={() => setEditTarget(null)}
          onSave={handleEdit}
        />
      )}

      {/* Delete Confirm Modal */}
      {deleteTarget && (
        <ConfirmDeleteModal
          metafield={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
