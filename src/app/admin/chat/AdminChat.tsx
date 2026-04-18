'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { UIMessage } from 'ai';

// ─── Quick Actions ─────────────────────────────────────────────────────────────

const QUICK_ACTIONS = [
  { icon: 'inventory_2', label: 'Show all products', prompt: 'Show me all products in the store' },
  { icon: 'add_box', label: 'Create product', prompt: 'I want to create a new product' },
  { icon: 'receipt_long', label: 'Recent orders', prompt: 'Show me the 10 most recent orders' },
  {
    icon: 'warehouse',
    label: 'Check inventory',
    prompt: 'Show me inventory levels for all products',
  },
  { icon: 'sell', label: 'Create discount', prompt: 'I want to create a new discount code' },
  { icon: 'people', label: 'Recent customers', prompt: 'Show me the most recent customers' },
  {
    icon: 'local_shipping',
    label: 'Pending orders',
    prompt: 'Show me all open/unfulfilled orders',
  },
  { icon: 'collections_bookmark', label: 'List collections', prompt: 'Show me all collections' },
] as const;

// ─── Tool Result Cards ─────────────────────────────────────────────────────────

type ToolCallResult = {
  type: string;
  toolCallId: string;
  toolName: string;
  args: Record<string, unknown>;
  state: string;
  output?: unknown;
};

