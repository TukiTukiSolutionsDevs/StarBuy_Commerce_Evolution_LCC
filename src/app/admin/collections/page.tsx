'use client';

/**
 * Admin Collections Page
 *
 * Grid/list of all Shopify collections with full CRUD:
 * create, edit, delete + view toggle, search, sort, type badges, published status.
 * Modal: 2-column layout with SEO preview, sort order, smart rules editor.
 */

import { useEffect, useState, useCallback } from 'react';
import { useToast } from '@/components/ui/useToast';

// ─── Types ─────────────────────────────────────────────────────────────────────

type CollectionRule = {
  column: string;
  relation: string;
  condition: string;
};

type Collection = {
  id: string;
  title: string;
  handle: string;
  description: string;
  descriptionHtml: string;
  productsCount: { count: number };
  image: { url: string; altText: string | null } | null;
  updatedAt: string;
  sortOrder: string;
  ruleSet: {
    appliedDisjunctively: boolean;
    rules: CollectionRule[];
  } | null;
  seo: { title: string | null; description: string | null };
};

type CollectionFormData = {
  title: string;
  descriptionHtml: string;
  imageUrl: string;
  type: 'manual' | 'smart';
  sortOrder: string;
  seoTitle: string;
  seoDescription: string;
  rules: CollectionRule[];
  appliedDisjunctively: boolean;
};

const EMPTY_FORM: CollectionFormData = {
  title: '',
  descriptionHtml: '',
  imageUrl: '',
  type: 'manual',
  sortOrder: 'MANUAL',
  seoTitle: '',
  seoDescription: '',
  rules: [{ column: 'TITLE', relation: 'CONTAINS', condition: '' }],
  appliedDisjunctively: false,
};

// ─── Constants ─────────────────────────────────────────────────────────────────

const SORT_ORDER_OPTIONS = [
  { value: 'MANUAL', label: 'Manual' },
  { value: 'BEST_SELLING', label: 'Best selling' },
  { value: 'ALPHA_ASC', label: 'Alphabetically A–Z' },
  { value: 'ALPHA_DESC', label: 'Alphabetically Z–A' },
  { value: 'PRICE_DESC', label: 'Price high to low' },
  { value: 'PRICE_ASC', label: 'Price low to high' },
  { value: 'CREATED_DESC', label: 'Date new to old' },
  { value: 'CREATED', label: 'Date old to new' },
];

const RULE_COLUMNS = [
  'TITLE',
  'TYPE',
  'VENDOR',
  'TAG',
  'PRICE',
  'COMPARE_AT_PRICE',
  'WEIGHT',
  'INVENTORY_STOCK',
  'VARIANT_TITLE',
];

const RULE_RELATIONS = [
  'EQUALS',
  'NOT_EQUALS',
  'GREATER_THAN',
  'LESS_THAN',
  'STARTS_WITH',
  'ENDS_WITH',
  'CONTAINS',
  'NOT_CONTAINS',
];

// ─── Helpers ───────────────────────────────────────────────────────────────────

function isSmartCollection(collection: Collection): boolean {
  return !!(collection.ruleSet && collection.ruleSet.rules.length > 0);
}

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

// ─── Type Badge ────────────────────────────────────────────────────────────────

function TypeBadge({ smart }: { smart: boolean }) {
  if (smart) {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
        style={{ background: 'rgba(99,102,241,0.15)', color: '#6366f1' }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: '10px' }}>
          auto_awesome
        </span>
        Smart
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
      style={{ background: 'rgba(107,114,128,0.15)', color: '#9ca3af' }}
    >
      <span className="material-symbols-outlined" style={{ fontSize: '10px' }}>
        edit_note
      </span>
      Manual
    </span>
  );
}

// ─── Status Badge ──────────────────────────────────────────────────────────────

