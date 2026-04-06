'use client';

/**
 * Admin Collections Page
 *
 * Grid/list of all Shopify collections with full CRUD:
 * create, edit, delete + view toggle.
 */

import { useEffect, useState, useCallback } from 'react';
import { useToast } from '@/components/ui/useToast';

// ─── Types ─────────────────────────────────────────────────────────────────────

type Collection = {
  id: string;
  title: string;
  handle: string;
  description: string;
  productsCount: { count: number };
  image: { url: string; altText: string | null } | null;
  updatedAt: string;
};

type CollectionFormData = {
  title: string;
  descriptionHtml: string;
  imageUrl: string;
  type: 'manual' | 'smart';
};

const EMPTY_FORM: CollectionFormData = {
  title: '',
  descriptionHtml: '',
  imageUrl: '',
  type: 'manual',
};

// ─── Skeleton Card ─────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-[#111827] border border-[#1f2d4e] rounded-2xl overflow-hidden animate-pulse">
      <div className="h-40 bg-[#1f2d4e]" />
      <div className="p-5 space-y-3">
        <div className="h-4 bg-[#1f2d4e] rounded w-3/4" />
        <div className="h-3 bg-[#1f2d4e] rounded w-1/2" />
        <div className="h-3 bg-[#1f2d4e] rounded w-full" />
      </div>
    </div>
  );
}

// ─── Collection Card (Grid) ────────────────────────────────────────────────────

