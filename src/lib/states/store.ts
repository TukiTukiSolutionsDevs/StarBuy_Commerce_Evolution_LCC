/**
 * State Intelligence — File-based Store
 *
 * Persists OpportunityScore[], StateTrendSnapshot[], and MarketPulseEvent[]
 * as JSON files under .starbuy-states/.
 * Paths computed lazily so STARBUY_DATA_DIR can be overridden in tests.
 *
 * Prune strategies:
 *   - Snapshots: keep last 4 weeks
 *   - Pulse events: keep last 30 days
 *   - Scores: always overwrite (latest only)
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { getDataDir } from '@/lib/data-dir';
import type { OpportunityScore, StateTrendSnapshot, MarketPulseEvent } from './types';

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_SNAPSHOT_WEEKS = 4;
const MAX_PULSE_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const MAX_PULSE_EVENTS = 500;

// ─── Lazy Paths ───────────────────────────────────────────────────────────────

function getStatesDir(): string {
  return getDataDir('.starbuy-states');
}

function getScoresFile(): string {
  return join(getStatesDir(), 'scores.json');
}

function getSnapshotsFile(): string {
  return join(getStatesDir(), 'snapshots.json');
}

function getPulseFile(): string {
  return join(getStatesDir(), 'pulse-events.json');
}

// ─── Internal Helpers ─────────────────────────────────────────────────────────

function ensureDir(): void {
  const dir = getStatesDir();
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function readJson<T>(file: string, fallback: T): T {
  ensureDir();
  if (!existsSync(file)) return fallback;
  try {
    return JSON.parse(readFileSync(file, 'utf-8')) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(file: string, data: T): void {
  ensureDir();
  writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
}

// ─── Scores ───────────────────────────────────────────────────────────────────

export function loadScores(): OpportunityScore[] {
  return readJson<OpportunityScore[]>(getScoresFile(), []);
}

export function saveScores(scores: OpportunityScore[]): void {
  writeJson(getScoresFile(), scores);
}

export function getScoreByState(stateCode: string): OpportunityScore | undefined {
  return loadScores().find((s) => s.stateCode === stateCode);
}

// ─── Snapshots ────────────────────────────────────────────────────────────────

export function loadSnapshots(): StateTrendSnapshot[] {
  return readJson<StateTrendSnapshot[]>(getSnapshotsFile(), []);
}

export function saveSnapshot(snapshot: StateTrendSnapshot): void {
  const snapshots = loadSnapshots();

  // Upsert: same stateCode + weekOf → replace
  const idx = snapshots.findIndex(
    (s) => s.stateCode === snapshot.stateCode && s.weekOf === snapshot.weekOf,
  );
  if (idx >= 0) {
    snapshots[idx] = snapshot;
  } else {
    snapshots.push(snapshot);
  }

  // Prune: keep only the last MAX_SNAPSHOT_WEEKS distinct weeks
  const distinctWeeks = [...new Set(snapshots.map((s) => s.weekOf))].sort().reverse();
  const keepWeeks = new Set(distinctWeeks.slice(0, MAX_SNAPSHOT_WEEKS));
  const pruned = snapshots.filter((s) => keepWeeks.has(s.weekOf));

  writeJson(getSnapshotsFile(), pruned);
}

export function getSnapshotsByState(stateCode: string): StateTrendSnapshot[] {
  return loadSnapshots().filter((s) => s.stateCode === stateCode);
}

export function getSnapshotsByWeek(weekOf: string): StateTrendSnapshot[] {
  return loadSnapshots().filter((s) => s.weekOf === weekOf);
}

export function getLatestWeek(): string | null {
  const snapshots = loadSnapshots();
  if (snapshots.length === 0) return null;
  return [...new Set(snapshots.map((s) => s.weekOf))].sort().reverse()[0];
}

export function getPreviousWeek(): string | null {
  const snapshots = loadSnapshots();
  const weeks = [...new Set(snapshots.map((s) => s.weekOf))].sort().reverse();
  return weeks.length >= 2 ? weeks[1] : null;
}

// ─── Pulse Events ─────────────────────────────────────────────────────────────

export function loadPulseEvents(): MarketPulseEvent[] {
  return readJson<MarketPulseEvent[]>(getPulseFile(), []);
}

export function savePulseEvents(events: MarketPulseEvent[]): void {
  // Prune: remove events older than 30 days, cap at MAX_PULSE_EVENTS
  const now = Date.now();
  const fresh = events
    .filter((e) => now - e.detectedAt < MAX_PULSE_AGE_MS)
    .sort((a, b) => b.detectedAt - a.detectedAt)
    .slice(0, MAX_PULSE_EVENTS);

  writeJson(getPulseFile(), fresh);
}

export function addPulseEvents(newEvents: MarketPulseEvent[]): void {
  const existing = loadPulseEvents();
  savePulseEvents([...newEvents, ...existing]);
}

export function markPulseEventsRead(eventIds: string[]): number {
  const events = loadPulseEvents();
  const idSet = new Set(eventIds);
  let marked = 0;

  for (const event of events) {
    if (idSet.has(event.id) && !event.isRead) {
      event.isRead = true;
      marked++;
    }
  }

  if (marked > 0) {
    writeJson(getPulseFile(), events);
  }

  return marked;
}

export function getUnreadPulseCount(): number {
  return loadPulseEvents().filter((e) => !e.isRead).length;
}

export function getPulseEventsByState(stateCode: string): MarketPulseEvent[] {
  return loadPulseEvents().filter((e) => e.stateCode === stateCode);
}

export function getPulseEventsBySeverity(
  severity: MarketPulseEvent['severity'],
): MarketPulseEvent[] {
  return loadPulseEvents().filter((e) => e.severity === severity);
}