function ToolCallCard({ toolCall }: { toolCall: ToolCallResult }) {
  const [expanded, setExpanded] = useState(false);

  const toolIcons: Record<string, string> = {
    searchProducts: 'inventory_2',
    getProduct: 'inventory_2',
    createProduct: 'add_box',
    updateProduct: 'edit',
    deleteProduct: 'delete',
    setProductPrice: 'sell',
    searchOrders: 'receipt_long',
    getOrder: 'receipt_long',
    cancelOrder: 'cancel',
    createFulfillment: 'local_shipping',
    refundOrder: 'currency_exchange',
    searchCustomers: 'people',
    getCustomer: 'person',
    createCustomer: 'person_add',
    updateCustomer: 'manage_accounts',
    deleteCustomer: 'person_remove',
    getInventory: 'warehouse',
    setInventory: 'inventory',
    listCollections: 'collections_bookmark',
    addToCollection: 'playlist_add',
    removeFromCollection: 'playlist_remove',
    createDiscount: 'sell',
    listDiscounts: 'discount',
  };

  const icon = toolIcons[toolCall.toolName] ?? 'build';
  const isDestructive = [
    'deleteProduct',
    'cancelOrder',
    'refundOrder',
    'deleteCustomer',
    'removeFromCollection',
  ].includes(toolCall.toolName);
  const resultData = toolCall.output;
  const isSuccess =
    !!resultData &&
    typeof resultData === 'object' &&
    !('error' in (resultData as Record<string, unknown>));

  return (
    <div
      className="rounded-xl border text-xs overflow-hidden"
      style={
        isDestructive
          ? {
              borderColor: 'color-mix(in srgb, var(--admin-error) 20%, transparent)',
              backgroundColor: 'color-mix(in srgb, var(--admin-error) 5%, transparent)',
            }
          : { borderColor: 'var(--admin-border)', backgroundColor: 'var(--admin-bg-input)' }
      }
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-white/5 transition-colors"
      >
        <span
          className="material-symbols-outlined text-base"
          style={{ color: isDestructive ? 'var(--admin-error)' : 'var(--admin-brand)' }}
        >
          {icon}
        </span>
        <span className="font-mono flex-1" style={{ color: 'var(--admin-text-secondary)' }}>
          {toolCall.toolName}
        </span>
        {isSuccess ? (
          <span
            className="material-symbols-outlined text-sm"
            style={{ color: 'var(--admin-success)' }}
          >
            check_circle
          </span>
        ) : (
          <span
            className="material-symbols-outlined text-sm"
            style={{ color: 'var(--admin-error)' }}
          >
            error
          </span>
        )}
        <span
          className="material-symbols-outlined text-sm"
          style={{ color: 'var(--admin-text-disabled)' }}
        >
          {expanded ? 'expand_less' : 'expand_more'}
        </span>
      </button>

      {expanded && (
        <div className="px-3 py-2" style={{ borderTop: '1px solid var(--admin-border)' }}>
          <div style={{ color: 'var(--admin-text-muted)' }} className="mb-1">
            Input:
          </div>
          <pre
            className="whitespace-pre-wrap break-all font-mono leading-relaxed"
            style={{ color: 'var(--admin-text-secondary)' }}
          >
            {JSON.stringify(toolCall.args, null, 2)}
          </pre>
          {resultData !== undefined && (
            <>
              <div style={{ color: 'var(--admin-text-muted)' }} className="mt-2 mb-1">
                Output:
              </div>
              <pre
                className="whitespace-pre-wrap break-all font-mono leading-relaxed text-[10px]"
                style={{ color: 'var(--admin-text-secondary)' }}
              >
                {JSON.stringify(resultData, null, 2)}
              </pre>
            </>
          )}
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
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      <div
        className="flex-none w-8 h-8 rounded-full flex items-center justify-center text-sm"
        style={
          isUser
            ? { backgroundColor: 'var(--admin-brand)', color: 'var(--admin-bg)' }
            : { backgroundColor: 'var(--admin-bg-hover)', color: 'var(--admin-brand)' }
        }
      >
        <span className="material-symbols-outlined text-base">
          {isUser ? 'person' : 'smart_toy'}
        </span>
      </div>

      <div
        className={`flex-1 max-w-[80%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-2`}
      >
        {textContent && (
          <div
            className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
              isUser ? 'font-medium rounded-tr-sm' : 'rounded-tl-sm'
            }`}
            style={
              isUser
                ? { backgroundColor: 'var(--admin-brand)', color: 'var(--admin-bg)' }
                : {
                    backgroundColor: 'var(--admin-bg-card)',
                    color: 'var(--admin-text-body)',
                    borderWidth: 1,
                    borderStyle: 'solid',
                    borderColor: 'var(--admin-border)',
                  }
            }
          >
            <MessageContent content={textContent} />
          </div>
        )}

        {toolParts.length > 0 && (
          <div className="w-full space-y-2">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {toolParts.map((part: any, i: number) => {
              const toolName = part.toolName ?? part.type?.replace('tool-', '') ?? 'unknown';
              const toolCallId = part.toolCallId ?? `${toolName}-${i}`;
              const state = part.state ?? 'unknown';

              if (state === 'output-available' || state === 'result') {
                return (
                  <ToolCallCard
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
                  className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs"
                  style={{
                    backgroundColor: 'var(--admin-bg-input)',
                    borderWidth: 1,
                    borderStyle: 'solid',
                    borderColor: 'var(--admin-border)',
                  }}
                >
                  <span
                    className="material-symbols-outlined text-base animate-pulse"
                    style={{ color: 'var(--admin-brand)' }}
                  >
                    hourglass_empty
                  </span>
                  <span className="font-mono" style={{ color: 'var(--admin-text-muted)' }}>
                    {toolName}
                  </span>
                  <span style={{ color: 'var(--admin-text-disabled)' }}>running...</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function MessageContent({ content }: { content: string }) {
  const lines = content.split('\n');
  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        if (!line) return <br key={i} />;
        const parts = line.split(/(\*\*[^*]+\*\*)/g);
        return (
          <p key={i}>
            {parts.map((part, j) => {
              if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={j}>{part.slice(2, -2)}</strong>;
              }
              return <span key={j}>{part}</span>;
            })}
          </p>
        );
      })}
    </div>
  );
}

// ─── Main Chat ──────────────────────────────────────────────────────────────────

export default function AdminChat() {
  const transport = useMemo(() => new DefaultChatTransport({ api: '/api/admin/chat' }), []);

  const { messages, sendMessage, status, error } = useChat({ transport });

  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const isLoading = status === 'streaming' || status === 'submitted';

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function handleQuickAction(prompt: string) {
    setInput(prompt);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  async function handleLogout() {
    await fetch('/api/admin/auth', { method: 'DELETE' });
    window.location.href = '/admin/login';
  }

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
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: 'var(--admin-bg)' }}>
      {/* Sidebar */}
      <aside
        className={`flex-none flex flex-col transition-all duration-300 ${
          sidebarOpen ? 'w-64' : 'w-0 overflow-hidden'
        }`}
        style={{
          backgroundColor: 'var(--admin-bg-sidebar)',
          borderRight: '1px solid var(--admin-border)',
        }}
      >
        <div
          className="flex items-center gap-3 px-4 py-5"
          style={{ borderBottom: '1px solid var(--admin-border)' }}
        >
          <img src="/logo.png" alt="StarBuy" className="h-9 w-auto flex-none" />
          <div className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
            Admin
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-1">
          <p
            className="text-xs font-medium uppercase tracking-widest mb-3"
            style={{ color: 'var(--admin-text-disabled)' }}
          >
            Quick Actions
          </p>
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.label}
              onClick={() => handleQuickAction(action.prompt)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors text-left group"
              style={{ color: 'var(--admin-text-secondary)' }}
            >
              <span
                className="material-symbols-outlined text-base transition-colors"
                style={{ color: 'var(--admin-text-disabled)' }}
              >
                {action.icon}
              </span>
              {action.label}
            </button>
          ))}
        </div>

        <div className="p-4" style={{ borderTop: '1px solid var(--admin-border)' }}>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-colors"
            style={{ color: 'var(--admin-text-muted)' }}
          >
            <span className="material-symbols-outlined text-base">logout</span>
            Sign out
          </button>
        </div>
      </aside>

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header
          className="flex items-center gap-3 px-4 py-3"
          style={{
            borderBottom: '1px solid var(--admin-border)',
            backgroundColor: 'var(--admin-bg-sidebar)',
          }}
        >
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="hover:text-white transition-colors"
            style={{ color: 'var(--admin-text-muted)' }}
          >
            <span className="material-symbols-outlined">{sidebarOpen ? 'menu_open' : 'menu'}</span>
          </button>
          <div className="flex-1">
            <h1
              className="font-semibold text-sm"
              style={{ fontFamily: 'var(--font-heading)', color: 'var(--admin-text)' }}
            >
              Chat
            </h1>
          </div>
          <div
            className="flex items-center gap-1 px-2 py-1 rounded-full"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--admin-success) 10%, transparent)',
              borderWidth: 1,
              borderStyle: 'solid',
              borderColor: 'color-mix(in srgb, var(--admin-success) 20%, transparent)',
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: 'var(--admin-success)' }}
            />
            <span className="text-xs" style={{ color: 'var(--admin-success)' }}>
              Online
            </span>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
          {messages.length === 0 ? (
            <WelcomeScreen onAction={handleQuickAction} />
          ) : (
            <>
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}
              {isLoading && (
                <div className="flex gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-none"
                    style={{ backgroundColor: 'var(--admin-bg-hover)' }}
                  >
                    <span
                      className="material-symbols-outlined text-base"
                      style={{ color: 'var(--admin-brand)' }}
                    >
                      smart_toy
                    </span>
                  </div>
                  <div
                    className="rounded-2xl rounded-tl-sm px-4 py-3"
                    style={{
                      backgroundColor: 'var(--admin-bg-card)',
                      borderWidth: 1,
                      borderStyle: 'solid',
                      borderColor: 'var(--admin-border)',
                    }}
                  >
                    <div className="flex gap-1 items-center">
                      {[0, 1, 2].map((i) => (
                        <span
                          key={i}
                          className="w-1.5 h-1.5 rounded-full animate-bounce"
                          style={{
                            backgroundColor: 'var(--admin-brand)',
                            animationDelay: `${i * 0.15}s`,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {error && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">
                  <span className="material-symbols-outlined text-base">error</span>
                  {error.message}
                </div>
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div
          className="p-4"
          style={{
            borderTop: '1px solid var(--admin-border)',
            backgroundColor: 'var(--admin-bg-sidebar)',
          }}
        >
          <div className="relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything about your store... (Enter to send, Shift+Enter for newline)"
              rows={1}
              disabled={isLoading}
              className="w-full rounded-2xl px-4 py-3 pr-14 text-sm resize-none outline-none transition-colors leading-relaxed max-h-32 overflow-y-auto"
              style={{
                backgroundColor: 'var(--admin-bg-input)',
                borderWidth: 1,
                borderStyle: 'solid',
                borderColor: 'var(--admin-border)',
                color: 'var(--admin-text)',
                minHeight: '48px',
              }}
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="absolute right-3 bottom-3 w-9 h-9 disabled:cursor-not-allowed rounded-xl flex items-center justify-center transition-colors"
              style={{ backgroundColor: 'var(--admin-brand)' }}
            >
              <span
                className="material-symbols-outlined text-base"
                style={{ color: 'var(--admin-bg)' }}
              >
                {isLoading ? 'hourglass_empty' : 'send'}
              </span>
            </button>
          </div>
          <p className="text-xs mt-2 text-center" style={{ color: 'var(--admin-text-disabled)' }}>
            AI may make mistakes. Always verify destructive actions before confirming.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Welcome screen ─────────────────────────────────────────────────────────────

function WelcomeScreen({ onAction }: { onAction: (prompt: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center px-4">
      <img src="/logo.png" alt="StarBuy" className="h-20 w-auto mb-6" />
      <h2
        className="text-2xl font-bold mb-2"
        style={{ fontFamily: 'var(--font-heading)', color: 'var(--admin-text)' }}
      >
        Admin Assistant
      </h2>
      <p
        className="text-sm max-w-md mb-8 leading-relaxed"
        style={{ color: 'var(--admin-text-muted)' }}
      >
        Your AI-powered store manager. Ask me to search products, manage orders, check inventory,
        create discounts, and more.
      </p>
      <div className="grid grid-cols-2 gap-3 w-full max-w-lg">
        {QUICK_ACTIONS.slice(0, 4).map((action) => (
          <button
            key={action.label}
            onClick={() => onAction(action.prompt)}
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-left transition-all group"
            style={{
              backgroundColor: 'var(--admin-bg-card)',
              borderWidth: 1,
              borderStyle: 'solid',
              borderColor: 'var(--admin-border)',
            }}
          >
            <span
              className="material-symbols-outlined text-xl group-hover:scale-110 transition-transform"
              style={{ color: 'var(--admin-brand)' }}
            >
              {action.icon}
            </span>
            <span
              className="text-sm transition-colors"
              style={{ color: 'var(--admin-text-secondary)' }}
            >
              {action.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
