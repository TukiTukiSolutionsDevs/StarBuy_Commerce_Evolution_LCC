/**
 * Activity Log — File-based event store
 *
 * Persists activity events to `.admin-activity/events.json`.
 * Max 500 events — oldest are pruned when limit is reached.
 * Designed for server-side use only (Node.js file system).
 */

import { randomUUID } from 'crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { getDataDir } from '@/lib/data-dir';

// ─── Types ─────────────────────────────────────────────────────────────────────

export type ActivityEventType = 'webhook' | 'user_action' | 'automation' | 'system';
export type ActivitySeverity = 'info' | 'warning' | 'error' | 'success';

export type ActivityEvent = {
  id: string;
  type: ActivityEventType;
  topic: string; // e.g. 'orders/create', 'products/update'
  summary: string; // Human-readable: "New order #1234 — $89.99"
  details: unknown; // Raw payload (may be truncated)
  severity: ActivitySeverity;
  timestamp: number;
};

// ─── Constants ─────────────────────────────────────────────────────────────────

const MAX_EVENTS = 500;
const STORE_DIR = getDataDir('.admin-activity');
const STORE_FILE = join(STORE_DIR, 'events.json');

// ─── Internal helpers ──────────────────────────────────────────────────────────

function ensureStore(): void {
  if (!existsSync(STORE_DIR)) {
    mkdirSync(STORE_DIR, { recursive: true });
  }
  if (!existsSync(STORE_FILE)) {
    writeFileSync(STORE_FILE, JSON.stringify([]), 'utf-8');
  }
}

function readStore(): ActivityEvent[] {
  try {
    ensureStore();
    const raw = readFileSync(STORE_FILE, 'utf-8');
    return JSON.parse(raw) as ActivityEvent[];
  } catch {
    return [];
  }
}

function writeStore(events: ActivityEvent[]): void {
  try {
    ensureStore();
    writeFileSync(STORE_FILE, JSON.stringify(events, null, 2), 'utf-8');
  } catch (err) {
    console.error('[activity-log] Failed to write store:', err);
  }
}

/**
 * Truncate payload to avoid bloating the log file.
 * Keeps the first 2KB of the JSON representation.
 */
function truncateDetails(payload: unknown): unknown {
  try {
    const serialized = JSON.stringify(payload);
    if (serialized.length <= 2048) return payload;
    return JSON.parse(serialized.slice(0, 2048) + '"[TRUNCATED]"}');
  } catch {
    return String(payload).slice(0, 512);
  }
}

// ─── Public API ────────────────────────────────────────────────────────────────

/**
 * Save a new activity event to the log.
 * Automatically assigns id and timestamp.
 */
export function saveActivity(event: Omit<ActivityEvent, 'id' | 'timestamp'>): ActivityEvent {
  const full: ActivityEvent = {
    id: randomUUID(),
    timestamp: Date.now(),
    ...event,
    details: truncateDetails(event.details),
  };

  const existing = readStore();
  const updated = [full, ...existing];

  // Prune oldest when over limit
  if (updated.length > MAX_EVENTS) {
    updated.splice(MAX_EVENTS);
  }

  writeStore(updated);
  return full;
}

/**
 * Retrieve activity events, most recent first.
 * @param limit  max events to return (default 100)
 * @param type   optional filter by event type
 */
export function getActivities(limit = 100, type?: ActivityEventType | string): ActivityEvent[] {
  const events = readStore();

  const filtered = type ? events.filter((e) => e.type === type) : events;

  return filtered.slice(0, Math.min(limit, MAX_EVENTS));
}

/**
 * Delete all stored activity events.
 */
export function clearActivities(): void {
  writeStore([]);
}
