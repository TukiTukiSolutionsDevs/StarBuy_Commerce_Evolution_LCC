'use client';

/**
 * Admin Chat Widget — Floating panel
 *
 * A floating chat button + panel overlay.
 * The panel reuses the chat logic from AdminChat but in a compact widget format.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import type { UIMessage } from 'ai';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface ChatWidgetProps {
  isOpen: boolean;
  onToggle: () => void;
}

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
        <span className="material-symbols-outlined text-sm">
          {isUser ? 'person' : 'smart_toy'}
        </span>
      </div>

      <div className={`flex-1 max-w-[85%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-1.5`}>
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

// ─── Chat Panel ─────────────────────────────────────────────────────────────────

function ChatPanel({ onClose }: { onClose: () => void }) {
  const transport = useMemo(
    () => new DefaultChatTransport({ api: '/api/admin/chat' }),
    []
  );

  const { messages, sendMessage, status, error } = useChat({ transport });
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const isLoading = status === 'streaming' || status === 'submitted';

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    // Focus on open
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  function handleSend() {
    const text = input.trim();
    if (!text || isLoading) return;
    sendMessage({ text });
    setInput('');
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
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[#1f2d4e] bg-[#0d1526]">
        <div className="w-8 h-8 rounded-full bg-[#1b2a5e] flex items-center justify-center">
          <span className="material-symbols-outlined text-[#d4a843] text-base">smart_toy</span>
        </div>
        <div className="flex-1">
          <p className="text-white font-semibold text-sm" style={{ fontFamily: 'var(--font-heading)' }}>
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

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4 py-8">
            <span className="material-symbols-outlined text-[#d4a843] text-4xl mb-3">smart_toy</span>
            <p className="text-white font-semibold text-sm mb-1">AI Store Assistant</p>
            <p className="text-[#6b7280] text-xs leading-relaxed">
              Ask me to search products, check inventory, manage orders, and more.
            </p>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            {isLoading && (
              <div className="flex gap-2">
                <div className="w-7 h-7 rounded-full bg-[#1b2a5e] flex items-center justify-center flex-none">
                  <span className="material-symbols-outlined text-[#d4a843] text-sm">smart_toy</span>
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
      <div className="border-t border-[#1f2d4e] p-3 bg-[#0d1526]">
        <div className="relative">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything… (Enter to send)"
            rows={1}
            disabled={isLoading}
            className="w-full bg-[#0f1729] border border-[#1f2d4e] focus:border-[#d4a843] focus:ring-1 focus:ring-[#d4a843] text-white placeholder-[#374151] rounded-xl px-3 py-2.5 pr-12 text-xs resize-none outline-none transition-colors leading-relaxed max-h-24 overflow-y-auto"
            style={{ minHeight: '40px' }}
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="absolute right-2 bottom-2 w-8 h-8 bg-[#d4a843] hover:bg-[#e4c06a] disabled:bg-[#1f2d4e] disabled:cursor-not-allowed rounded-lg flex items-center justify-center transition-colors"
          >
            <span className="material-symbols-outlined text-[#0a0f1e] text-sm">
              {isLoading ? 'hourglass_empty' : 'send'}
            </span>
          </button>
        </div>
      </div>
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
