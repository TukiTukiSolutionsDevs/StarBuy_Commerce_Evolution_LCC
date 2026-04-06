'use client';

/**
 * Admin Chat Widget — Floating panel
 *
 * A floating chat button + panel overlay.
 * 3 tabs: Chat | History | Actions
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import type { UIMessage } from 'ai';

import ChatHistory from './ChatHistory';
import ActionLog from './ActionLog';
import SuggestedPrompts from './SuggestedPrompts';

// ─── Agent Info Map ─────────────────────────────────────────────────────────────

const AGENT_INFO: Record<string, { name: string; icon: string; color: string }> = {
  catalog: { name: 'Catalog Agent', icon: 'inventory_2', color: '#d4a843' },
  orders: { name: 'Orders Agent', icon: 'receipt_long', color: '#10b981' },
  customers: { name: 'Customers Agent', icon: 'people', color: '#6b8cff' },
  pricing: { name: 'Pricing Agent', icon: 'sell', color: '#f59e0b' },
  analytics: { name: 'Analytics Agent', icon: 'insights', color: '#8b5cf6' },
  operations: { name: 'Operations Agent', icon: 'warehouse', color: '#ef4444' },
  shopify: { name: 'Shopify Expert', icon: 'store', color: '#96bf48' },
  orchestrator: { name: 'Assistant', icon: 'smart_toy', color: '#d4a843' },
};

// ─── Types ─────────────────────────────────────────────────────────────────────

interface ChatWidgetProps {
  isOpen: boolean;
  onToggle: () => void;
}

type Tab = 'chat' | 'history' | 'actions';

// ─── Tool Call Card (compact) ──────────────────────────────────────────────────

type ToolCallResult = {
  type: string;
  toolCallId: string;
  toolName: string;
  args: Record<string, unknown>;
  state: string;
  output?: unknown;
};

function ToolCallBadge({ toolCall }: { toolCall: ToolCallResult }) {
  const [expanded, setExpanded] = useState(false);
  const isSuccess =
    !!toolCall.output &&
    typeof toolCall.output === 'object' &&
    !('error' in (toolCall.output as Record<string, unknown>));

  return (
    <div className="rounded-lg border border-[#1f2d4e] bg-[#0f1729] text-xs overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left hover:bg-white/5 transition-colors"
      >
        <span className="material-symbols-outlined text-[#d4a843] text-sm">build</span>
        <span className="text-[#9ca3af] font-mono flex-1 truncate">{toolCall.toolName}</span>
        {isSuccess ? (
          <span className="material-symbols-outlined text-[#10b981] text-xs">check_circle</span>
        ) : (
          <span className="material-symbols-outlined text-red-400 text-xs">error</span>
        )}
        <span className="material-symbols-outlined text-[#374151] text-xs">
          {expanded ? 'expand_less' : 'expand_more'}
        </span>
      </button>
      {expanded && (
        <div className="border-t border-[#1f2d4e] px-2.5 py-2">
          <pre className="text-[9px] text-[#9ca3af] whitespace-pre-wrap break-all font-mono leading-relaxed max-h-32 overflow-y-auto">
            {JSON.stringify(toolCall.output ?? toolCall.args, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

// ─── Agent Badge ────────────────────────────────────────────────────────────────

/**
 * Tries to infer agent from message tool calls (first tool name prefix).
 * Falls back to "orchestrator" (= Assistant) for plain text responses.
 */
function resolveAgent(message: UIMessage): { name: string; icon: string; color: string } {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parts = (message.parts as any[]) ?? [];

  for (const part of parts) {
    const partType = part.type as string;
    if (!partType?.startsWith('tool-') && partType !== 'tool-invocation') continue;
    const toolName: string = part.toolName ?? '';
    const matchedKey = Object.keys(AGENT_INFO).find((k) => toolName.toLowerCase().startsWith(k));
    if (matchedKey) return AGENT_INFO[matchedKey];
  }

  return AGENT_INFO.orchestrator;
}

function AgentBadge({ message }: { message: UIMessage }) {
  const agent = resolveAgent(message);
  return (
    <div
      className="flex items-center gap-1 text-[10px] font-medium mb-1 px-1"
      style={{ color: agent.color }}
    >
      <span className="material-symbols-outlined" style={{ fontSize: '11px' }}>
        {agent.icon}
      </span>
      {agent.name}
    </div>
  );
}

// ─── Message Bubble ─────────────────────────────────────────────────────────────

