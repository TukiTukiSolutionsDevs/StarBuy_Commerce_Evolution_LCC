/**
 * Memory Context Builder
 *
 * Utilities to build memory-enriched context strings for system prompts.
 */

import type { ConversationMessage } from './types';

// ─── Title Generation ─────────────────────────────────────────────────────────────

/**
 * Generates a conversation title from the first user message.
 * Truncates at 50 chars and cleans up whitespace.
 */
export function generateTitle(firstMessage: string): string {
  const cleaned = firstMessage.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= 50) return cleaned;
  return `${cleaned.slice(0, 47)}...`;
}

// ─── Conversation Summary ─────────────────────────────────────────────────────────

/**
 * Produces a brief summary listing tool calls and main topics from a conversation.
 * Used to inject compact context into system prompts without bloating the token count.
 */
export function summarizeConversation(messages: ConversationMessage[]): string {
  const toolsUsed: string[] = [];
  const topics: string[] = [];

  for (const msg of messages) {
    if (msg.toolCalls?.length) {
      for (const tc of msg.toolCalls) {
        if (!toolsUsed.includes(tc.toolName)) {
          toolsUsed.push(tc.toolName);
        }
      }
    }

    // Extract short topic hint from user messages (first 60 chars)
    if (msg.role === 'user' && msg.content.trim().length > 0) {
      const hint = msg.content.replace(/\s+/g, ' ').trim().slice(0, 60);
      topics.push(hint);
    }
  }

  const parts: string[] = [];

  if (toolsUsed.length > 0) {
    parts.push(`Tools used: ${toolsUsed.join(', ')}`);
  }

  if (topics.length > 0) {
    // Show up to 3 topic hints to keep it compact
    parts.push(`Topics: ${topics.slice(0, 3).join(' | ')}`);
  }

  return parts.length > 0 ? parts.join('. ') : 'No activity recorded.';
}

// ─── Memory Context for System Prompt ───────────────────────────────────────────────

/**
 * Builds a memory context block to append to the system prompt.
 * Includes the most recent conversation history and any relevant insights.
 *
 * @param currentMessage - The new user message (used to search relevant insights)
 * @param history        - Recent conversation messages to include as context
 * @returns A formatted string block ready to append to a system prompt
 */
export function buildMemoryContext(currentMessage: string, history: ConversationMessage[]): string {
  if (history.length === 0 && currentMessage.trim().length === 0) return '';

  const lines: string[] = ['--- CONVERSATION HISTORY ---'];

  for (const msg of history) {
    const roleLabel =
      msg.role === 'user' ? 'User' : msg.agentId ? `Agent(${msg.agentId})` : 'Assistant';
    const toolNote =
      msg.toolCalls && msg.toolCalls.length > 0
        ? ` [used: ${msg.toolCalls.map((t) => t.toolName).join(', ')}]`
        : '';
    lines.push(`${roleLabel}${toolNote}: ${msg.content.slice(0, 300)}`);
  }

  lines.push('--- END HISTORY ---');

  return lines.join('\n');
}
