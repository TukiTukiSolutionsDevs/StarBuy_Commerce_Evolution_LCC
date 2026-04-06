/**
 * Automations Store — File-based persistence
 *
 * Stores automation rules as JSON in `.admin-automations/rules.json`.
 * Server-side only — uses Node.js fs module directly.
 *
 * Mirrors the pattern from src/lib/ai/memory/store.ts.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import type { AutomationRule } from './types';
import { getDataDir } from '@/lib/data-dir';

// ─── Paths ───────────────────────────────────────────────────────────────────────

const AUTOMATIONS_DIR = getDataDir('.admin-automations');
const RULES_FILE = join(AUTOMATIONS_DIR, 'rules.json');

// ─── Initialisation ──────────────────────────────────────────────────────────────

function ensureDir(): void {
  if (!existsSync(AUTOMATIONS_DIR)) {
    mkdirSync(AUTOMATIONS_DIR, { recursive: true });
  }
  if (!existsSync(RULES_FILE)) {
    writeFileSync(RULES_FILE, JSON.stringify([], null, 2), 'utf-8');
  }
}

// ─── Internal read/write helpers ──────────────────────────────────────────────────

function readRules(): AutomationRule[] {
  ensureDir();
  try {
    const raw = readFileSync(RULES_FILE, 'utf-8');
    return JSON.parse(raw) as AutomationRule[];
  } catch {
    return [];
  }
}

function writeRules(rules: AutomationRule[]): void {
  ensureDir();
  writeFileSync(RULES_FILE, JSON.stringify(rules, null, 2), 'utf-8');
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────────

export function saveRule(rule: AutomationRule): void {
  const rules = readRules();
  const idx = rules.findIndex((r) => r.id === rule.id);

  if (idx >= 0) {
    rules[idx] = rule;
  } else {
    rules.push(rule);
  }

  writeRules(rules);
}

export function getRule(id: string): AutomationRule | null {
  const rules = readRules();
  return rules.find((r) => r.id === id) ?? null;
}

export function listRules(): AutomationRule[] {
  return readRules().sort((a, b) => b.createdAt - a.createdAt);
}

export function deleteRule(id: string): void {
  const rules = readRules();
  writeRules(rules.filter((r) => r.id !== id));
}

export function toggleRule(id: string, enabled: boolean): void {
  const rules = readRules();
  const idx = rules.findIndex((r) => r.id === id);
  if (idx >= 0) {
    rules[idx] = { ...rules[idx], enabled };
    writeRules(rules);
  }
}

export function updateRuleStats(id: string): void {
  const rules = readRules();
  const idx = rules.findIndex((r) => r.id === id);
  if (idx >= 0) {
    rules[idx] = {
      ...rules[idx],
      lastRunAt: Date.now(),
      runCount: (rules[idx].runCount ?? 0) + 1,
    };
    writeRules(rules);
  }
}
