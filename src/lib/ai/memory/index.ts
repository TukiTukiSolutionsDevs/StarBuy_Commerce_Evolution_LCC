/**
 * Memory System — Barrel Export
 *
 * Re-exports everything from the conversation memory system.
 * Import from `@/lib/ai/memory` for clean, tree-shakeable imports.
 */

// Types
export type { ConversationMessage, Conversation, BusinessInsight } from './types';

// Store — CRUD operations
export {
  saveConversation,
  getConversation,
  listConversations,
  deleteConversation,
  deleteAllConversations,
  addInsight,
  listInsights,
  getRelevantInsights,
  deleteInsight,
} from './store';

// Context builder — system prompt enrichment
export { generateTitle, summarizeConversation, buildMemoryContext } from './context';

// Persistence helpers — high-level chat helpers
export { persistChatMessage, getConversationHistory, createMessage } from './persistence';
