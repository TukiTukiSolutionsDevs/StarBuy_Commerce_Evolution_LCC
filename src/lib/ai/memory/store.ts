/**
 * Memory Store — File-based persistence
 *
 * Stores conversations and business insights as JSON files in `.admin-memory/`.
 * Server-side only — uses Node.js fs module directly (no streams).
 *
 * Limits:
 *   - Max 50 conversations (prunes oldest by updatedAt)
 *   - Max 100 insights (prunes oldest by createdAt)
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import type { Conversation, BusinessInsight } from './types';
import { getDataDir } from '@/lib/data-dir';

// ─── Paths ──────────────────────────────────────────────────────────────────────

const MEMORY_DIR = getDataDir('.admin-memory');
const CONVERSATIONS_FILE = join(MEMORY_DIR, 'conversations.json');
const INSIGHTS_FILE = join(MEMORY_DIR, 'insights.json');

const MAX_CONVERSATIONS = 50;
const MAX_INSIGHTS = 100;

// ─── Initialisation ─────────────────────────────────────────────────────────────

function ensureMemoryDir(): void {
  if (!existsSync(MEMORY_DIR)) {
    mkdirSync(MEMORY_DIR, { recursive: true });
  }
  if (!existsSync(CONVERSATIONS_FILE)) {
    writeFileSync(CONVERSATIONS_FILE, JSON.stringify([], null, 2), 'utf-8');
  }
  if (!existsSync(INSIGHTS_FILE)) {
    writeFileSync(INSIGHTS_FILE, JSON.stringify([], null, 2), 'utf-8');
  }
}

// ─── Internal read/write helpers ─────────────────────────────────────────────────

function readConversations(): Conversation[] {
  ensureMemoryDir();
  try {
    const raw = readFileSync(CONVERSATIONS_FILE, 'utf-8');
    return JSON.parse(raw) as Conversation[];
  } catch {
    return [];
  }
}

function writeConversations(conversations: Conversation[]): void {
  ensureMemoryDir();
  // Prune oldest by updatedAt if over limit
  const pruned =
    conversations.length > MAX_CONVERSATIONS
      ? [...conversations].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, MAX_CONVERSATIONS)
      : conversations;
  writeFileSync(CONVERSATIONS_FILE, JSON.stringify(pruned, null, 2), 'utf-8');
}

function readInsights(): BusinessInsight[] {
  ensureMemoryDir();
  try {
    const raw = readFileSync(INSIGHTS_FILE, 'utf-8');
    return JSON.parse(raw) as BusinessInsight[];
  } catch {
    return [];
  }
}

function writeInsights(insights: BusinessInsight[]): void {
  ensureMemoryDir();
  // Prune oldest by createdAt if over limit
  const pruned =
    insights.length > MAX_INSIGHTS
      ? [...insights].sort((a, b) => b.createdAt - a.createdAt).slice(0, MAX_INSIGHTS)
      : insights;
  writeFileSync(INSIGHTS_FILE, JSON.stringify(pruned, null, 2), 'utf-8');
}

// ─── Conversation CRUD ────────────────────────────────────────────────────────────

export function saveConversation(conversation: Conversation): void {
  const conversations = readConversations();
  const idx = conversations.findIndex((c) => c.id === conversation.id);

  if (idx >= 0) {
    conversations[idx] = { ...conversation, updatedAt: Date.now() };
  } else {
    conversations.push(conversation);
  }

  writeConversations(conversations);
}

export function getConversation(id: string): Conversation | null {
  const conversations = readConversations();
  return conversations.find((c) => c.id === id) ?? null;
}

export function listConversations(): Omit<Conversation, 'messages'>[] {
  const conversations = readConversations();
  return conversations
    .map(({ messages: _messages, ...meta }) => meta)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export function deleteConversation(id: string): boolean {
  const conversations = readConversations();
  const filtered = conversations.filter((c) => c.id !== id);

  if (filtered.length === conversations.length) return false;

  writeConversations(filtered);
  return true;
}

export function deleteAllConversations(): void {
  writeConversations([]);
}

// ─── Insights CRUD ───────────────────────────────────────────────────────────────

export function addInsight(insight: BusinessInsight): void {
  const insights = readInsights();
  // Avoid exact duplicates by content
  const exists = insights.some((i) => i.content === insight.content);
  if (!exists) {
    insights.push(insight);
    writeInsights(insights);
  }
}

export function listInsights(): BusinessInsight[] {
  return readInsights().sort((a, b) => b.createdAt - a.createdAt);
}

export function getRelevantInsights(query: string, limit = 5): BusinessInsight[] {
  const insights = readInsights();
  const q = query.toLowerCase();

  return insights
    .filter((insight) => insight.content.toLowerCase().includes(q))
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, limit);
}

export function deleteInsight(id: string): boolean {
  const insights = readInsights();
  const filtered = insights.filter((i) => i.id !== id);

  if (filtered.length === insights.length) return false;

  writeInsights(filtered);
  return true;
}
