/**
 * Unit tests — publish/store.ts
 *
 * File-based CRUD for publish records.
 * Uses a temp STARBUY_DATA_DIR so no real files are touched.
 *
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  getAll,
  getById,
  getByResearchId,
  getByStatus,
  getByBatchId,
  add,
  update,
  remove,
  getStats,
} from './store';

// ─── Setup ────────────────────────────────────────────────────────────────────

let tmpDir: string;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'starbuy-publish-test-'));
  vi.stubEnv('STARBUY_DATA_DIR', tmpDir);
});

afterEach(() => {
  vi.unstubAllEnvs();
  rmSync(tmpDir, { recursive: true, force: true });
});

// ─── getAll ───────────────────────────────────────────────────────────────────

describe('getAll', () => {
  it('returns empty array when no records exist', () => {
    expect(getAll()).toEqual([]);
  });

  it('returns all stored records', () => {
    add({ researchId: 'r1' });
    add({ researchId: 'r2' });
    expect(getAll()).toHaveLength(2);
  });
});

// ─── getById ──────────────────────────────────────────────────────────────────

describe('getById', () => {
  it('returns record when found', () => {
    const record = add({ researchId: 'r1' });
    expect(getById(record.id)).toMatchObject({ id: record.id });
  });

  it('returns undefined for unknown id', () => {
    expect(getById('nonexistent')).toBeUndefined();
  });
});

// ─── getByResearchId ──────────────────────────────────────────────────────────

describe('getByResearchId', () => {
  it('returns record matching researchId', () => {
    add({ researchId: 'r1' });
    expect(getByResearchId('r1')).toBeDefined();
  });

  it('returns undefined when no match', () => {
    expect(getByResearchId('ghost')).toBeUndefined();
  });
});

// ─── getByStatus ──────────────────────────────────────────────────────────────

describe('getByStatus', () => {
  it('filters by status', () => {
    const r = add({ researchId: 'r1' });
    update(r.id, { status: 'published' });
    add({ researchId: 'r2' });

    expect(getByStatus('published')).toHaveLength(1);
    expect(getByStatus('pending')).toHaveLength(1);
  });
});

// ─── getByBatchId ─────────────────────────────────────────────────────────────

describe('getByBatchId', () => {
  it('filters by batchId', () => {
    add({ researchId: 'r1', batchId: 'batch-1' });
    add({ researchId: 'r2', batchId: 'batch-1' });
    add({ researchId: 'r3' });

    expect(getByBatchId('batch-1')).toHaveLength(2);
  });
});

// ─── add ──────────────────────────────────────────────────────────────────────

describe('add', () => {
  it('creates record with generated UUID', () => {
    const record = add({ researchId: 'r1' });
    expect(record.id).toBeTruthy();
    expect(record.id).toHaveLength(36);
  });

  it('sets status to pending', () => {
    expect(add({ researchId: 'r1' }).status).toBe('pending');
  });

  it('sets retryCount to 0', () => {
    expect(add({ researchId: 'r1' }).retryCount).toBe(0);
  });

  it('sets createdAt and updatedAt', () => {
    const record = add({ researchId: 'r1' });
    expect(record.createdAt).toBeTruthy();
    expect(record.updatedAt).toBe(record.createdAt);
  });

  it('initializes empty validation', () => {
    const record = add({ researchId: 'r1' });
    expect(record.validation.title).toBe(false);
    expect(record.validation.errors).toEqual([]);
  });

  it('stores batchId when provided', () => {
    const record = add({ researchId: 'r1', batchId: 'b1' });
    expect(record.batchId).toBe('b1');
  });

  it('prevents duplicate active publish for same researchId', () => {
    add({ researchId: 'r1' });
    expect(() => add({ researchId: 'r1' })).toThrow(/already has an active/);
  });

  it('allows re-publish after failed record', () => {
    const r = add({ researchId: 'r1' });
    update(r.id, { status: 'failed' });
    const r2 = add({ researchId: 'r1' });
    expect(r2.id).not.toBe(r.id);
  });

  it('allows re-publish after archived record', () => {
    const r = add({ researchId: 'r1' });
    update(r.id, { status: 'archived' });
    expect(() => add({ researchId: 'r1' })).not.toThrow();
  });

  it('persists record retrievable by id', () => {
    const added = add({ researchId: 'r1' });
    expect(getById(added.id)).toBeDefined();
  });
});

// ─── update ───────────────────────────────────────────────────────────────────

describe('update', () => {
  it('updates status', () => {
    const r = add({ researchId: 'r1' });
    const updated = update(r.id, { status: 'publishing' });
    expect(updated.status).toBe('publishing');
  });

  it('updates shopifyProductId', () => {
    const r = add({ researchId: 'r1' });
    const updated = update(r.id, { shopifyProductId: 'gid://shopify/Product/123' });
    expect(updated.shopifyProductId).toBe('gid://shopify/Product/123');
  });

  it('updates updatedAt timestamp', () => {
    const r = add({ researchId: 'r1' });
    // Advance clock so updatedAt differs from createdAt
    vi.useFakeTimers();
    vi.setSystemTime(new Date(Date.now() + 1000));
    const updated = update(r.id, { status: 'published' });
    expect(updated.updatedAt).not.toBe(r.updatedAt);
    vi.useRealTimers();
  });

  it('throws for unknown id', () => {
    expect(() => update('ghost', { status: 'failed' })).toThrow(/not found/);
  });

  it('persists the update', () => {
    const r = add({ researchId: 'r1' });
    update(r.id, { status: 'published' });
    expect(getById(r.id)?.status).toBe('published');
  });
});

// ─── remove ───────────────────────────────────────────────────────────────────

describe('remove', () => {
  it('removes the record', () => {
    const r = add({ researchId: 'r1' });
    remove(r.id);
    expect(getById(r.id)).toBeUndefined();
  });

  it('throws for unknown id', () => {
    expect(() => remove('ghost')).toThrow(/not found/);
  });

  it('only removes the target, leaves others intact', () => {
    const a = add({ researchId: 'r1' });
    const b = add({ researchId: 'r2' });
    remove(a.id);
    expect(getAll()).toHaveLength(1);
    expect(getById(b.id)).toBeDefined();
  });
});

// ─── getStats ─────────────────────────────────────────────────────────────────

describe('getStats', () => {
  it('returns zeros for empty store', () => {
    const stats = getStats();
    expect(stats.total).toBe(0);
    expect(stats.pending).toBe(0);
  });

  it('counts by status correctly', () => {
    const a = add({ researchId: 'r1' });
    const b = add({ researchId: 'r2' });
    add({ researchId: 'r3' });
    update(a.id, { status: 'published' });
    update(b.id, { status: 'failed' });

    const stats = getStats();
    expect(stats.total).toBe(3);
    expect(stats.published).toBe(1);
    expect(stats.failed).toBe(1);
    expect(stats.pending).toBe(1);
  });
});

// ─── Edge cases ───────────────────────────────────────────────────────────────

describe('edge cases', () => {
  it('handles corrupt JSON gracefully', () => {
    const { writeFileSync, mkdirSync } = await import('fs');
    const dir = join(tmpDir, '.starbuy-publish');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'records.json'), '{broken', 'utf-8');
    expect(getAll()).toEqual([]);
  });
});