function StatusBadge({ published }: { published: string | null | boolean }) {
  if (published) {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium"
        style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}
      >
        <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: '#10b981' }} />
        Published
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium"
      style={{ background: 'rgba(107,114,128,0.1)', color: '#6b7280' }}
    >
      <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: '#6b7280' }} />
      Draft
    </span>
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
  const smart = isSmartCollection(collection);

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

        {/* Type badge — top left */}
        <div className="absolute top-3 left-3">
          <TypeBadge smart={smart} />
        </div>

        {/* Product count badge + published dot — top right */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5">
          <span
            className="inline-block w-2 h-2 rounded-full"
            style={{ background: '#10b981' }}
            title="Published"
          />
          <div className="bg-black/60 backdrop-blur-sm rounded-lg px-2.5 py-1 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[#d4a843] text-sm">inventory_2</span>
            <span className="text-white text-xs font-medium">{collection.productsCount.count}</span>
          </div>
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
          className="font-semibold text-sm mb-1 group-hover:text-[#d4a843] transition-colors line-clamp-1"
          style={{ fontFamily: 'var(--font-heading)', color: '#ffffff' }}
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
  const smart = isSmartCollection(collection);

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
            <div className="flex items-center gap-2 mb-0.5">
              <p className="text-white text-sm font-medium line-clamp-1">{collection.title}</p>
              <TypeBadge smart={smart} />
            </div>
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
      <td className="px-4 py-3">
        <StatusBadge published={true} />
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

// ─── SEO Preview Block ─────────────────────────────────────────────────────────

function SeoPreview({
  title,
  handle,
  description,
}: {
  title: string;
  handle: string;
  description: string;
}) {
  const displayTitle = title || 'Collection Title';
  const displayUrl = `yourdomain.com/collections/${handle || 'collection-handle'}`;
  const displayDesc =
    description || 'Your collection description will appear here in search results.';

  return (
    <div
      className="rounded-xl p-3 mt-2"
      style={{ background: '#0a0f1e', border: '1px solid #1f2d4e' }}
    >
      <p className="text-[#9ca3af] text-[10px] uppercase tracking-wider mb-2 font-semibold">
        Google Preview
      </p>
      <p
        className="text-sm font-medium leading-tight mb-0.5 line-clamp-1"
        style={{ color: '#8ab4f8' }}
      >
        {displayTitle}
      </p>
      <p className="text-[11px] mb-1 line-clamp-1" style={{ color: '#34a853' }}>
        {displayUrl}
      </p>
      <p className="text-[11px] leading-relaxed line-clamp-2" style={{ color: '#bdc1c6' }}>
        {displayDesc}
      </p>
    </div>
  );
}

// ─── Smart Rules Editor ────────────────────────────────────────────────────────

function SmartRulesEditor({
  rules,
  appliedDisjunctively,
  onRulesChange,
  onDisjunctiveChange,
}: {
  rules: CollectionRule[];
  appliedDisjunctively: boolean;
  onRulesChange: (rules: CollectionRule[]) => void;
  onDisjunctiveChange: (v: boolean) => void;
}) {
  const addRule = () => {
    onRulesChange([...rules, { column: 'TITLE', relation: 'CONTAINS', condition: '' }]);
  };

  const removeRule = (idx: number) => {
    onRulesChange(rules.filter((_, i) => i !== idx));
  };

  const updateRule = (idx: number, field: keyof CollectionRule, value: string) => {
    onRulesChange(rules.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));
  };

  return (
    <div className="space-y-3">
      {/* Condition type toggle */}
      <div className="flex items-center gap-2">
        <span className="text-[#9ca3af] text-xs">Products must match</span>
        <div className="flex items-center bg-[#0a0f1e] border border-[#1f2d4e] rounded-lg p-0.5">
          <button
            type="button"
            onClick={() => onDisjunctiveChange(false)}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
              !appliedDisjunctively ? 'bg-[#6366f1] text-white' : 'text-[#6b7280] hover:text-white'
            }`}
          >
            All conditions
          </button>
          <button
            type="button"
            onClick={() => onDisjunctiveChange(true)}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
              appliedDisjunctively ? 'bg-[#6366f1] text-white' : 'text-[#6b7280] hover:text-white'
            }`}
          >
            Any condition
          </button>
        </div>
      </div>

      {/* Rules list */}
      <div className="space-y-2">
        {rules.map((rule, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <select
              value={rule.column}
              onChange={(e) => updateRule(idx, 'column', e.target.value)}
              className="flex-1 bg-[#0a0f1e] border border-[#1f2d4e] focus:border-[#6366f1] rounded-xl px-3 py-2 text-white text-xs outline-none transition-colors"
            >
              {RULE_COLUMNS.map((c) => (
                <option key={c} value={c} style={{ background: '#0a0f1e' }}>
                  {c.toLowerCase().replace(/_/g, ' ')}
                </option>
              ))}
            </select>
            <select
              value={rule.relation}
              onChange={(e) => updateRule(idx, 'relation', e.target.value)}
              className="flex-1 bg-[#0a0f1e] border border-[#1f2d4e] focus:border-[#6366f1] rounded-xl px-3 py-2 text-white text-xs outline-none transition-colors"
            >
              {RULE_RELATIONS.map((r) => (
                <option key={r} value={r} style={{ background: '#0a0f1e' }}>
                  {r.toLowerCase().replace(/_/g, ' ')}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={rule.condition}
              onChange={(e) => updateRule(idx, 'condition', e.target.value)}
              placeholder="Value…"
              className="flex-1 bg-[#0a0f1e] border border-[#1f2d4e] focus:border-[#6366f1] rounded-xl px-3 py-2 text-white text-xs placeholder-[#374151] outline-none transition-colors"
            />
            <button
              type="button"
              onClick={() => removeRule(idx)}
              disabled={rules.length === 1}
              className="text-[#6b7280] hover:text-[#ef4444] transition-colors p-1.5 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
              title="Remove rule"
            >
              <span className="material-symbols-outlined text-base">remove_circle</span>
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addRule}
        className="flex items-center gap-1.5 text-[#6366f1] hover:text-[#818cf8] text-xs font-medium transition-colors"
      >
        <span className="material-symbols-outlined text-sm">add_circle</span>
        Add condition
      </button>
    </div>
  );
}

// ─── Collection Modal (2-column) ───────────────────────────────────────────────

function CollectionModal({
  mode,
  initialData,
  editHandle,
  onClose,
  onSave,
}: {
  mode: 'create' | 'edit';
  initialData?: CollectionFormData;
  editHandle?: string;
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

  const currentHandle =
    editHandle ??
    form.title
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 bg-[#111827] border border-[#1f2d4e] rounded-2xl w-full max-w-3xl shadow-2xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#1f2d4e]">
          <h2
            className="font-bold text-lg"
            style={{ fontFamily: 'var(--font-heading)', color: '#ffffff' }}
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

        {/* Form — 2 columns */}
        <form onSubmit={handleSubmit}>
          <div className="grid lg:grid-cols-3 gap-0">
            {/* Left column (main) */}
            <div className="lg:col-span-2 p-6 space-y-5 border-r border-[#1f2d4e]">
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
                <label className="block text-sm text-[#9ca3af] mb-1.5 font-medium">
                  Description
                </label>
                <textarea
                  value={form.descriptionHtml}
                  onChange={(e) => setForm((f) => ({ ...f, descriptionHtml: e.target.value }))}
                  placeholder="Describe this collection…"
                  rows={3}
                  className="w-full bg-[#0a0f1e] border border-[#1f2d4e] focus:border-[#d4a843] rounded-xl px-4 py-2.5 text-white text-sm placeholder-[#374151] outline-none transition-colors resize-none"
                />
              </div>

              {/* Collection Type */}
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
                          ? t === 'smart'
                            ? 'bg-[#6366f1]/10 border-[#6366f1] text-[#6366f1]'
                            : 'bg-[#d4a843]/10 border-[#d4a843] text-[#d4a843]'
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

              {/* Smart Rules */}
              {form.type === 'smart' && (
                <div
                  className="rounded-xl p-4 space-y-3"
                  style={{
                    background: 'rgba(99,102,241,0.05)',
                    border: '1px solid rgba(99,102,241,0.2)',
                  }}
                >
                  <p
                    className="text-xs font-semibold uppercase tracking-wider"
                    style={{ color: '#6366f1' }}
                  >
                    Automation Rules
                  </p>
                  <SmartRulesEditor
                    rules={form.rules}
                    appliedDisjunctively={form.appliedDisjunctively}
                    onRulesChange={(rules) => setForm((f) => ({ ...f, rules }))}
                    onDisjunctiveChange={(v) => setForm((f) => ({ ...f, appliedDisjunctively: v }))}
                  />
                </div>
              )}
            </div>

            {/* Right column (sidebar) */}
            <div className="lg:col-span-1 p-6 space-y-5">
              {/* SEO section */}
              <div
                className="rounded-xl p-4 space-y-3"
                style={{ background: '#0d1526', border: '1px solid #1f2d4e' }}
              >
                <p className="text-xs font-semibold uppercase tracking-wider text-[#9ca3af]">
                  Search Engine Listing
                </p>

                {/* SEO Title */}
                <div>
                  <label className="block text-xs text-[#6b7280] mb-1 font-medium">SEO Title</label>
                  <input
                    type="text"
                    value={form.seoTitle}
                    onChange={(e) => setForm((f) => ({ ...f, seoTitle: e.target.value }))}
                    placeholder={form.title || 'Collection title…'}
                    className="w-full bg-[#0a0f1e] border border-[#1f2d4e] focus:border-[#d4a843] rounded-xl px-3 py-2 text-white text-xs placeholder-[#374151] outline-none transition-colors"
                  />
                </div>

                {/* SEO Description */}
                <div>
                  <label className="block text-xs text-[#6b7280] mb-1 font-medium">
                    SEO Description
                  </label>
                  <textarea
                    value={form.seoDescription}
                    onChange={(e) => setForm((f) => ({ ...f, seoDescription: e.target.value }))}
                    placeholder="Meta description for search engines…"
                    rows={2}
                    className="w-full bg-[#0a0f1e] border border-[#1f2d4e] focus:border-[#d4a843] rounded-xl px-3 py-2 text-white text-xs placeholder-[#374151] outline-none transition-colors resize-none"
                  />
                </div>

                {/* URL Handle */}
                <div>
                  <label className="block text-xs text-[#6b7280] mb-1 font-medium">
                    URL Handle
                  </label>
                  <div
                    className="w-full rounded-xl px-3 py-2 text-xs font-mono"
                    style={{ background: '#0a0f1e', border: '1px solid #1f2d4e', color: '#9ca3af' }}
                  >
                    /collections/{currentHandle || '…'}
                  </div>
                </div>

                {/* Google Preview */}
                <SeoPreview
                  title={form.seoTitle || form.title}
                  handle={currentHandle}
                  description={form.seoDescription || form.descriptionHtml}
                />
              </div>

              {/* Sort Order */}
              <div>
                <label className="block text-xs text-[#9ca3af] mb-1.5 font-medium">
                  Default Product Sort
                </label>
                <select
                  value={form.sortOrder}
                  onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
                  className="w-full bg-[#0a0f1e] border border-[#1f2d4e] focus:border-[#d4a843] rounded-xl px-3 py-2.5 text-white text-sm outline-none transition-colors"
                >
                  {SORT_ORDER_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value} style={{ background: '#0a0f1e' }}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Image URL */}
              <div>
                <label className="block text-xs text-[#9ca3af] mb-1.5 font-medium">
                  Image URL <span className="text-[#374151] font-normal">(optional)</span>
                </label>
                <input
                  type="url"
                  value={form.imageUrl}
                  onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
                  placeholder="https://…"
                  className="w-full bg-[#0a0f1e] border border-[#1f2d4e] focus:border-[#d4a843] rounded-xl px-3 py-2.5 text-white text-sm placeholder-[#374151] outline-none transition-colors"
                />
                {form.imageUrl && (
                  <div className="mt-2 rounded-xl overflow-hidden h-24 bg-[#0d1526]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={form.imageUrl}
                      alt="Preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer actions */}
          <div className="flex gap-3 px-6 py-4 border-t border-[#1f2d4e]">
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
              className="font-bold text-lg mb-1"
              style={{ fontFamily: 'var(--font-heading)', color: '#ffffff' }}
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

type SortKey = 'title' | 'products' | 'updated';

export default function CollectionsPage() {
  const { toast } = useToast();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('title');

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
      sortOrder: form.sortOrder,
    };
    if (form.imageUrl) {
      body.image = { src: form.imageUrl };
    }
    if (form.type === 'smart') {
      body.ruleSet = {
        appliedDisjunctively: form.appliedDisjunctively,
        rules: form.rules.filter((r) => r.condition.trim() !== ''),
      };
    }
    if (form.seoTitle || form.seoDescription) {
      body.seo = { title: form.seoTitle, description: form.seoDescription };
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
      sortOrder: form.sortOrder,
    };
    if (form.imageUrl) {
      body.image = { src: form.imageUrl };
    }
    if (form.type === 'smart') {
      body.ruleSet = {
        appliedDisjunctively: form.appliedDisjunctively,
        rules: form.rules.filter((r) => r.condition.trim() !== ''),
      };
    }
    if (form.seoTitle || form.seoDescription) {
      body.seo = { title: form.seoTitle, description: form.seoDescription };
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
    descriptionHtml: c.descriptionHtml || c.description,
    imageUrl: c.image?.url ?? '',
    type: isSmartCollection(c) ? 'smart' : 'manual',
    sortOrder: c.sortOrder ?? 'MANUAL',
    seoTitle: c.seo?.title ?? '',
    seoDescription: c.seo?.description ?? '',
    rules:
      c.ruleSet && c.ruleSet.rules.length > 0
        ? c.ruleSet.rules
        : [{ column: 'TITLE', relation: 'CONTAINS', condition: '' }],
    appliedDisjunctively: c.ruleSet?.appliedDisjunctively ?? false,
  });

  // ── Filtered + sorted collections ─────────────────────────────────────────

  const filteredCollections = collections
    .filter((c) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return c.title.toLowerCase().includes(q) || c.handle.toLowerCase().includes(q);
    })
    .sort((a, b) => {
      if (sortKey === 'title') return a.title.localeCompare(b.title);
      if (sortKey === 'products') return b.productsCount.count - a.productsCount.count;
      if (sortKey === 'updated')
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      return 0;
    });

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ fontFamily: 'var(--font-heading)', color: '#ffffff' }}
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
          {/* Sort dropdown */}
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="bg-[#111827] border border-[#1f2d4e] rounded-xl px-3 py-2 text-sm text-[#9ca3af] outline-none transition-colors hover:border-[#374151]"
          >
            <option value="title" style={{ background: '#111827' }}>
              Sort: Title
            </option>
            <option value="products" style={{ background: '#111827' }}>
              Sort: Products
            </option>
            <option value="updated" style={{ background: '#111827' }}>
              Sort: Updated
            </option>
          </select>

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

      {/* Search bar */}
      <div className="relative">
        <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6b7280] text-lg pointer-events-none">
          search
        </span>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search collections by title or handle…"
          className="w-full bg-[#111827] border border-[#1f2d4e] focus:border-[#d4a843] rounded-xl pl-10 pr-4 py-2.5 text-white text-sm placeholder-[#374151] outline-none transition-colors"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#6b7280] hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        )}
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
      ) : filteredCollections.length === 0 ? (
        search ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <span className="material-symbols-outlined text-[#374151] text-5xl mb-4">
              search_off
            </span>
            <p className="text-white font-semibold mb-2">
              No collections match &ldquo;{search}&rdquo;
            </p>
            <p className="text-[#6b7280] text-sm">Try adjusting your search terms.</p>
          </div>
        ) : (
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
        )
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredCollections.map((collection) => (
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
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#6b7280] uppercase tracking-wider">
                  Updated
                </th>
                <th className="px-4 py-3 w-20" />
              </tr>
            </thead>
            <tbody>
              {filteredCollections.map((collection) => (
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
          editHandle={editTarget.handle}
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