function CollectionCard({
  collection,
  onEdit,
  onDelete,
}: {
  collection: Collection;
  onEdit: (c: Collection) => void;
  onDelete: (c: Collection) => void;
}) {
  return (
    <div className="bg-[#111827] border border-[#1f2d4e] hover:border-[#d4a843]/30 rounded-2xl overflow-hidden transition-all group relative">
      {/* Image / Placeholder */}
      <div className="relative h-40 bg-[#0d1526] overflow-hidden">
        {collection.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={collection.image.url}
            alt={collection.image.altText ?? collection.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="material-symbols-outlined text-[#1f2d4e] text-5xl">
              collections_bookmark
            </span>
          </div>
        )}

        {/* Product count badge */}
        <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm rounded-lg px-2.5 py-1 flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[#d4a843] text-sm">inventory_2</span>
          <span className="text-white text-xs font-medium">{collection.productsCount.count}</span>
        </div>

        {/* Action buttons — hover reveal */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <button
            onClick={() => onEdit(collection)}
            className="bg-[#d4a843] hover:bg-[#e4c06a] text-black text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
          >
            <span className="material-symbols-outlined text-base">edit</span>
            Edit
          </button>
          <button
            onClick={() => onDelete(collection)}
            className="bg-[#ef4444]/90 hover:bg-[#ef4444] text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
          >
            <span className="material-symbols-outlined text-base">delete</span>
            Delete
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="p-5">
        <h3
          className="text-white font-semibold text-sm mb-1 group-hover:text-[#d4a843] transition-colors line-clamp-1"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          {collection.title}
        </h3>
        <p className="text-[#6b7280] text-xs mb-3 line-clamp-2 leading-relaxed">
          {collection.description || 'No description'}
        </p>
        <div className="flex items-center justify-between">
          <span className="text-[#374151] text-xs font-mono">/{collection.handle}</span>
          <span className="text-[#374151] text-xs">
            {new Date(collection.updatedAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Collection Row (List) ─────────────────────────────────────────────────────

function CollectionRow({
  collection,
  onEdit,
  onDelete,
}: {
  collection: Collection;
  onEdit: (c: Collection) => void;
  onDelete: (c: Collection) => void;
}) {
  return (
    <tr className="border-b border-[#1f2d4e] hover:bg-[#0d1526]/50 transition-colors group">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg overflow-hidden bg-[#0d1526] flex-shrink-0">
            {collection.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={collection.image.url}
                alt={collection.image.altText ?? collection.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="material-symbols-outlined text-[#1f2d4e] text-xl">
                  collections_bookmark
                </span>
              </div>
            )}
          </div>
          <div>
            <p className="text-white text-sm font-medium line-clamp-1">{collection.title}</p>
            <p className="text-[#374151] text-xs font-mono">/{collection.handle}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-[#6b7280] text-sm line-clamp-1 max-w-xs">
        {collection.description || '—'}
      </td>
      <td className="px-4 py-3 text-center">
        <span className="inline-flex items-center gap-1 bg-[#0d1526] rounded-lg px-2 py-0.5 text-[#d4a843] text-xs">
          <span className="material-symbols-outlined text-sm">inventory_2</span>
          {collection.productsCount.count}
        </span>
      </td>
      <td className="px-4 py-3 text-[#6b7280] text-xs">
        {new Date(collection.updatedAt).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(collection)}
            className="text-[#d4a843] hover:text-[#e4c06a] transition-colors p-1 rounded"
            title="Edit collection"
          >
            <span className="material-symbols-outlined text-lg">edit</span>
          </button>
          <button
            onClick={() => onDelete(collection)}
            className="text-[#ef4444] hover:text-red-400 transition-colors p-1 rounded"
            title="Delete collection"
          >
            <span className="material-symbols-outlined text-lg">delete</span>
          </button>
        </div>
      </td>
    </tr>
  );
}

// ─── Collection Modal ──────────────────────────────────────────────────────────

function CollectionModal({
  mode,
  initialData,
  onClose,
  onSave,
}: {
  mode: 'create' | 'edit';
  initialData?: CollectionFormData;
  onClose: () => void;
  onSave: (data: CollectionFormData) => Promise<void>;
}) {
  const [form, setForm] = useState<CollectionFormData>(initialData ?? EMPTY_FORM);
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 bg-[#111827] border border-[#1f2d4e] rounded-2xl w-full max-w-lg shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#1f2d4e]">
          <h2
            className="text-white font-bold text-lg"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            {mode === 'create' ? 'New Collection' : 'Edit Collection'}
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
          {/* Title */}
          <div>
            <label className="block text-sm text-[#9ca3af] mb-1.5 font-medium">
              Title <span className="text-[#ef4444]">*</span>
            </label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Summer Collection"
              className="w-full bg-[#0a0f1e] border border-[#1f2d4e] focus:border-[#d4a843] rounded-xl px-4 py-2.5 text-white text-sm placeholder-[#374151] outline-none transition-colors"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm text-[#9ca3af] mb-1.5 font-medium">Description</label>
            <textarea
              value={form.descriptionHtml}
              onChange={(e) => setForm((f) => ({ ...f, descriptionHtml: e.target.value }))}
              placeholder="Describe this collection…"
              rows={3}
              className="w-full bg-[#0a0f1e] border border-[#1f2d4e] focus:border-[#d4a843] rounded-xl px-4 py-2.5 text-white text-sm placeholder-[#374151] outline-none transition-colors resize-none"
            />
          </div>

          {/* Image URL */}
          <div>
            <label className="block text-sm text-[#9ca3af] mb-1.5 font-medium">
              Image URL <span className="text-[#374151] text-xs font-normal">(optional)</span>
            </label>
            <input
              type="url"
              value={form.imageUrl}
              onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
              placeholder="https://…"
              className="w-full bg-[#0a0f1e] border border-[#1f2d4e] focus:border-[#d4a843] rounded-xl px-4 py-2.5 text-white text-sm placeholder-[#374151] outline-none transition-colors"
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm text-[#9ca3af] mb-1.5 font-medium">
              Collection Type
            </label>
            <div className="flex gap-3">
              {(['manual', 'smart'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, type: t }))}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all capitalize ${
                    form.type === t
                      ? 'bg-[#d4a843]/10 border-[#d4a843] text-[#d4a843]'
                      : 'bg-[#0a0f1e] border-[#1f2d4e] text-[#6b7280] hover:border-[#374151]'
                  }`}
                >
                  <span className="material-symbols-outlined text-sm mr-1 align-middle">
                    {t === 'manual' ? 'edit_note' : 'auto_awesome'}
                  </span>
                  {t}
                </button>
              ))}
            </div>
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
                'Create Collection'
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
  collection,
  onClose,
  onConfirm,
}: {
  collection: Collection;
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
              className="text-white font-bold text-lg mb-1"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              Delete Collection
            </h2>
            <p className="text-[#6b7280] text-sm leading-relaxed">
              Are you sure you want to delete{' '}
              <span className="text-white font-medium">&ldquo;{collection.title}&rdquo;</span>? This
              action cannot be undone.
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

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function CollectionsPage() {
  const { toast } = useToast();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('grid');

  // Modal state
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Collection | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Collection | null>(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchCollections = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/collections');
      const data = (await res.json()) as { collections?: Collection[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Failed to load');
      setCollections(data.collections ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load collections');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleCreate = async (form: CollectionFormData) => {
    const body: Record<string, unknown> = {
      title: form.title,
      descriptionHtml: form.descriptionHtml,
    };
    if (form.imageUrl) {
      body.image = { src: form.imageUrl };
    }
    if (form.type === 'smart') {
      body.ruleSet = { appliedDisjunctively: false, rules: [] };
    }

    const res = await fetch('/api/admin/collections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as { collection?: Collection; error?: string };

    if (!res.ok) {
      toast.error(data.error ?? 'Failed to create collection');
      return;
    }

    toast.success(`Collection "${form.title}" created`);
    setCreateOpen(false);
    fetchCollections();
  };

  const handleEdit = async (form: CollectionFormData) => {
    if (!editTarget) return;

    const body: Record<string, unknown> = {
      title: form.title,
      descriptionHtml: form.descriptionHtml,
    };
    if (form.imageUrl) {
      body.image = { src: form.imageUrl };
    }

    const res = await fetch(`/api/admin/collections/${encodeURIComponent(editTarget.id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as { collection?: Collection; error?: string };

    if (!res.ok) {
      toast.error(data.error ?? 'Failed to update collection');
      return;
    }

    toast.success(`Collection "${form.title}" updated`);
    setEditTarget(null);
    fetchCollections();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    const res = await fetch(`/api/admin/collections/${encodeURIComponent(deleteTarget.id)}`, {
      method: 'DELETE',
    });
    const data = (await res.json()) as { success?: boolean; error?: string };

    if (!res.ok) {
      toast.error(data.error ?? 'Failed to delete collection');
      return;
    }

    toast.success(`Collection "${deleteTarget.title}" deleted`);
    setDeleteTarget(null);
    fetchCollections();
  };

  // ── Helpers ────────────────────────────────────────────────────────────────

  const collectionToForm = (c: Collection): CollectionFormData => ({
    title: c.title,
    descriptionHtml: c.description,
    imageUrl: c.image?.url ?? '',
    type: 'manual',
  });

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1
            className="text-2xl font-bold text-white"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Collections
          </h1>
          <p className="text-[#6b7280] text-sm mt-1">
            {loading
              ? 'Loading…'
              : `${collections.length} collection${collections.length !== 1 ? 's' : ''}`}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View toggle */}
          <div className="flex items-center bg-[#111827] border border-[#1f2d4e] rounded-xl p-1">
            <button
              onClick={() => setView('grid')}
              className={`p-1.5 rounded-lg transition-all ${
                view === 'grid' ? 'bg-[#1f2d4e] text-[#d4a843]' : 'text-[#6b7280] hover:text-white'
              }`}
              title="Grid view"
            >
              <span className="material-symbols-outlined text-lg">grid_view</span>
            </button>
            <button
              onClick={() => setView('list')}
              className={`p-1.5 rounded-lg transition-all ${
                view === 'list' ? 'bg-[#1f2d4e] text-[#d4a843]' : 'text-[#6b7280] hover:text-white'
              }`}
              title="List view"
            >
              <span className="material-symbols-outlined text-lg">list</span>
            </button>
          </div>

          {/* Create button */}
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 bg-[#d4a843] hover:bg-[#e4c06a] text-black px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
          >
            <span className="material-symbols-outlined text-lg">add</span>
            Create Collection
          </button>
        </div>
      </div>

      {/* Content */}
      {error ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <span className="material-symbols-outlined text-[#ef4444] text-4xl mb-3">error</span>
          <p className="text-[#ef4444] text-sm">{error}</p>
          <button
            onClick={() => fetchCollections()}
            className="mt-4 text-[#d4a843] text-sm hover:text-[#e4c06a] transition-colors"
          >
            Try again
          </button>
        </div>
      ) : loading ? (
        view === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : (
          <div className="bg-[#111827] border border-[#1f2d4e] rounded-2xl animate-pulse h-64" />
        )
      ) : collections.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <span className="material-symbols-outlined text-[#374151] text-5xl mb-4">
            collections_bookmark
          </span>
          <p className="text-white font-semibold mb-2">No collections yet</p>
          <p className="text-[#6b7280] text-sm mb-6">
            Create your first collection to organize products.
          </p>
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 bg-[#d4a843] hover:bg-[#e4c06a] text-black px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
          >
            <span className="material-symbols-outlined text-lg">add</span>
            Create Collection
          </button>
        </div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {collections.map((collection) => (
            <CollectionCard
              key={collection.id}
              collection={collection}
              onEdit={setEditTarget}
              onDelete={setDeleteTarget}
            />
          ))}
        </div>
      ) : (
        <div className="bg-[#111827] border border-[#1f2d4e] rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#1f2d4e]">
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#6b7280] uppercase tracking-wider">
                  Collection
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#6b7280] uppercase tracking-wider">
                  Description
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-[#6b7280] uppercase tracking-wider">
                  Products
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#6b7280] uppercase tracking-wider">
                  Updated
                </th>
                <th className="px-4 py-3 w-20" />
              </tr>
            </thead>
            <tbody>
              {collections.map((collection) => (
                <CollectionRow
                  key={collection.id}
                  collection={collection}
                  onEdit={setEditTarget}
                  onDelete={setDeleteTarget}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      {createOpen && (
        <CollectionModal mode="create" onClose={() => setCreateOpen(false)} onSave={handleCreate} />
      )}

      {/* Edit Modal */}
      {editTarget && (
        <CollectionModal
          mode="edit"
          initialData={collectionToForm(editTarget)}
          onClose={() => setEditTarget(null)}
          onSave={handleEdit}
        />
      )}

      {/* Delete Confirm Modal */}
      {deleteTarget && (
        <ConfirmDeleteModal
          collection={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
