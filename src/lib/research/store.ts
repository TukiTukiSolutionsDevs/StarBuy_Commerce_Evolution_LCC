/**
 * Research Board — File-based CRUD
 *
 * Persists ResearchItem[] as .starbuy-research/boards.json.
 * Paths computed lazily so STARBUY_DATA_DIR can be overridden in tests.
 * No auto-prune — max 500 items enforced on add().
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { getDataDir } from '@/lib/data-dir';
import { computeMargin, computeAiScore } from './scorer';
import type {
  ResearchItem,
  AddResearchItemInput,
  UpdateResearchItemInput,
  ResearchItemStatus,
} from './types';

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_ITEMS = 500;

// ─── Lazy Paths ───────────────────────────────────────────────────────────────

function getResearchDir(): string {
  return getDataDir('.starbuy-research');
}

function getBoardsFile(): string {
  return join(getResearchDir(), 'boards.json');
}

// ─── Internal Helpers ─────────────────────────────────────────────────────────

function ensureDir(): void {
  const dir = getResearchDir();
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const file = getBoardsFile();
  if (!existsSync(file)) writeFileSync(file, '[]', 'utf-8');
}

function readItems(): ResearchItem[] {
  ensureDir();
  try {
    return JSON.parse(readFileSync(getBoardsFile(), 'utf-8')) as ResearchItem[];
  } catch {
    return [];
  }
}

function writeItems(items: ResearchItem[]): void {
  ensureDir();
  writeFileSync(getBoardsFile(), JSON.stringify(items, null, 2), 'utf-8');
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function getAll(): ResearchItem[] {
  return readItems();
}

export function getById(id: string): ResearchItem | undefined {
  return readItems().find((item) => item.id === id);
}

export function getByStatus(status: ResearchItemStatus): ResearchItem[] {
  return readItems().filter((item) => item.status === status);
}

export function add(input: AddResearchItemInput): ResearchItem {
  const items = readItems();
  if (items.length >= MAX_ITEMS) {
    throw new Error(
      `Research board is at capacity (${MAX_ITEMS} items). Discard or delete items to add more.`,
    );
  }

  const now = Date.now();
  const marginPercent = computeMargin(input.costPrice, input.salePrice);
  const { score, breakdown, label } = computeAiScore({
    trendScore: input.trendScore,
    marginPercent,
    adCount: input.adCount,
    searchVolume: input.searchVolume,
  });

  const item: ResearchItem = {
    id: randomUUID(),
    keyword: input.keyword,
    title: input.title ?? input.keyword,
    description: input.description,
    trendScore: input.trendScore,
    trendState: input.trendState,
    sources: input.sources,
    relatedKeywords: input.relatedKeywords,
    searchVolume: input.searchVolume,
    adCount: input.adCount,
    costPrice: input.costPrice,
    salePrice: input.salePrice,
    marginPercent,
    aiScore: score,
    aiScoreBreakdown: breakdown,
    aiScoreLabel: label,
    status: 'candidate',
    notes: input.notes,
    addedAt: now,
    updatedAt: now,
  };

  items.push(item);
  writeItems(items);
  return item;
}

export function update(id: string, patch: UpdateResearchItemInput): ResearchItem {
  const items = readItems();
  const idx = items.findIndex((i) => i.id === id);
  if (idx === -1) throw new Error(`ResearchItem ${id} not found`);

  const existing = items[idx];
  const updated: ResearchItem = { ...existing, ...patch, updatedAt: Date.now() };

  // Recompute margin + AI score only when prices change
  if (patch.costPrice !== undefined || patch.salePrice !== undefined) {
    updated.marginPercent = computeMargin(updated.costPrice, updated.salePrice);
    const { score, breakdown, label } = computeAiScore({
      trendScore: updated.trendScore,
      marginPercent: updated.marginPercent,
      adCount: updated.adCount,
      searchVolume: updated.searchVolume,
    });
    updated.aiScore = score;
    updated.aiScoreBreakdown = breakdown;
    updated.aiScoreLabel = label;
  }

  items[idx] = updated;
  writeItems(items);
  return updated;
}

export function remove(id: string): void {
  const items = readItems();
  const filtered = items.filter((i) => i.id !== id);
  if (filtered.length === items.length) throw new Error(`ResearchItem ${id} not found`);
  writeItems(filtered);
}

export function getStats(): {
  total: number;
  candidates: number;
  saved: number;
  imported: number;
  discarded: number;
  importing: number;
  published: number;
  avgMargin: number;
} {
  const items = readItems();
  const active = items.filter((i) => i.status !== 'discarded');
  const avgMargin =
    active.length > 0
      ? Math.round((active.reduce((sum, i) => sum + i.marginPercent, 0) / active.length) * 10) / 10
      : 0;

  return {
    total: items.length,
    candidates: items.filter((i) => i.status === 'candidate').length,
    saved: items.filter((i) => i.status === 'saved').length,
    imported: items.filter((i) => i.status === 'imported').length,
    discarded: items.filter((i) => i.status === 'discarded').length,
    importing: items.filter((i) => i.status === 'importing').length,
    published: items.filter((i) => i.status === 'published').length,
    avgMargin,
  };
}
