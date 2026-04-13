/**
 * Unit tests — trends/categories.ts
 *
 * Pure data + helpers — no I/O, no mocks needed.
 *
 * @vitest-environment node
 */

import { describe, it, expect } from 'vitest';
import { CATEGORY_TREE, getCategoryById, getSubcategoryById, getAllKeywords } from './categories';

// ─── CATEGORY_TREE structure ──────────────────────────────────────────────────

describe('CATEGORY_TREE', () => {
  it('has exactly 8 top-level categories', () => {
    expect(CATEGORY_TREE).toHaveLength(8);
  });

  it('each category has the required shape (id, label, icon, subcategories)', () => {
    for (const cat of CATEGORY_TREE) {
      expect(typeof cat.id).toBe('string');
      expect(cat.id.length).toBeGreaterThan(0);
      expect(typeof cat.label).toBe('string');
      expect(typeof cat.icon).toBe('string');
      expect(Array.isArray(cat.subcategories)).toBe(true);
    }
  });

  it('each category has 3-4 subcategories', () => {
    for (const cat of CATEGORY_TREE) {
      expect(cat.subcategories.length).toBeGreaterThanOrEqual(3);
      expect(cat.subcategories.length).toBeLessThanOrEqual(4);
    }
  });

  it('each subcategory has 4-6 keywords', () => {
    for (const cat of CATEGORY_TREE) {
      for (const sub of cat.subcategories) {
        expect(sub.keywords.length).toBeGreaterThanOrEqual(4);
        expect(sub.keywords.length).toBeLessThanOrEqual(6);
      }
    }
  });

  it('each keyword has a weight between 0 and 1 (inclusive)', () => {
    for (const cat of CATEGORY_TREE) {
      for (const sub of cat.subcategories) {
        for (const kw of sub.keywords) {
          expect(typeof kw.keyword).toBe('string');
          expect(kw.weight).toBeGreaterThanOrEqual(0);
          expect(kw.weight).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it('all category ids are unique', () => {
    const ids = CATEGORY_TREE.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('contains the expected 8 category ids', () => {
    const ids = CATEGORY_TREE.map((c) => c.id);
    expect(ids).toContain('electronics');
    expect(ids).toContain('health');
    expect(ids).toContain('beauty');
    expect(ids).toContain('home');
    expect(ids).toContain('pets');
    expect(ids).toContain('outdoor');
    expect(ids).toContain('baby');
    expect(ids).toContain('fashion');
  });
});

// ─── getCategoryById ──────────────────────────────────────────────────────────

describe('getCategoryById', () => {
  it('returns the correct category for a valid id', () => {
    const cat = getCategoryById('electronics');
    expect(cat).toBeDefined();
    expect(cat!.id).toBe('electronics');
    expect(cat!.label).toBe('Electronics & Tech');
    expect(cat!.icon).toBe('devices');
  });

  it('returns the correct category for each of the 8 ids', () => {
    const ids = ['electronics', 'health', 'beauty', 'home', 'pets', 'outdoor', 'baby', 'fashion'];
    for (const id of ids) {
      expect(getCategoryById(id)).toBeDefined();
    }
  });

  it('returns undefined for an unknown id', () => {
    expect(getCategoryById('nonexistent')).toBeUndefined();
    expect(getCategoryById('')).toBeUndefined();
  });
});

// ─── getSubcategoryById ───────────────────────────────────────────────────────

describe('getSubcategoryById', () => {
  it('returns the correct subcategory for a valid id', () => {
    const sub = getSubcategoryById('smart-home');
    expect(sub).toBeDefined();
    expect(sub!.id).toBe('smart-home');
    expect(sub!.label).toBe('Smart Home');
    expect(sub!.keywords.length).toBeGreaterThan(0);
  });

  it('finds subcategories across all parent categories', () => {
    expect(getSubcategoryById('fitness')).toBeDefined(); // health
    expect(getSubcategoryById('skincare')).toBeDefined(); // beauty
    expect(getSubcategoryById('camping')).toBeDefined(); // outdoor
    expect(getSubcategoryById('clothing')).toBeDefined(); // fashion
  });

  it('returns undefined for an unknown subcategory id', () => {
    expect(getSubcategoryById('does-not-exist')).toBeUndefined();
    expect(getSubcategoryById('')).toBeUndefined();
  });
});

// ─── getAllKeywords ───────────────────────────────────────────────────────────

describe('getAllKeywords', () => {
  it('returns a flat array of strings', () => {
    const keywords = getAllKeywords();
    expect(Array.isArray(keywords)).toBe(true);
    for (const kw of keywords) {
      expect(typeof kw).toBe('string');
    }
  });

  it('returns no duplicates', () => {
    const keywords = getAllKeywords();
    expect(new Set(keywords).size).toBe(keywords.length);
  });

  it('returns a non-empty array', () => {
    expect(getAllKeywords().length).toBeGreaterThan(0);
  });

  it('contains expected keywords from different categories', () => {
    const keywords = getAllKeywords();
    expect(keywords).toContain('smartwatch'); // electronics/wearables
    expect(keywords).toContain('protein powder'); // health/supplements
    expect(keywords).toContain('air fryer'); // home/kitchen-gadgets
    expect(keywords).toContain('dog harness'); // pets/dog
    expect(keywords).toContain('oversized hoodie'); // fashion/clothing
  });
});
