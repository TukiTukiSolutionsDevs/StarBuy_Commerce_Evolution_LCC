'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import type { ShopifyCollectionFilter } from '@/lib/shopify/types';

// ─── Types ────────────────────────────────────────────────────────────────────

type FiltersPanelProps = {
  /** Server-returned filter facets from Shopify */
  filters?: ShopifyCollectionFilter[];
};

type SectionState = Record<string, boolean>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseInput(input: string): Record<string, unknown> {
  try {
    return JSON.parse(input) as Record<string, unknown>;
  } catch {
    return {};
  }
}

/** Count how many filter-related search params are active */
function countActiveFilters(sp: URLSearchParams): number {
  let count = 0;
  if (sp.get('minPrice')) count++;
  if (sp.get('maxPrice')) count++;
  if (sp.get('availability') === 'in-stock') count++;
  count += sp.getAll('vendor').length;
  count += sp.getAll('productType').length;
  count += sp.getAll('tag').length;
  return count;
}

// ─── Collapsible Section ──────────────────────────────────────────────────────

function FilterSection({
  title,
  id,
  open,
  onToggle,
  onClear,
  hasActive,
  children,
}: {
  title: string;
  id: string;
  open: boolean;
  onToggle: (id: string) => void;
  onClear?: () => void;
  hasActive: boolean;
  children: React.ReactNode;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState(0);

  useEffect(() => {
    if (open && contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight + 16);
    }
  }, [open, children]);

  return (
    <div className="pb-4 mb-4 last:mb-0 last:pb-0">
      <button
        type="button"
        onClick={() => onToggle(id)}
        className="flex w-full items-center justify-between py-2 text-left"
        aria-expanded={open}
        aria-controls={`filter-section-${id}`}
      >
        <span className="font-label text-xs font-bold uppercase tracking-widest text-[#5d605c]">
          {title}
          {hasActive && <span className="ml-2 inline-flex h-2 w-2 rounded-full bg-[#795a00]" />}
        </span>
        <span
          className={`material-symbols-outlined text-base text-[#b1b2af] transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        >
          expand_more
        </span>
      </button>
      <div
        id={`filter-section-${id}`}
        ref={contentRef}
        className="overflow-hidden transition-all duration-200"
        style={{
          maxHeight: open ? `${contentHeight || 500}px` : '0px',
          opacity: open ? 1 : 0,
        }}
      >
        <div className="pt-2 pb-1">
          {hasActive && onClear && (
            <button
              type="button"
              onClick={onClear}
              className="mb-2 text-xs text-[#795a00] hover:text-[#6b4f00] underline transition-colors"
            >
              Clear
            </button>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}

// ─── Checkbox List ────────────────────────────────────────────────────────────

function CheckboxFilterList({
  values,
  selected,
  onToggle,
}: {
  values: Array<{ id: string; label: string; count: number }>;
  selected: string[];
  onToggle: (value: string) => void;
}) {
  if (values.length === 0) return null;

  return (
    <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
      {values.map((v) => {
        const isChecked = selected.includes(v.label);
        return (
          <label
            key={v.id}
            className="flex items-center gap-3 cursor-pointer group py-0.5"
            onClick={() => onToggle(v.label)}
          >
            <div
              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                isChecked
                  ? 'border-[#795a00] bg-[#795a00]'
                  : 'border-[#b1b2af] bg-transparent hover:border-[#5d605c]'
              }`}
            >
              {isChecked && (
                <svg
                  className="h-3 w-3 text-[#fff8f0]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <span
              className={`text-sm flex-1 ${isChecked ? 'text-[#303330]' : 'text-[#303330] group-hover:text-[#795a00]'}`}
            >
              {v.label}
            </span>
            <span className="text-xs text-[#b1b2af]">{v.count}</span>
          </label>
        );
      })}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function FiltersPanel({ filters = [] }: FiltersPanelProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // ── Derive filter state from URL (no useState needed for URL-synced values)
  const urlMinPrice = searchParams.get('minPrice') ?? '';
  const urlMaxPrice = searchParams.get('maxPrice') ?? '';
  const inStockOnly = searchParams.get('availability') === 'in-stock';
  const selectedVendors = searchParams.getAll('vendor');
  const selectedTypes = searchParams.getAll('productType');
  const selectedTags = searchParams.getAll('tag');

  // Local state only for inputs that need controlled editing before apply
  const [minPrice, setMinPrice] = useState(urlMinPrice);
  const [maxPrice, setMaxPrice] = useState(urlMaxPrice);

  // Sync price inputs when URL changes (browser back/forward)
  useEffect(() => {
    queueMicrotask(() => {
      setMinPrice(urlMinPrice);
      setMaxPrice(urlMaxPrice);
    });
  }, [urlMinPrice, urlMaxPrice]);

  // Mobile drawer state
  const [isOpen, setIsOpen] = useState(false);

  // Section open/close state (all open by default)
  const [sections, setSections] = useState<SectionState>({
    price: true,
    availability: true,
    vendor: true,
    productType: true,
    tags: true,
  });

  // ── Extract filter values from Shopify response ───────────────────────────
  const vendorValues: Array<{ id: string; label: string; count: number }> = [];
  const typeValues: Array<{ id: string; label: string; count: number }> = [];
  const tagValues: Array<{ id: string; label: string; count: number }> = [];

  for (const filter of filters) {
    for (const val of filter.values) {
      const parsed = parseInput(val.input);

      if ('productVendor' in parsed) {
        vendorValues.push({ id: val.id, label: val.label, count: val.count });
      } else if ('productType' in parsed) {
        typeValues.push({ id: val.id, label: val.label, count: val.count });
      } else if ('tag' in parsed) {
        tagValues.push({ id: val.id, label: val.label, count: val.count });
      }
    }
  }

  // ── Toggle helpers ────────────────────────────────────────────────────────
  const toggleSection = useCallback(
    (id: string) => {
      setSections((prev) => ({ ...prev, [id]: !prev[id] }));
    },
    [setSections],
  );

  function toggleInList(list: string[], value: string): string[] {
    return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
  }

  // ── Apply filters → update URL ────────────────────────────────────────────
  function applyFilters(overrides?: {
    min?: string;
    max?: string;
    stock?: boolean;
    vendors?: string[];
    types?: string[];
    tags?: string[];
  }) {
    const min = overrides?.min ?? minPrice;
    const max = overrides?.max ?? maxPrice;
    const stock = overrides?.stock ?? inStockOnly;
    const vendors = overrides?.vendors ?? selectedVendors;
    const types = overrides?.types ?? selectedTypes;
    const tags = overrides?.tags ?? selectedTags;

    const params = new URLSearchParams();

    // Preserve sort params
    const sort = searchParams.get('sort');
    const reverse = searchParams.get('reverse');
    if (sort) params.set('sort', sort);
    if (reverse) params.set('reverse', reverse);

    // Set filter params
    if (min) params.set('minPrice', min);
    if (max) params.set('maxPrice', max);
    if (stock) params.set('availability', 'in-stock');
    for (const v of vendors) params.append('vendor', v);
    for (const t of types) params.append('productType', t);
    for (const tag of tags) params.append('tag', tag);

    router.push(`${pathname}?${params.toString()}`);
  }

  // ── Auto-apply on checkbox/toggle changes ─────────────────────────────────
  function handleVendorToggle(value: string) {
    applyFilters({ vendors: toggleInList(selectedVendors, value) });
  }

  function handleTypeToggle(value: string) {
    applyFilters({ types: toggleInList(selectedTypes, value) });
  }

  function handleTagToggle(value: string) {
    applyFilters({ tags: toggleInList(selectedTags, value) });
  }

  function handleStockToggle() {
    applyFilters({ stock: !inStockOnly });
  }

  // ── Clear helpers ─────────────────────────────────────────────────────────
  function clearAll() {
    setMinPrice('');
    setMaxPrice('');

    const params = new URLSearchParams();
    const sort = searchParams.get('sort');
    const reverse = searchParams.get('reverse');
    if (sort) params.set('sort', sort);
    if (reverse) params.set('reverse', reverse);
    router.push(`${pathname}?${params.toString()}`);
  }

  function clearPrice() {
    setMinPrice('');
    setMaxPrice('');
    applyFilters({ min: '', max: '' });
  }

  function clearVendors() {
    applyFilters({ vendors: [] });
  }

  function clearTypes() {
    applyFilters({ types: [] });
  }

  function clearTags() {
    applyFilters({ tags: [] });
  }

  const activeCount = countActiveFilters(searchParams);
  const hasActiveFilters = activeCount > 0;

  // ── Panel content (shared between desktop & mobile) ───────────────────────
  const panelContent = (
    <div className="space-y-2">
      {/* Price Range */}
      <FilterSection
        title="Price Range"
        id="price"
        open={sections.price ?? true}
        onToggle={toggleSection}
        onClear={clearPrice}
        hasActive={!!searchParams.get('minPrice') || !!searchParams.get('maxPrice')}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-lg bg-[#f4f4f0] px-3 flex-1 focus-within:ring-1 focus-within:ring-[#795a00]/30 transition-colors">
            <span className="text-[#b1b2af] text-xs mr-1">$</span>
            <input
              type="number"
              placeholder="Min"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              onBlur={() => applyFilters()}
              onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
              min="0"
              className="w-full bg-transparent border-none focus:ring-0 focus:outline-none text-sm py-2 text-[#303330] placeholder-[#b1b2af]"
            />
          </div>
          <span className="text-[#b1b2af] text-xs">to</span>
          <div className="flex items-center rounded-lg bg-[#f4f4f0] px-3 flex-1 focus-within:ring-1 focus-within:ring-[#795a00]/30 transition-colors">
            <span className="text-[#b1b2af] text-xs mr-1">$</span>
            <input
              type="number"
              placeholder="Max"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              onBlur={() => applyFilters()}
              onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
              min="0"
              className="w-full bg-transparent border-none focus:ring-0 focus:outline-none text-sm py-2 text-[#303330] placeholder-[#b1b2af]"
            />
          </div>
        </div>
      </FilterSection>

      {/* Availability */}
      <FilterSection
        title="Availability"
        id="availability"
        open={sections.availability ?? true}
        onToggle={toggleSection}
        onClear={() => {
          applyFilters({ stock: false });
        }}
        hasActive={inStockOnly}
      >
        <label className="flex items-center gap-3 cursor-pointer group">
          <button
            type="button"
            role="switch"
            aria-checked={inStockOnly}
            onClick={handleStockToggle}
            className={`relative h-5 w-10 rounded-full transition-colors duration-200 ${
              inStockOnly ? 'bg-[#795a00]' : 'bg-[#e1e3df]'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${
                inStockOnly ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
          <span className={`text-sm ${inStockOnly ? 'text-[#303330]' : 'text-[#5d605c]'}`}>
            In Stock Only
          </span>
        </label>
      </FilterSection>

      {/* Vendor / Brand */}
      {vendorValues.length > 0 && (
        <FilterSection
          title="Brand"
          id="vendor"
          open={sections.vendor ?? true}
          onToggle={toggleSection}
          onClear={clearVendors}
          hasActive={selectedVendors.length > 0}
        >
          <CheckboxFilterList
            values={vendorValues}
            selected={selectedVendors}
            onToggle={handleVendorToggle}
          />
        </FilterSection>
      )}

      {/* Product Type */}
      {typeValues.length > 0 && (
        <FilterSection
          title="Product Type"
          id="productType"
          open={sections.productType ?? true}
          onToggle={toggleSection}
          onClear={clearTypes}
          hasActive={selectedTypes.length > 0}
        >
          <CheckboxFilterList
            values={typeValues}
            selected={selectedTypes}
            onToggle={handleTypeToggle}
          />
        </FilterSection>
      )}

      {/* Tags */}
      {tagValues.length > 0 && (
        <FilterSection
          title="Tags"
          id="tags"
          open={sections.tags ?? true}
          onToggle={toggleSection}
          onClear={clearTags}
          hasActive={selectedTags.length > 0}
        >
          <CheckboxFilterList
            values={tagValues}
            selected={selectedTags}
            onToggle={handleTagToggle}
          />
        </FilterSection>
      )}
    </div>
  );

  return (
    <>
      {/* ── Mobile: Filter toggle button ──────────────────────────────────── */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl bg-[#ffffff] px-4 py-2.5 text-sm font-medium text-[#5d605c] hover:shadow-sm transition-all lg:hidden"
      >
        <span className="material-symbols-outlined text-base" aria-hidden="true">
          tune
        </span>
        Filters
        {activeCount > 0 && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#795a00] text-xs font-bold text-[#fff8f0]">
            {activeCount}
          </span>
        )}
      </button>

      {/* ── Mobile: Slide-over drawer ─────────────────────────────────────── */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-[#303330]/30 backdrop-blur-sm lg:hidden"
            onClick={() => setIsOpen(false)}
          />
          {/* Drawer — full height from left */}
          <div className="fixed inset-y-0 left-0 z-50 flex w-80 max-w-[85vw] flex-col bg-[#faf9f6] shadow-2xl lg:hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4">
              <h2 className="font-label text-xs font-bold uppercase tracking-widest text-[#5d605c]">
                Filters
              </h2>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1 hover:bg-[#f4f4f0] transition-colors"
                aria-label="Close filters"
              >
                <span
                  className="material-symbols-outlined text-xl text-[#5d605c]"
                  aria-hidden="true"
                >
                  close
                </span>
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-5 py-4">{panelContent}</div>

            {/* Footer buttons */}
            <div className="px-5 py-4 flex gap-3">
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={() => {
                    clearAll();
                    setIsOpen(false);
                  }}
                  className="flex-1 rounded-lg py-2.5 text-sm font-semibold text-[#795a00] hover:text-[#6b4f00] transition-colors"
                >
                  Clear All
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex-1 rounded-lg bg-[#795a00] py-2.5 text-sm font-bold text-[#fff8f0] tracking-wide hover:bg-[#6b4f00] transition-colors"
              >
                Apply
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Desktop: Sidebar ──────────────────────────────────────────────── */}
      <aside className="hidden lg:block w-64 flex-shrink-0">
        <div className="sticky top-24 rounded-2xl bg-[#ffffff] p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4 pb-3">
            <h2 className="font-label text-xs font-bold uppercase tracking-widest text-[#5d605c]">
              Filters
            </h2>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearAll}
                className="text-xs text-[#795a00] hover:text-[#6b4f00] underline transition-colors"
              >
                Clear All
              </button>
            )}
          </div>

          {panelContent}
        </div>
      </aside>
    </>
  );
}
