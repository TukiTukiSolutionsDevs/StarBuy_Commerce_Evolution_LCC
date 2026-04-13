/**
 * Unit tests — publish/validator.ts
 *
 * Pure functions — no I/O, no mocks needed.
 *
 * @vitest-environment node
 */

import { describe, it, expect } from 'vitest';
import { validateForPublish, isReadyToPublish } from './validator';
import type { ResearchItem } from '@/lib/research/types';

function makeItem(overrides: Partial<ResearchItem> = {}): ResearchItem {
  return {
    id: 'r1',
    keyword: 'wireless mouse',
    title: 'Premium Wireless Mouse',
    trendScore: 75,
    trendState: 'rising',
    sources: ['serpapi'],
    relatedKeywords: ['bluetooth mouse'],
    costPrice: 10,
    salePrice: 30,
    marginPercent: 66.7,
    aiScore: 70,
    aiScoreBreakdown: { trend: 30, margin: 22, competition: 10, volume: 8 },
    aiScoreLabel: 'Good',
    status: 'saved',
    addedAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

// ─── validateForPublish ───────────────────────────────────────────────────────

describe('validateForPublish', () => {
  it('passes all checks for a valid item', () => {
    const v = validateForPublish(makeItem());
    expect(v.title).toBe(true);
    expect(v.description).toBe(true);
    expect(v.price).toBe(true);
    expect(v.images).toBe(true);
    expect(v.errors).toEqual([]);
  });

  it('fails title when empty', () => {
    const v = validateForPublish(makeItem({ title: '' }));
    expect(v.title).toBe(false);
    expect(v.errors).toContain('Title must be at least 3 characters');
  });

  it('fails title when too short (1-2 chars)', () => {
    const v = validateForPublish(makeItem({ title: 'Ab' }));
    expect(v.title).toBe(false);
  });

  it('passes title with exactly 3 chars', () => {
    const v = validateForPublish(makeItem({ title: 'Abc' }));
    expect(v.title).toBe(true);
  });

  it('fails price when salePrice is 0', () => {
    const v = validateForPublish(makeItem({ salePrice: 0 }));
    expect(v.price).toBe(false);
    expect(v.errors.some((e) => e.includes('Sale price'))).toBe(true);
  });

  it('fails price when salePrice is negative', () => {
    const v = validateForPublish(makeItem({ salePrice: -5 }));
    expect(v.price).toBe(false);
  });

  it('fails price when costPrice is negative', () => {
    const v = validateForPublish(makeItem({ costPrice: -1 }));
    expect(v.price).toBe(false);
    expect(v.errors.some((e) => e.includes('Cost price'))).toBe(true);
  });

  it('fails price when salePrice <= costPrice', () => {
    const v = validateForPublish(makeItem({ costPrice: 30, salePrice: 30 }));
    expect(v.price).toBe(false);
    expect(v.errors.some((e) => e.includes('greater than'))).toBe(true);
  });

  it('passes price with costPrice=0 and salePrice>0', () => {
    const v = validateForPublish(makeItem({ costPrice: 0, salePrice: 10 }));
    expect(v.price).toBe(true);
  });

  it('description always passes (optional for Shopify)', () => {
    const v = validateForPublish(makeItem({ description: undefined }));
    expect(v.description).toBe(true);
  });

  it('images always passes for MVP', () => {
    const v = validateForPublish(makeItem());
    expect(v.images).toBe(true);
  });

  it('accumulates multiple errors', () => {
    const v = validateForPublish(makeItem({ title: '', salePrice: 0 }));
    expect(v.errors.length).toBeGreaterThanOrEqual(2);
  });
});

// ─── isReadyToPublish ─────────────────────────────────────────────────────────

describe('isReadyToPublish', () => {
  it('returns true when title and price pass', () => {
    expect(
      isReadyToPublish({ title: true, description: true, price: true, images: true, errors: [] }),
    ).toBe(true);
  });

  it('returns false when title fails', () => {
    expect(
      isReadyToPublish({
        title: false,
        description: true,
        price: true,
        images: true,
        errors: ['err'],
      }),
    ).toBe(false);
  });

  it('returns false when price fails', () => {
    expect(
      isReadyToPublish({
        title: true,
        description: true,
        price: false,
        images: true,
        errors: ['err'],
      }),
    ).toBe(false);
  });

  it('returns true even if description/images are false (optional)', () => {
    expect(
      isReadyToPublish({ title: true, description: false, price: true, images: false, errors: [] }),
    ).toBe(true);
  });
});
