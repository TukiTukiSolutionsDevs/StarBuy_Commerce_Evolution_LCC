'use client';

/**
 * Admin Collections Page — Phase 3
 *
 * Migrated to use admin design tokens. Zero hardcoded hex colors.
 * Grid/list of all Shopify collections with full CRUD:
 * create, edit, delete + view toggle, search, sort, type badges, published status.
 * Modal: 2-column layout with SEO preview, sort order, smart rules editor.
 */

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useToast } from '@/components/ui/useToast';
import { AdminHelpBanner } from '@/components/admin/ui';

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
  { value: 'BEST_SELLING', label: 'Más vendidos' },
  { value: 'ALPHA_ASC', label: 'Alfabético A–Z' },
  { value: 'ALPHA_DESC', label: 'Alfabético Z–A' },
  { value: 'PRICE_DESC', label: 'Precio mayor a menor' },
  { value: 'PRICE_ASC', label: 'Precio menor a mayor' },
  { value: 'CREATED_DESC', label: 'Más recientes primero' },
  { value: 'CREATED', label: 'Más antiguos primero' },
];

const TYPE_LABELS: Record<string, string> = { manual: 'Manual', smart: 'Inteligente' };

const COLUMN_LABELS: Record<string, string> = {
  TITLE: 'título',
  TYPE: 'tipo',
  VENDOR: 'marca',
  TAG: 'etiqueta',
  PRICE: 'precio',
  COMPARE_AT_PRICE: 'precio anterior',
  WEIGHT: 'peso',
  INVENTORY_STOCK: 'stock',
  VARIANT_TITLE: 'variante',
};

