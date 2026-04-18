'use client';

/**
 * ChatHistory — Conversation list from /api/admin/memory
 *
 * Lists past conversations with title, date, message count.
 * Clicking a conversation shows its messages read-only.
 */

import { useEffect, useState } from 'react';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface MemoryMessage {
  role: 'user' | 'assistant';
  content: string;
  createdAt?: string;
}

interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  messages: MemoryMessage[];
}

interface ChatHistoryProps {
  /** Called when user wants to start a new chat */
  onNewChat: () => void;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / 86_400_000);

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return '—';
  }
}

// ─── ReadOnly Message ──────────────────────────────────────────────────────────

function ReadOnlyMessage({ msg }: { msg: MemoryMessage }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      <div
        className={`flex-none w-6 h-6 rounded-full flex items-center justify-center ${
          isUser
            ? 'bg-[var(--admin-brand)] text-[var(--admin-bg)]'
            : 'bg-[var(--admin-chat-avatar-bg)] text-[var(--admin-brand)]'
        }`}
      >
        <span className="material-symbols-outlined text-xs">{isUser ? 'person' : 'smart_toy'}</span>
      </div>
      <div
        className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
          isUser
            ? 'bg-[var(--admin-brand)] text-[var(--admin-bg)] font-medium rounded-tr-sm'
            : 'bg-[var(--admin-bg-card)] text-[var(--admin-text-body)] rounded-tl-sm border border-[var(--admin-border)]'
        }`}
      >
        {msg.content.split('\n').map((line, i) => (
          <p key={i}>{line || <br />}</p>
        ))}
      </div>
    </div>
  );
}

// ─── Conversation Detail ────────────────────────────────────────────────────────

function ConversationDetail({
  conversation,
  onBack,
}: {
  conversation: Conversation;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-[var(--admin-border)] bg-[var(--admin-bg-sidebar)] flex-none">
        <button
          onClick={onBack}
          className="text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] transition-colors p-1 rounded-lg hover:bg-[var(--admin-border)]"
          aria-label="Back to history"
        >
          <span className="material-symbols-outlined text-sm">arrow_back</span>
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-[var(--admin-text-heading)] text-xs font-semibold truncate">
            {conversation.title}
          </p>
          <p className="text-[var(--admin-text-muted)] text-[10px]">
            {formatDate(conversation.createdAt)}
          </p>
        </div>
        <span className="text-[var(--admin-text-disabled)] text-[10px] flex-none">
          {conversation.messages.length} msg
        </span>
      </div>

      {/* Read-only messages */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-3">
        {conversation.messages.length === 0 ? (
          <p className="text-[var(--admin-text-muted)] text-xs text-center py-8">No messages</p>
        ) : (
          conversation.messages.map((msg, i) => <ReadOnlyMessage key={i} msg={msg} />)
        )}
      </div>

      {/* Read-only notice */}
      <div className="border-t border-[var(--admin-border)] px-3 py-2 bg-[var(--admin-bg-sidebar)] flex-none">
        <p className="text-[var(--admin-text-disabled)] text-[10px] text-center">
          Read-only view · Start a new chat to continue
        </p>
      </div>
    </div>
  );
}

// ─── ChatHistory ────────────────────────────────────────────────────────────────

export default function ChatHistory({ onNewChat }: ChatHistoryProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [clearConfirm, setClearConfirm] = useState(false);

  async function fetchHistory() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/memory?limit=20');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { conversations?: Conversation[] };
      setConversations(data.conversations ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load history');
    } finally {
      setLoading(false);
    }
  }

  async function handleClearAll() {
    if (!clearConfirm) {
      setClearConfirm(true);
      return;
    }
    try {
      await fetch('/api/admin/memory', { method: 'DELETE' });
      setConversations([]);
      setClearConfirm(false);
      setSelected(null);
    } catch {
      setError('Failed to clear history');
    }
  }

  useEffect(() => {
    fetchHistory();
  }, []);

  // Show detail view when conversation selected
  if (selected) {
    return <ConversationDetail conversation={selected} onBack={() => setSelected(null)} />;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-[var(--admin-border)] bg-[var(--admin-bg-sidebar)] flex-none">
        <span className="text-[var(--admin-text-secondary)] text-xs font-medium">
          {conversations.length > 0
            ? `${conversations.length} conversation${conversations.length !== 1 ? 's' : ''}`
            : 'History'}
        </span>
        <div className="flex items-center gap-1">
          {conversations.length > 0 && (
            <button
              onClick={handleClearAll}
              className={`text-xs px-2 py-1 rounded-lg transition-colors ${
                clearConfirm
                  ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                  : 'text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-border)]'
              }`}
            >
              {clearConfirm ? 'Confirm clear?' : 'Clear all'}
            </button>
          )}
          {clearConfirm && (
            <button
              onClick={() => setClearConfirm(false)}
              className="text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] text-xs px-2 py-1 rounded-lg hover:bg-[var(--admin-border)] transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            onClick={onNewChat}
            className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-[var(--admin-brand)]/10 text-[var(--admin-brand)] hover:bg-[var(--admin-brand)]/20 transition-colors"
          >
            <span className="material-symbols-outlined text-xs">add</span>
            New chat
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-3">
              <span className="material-symbols-outlined text-[var(--admin-brand)] text-2xl animate-pulse">
                history
              </span>
              <p className="text-[var(--admin-text-muted)] text-xs">Loading history…</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center gap-3">
            <span className="material-symbols-outlined text-red-400 text-2xl">error</span>
            <p className="text-red-400 text-xs">{error}</p>
            <button
              onClick={fetchHistory}
              className="text-xs text-[var(--admin-brand)] hover:text-[var(--admin-brand-hover)] transition-colors"
            >
              Try again
            </button>
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center gap-3">
            <span className="material-symbols-outlined text-[var(--admin-text-disabled)] text-3xl">
              forum
            </span>
            <p className="text-[var(--admin-text-muted)] text-xs">No conversations yet</p>
            <button
              onClick={onNewChat}
              className="text-xs text-[var(--admin-brand)] hover:text-[var(--admin-brand-hover)] transition-colors"
            >
              Start your first chat →
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-[var(--admin-border)]">
            {conversations.map((conv) => (
              <li key={conv.id}>
                <button
                  onClick={() => setSelected(conv)}
                  className="w-full flex items-start gap-3 px-4 py-3 hover:bg-[var(--admin-bg-card)] transition-colors text-left"
                >
                  <div className="flex-none w-7 h-7 rounded-full bg-[var(--admin-chat-avatar-bg)] flex items-center justify-center mt-0.5">
                    <span className="material-symbols-outlined text-[var(--admin-brand)] text-sm">
                      chat_bubble
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[var(--admin-text-heading)] text-xs font-medium truncate">
                      {conv.title}
                    </p>
                    <p className="text-[var(--admin-text-muted)] text-[10px] mt-0.5">
                      {formatDate(conv.createdAt)} · {conv.messages.length} messages
                    </p>
                  </div>
                  <span className="material-symbols-outlined text-[var(--admin-text-disabled)] text-sm flex-none mt-1">
                    chevron_right
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