function MessageBubble({ message }: { message: UIMessage }) {
  const isUser = message.role === 'user';

  const textContent = message.parts
    .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
    .map((p) => p.text)
    .join('');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const toolParts = message.parts.filter((p: any) => {
    const t = p.type as string;
    return t?.startsWith('tool-') || t === 'tool-invocation';
  });

  return (
    <div className={`flex gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      <div
        className={`flex-none w-7 h-7 rounded-full flex items-center justify-center text-xs ${
          isUser ? 'bg-[#d4a843] text-[#0a0f1e]' : 'bg-[#1b2a5e] text-[#d4a843]'
        }`}
      >
        <span className="material-symbols-outlined text-sm">{isUser ? 'person' : 'smart_toy'}</span>
      </div>

      <div
        className={`flex-1 max-w-[85%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-1.5`}
      >
        {/* Agent badge — only for assistant messages */}
        {!isUser && <AgentBadge message={message} />}

        {textContent && (
          <div
            className={`rounded-xl px-3 py-2 text-xs leading-relaxed ${
              isUser
                ? 'bg-[#d4a843] text-[#0a0f1e] font-medium rounded-tr-sm'
                : 'bg-[#111827] text-[#e5e7eb] rounded-tl-sm border border-[#1f2d4e]'
            }`}
          >
            {textContent.split('\n').map((line, i) => (
              <p key={i}>{line || <br />}</p>
            ))}
          </div>
        )}

        {toolParts.length > 0 && (
          <div className="w-full space-y-1">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {toolParts.map((part: any, i: number) => {
              const toolName = part.toolName ?? part.type?.replace('tool-', '') ?? 'unknown';
              const toolCallId = part.toolCallId ?? `${toolName}-${i}`;
              const state = part.state ?? 'unknown';

              if (state === 'output-available' || state === 'result') {
                return (
                  <ToolCallBadge
                    key={toolCallId}
                    toolCall={{
                      type: part.type,
                      toolCallId,
                      toolName,
                      args: part.input ?? part.args ?? {},
                      state,
                      output: part.output ?? part.result,
                    }}
                  />
                );
              }

              return (
                <div
                  key={toolCallId}
                  className="flex items-center gap-1.5 bg-[#0f1729] border border-[#1f2d4e] rounded-lg px-2.5 py-1.5 text-xs"
                >
                  <span className="material-symbols-outlined text-[#d4a843] text-sm animate-pulse">
                    hourglass_empty
                  </span>
                  <span className="text-[#6b7280] font-mono">{toolName}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tab Bar ────────────────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'chat', label: 'Chat', icon: 'chat' },
  { id: 'history', label: 'History', icon: 'history' },
  { id: 'actions', label: 'Actions', icon: 'terminal' },
];

function TabBar({
  active,
  onChange,
  actionCount,
}: {
  active: Tab;
  onChange: (tab: Tab) => void;
  actionCount: number;
}) {
  return (
    <div className="flex border-b border-[#1f2d4e] bg-[#0d1526] flex-none">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`relative flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${
            active === tab.id ? 'text-[#d4a843]' : 'text-[#6b7280] hover:text-[#9ca3af]'
          }`}
        >
          <span className="material-symbols-outlined text-sm">{tab.icon}</span>
          {tab.label}
          {/* Actions count badge */}
          {tab.id === 'actions' && actionCount > 0 && (
            <span className="absolute top-1.5 right-3 min-w-[16px] h-4 bg-[#d4a843] text-[#0a0f1e] text-[9px] font-bold rounded-full flex items-center justify-center px-1">
              {actionCount > 99 ? '99+' : actionCount}
            </span>
          )}
          {/* Active indicator */}
          {active === tab.id && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#d4a843] rounded-t" />
          )}
        </button>
      ))}
    </div>
  );
}

// ─── Chat Tab ───────────────────────────────────────────────────────────────────

interface ChatTabProps {
  messages: UIMessage[];
  isLoading: boolean;
  error: Error | null | undefined;
  input: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onSelectPrompt: (prompt: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
}

function ChatTab({
  messages,
  isLoading,
  error,
  input,
  onInputChange,
  onSend,
  onSelectPrompt,
  onKeyDown,
  inputRef,
  messagesEndRef,
}: ChatTabProps) {
  return (
    <>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
        {messages.length === 0 ? (
          <SuggestedPrompts onSelectPrompt={onSelectPrompt} />
        ) : (
          <>
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            {isLoading && (
              <div className="flex gap-2">
                <div className="w-7 h-7 rounded-full bg-[#1b2a5e] flex items-center justify-center flex-none">
                  <span className="material-symbols-outlined text-[#d4a843] text-sm">
                    smart_toy
                  </span>
                </div>
                <div className="bg-[#111827] border border-[#1f2d4e] rounded-xl rounded-tl-sm px-3 py-2">
                  <div className="flex gap-1 items-center">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="w-1.5 h-1.5 bg-[#d4a843] rounded-full animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
            {error && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-xs text-red-400">
                <span className="material-symbols-outlined text-sm">error</span>
                {error.message}
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-[#1f2d4e] p-3 bg-[#0d1526] flex-none">
        <div className="relative">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Ask anything… (Enter to send)"
            rows={1}
            disabled={isLoading}
            className="w-full bg-[#0f1729] border border-[#1f2d4e] focus:border-[#d4a843] focus:ring-1 focus:ring-[#d4a843] text-white placeholder-[#374151] rounded-xl px-3 py-2.5 pr-12 text-xs resize-none outline-none transition-colors leading-relaxed max-h-24 overflow-y-auto"
            style={{ minHeight: '40px' }}
          />
          <button
            type="button"
            onClick={onSend}
            disabled={!input.trim() || isLoading}
            className="absolute right-2 bottom-2 w-8 h-8 bg-[#d4a843] hover:bg-[#e4c06a] disabled:bg-[#1f2d4e] disabled:cursor-not-allowed rounded-lg flex items-center justify-center transition-colors"
          >
            <span className="material-symbols-outlined text-[#0a0f1e] text-sm">
              {isLoading ? 'hourglass_empty' : 'send'}
            </span>
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Chat Panel ─────────────────────────────────────────────────────────────────

function ChatPanel({ onClose }: { onClose: () => void }) {
  const transport = useMemo(() => new DefaultChatTransport({ api: '/api/admin/chat' }), []);

  const { messages, sendMessage, status, error } = useChat({ transport });
  const [input, setInput] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('chat');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const isLoading = status === 'streaming' || status === 'submitted';

  // Count tool calls across all messages for the Actions badge
  const actionCount = useMemo(() => {
    let count = 0;
    for (const msg of messages) {
      if (msg.role !== 'assistant') continue;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const part of (msg.parts as any[]) ?? []) {
        const t = part.type as string;
        if (t?.startsWith('tool-') || t === 'tool-invocation') count++;
      }
    }
    return count;
  }, [messages]);

  useEffect(() => {
    if (activeTab === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeTab]);

  useEffect(() => {
    if (activeTab === 'chat') {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [activeTab]);

  useEffect(() => {
    // Focus on open
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  function handleSend() {
    const text = input.trim();
    if (!text || isLoading) return;
    sendMessage({ text });
    setInput('');
    // Switch to chat tab if not already there
    setActiveTab('chat');
  }

  function handleSelectPrompt(prompt: string) {
    setInput('');
    setActiveTab('chat');
    sendMessage({ text: prompt });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === 'Escape') {
      onClose();
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[#1f2d4e] bg-[#0d1526] flex-none">
        <div className="w-8 h-8 rounded-full bg-[#1b2a5e] flex items-center justify-center">
          <span className="material-symbols-outlined text-[#d4a843] text-base">smart_toy</span>
        </div>
        <div className="flex-1">
          <p
            className="text-white font-semibold text-sm"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            AI Assistant
          </p>
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
            <span className="text-[#10b981] text-[10px]">Online</span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-[#6b7280] hover:text-white transition-colors p-1 rounded-lg hover:bg-[#1f2d4e]"
        >
          <span className="material-symbols-outlined text-base">close</span>
        </button>
      </div>

      {/* Tab Bar */}
      <TabBar active={activeTab} onChange={setActiveTab} actionCount={actionCount} />

      {/* Tab Content */}
      {activeTab === 'chat' && (
        <ChatTab
          messages={messages}
          isLoading={isLoading}
          error={error}
          input={input}
          onInputChange={setInput}
          onSend={handleSend}
          onSelectPrompt={handleSelectPrompt}
          onKeyDown={handleKeyDown}
          inputRef={inputRef}
          messagesEndRef={messagesEndRef}
        />
      )}

      {activeTab === 'history' && (
        <div className="flex-1 overflow-hidden">
          <ChatHistory
            onNewChat={() => {
              setActiveTab('chat');
              setTimeout(() => inputRef.current?.focus(), 150);
            }}
          />
        </div>
      )}

      {activeTab === 'actions' && (
        <div className="flex-1 overflow-hidden">
          <ActionLog messages={messages} agentInfo={AGENT_INFO} />
        </div>
      )}
    </div>
  );
}

// ─── ChatWidget ─────────────────────────────────────────────────────────────────

export default function ChatWidget({ isOpen, onToggle }: ChatWidgetProps) {
  // Close on Escape key globally when panel is open
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        onToggle();
      }
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onToggle]);

  return (
    <>
      {/* Floating button (shown when closed) */}
      {!isOpen && (
        <button
          onClick={onToggle}
          aria-label="Open AI Assistant"
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-[#d4a843] hover:bg-[#e4c06a] shadow-lg shadow-[#d4a843]/20 flex items-center justify-center transition-all hover:scale-105 z-[60]"
        >
          <span className="material-symbols-outlined text-[#0a0f1e] text-2xl">smart_toy</span>
        </button>
      )}

      {/* Panel */}
      {isOpen && (
        <div
          className="fixed bottom-6 right-6 w-[400px] h-[600px] bg-[#0a0f1e] border border-[#1f2d4e] rounded-2xl shadow-2xl shadow-black/60 flex flex-col overflow-hidden z-[60]"
          role="dialog"
          aria-modal="true"
          aria-label="AI Assistant"
        >
          <ChatPanel onClose={onToggle} />
        </div>
      )}
    </>
  );
}