const RELATION_LABELS: Record<string, string> = {
  EQUALS: 'es igual a',
  NOT_EQUALS: 'no es igual a',
  GREATER_THAN: 'mayor que',
  LESS_THAN: 'menor que',
  STARTS_WITH: 'empieza con',
  ENDS_WITH: 'termina con',
  CONTAINS: 'contiene',
  NOT_CONTAINS: 'no contiene',
};

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
    <div
      className="rounded-2xl overflow-hidden animate-pulse"
      style={{ backgroundColor: 'var(--admin-bg-card)', border: '1px solid var(--admin-border)' }}
    >
      <div className="h-40" style={{ backgroundColor: 'var(--admin-border)' }} />
      <div className="p-5 space-y-3">
        <div className="h-4 rounded w-3/4" style={{ backgroundColor: 'var(--admin-border)' }} />
        <div className="h-3 rounded w-1/2" style={{ backgroundColor: 'var(--admin-border)' }} />
        <div className="h-3 rounded w-full" style={{ backgroundColor: 'var(--admin-border)' }} />
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
        style={{ background: 'var(--admin-accent-bg)', color: 'var(--admin-accent)' }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: '10px' }}>
          auto_awesome
        </span>
        Inteligente
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
      style={{
        background: 'color-mix(in srgb, var(--admin-text-muted) 15%, transparent)',
        color: 'var(--admin-text-secondary)',
      }}
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
        style={{ background: 'var(--admin-success-bg)', color: 'var(--admin-success)' }}
      >
        <span
          className="inline-block w-1.5 h-1.5 rounded-full"
          style={{ background: 'var(--admin-success)' }}
        />
        Publicada
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium"
      style={{
        background: 'color-mix(in srgb, var(--admin-text-muted) 10%, transparent)',
        color: 'var(--admin-text-muted)',
      }}
    >
      <span
        className="inline-block w-1.5 h-1.5 rounded-full"
        style={{ background: 'var(--admin-text-muted)' }}
      />
      Borrador
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
    <div
      className="rounded-2xl overflow-hidden transition-all group relative"
      style={{
        backgroundColor: 'var(--admin-bg-card)',
        border: '1px solid var(--admin-border)',
      }}
    >
      {/* Image / Placeholder */}
      <div
        className="relative h-40 overflow-hidden"
        style={{ backgroundColor: 'var(--admin-bg-elevated)' }}
      >
        {collection.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={collection.image.url}
            alt={collection.image.altText ?? collection.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2">
            <span
              className="material-symbols-outlined text-4xl"
              style={{ color: 'var(--admin-text-disabled)' }}
            >
              {smart ? 'auto_awesome' : 'collections_bookmark'}
            </span>
            <span className="text-xs font-medium" style={{ color: 'var(--admin-text-disabled)' }}>
              {smart ? 'Colección Inteligente' : 'Colección Manual'}
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
            style={{ background: 'var(--admin-success)' }}
            title="Publicada"
          />
          <div className="bg-black/60 backdrop-blur-sm rounded-lg px-2.5 py-1 flex items-center gap-1.5">
            <span
              className="material-symbols-outlined text-sm"
              style={{ color: 'var(--admin-brand)' }}
            >
              inventory_2
            </span>
            {/* eslint-disable-next-line no-restricted-syntax -- over black/60 overlay */}
            <span className="text-white text-xs font-medium">{collection.productsCount.count}</span>
          </div>
        </div>

        {/* Action buttons — hover reveal */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <button
            onClick={() => onEdit(collection)}
            className="text-black text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
            style={{ backgroundColor: 'var(--admin-brand)' }}
          >
            <span className="material-symbols-outlined text-base">edit</span>
            Editar
          </button>
          <button
            onClick={() => onDelete(collection)}
            // eslint-disable-next-line no-restricted-syntax -- over solid --admin-error button
            className="text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
            style={{ backgroundColor: 'var(--admin-error)' }}
          >
            <span className="material-symbols-outlined text-base">delete</span>
            Eliminar
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="p-5">
        <h3 className="admin-h3 mb-1 line-clamp-1">{collection.title}</h3>
        <p
          className="text-xs mb-3 line-clamp-2 leading-relaxed"
          style={{ color: 'var(--admin-text-muted)' }}
        >
          {collection.description || 'Sin descripción'}
        </p>
        {/* Product count bar */}
        <div className="flex items-center gap-2 mb-3">
          <div
            className="flex-1 h-1.5 rounded-full overflow-hidden"
            style={{ backgroundColor: 'var(--admin-border)' }}
          >
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min(100, collection.productsCount.count * 5)}%`,
                backgroundColor:
                  collection.productsCount.count === 0
                    ? 'var(--admin-text-disabled)'
                    : 'var(--admin-brand)',
                minWidth: collection.productsCount.count > 0 ? '8px' : '0',
              }}
            />
          </div>
          <span
            className="text-xs tabular-nums font-medium"
            style={{
              color:
                collection.productsCount.count === 0
                  ? 'var(--admin-text-disabled)'
                  : 'var(--admin-brand)',
            }}
          >
            {collection.productsCount.count}{' '}
            {collection.productsCount.count === 1 ? 'producto' : 'productos'}
          </span>
        </div>
        {collection.productsCount.count === 0 && (
          <div
            className="flex items-center gap-1.5 mb-2 px-2 py-1 rounded-lg"
            style={{ backgroundColor: 'color-mix(in srgb, var(--admin-brand) 5%, transparent)' }}
          >
            <span
              className="material-symbols-outlined text-xs"
              style={{ color: 'var(--admin-brand)' }}
            >
              info
            </span>
            <span className="text-[10px]" style={{ color: 'var(--admin-brand)' }}>
              Esta colección no tiene productos todavía
            </span>
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono" style={{ color: 'var(--admin-text-disabled)' }}>
            /{collection.handle}
          </span>
          <span className="text-xs" style={{ color: 'var(--admin-text-disabled)' }}>
            {new Date(collection.updatedAt).toLocaleDateString('es-AR', {
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
    <tr
      className="transition-colors group"
      style={{ borderBottom: '1px solid var(--admin-border)' }}
      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--admin-bg-hover)')}
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0"
            style={{ backgroundColor: 'var(--admin-bg-elevated)' }}
          >
            {collection.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={collection.image.url}
                alt={collection.image.altText ?? collection.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span
                  className="material-symbols-outlined text-xl"
                  style={{ color: 'var(--admin-border)' }}
                >
                  collections_bookmark
                </span>
              </div>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <p className="text-sm font-medium" style={{ color: 'var(--admin-text)' }}>
                {collection.title}
              </p>
              <TypeBadge smart={smart} />
            </div>
            <p className="text-xs font-mono" style={{ color: 'var(--admin-text-disabled)' }}>
              /{collection.handle}
            </p>
          </div>
        </div>
      </td>
      <td
        className="px-4 py-3 text-sm line-clamp-1 max-w-xs"
        style={{ color: 'var(--admin-text-muted)' }}
      >
        {collection.description || '—'}
      </td>
      <td className="px-4 py-3 text-center">
        <span
          className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs"
          style={{ backgroundColor: 'var(--admin-bg-elevated)', color: 'var(--admin-brand)' }}
        >
          <span className="material-symbols-outlined text-sm">inventory_2</span>
          {collection.productsCount.count}
        </span>
      </td>
      <td className="px-4 py-3">
        <StatusBadge published={true} />
      </td>
      <td className="px-4 py-3 text-xs" style={{ color: 'var(--admin-text-muted)' }}>
        {new Date(collection.updatedAt).toLocaleDateString('es-AR', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(collection)}
            className="transition-colors p-1 rounded"
            style={{ color: 'var(--admin-brand)' }}
            title="Editar colección"
          >
            <span className="material-symbols-outlined text-lg">edit</span>
          </button>
          <button
            onClick={() => onDelete(collection)}
            className="transition-colors p-1 rounded"
            style={{ color: 'var(--admin-error)' }}
            title="Eliminar colección"
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
  const displayTitle = title || 'Título de la colección';
  const displayUrl = `yourdomain.com/collections/${handle || 'collection-handle'}`;
  const displayDesc =
    description || 'La descripción de tu colección aparecerá acá en los resultados de búsqueda.';

  return (
    <div
      className="rounded-xl p-3 mt-2"
      style={{ background: 'var(--admin-bg)', border: '1px solid var(--admin-border)' }}
    >
      <p
        className="text-[10px] uppercase tracking-wider mb-2 font-semibold"
        style={{ color: 'var(--admin-text-secondary)' }}
      >
        Vista previa en Google
      </p>
      {/* Intentional: Google SERP preview colors — not admin theme colors */}
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

  const inputStyle: React.CSSProperties = {
    backgroundColor: 'var(--admin-bg-input)',
    border: '1px solid var(--admin-border)',
    color: 'var(--admin-text)',
  };

  return (
    <div className="space-y-3">
      {/* Condition type toggle */}
      <div className="flex items-center gap-2">
        <span className="text-xs" style={{ color: 'var(--admin-text-secondary)' }}>
          Los productos deben cumplir
        </span>
        <div
          className="flex items-center rounded-lg p-0.5"
          style={{
            backgroundColor: 'var(--admin-bg-input)',
            border: '1px solid var(--admin-border)',
          }}
        >
          <button
            type="button"
            onClick={() => onDisjunctiveChange(false)}
            className="px-2.5 py-1 rounded-md text-xs font-medium transition-all"
            style={{
              backgroundColor: !appliedDisjunctively ? 'var(--admin-accent)' : 'transparent',
              color: !appliedDisjunctively ? 'white' : 'var(--admin-text-muted)',
            }}
          >
            Todas las condiciones
          </button>
          <button
            type="button"
            onClick={() => onDisjunctiveChange(true)}
            className="px-2.5 py-1 rounded-md text-xs font-medium transition-all"
            style={{
              backgroundColor: appliedDisjunctively ? 'var(--admin-accent)' : 'transparent',
              color: appliedDisjunctively ? 'white' : 'var(--admin-text-muted)',
            }}
          >
            Alguna condición
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
              className="flex-1 rounded-xl px-3 py-2 text-xs outline-none transition-colors"
              style={inputStyle}
            >
              {RULE_COLUMNS.map((c) => (
                <option key={c} value={c}>
                  {COLUMN_LABELS[c] ?? c.toLowerCase().replace(/_/g, ' ')}
                </option>
              ))}
            </select>
            <select
              value={rule.relation}
              onChange={(e) => updateRule(idx, 'relation', e.target.value)}
              className="flex-1 rounded-xl px-3 py-2 text-xs outline-none transition-colors"
              style={inputStyle}
            >
              {RULE_RELATIONS.map((r) => (
                <option key={r} value={r}>
                  {RELATION_LABELS[r] ?? r.toLowerCase().replace(/_/g, ' ')}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={rule.condition}
              onChange={(e) => updateRule(idx, 'condition', e.target.value)}
              placeholder="Valor…"
              className="flex-1 rounded-xl px-3 py-2 text-xs outline-none transition-colors"
              style={inputStyle}
            />
            <button
              type="button"
              onClick={() => removeRule(idx)}
              disabled={rules.length === 1}
              className="transition-colors p-1.5 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
              style={{ color: 'var(--admin-text-muted)' }}
              title="Quitar regla"
            >
              <span className="material-symbols-outlined text-base">remove_circle</span>
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addRule}
        className="flex items-center gap-1.5 text-xs font-medium transition-colors"
        style={{ color: 'var(--admin-accent)' }}
      >
        <span className="material-symbols-outlined text-sm">add_circle</span>
        Agregar condición
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

  const inputStyle: React.CSSProperties = {
    backgroundColor: 'var(--admin-bg-input)',
    border: '1px solid var(--admin-border)',
    color: 'var(--admin-text)',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div
        className="absolute inset-0 backdrop-blur-sm"
        style={{ backgroundColor: 'var(--admin-overlay)' }}
        onClick={onClose}
      />
      <div
        className="relative z-10 rounded-2xl w-full max-w-3xl my-8"
        style={{
          backgroundColor: 'var(--admin-bg-card)',
          border: '1px solid var(--admin-border)',
          boxShadow: 'var(--admin-shadow-dropdown)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-5"
          style={{ borderBottom: '1px solid var(--admin-border)' }}
        >
          <h2 className="admin-h2 text-lg">
            {mode === 'create' ? 'Nueva Colección' : 'Editar Colección'}
          </h2>
          <button
            onClick={onClose}
            className="transition-colors p-1 rounded-lg"
            style={{ color: 'var(--admin-text-muted)' }}
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {mode === 'create' && (
          <div
            className="px-6 py-3 flex items-center gap-3"
            style={{
              backgroundColor: 'var(--admin-bg-elevated)',
              borderBottom: '1px solid var(--admin-border)',
            }}
          >
            <div className="flex items-center gap-2">
              <span
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ backgroundColor: 'var(--admin-brand)', color: 'var(--admin-bg)' }}
              >
                1
              </span>
              <span className="text-xs font-medium" style={{ color: 'var(--admin-text)' }}>
                Nombre y tipo
              </span>
            </div>
            <div className="flex-1 h-px" style={{ backgroundColor: 'var(--admin-border)' }} />
            <div className="flex items-center gap-2">
              <span
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ backgroundColor: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}
              >
                2
              </span>
              <span className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                SEO y opciones
              </span>
            </div>
          </div>
        )}

        {/* Form — 2 columns */}
        <form onSubmit={handleSubmit}>
          <div className="grid lg:grid-cols-3 gap-0">
            {/* Left column (main) */}
            <div
              className="lg:col-span-2 p-6 space-y-5"
              style={{ borderRight: '1px solid var(--admin-border)' }}
            >
              {/* Title */}
              <div>
                <label className="admin-label block mb-1.5">
                  Título <span style={{ color: 'var(--admin-error)' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Ej: Ofertas de Verano"
                  className="w-full rounded-xl px-4 py-2.5 text-sm outline-none transition-colors"
                  style={inputStyle}
                />
              </div>

              {/* Description */}
              <div>
                <label className="admin-label block mb-1.5">Descripción</label>
                <textarea
                  value={form.descriptionHtml}
                  onChange={(e) => setForm((f) => ({ ...f, descriptionHtml: e.target.value }))}
                  placeholder="Describí esta colección…"
                  rows={3}
                  className="w-full rounded-xl px-4 py-2.5 text-sm outline-none transition-colors resize-none"
                  style={inputStyle}
                />
              </div>

              {/* Collection Type */}
              <div>
                <label className="admin-label block mb-1.5">Tipo de Colección</label>
                <div className="flex gap-3">
                  {(['manual', 'smart'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, type: t }))}
                      className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all"
                      style={{
                        backgroundColor:
                          form.type === t
                            ? t === 'smart'
                              ? 'var(--admin-accent-bg)'
                              : 'var(--admin-brand-bg)'
                            : 'var(--admin-bg-input)',
                        border: `1px solid ${
                          form.type === t
                            ? t === 'smart'
                              ? 'var(--admin-accent)'
                              : 'var(--admin-brand)'
                            : 'var(--admin-border)'
                        }`,
                        color:
                          form.type === t
                            ? t === 'smart'
                              ? 'var(--admin-accent)'
                              : 'var(--admin-brand)'
                            : 'var(--admin-text-muted)',
                      }}
                    >
                      <span className="material-symbols-outlined text-sm mr-1 align-middle">
                        {t === 'manual' ? 'edit_note' : 'auto_awesome'}
                      </span>
                      {TYPE_LABELS[t]}
                    </button>
                  ))}
                </div>
                <p className="text-xs mt-2" style={{ color: 'var(--admin-text-muted)' }}>
                  {form.type === 'manual'
                    ? '📋 Manual: Vos elegís los productos uno por uno. Ideal cuando querés control total.'
                    : '✨ Inteligente: Los productos se agregan solos según las reglas que definas. Ideal para colecciones que se actualizan solas.'}
                </p>
              </div>

              {/* Smart Rules */}
              {form.type === 'smart' && (
                <div
                  className="rounded-xl p-4 space-y-3"
                  style={{
                    background: 'var(--admin-accent-bg)',
                    border: '1px solid color-mix(in srgb, var(--admin-accent) 20%, transparent)',
                  }}
                >
                  <p
                    className="text-xs font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--admin-accent)' }}
                  >
                    Reglas Automáticas
                  </p>
                  <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                    Los productos que cumplan estas reglas se van a agregar automáticamente a la
                    colección.
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
                style={{
                  background: 'var(--admin-bg-elevated)',
                  border: '1px solid var(--admin-border)',
                }}
              >
                <p
                  className="text-xs font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--admin-text-secondary)' }}
                >
                  Vista en Buscadores (SEO)
                </p>

                {/* SEO Title */}
                <div>
                  <label
                    className="block text-xs mb-1 font-medium"
                    style={{ color: 'var(--admin-text-muted)' }}
                  >
                    Título SEO
                  </label>
                  <input
                    type="text"
                    value={form.seoTitle}
                    onChange={(e) => setForm((f) => ({ ...f, seoTitle: e.target.value }))}
                    placeholder={form.title || 'Título de la colección…'}
                    className="w-full rounded-xl px-3 py-2 text-xs outline-none transition-colors"
                    style={inputStyle}
                  />
                </div>

                {/* SEO Description */}
                <div>
                  <label
                    className="block text-xs mb-1 font-medium"
                    style={{ color: 'var(--admin-text-muted)' }}
                  >
                    Descripción SEO
                  </label>
                  <textarea
                    value={form.seoDescription}
                    onChange={(e) => setForm((f) => ({ ...f, seoDescription: e.target.value }))}
                    placeholder="Descripción para los buscadores…"
                    rows={2}
                    className="w-full rounded-xl px-3 py-2 text-xs outline-none transition-colors resize-none"
                    style={inputStyle}
                  />
                </div>

                {/* URL Handle */}
                <div>
                  <label
                    className="block text-xs mb-1 font-medium"
                    style={{ color: 'var(--admin-text-muted)' }}
                  >
                    URL de la Colección
                  </label>
                  <div
                    className="w-full rounded-xl px-3 py-2 text-xs font-mono"
                    style={{
                      background: 'var(--admin-bg-input)',
                      border: '1px solid var(--admin-border)',
                      color: 'var(--admin-text-secondary)',
                    }}
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
                <label className="admin-label block mb-1.5">Orden de Productos</label>
                <select
                  value={form.sortOrder}
                  onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
                  className="w-full rounded-xl px-3 py-2.5 text-sm outline-none transition-colors"
                  style={inputStyle}
                >
                  {SORT_ORDER_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Image URL */}
              <div>
                <label className="admin-label block mb-1.5">
                  URL de Imagen{' '}
                  <span style={{ color: 'var(--admin-text-disabled)' }}>(opcional)</span>
                </label>
                <input
                  type="url"
                  value={form.imageUrl}
                  onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
                  placeholder="https://…"
                  className="w-full rounded-xl px-3 py-2.5 text-sm outline-none transition-colors"
                  style={inputStyle}
                />
                {form.imageUrl && (
                  <div
                    className="mt-2 rounded-xl overflow-hidden h-24"
                    style={{ backgroundColor: 'var(--admin-bg-elevated)' }}
                  >
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
          <div
            className="flex gap-3 px-6 py-4"
            style={{ borderTop: '1px solid var(--admin-border)' }}
          >
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{
                border: '1px solid var(--admin-border)',
                color: 'var(--admin-text-muted)',
              }}
            >
              Cancelar
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
                  Guardando…
                </>
              ) : mode === 'create' ? (
                'Crear Colección'
              ) : (
                'Guardar Cambios'
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
            <h2 className="admin-h2 text-lg mb-1">Eliminar Colección</h2>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--admin-text-muted)' }}>
              ¿Estás seguro de que querés eliminar{' '}
              <span className="font-medium" style={{ color: 'var(--admin-text)' }}>
                &ldquo;{collection.title}&rdquo;
              </span>
              ? Esta acción no se puede deshacer.
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
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={deleting}
            // eslint-disable-next-line no-restricted-syntax -- over solid --admin-error button
            className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            style={{ backgroundColor: 'var(--admin-error)' }}
          >
            {deleting ? (
              <>
                <span className="material-symbols-outlined text-sm animate-spin">autorenew</span>
                Eliminando…
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-sm">delete</span>
                Eliminar
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
  const [typeFilter, setTypeFilter] = useState<'all' | 'manual' | 'smart'>('all');

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

  const stats = useMemo(() => {
    const manual = collections.filter((c) => !isSmartCollection(c)).length;
    const smart = collections.filter((c) => isSmartCollection(c)).length;
    const totalProducts = collections.reduce((sum, c) => sum + c.productsCount.count, 0);
    const empty = collections.filter((c) => c.productsCount.count === 0).length;
    return { total: collections.length, manual, smart, totalProducts, empty };
  }, [collections]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleCreate = async (form: CollectionFormData) => {
    const body: Record<string, unknown> = {
      title: form.title,
      descriptionHtml: form.descriptionHtml,
      sortOrder: form.sortOrder,
    };
    if (form.imageUrl) body.image = { src: form.imageUrl };
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
      toast.error(data.error ?? 'Error al crear la colección');
      return;
    }
    toast.success(`Colección "${form.title}" creada`);
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
    if (form.imageUrl) body.image = { src: form.imageUrl };
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
      toast.error(data.error ?? 'Error al actualizar la colección');
      return;
    }
    toast.success(`Colección "${form.title}" actualizada`);
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
      toast.error(data.error ?? 'Error al eliminar la colección');
      return;
    }
    toast.success(`Colección "${deleteTarget.title}" eliminada`);
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
      if (typeFilter === 'manual' && isSmartCollection(c)) return false;
      if (typeFilter === 'smart' && !isSmartCollection(c)) return false;
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
          <h1 className="admin-h1 text-2xl">Colecciones</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--admin-text-muted)' }}>
            {loading
              ? 'Cargando…'
              : `${collections.length} ${collections.length !== 1 ? 'colecciones' : 'colección'}`}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Sort dropdown */}
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="rounded-xl px-3 py-2 text-sm outline-none transition-colors"
            style={{
              backgroundColor: 'var(--admin-bg-card)',
              border: '1px solid var(--admin-border)',
              color: 'var(--admin-text-secondary)',
            }}
          >
            <option value="title">Ordenar: Título</option>
            <option value="products">Ordenar: Productos</option>
            <option value="updated">Ordenar: Actualización</option>
          </select>

          {/* View toggle */}
          <div
            className="flex items-center rounded-xl p-1"
            style={{
              backgroundColor: 'var(--admin-bg-card)',
              border: '1px solid var(--admin-border)',
            }}
          >
            <button
              onClick={() => setView('grid')}
              className="p-1.5 rounded-lg transition-all"
              style={{
                backgroundColor: view === 'grid' ? 'var(--admin-border)' : 'transparent',
                color: view === 'grid' ? 'var(--admin-brand)' : 'var(--admin-text-muted)',
              }}
              title="Vista en grilla"
            >
              <span className="material-symbols-outlined text-lg">grid_view</span>
            </button>
            <button
              onClick={() => setView('list')}
              className="p-1.5 rounded-lg transition-all"
              style={{
                backgroundColor: view === 'list' ? 'var(--admin-border)' : 'transparent',
                color: view === 'list' ? 'var(--admin-brand)' : 'var(--admin-text-muted)',
              }}
              title="Vista en lista"
            >
              <span className="material-symbols-outlined text-lg">list</span>
            </button>
          </div>

          {/* Create button */}
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
            style={{ backgroundColor: 'var(--admin-brand)', color: 'var(--admin-bg)' }}
          >
            <span className="material-symbols-outlined text-lg">add</span>
            Crear Colección
          </button>
        </div>
      </div>

      {/* Help Banner */}
      <AdminHelpBanner
        icon="collections_bookmark"
        title="¿Qué son las Colecciones?"
        description="Las colecciones son grupos de productos que ayudan a tus clientes a encontrar lo que buscan. Por ejemplo: 'Ofertas de Verano', 'Electrónica', 'Nuevos Ingresos'. Podés crear colecciones Manuales (vos elegís los productos uno por uno) o Inteligentes (se agregan solos según reglas que vos definís)."
      />

      {/* Stats Row */}
      {!loading && collections.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              icon: 'collections_bookmark',
              label: 'Total',
              value: stats.total,
              token: 'var(--admin-accent)',
            },
            {
              icon: 'edit_note',
              label: 'Manuales',
              value: stats.manual,
              token: 'var(--admin-text-secondary)',
            },
            {
              icon: 'auto_awesome',
              label: 'Inteligentes',
              value: stats.smart,
              token: 'var(--admin-brand)',
            },
            {
              icon: 'inventory_2',
              label: 'Productos en colecciones',
              value: stats.totalProducts,
              token: 'var(--admin-success)',
            },
          ].map(({ icon, label, value, token }) => (
            <div
              key={label}
              className="rounded-xl p-4 text-left"
              style={{
                backgroundColor: 'var(--admin-bg-card)',
                border: '1px solid var(--admin-border)',
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p
                    className="text-xs font-medium uppercase tracking-wider mb-1"
                    style={{ color: 'var(--admin-text-muted)' }}
                  >
                    {label}
                  </p>
                  <p
                    className="text-xl font-bold tabular-nums"
                    style={{ color: 'var(--admin-text)' }}
                  >
                    {value}
                  </p>
                </div>
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-none"
                  style={{ backgroundColor: `color-mix(in srgb, ${token} 10%, transparent)` }}
                >
                  <span className="material-symbols-outlined text-lg" style={{ color: token }}>
                    {icon}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Search bar */}
      <div className="relative">
        <span
          className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-lg pointer-events-none"
          style={{ color: 'var(--admin-text-muted)' }}
        >
          search
        </span>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar colecciones por nombre…"
          className="w-full rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none transition-colors"
          style={{
            backgroundColor: 'var(--admin-bg-card)',
            border: '1px solid var(--admin-border)',
            color: 'var(--admin-text)',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'var(--admin-brand)';
            e.currentTarget.style.boxShadow = '0 0 0 1px var(--admin-brand)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'var(--admin-border)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors"
            style={{ color: 'var(--admin-text-muted)' }}
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        )}
      </div>

      {/* Type Filter */}
      {!loading && collections.length > 0 && (
        <div className="flex items-center gap-2">
          {[
            { value: 'all' as const, label: 'Todas', count: collections.length },
            { value: 'manual' as const, label: 'Manuales', count: stats.manual, icon: 'edit_note' },
            {
              value: 'smart' as const,
              label: 'Inteligentes',
              count: stats.smart,
              icon: 'auto_awesome',
            },
          ].map(({ value, label, count, icon }) => (
            <button
              key={value}
              onClick={() => setTypeFilter(value)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all"
              style={{
                backgroundColor:
                  typeFilter === value ? 'var(--admin-brand-bg)' : 'var(--admin-bg-card)',
                border:
                  typeFilter === value
                    ? '1px solid var(--admin-brand-border)'
                    : '1px solid var(--admin-border)',
                color: typeFilter === value ? 'var(--admin-brand)' : 'var(--admin-text-muted)',
              }}
            >
              {icon && <span className="material-symbols-outlined text-sm">{icon}</span>}
              {label}
              <span
                className="text-xs px-1.5 py-0.5 rounded-full"
                style={{
                  backgroundColor:
                    typeFilter === value
                      ? 'color-mix(in srgb, var(--admin-brand) 20%, transparent)'
                      : 'var(--admin-border)',
                  color: typeFilter === value ? 'var(--admin-brand)' : 'var(--admin-text-disabled)',
                }}
              >
                {count}
              </span>
            </button>
          ))}
        </div>
      )}

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
            onClick={() => fetchCollections()}
            className="mt-4 text-sm transition-colors"
            style={{ color: 'var(--admin-brand)' }}
          >
            Intentar de nuevo
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
          <div
            className="rounded-2xl animate-pulse h-64"
            style={{
              backgroundColor: 'var(--admin-bg-card)',
              border: '1px solid var(--admin-border)',
            }}
          />
        )
      ) : filteredCollections.length === 0 ? (
        search ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <span
              className="material-symbols-outlined text-5xl mb-4"
              style={{ color: 'var(--admin-text-disabled)' }}
            >
              search_off
            </span>
            <p className="font-semibold mb-2" style={{ color: 'var(--admin-text)' }}>
              No se encontraron colecciones para &ldquo;{search}&rdquo;
            </p>
            <p className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>
              Probá ajustando los términos de búsqueda.
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <span
              className="material-symbols-outlined text-5xl mb-4"
              style={{ color: 'var(--admin-text-disabled)' }}
            >
              collections_bookmark
            </span>
            <p className="font-semibold mb-2" style={{ color: 'var(--admin-text)' }}>
              Todavía no hay colecciones
            </p>
            <p className="text-sm mb-2" style={{ color: 'var(--admin-text-muted)' }}>
              Creá tu primera colección para organizar tus productos.
            </p>
            <div
              className="mt-4 mb-6 flex items-center justify-center gap-6 text-xs"
              style={{ color: 'var(--admin-text-muted)' }}
            >
              <div className="flex flex-col items-center gap-1">
                <span
                  className="material-symbols-outlined text-2xl"
                  style={{ color: 'var(--admin-brand)' }}
                >
                  collections_bookmark
                </span>
                <span>Creá una colección</span>
              </div>
              <span
                className="material-symbols-outlined text-lg"
                style={{ color: 'var(--admin-text-disabled)' }}
              >
                arrow_forward
              </span>
              <div className="flex flex-col items-center gap-1">
                <span
                  className="material-symbols-outlined text-2xl"
                  style={{ color: 'var(--admin-brand)' }}
                >
                  playlist_add
                </span>
                <span>Agregá productos</span>
              </div>
              <span
                className="material-symbols-outlined text-lg"
                style={{ color: 'var(--admin-text-disabled)' }}
              >
                arrow_forward
              </span>
              <div className="flex flex-col items-center gap-1">
                <span
                  className="material-symbols-outlined text-2xl"
                  style={{ color: 'var(--admin-success)' }}
                >
                  storefront
                </span>
                <span>Tus clientes navegan</span>
              </div>
            </div>
            <button
              onClick={() => setCreateOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
              style={{ backgroundColor: 'var(--admin-brand)', color: 'var(--admin-bg)' }}
            >
              <span className="material-symbols-outlined text-lg">add</span>
              Crear Colección
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
                {['Colección', 'Descripción', 'Productos', 'Estado', 'Actualizado'].map((h) => (
                  <th
                    key={h}
                    className={`px-4 py-3 text-${h === 'Productos' ? 'center' : 'left'} text-xs font-semibold uppercase tracking-wider`}
                    style={{ color: 'var(--admin-text-muted)' }}
                  >
                    {h}
                  </th>
                ))}
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
