'use client';

/**
 * Admin Product Metafields Page
 *
 * Route: /admin/products/{id}/metafields
 *
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
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all capitalize ${
                  form.value === v
                    ? 'bg-[#d4a843]/10 border-[#d4a843] text-[#d4a843]'
                    : 'bg-[#0a0f1e] border-[#1f2d4e] text-[#6b7280] hover:border-[#374151]'
                }`}
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
              className="w-12 h-10 rounded-lg border border-[#1f2d4e] bg-transparent cursor-pointer"
            />
            <input
              type="text"
              value={form.value}
              onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
              placeholder="#000000"
              pattern="^#[0-9A-Fa-f]{6}$"
              className="flex-1 bg-[#0a0f1e] border border-[#1f2d4e] focus:border-[#d4a843] rounded-xl px-4 py-2.5 text-white text-sm placeholder-[#374151] outline-none transition-colors font-mono"
            />
          </div>
        );

      case 'date':
        return (
          <input
            type="date"
            value={form.value}
            onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
            className="w-full bg-[#0a0f1e] border border-[#1f2d4e] focus:border-[#d4a843] rounded-xl px-4 py-2.5 text-white text-sm outline-none transition-colors"
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
            className="w-full bg-[#0a0f1e] border border-[#1f2d4e] focus:border-[#d4a843] rounded-xl px-4 py-2.5 text-white text-sm placeholder-[#374151] outline-none transition-colors resize-none font-mono"
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
            className="w-full bg-[#0a0f1e] border border-[#1f2d4e] focus:border-[#d4a843] rounded-xl px-4 py-2.5 text-white text-sm placeholder-[#374151] outline-none transition-colors"
          />
        );

      default:
        return (
          <input
            type="text"
            value={form.value}
            onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
            placeholder="Value…"
            className="w-full bg-[#0a0f1e] border border-[#1f2d4e] focus:border-[#d4a843] rounded-xl px-4 py-2.5 text-white text-sm placeholder-[#374151] outline-none transition-colors"
          />
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 bg-[#111827] border border-[#1f2d4e] rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#1f2d4e] sticky top-0 bg-[#111827] z-10">
          <h2
            className="font-bold text-lg"
            style={{ fontFamily: 'var(--font-heading)', color: '#ffffff' }}
          >
            {mode === 'create' ? 'Add Metafield' : 'Edit Metafield'}
          </h2>
          <button
            onClick={onClose}
            className="text-[#6b7280] hover:text-white transition-colors p-1 rounded-lg"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Namespace + Key row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-[#9ca3af] mb-1.5 font-medium">
                Namespace <span className="text-[#ef4444]">*</span>
              </label>
              <input
                type="text"
                required
                value={form.namespace}
                onChange={(e) => setForm((f) => ({ ...f, namespace: e.target.value }))}
                placeholder="custom"
                disabled={mode === 'edit'}
                className="w-full bg-[#0a0f1e] border border-[#1f2d4e] focus:border-[#d4a843] rounded-xl px-3 py-2.5 text-white text-sm placeholder-[#374151] outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-mono"
              />
            </div>
            <div>
              <label className="block text-sm text-[#9ca3af] mb-1.5 font-medium">
                Key <span className="text-[#ef4444]">*</span>
              </label>
              <input
                type="text"
                required
                value={form.key}
                onChange={(e) => setForm((f) => ({ ...f, key: e.target.value }))}
                placeholder="my_key"
                disabled={mode === 'edit'}
                className="w-full bg-[#0a0f1e] border border-[#1f2d4e] focus:border-[#d4a843] rounded-xl px-3 py-2.5 text-white text-sm placeholder-[#374151] outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-mono"
              />
            </div>
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm text-[#9ca3af] mb-2 font-medium">Type</label>
            <div className="grid grid-cols-4 gap-2">
              {TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  disabled={mode === 'edit'}
                  onClick={() => setForm((f) => ({ ...f, type: opt.value, value: '' }))}
                  className={`flex flex-col items-center gap-1 py-2.5 rounded-xl text-xs font-medium border transition-all ${
                    form.type === opt.value
                      ? 'bg-[#d4a843]/10 border-[#d4a843] text-[#d4a843]'
                      : 'bg-[#0a0f1e] border-[#1f2d4e] text-[#6b7280] hover:border-[#374151]'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <span className="material-symbols-outlined text-base">{opt.icon}</span>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Value */}
          <div>
            <label className="block text-sm text-[#9ca3af] mb-1.5 font-medium">
              Value <span className="text-[#ef4444]">*</span>
            </label>
            {renderValueInput()}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-[#1f2d4e] text-[#6b7280] hover:text-white hover:border-[#374151] text-sm font-medium transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-[#d4a843] hover:bg-[#e4c06a] text-black text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <span className="material-symbols-outlined text-sm animate-spin">autorenew</span>
                  Saving…
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
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 bg-[#111827] border border-[#1f2d4e] rounded-2xl w-full max-w-md shadow-2xl p-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-10 h-10 rounded-xl bg-[#ef4444]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="material-symbols-outlined text-[#ef4444] text-xl">warning</span>
          </div>
          <div>
            <h2
              className="font-bold text-lg mb-1"
              style={{ fontFamily: 'var(--font-heading)', color: '#ffffff' }}
            >
              Delete Metafield
            </h2>
            <p className="text-[#6b7280] text-sm leading-relaxed">
              Delete metafield{' '}
              <span className="text-white font-mono text-xs bg-[#0a0f1e] px-1.5 py-0.5 rounded">
                {metafield.namespace}.{metafield.key}
              </span>
              ? This action cannot be undone.
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-[#1f2d4e] text-[#6b7280] hover:text-white hover:border-[#374151] text-sm font-medium transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={deleting}
            className="flex-1 py-2.5 rounded-xl bg-[#ef4444] hover:bg-red-400 text-white text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {deleting ? (
              <>
                <span className="material-symbols-outlined text-sm animate-spin">autorenew</span>
                Deleting…
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
          className="w-4 h-4 rounded-full border border-[#1f2d4e] flex-shrink-0"
          style={{ backgroundColor: value }}
        />
        <span className="text-[#9ca3af] text-sm font-mono">{value}</span>
      </div>
    );
  }

  if (type === 'boolean') {
    return (
      <span
        className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
          value === 'true' ? 'bg-[#10b981]/10 text-[#10b981]' : 'bg-[#6b7280]/10 text-[#6b7280]'
        }`}
      >
        <span className="material-symbols-outlined text-sm">
          {value === 'true' ? 'check_circle' : 'cancel'}
        </span>
        {value}
      </span>
    );
  }

  if (type === 'json') {
    return <span className="text-[#9ca3af] text-xs font-mono line-clamp-1 max-w-xs">{value}</span>;
  }

  return <span className="text-[#9ca3af] text-sm line-clamp-1 max-w-xs">{value || '—'}</span>;
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
      <div className="flex items-center gap-2 text-sm text-[#6b7280]">
        <button
          onClick={() => router.push('/admin/products')}
          className="hover:text-white transition-colors"
        >
          Products
        </button>
        <span className="material-symbols-outlined text-sm">chevron_right</span>
        {productTitle ? (
          <Link
            href={`/admin/products`}
            className="hover:text-white transition-colors line-clamp-1 max-w-[200px]"
            title={productTitle}
          >
            {productTitle}
          </Link>
        ) : (
          <span className="font-mono text-xs">{productId}</span>
        )}
        <span className="material-symbols-outlined text-sm">chevron_right</span>
        <span className="text-white font-medium">Metafields</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ fontFamily: 'var(--font-heading)', color: '#ffffff' }}
          >
            Metafields
          </h1>
          <p className="text-[#6b7280] text-sm mt-1">
            {loading
              ? 'Loading…'
              : `${metafields.length} metafield${metafields.length !== 1 ? 's' : ''}`}
            {productTitle && <span className="text-[#374151]"> — {productTitle}</span>}
          </p>
        </div>

        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-2 bg-[#d4a843] hover:bg-[#e4c06a] text-black px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          Add Metafield
        </button>
      </div>

      {/* Content */}
      {error ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <span className="material-symbols-outlined text-[#ef4444] text-4xl mb-3">error</span>
          <p className="text-[#ef4444] text-sm">{error}</p>
          <button
            onClick={() => fetchMetafields()}
            className="mt-4 text-[#d4a843] text-sm hover:text-[#e4c06a] transition-colors"
          >
            Try again
          </button>
        </div>
      ) : loading ? (
        <div className="bg-[#111827] border border-[#1f2d4e] rounded-2xl animate-pulse h-48" />
      ) : metafields.length === 0 ? (
        <div className="bg-[#111827] border border-[#1f2d4e] rounded-2xl flex flex-col items-center justify-center py-16 text-center">
          <span className="material-symbols-outlined text-[#374151] text-5xl mb-4">
            data_object
          </span>
          <p className="text-white font-semibold mb-2">No metafields yet</p>
          <p className="text-[#6b7280] text-sm mb-6">
            Add custom metadata to this product for extended functionality.
          </p>
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 bg-[#d4a843] hover:bg-[#e4c06a] text-black px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
          >
            <span className="material-symbols-outlined text-lg">add</span>
            Add First Metafield
          </button>
        </div>
      ) : (
        <div className="bg-[#111827] border border-[#1f2d4e] rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#1f2d4e]">
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#6b7280] uppercase tracking-wider">
                  Namespace
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#6b7280] uppercase tracking-wider">
                  Key
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#6b7280] uppercase tracking-wider">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#6b7280] uppercase tracking-wider">
                  Value
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#6b7280] uppercase tracking-wider">
                  Updated
                </th>
                <th className="px-4 py-3 w-20" />
              </tr>
            </thead>
            <tbody>
              {metafields.map((mf) => (
                <tr
                  key={mf.id}
                  className="border-b border-[#1f2d4e] last:border-0 hover:bg-[#0d1526]/50 transition-colors group"
                >
                  <td className="px-4 py-3">
                    <span className="text-[#9ca3af] text-xs font-mono bg-[#0a0f1e] px-2 py-1 rounded-lg">
                      {mf.namespace}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-white text-xs font-mono">{mf.key}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 text-[#6b7280] text-xs">
                      <span className="material-symbols-outlined text-sm">
                        {TYPE_OPTIONS.find((t) => t.value === mf.type)?.icon ?? 'text_fields'}
                      </span>
                      {TYPE_OPTIONS.find((t) => t.value === mf.type)?.label ?? mf.type}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <ValuePreview type={mf.type} value={mf.value} />
                  </td>
                  <td className="px-4 py-3 text-[#374151] text-xs">
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
                        className="text-[#d4a843] hover:text-[#e4c06a] transition-colors p-1 rounded"
                        title="Edit metafield"
                      >
                        <span className="material-symbols-outlined text-lg">edit</span>
                      </button>
                      <button
                        onClick={() => setDeleteTarget(mf)}
                        className="text-[#ef4444] hover:text-red-400 transition-colors p-1 rounded"
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
      <div className="bg-[#0d1526] border border-[#1f2d4e] rounded-xl p-4 flex gap-3">
        <span className="material-symbols-outlined text-[#d4a843] text-xl flex-shrink-0 mt-0.5">
          info
        </span>
        <div>
          <p className="text-[#9ca3af] text-sm font-medium mb-1">About Metafields</p>
          <p className="text-[#6b7280] text-xs leading-relaxed">
            Metafields let you store additional information about products. They are organized by{' '}
            <span className="font-mono text-[#9ca3af]">namespace.key</span> and support types like
            text, numbers, JSON, booleans, dates, and colors.
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
