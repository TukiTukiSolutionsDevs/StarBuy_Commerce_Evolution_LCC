/**
 * Conversation Memory Types
 *
 * Core types for the file-based conversation memory system.
 * Persisted to `.admin-memory/` directory at the project root.
 */

export type ConversationMessage = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  agentId?: string;
  toolCalls?: Array<{ toolName: string; args: Record<string, unknown>; result: unknown }>;
  timestamp: number;
};

export type Conversation = {
  id: string;
  title: string;
  messages: ConversationMessage[];
  createdAt: number;
  updatedAt: number;
};

export type BusinessInsight = {
  id: string;
  type: 'observation' | 'decision' | 'preference' | 'pattern';
  content: string;
  source: string;
  createdAt: number;
};
