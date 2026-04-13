/**
 * Publish Pipeline — File-based Store
 *
 * Persists PublishRecord[] as .starbuy-publish/records.json.
 * Same pattern as research/store.ts and states/store.ts.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { getDataDir } from '@/lib/data-dir';
import type {
  PublishRecord,
  PublishStatus,
  AddPublishRecordInput,
  UpdatePublishRecordInput,
  PublishStats,
} from './types';

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_RECORDS = 500;

// ─── Lazy Paths ───────────────────────────────────────────────────────────────

function getPublishDir(): string {
  return getDataDir('.starbuy-publish');
}

function getRecordsFile(): string {
  return join(getPublishDir(), 'records.json');
}

// ─── Internal Helpers ─────────────────────────────────────────────────────────

function ensureDir(): void {
  const dir = getPublishDir();
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const file = getRecordsFile();
  if (!existsSync(file)) writeFileSync(file, '[]', 'utf-8');
}

function readRecords(): PublishRecord[] {
  ensureDir();
  try {
    return JSON.parse(readFileSync(getRecordsFile(), 'utf-8')) as PublishRecord[];
  } catch {
    return [];
  }
}

function writeRecords(records: PublishRecord[]): void {
  ensureDir();
  writeFileSync(getRecordsFile(), JSON.stringify(records, null, 2), 'utf-8');
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function getAll(): PublishRecord[] {
  return readRecords();
}

export function getById(id: string): PublishRecord | undefined {
  return readRecords().find((r) => r.id === id);
}

export function getByResearchId(researchId: string): PublishRecord | undefined {
  return readRecords().find((r) => r.researchId === researchId);
}

export function getByStatus(status: PublishStatus): PublishRecord[] {
  return readRecords().filter((r) => r.status === status);
}

export function getByBatchId(batchId: string): PublishRecord[] {
  return readRecords().filter((r) => r.batchId === batchId);
}

export function add(input: AddPublishRecordInput): PublishRecord {
  const records = readRecords();
  if (records.length >= MAX_RECORDS) {
    throw new Error(
      `Publish store is at capacity (${MAX_RECORDS} records). Archive old records to add more.`,
    );
  }

  // Prevent duplicate publish for same research item
  const existing = records.find(
    (r) => r.researchId === input.researchId && r.status !== 'failed' && r.status !== 'archived',
  );
  if (existing) {
    throw new Error(
      `Research item ${input.researchId} already has an active publish record (${existing.id})`,
    );
  }

  const now = new Date().toISOString();
  const record: PublishRecord = {
    id: randomUUID(),
    researchId: input.researchId,
    status: 'pending',
    validation: { title: false, description: false, price: false, images: false, errors: [] },
    retryCount: 0,
    batchId: input.batchId,
    createdAt: now,
    updatedAt: now,
  };

  records.push(record);
  writeRecords(records);
  return record;
}

export function update(id: string, patch: UpdatePublishRecordInput): PublishRecord {
  const records = readRecords();
  const idx = records.findIndex((r) => r.id === id);
  if (idx === -1) throw new Error(`PublishRecord ${id} not found`);

  const updated: PublishRecord = {
    ...records[idx],
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  records[idx] = updated;
  writeRecords(records);
  return updated;
}

export function remove(id: string): void {
  const records = readRecords();
  const filtered = records.filter((r) => r.id !== id);
  if (filtered.length === records.length) throw new Error(`PublishRecord ${id} not found`);
  writeRecords(filtered);
}

export function getStats(): PublishStats {
  const records = readRecords();
  return {
    total: records.length,
    pending: records.filter((r) => r.status === 'pending').length,
    publishing: records.filter((r) => r.status === 'publishing' || r.status === 'validating')
      .length,
    published: records.filter((r) => r.status === 'published').length,
    failed: records.filter((r) => r.status === 'failed').length,
    archived: records.filter((r) => r.status === 'archived').length,
  };
}
