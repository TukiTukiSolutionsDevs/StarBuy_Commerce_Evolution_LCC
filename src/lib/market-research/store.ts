/**
 * Market Research Store — File-based persistence
 *
 * Stores research sessions as JSON in `.admin-market-research/sessions.json`.
 * Server-side only — uses Node.js fs module directly.
 *
 * Mirrors the pattern from src/lib/automations/store.ts.
 * Max 50 sessions (oldest pruned when limit is exceeded).
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import type { ResearchSession } from './types';
import { getDataDir } from '@/lib/data-dir';

// ─── Paths ───────────────────────────────────────────────────────────────────────

const RESEARCH_DIR = getDataDir('.admin-market-research');
const SESSIONS_FILE = join(RESEARCH_DIR, 'sessions.json');
const MAX_SESSIONS = 50;

// ─── Initialisation ──────────────────────────────────────────────────────────────

function ensureDir(): void {
  if (!existsSync(RESEARCH_DIR)) {
    mkdirSync(RESEARCH_DIR, { recursive: true });
  }
  if (!existsSync(SESSIONS_FILE)) {
    writeFileSync(SESSIONS_FILE, JSON.stringify([], null, 2), 'utf-8');
  }
}

// ─── Internal read/write helpers ──────────────────────────────────────────────────

function readSessions(): ResearchSession[] {
  ensureDir();
  try {
    const raw = readFileSync(SESSIONS_FILE, 'utf-8');
    return JSON.parse(raw) as ResearchSession[];
  } catch {
    return [];
  }
}

function writeSessions(sessions: ResearchSession[]): void {
  ensureDir();
  writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2), 'utf-8');
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────────

export function saveSession(session: ResearchSession): void {
  let sessions = readSessions();
  const idx = sessions.findIndex((s) => s.id === session.id);

  if (idx >= 0) {
    sessions[idx] = session;
  } else {
    sessions.push(session);
    // Prune oldest sessions if over max
    if (sessions.length > MAX_SESSIONS) {
      sessions = sessions.sort((a, b) => b.createdAt - a.createdAt).slice(0, MAX_SESSIONS);
    }
  }

  writeSessions(sessions);
}

export function getSession(id: string): ResearchSession | null {
  const sessions = readSessions();
  return sessions.find((s) => s.id === id) ?? null;
}

export function listSessions(): ResearchSession[] {
  return readSessions().sort((a, b) => b.createdAt - a.createdAt);
}

export function deleteSession(id: string): void {
  const sessions = readSessions();
  writeSessions(sessions.filter((s) => s.id !== id));
}
