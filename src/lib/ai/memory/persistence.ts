/**
 * Persistence Helper
 *
 * High-level helpers for appending messages to conversations
 * and retrieving recent history. Intended for use in the chat route.
 */

import { randomUUID } from 'crypto';
import { saveConversation, getConversation } from './store';
import { generateTitle } from './context';
import type { ConversationMessage, Conversation } from './types';

// ─── Persist a single message ────────────────────────────────────────────────────

/**
 * Appends a message to the given conversation.
 * Creates the conversation if it doesn't exist yet.
 *
 * @param conversationId - Unique conversation identifier
 * @param message        - The message to append
 */
export function persistChatMessage(conversationId: string, message: ConversationMessage): void {
  const now = Date.now();
  const existing = getConversation(conversationId);

  if (existing) {
    const updated: Conversation = {
      ...existing,
      messages: [...existing.messages, message],
      updatedAt: now,
    };
    saveConversation(updated);
  } else {
    // Auto-generate title from first user message
    const title =
      message.role === 'user'
        ? generateTitle(message.content)
        : `Conversation ${conversationId.slice(0, 8)}`;

    const conversation: Conversation = {
      id: conversationId,
      title,
      messages: [message],
      createdAt: now,
      updatedAt: now,
    };
    saveConversation(conversation);
  }
}

// ─── Retrieve recent history ─────────────────────────────────────────────────────

/**
 * Returns the last N messages for a conversation.
 * If `lastN` is omitted, returns all messages.
 *
 * @param conversationId - Unique conversation identifier
 * @param lastN          - How many recent messages to return (optional)
 */
export function getConversationHistory(
  conversationId: string,
  lastN?: number,
): ConversationMessage[] {
  const conversation = getConversation(conversationId);
  if (!conversation) return [];

  const { messages } = conversation;
  if (lastN === undefined || lastN >= messages.length) return messages;

  return messages.slice(-lastN);
}

// ─── Message factory helper ──────────────────────────────────────────────────────

/**
 * Creates a ConversationMessage with a generated ID and current timestamp.
 */
export function createMessage(
  partial: Omit<ConversationMessage, 'id' | 'timestamp'>,
): ConversationMessage {
  return {
    ...partial,
    id: randomUUID(),
    timestamp: Date.now(),
  };
}
