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
  { icon: 'warehouse', label: 'Check inventory', prompt: 'Show me inventory levels for all products' },
  { icon: 'sell', label: 'Create discount', prompt: 'I want to create a new discount code' },
  { icon: 'people', label: 'Recent customers', prompt: 'Show me the most recent customers' },
  { icon: 'local_shipping', label: 'Pending orders', prompt: 'Show me all open/unfulfilled orders' },
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
  const isDestructive = ['deleteProduct', 'cancelOrder', 'refundOrder', 'deleteCustomer', 'removeFromCollection'].includes(toolCall.toolName);
  const resultData = toolCall.output;
  const isSuccess = !!resultData && typeof resultData === 'object' && !('error' in (resultData as Record<string, unknown>));

  return (
    <div
      className={`rounded-xl border text-xs overflow-hidden ${
        isDestructive
          ? 'border-red-500/20 bg-red-500/5'
          : 'border-[#1f2d4e] bg-[#0f1729]'
      }`}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-white/5 transition-colors"
      >
        <span
          className={`material-symbols-outlined text-base ${
            isDestructive ? 'text-red-400' : 'text-[#d4a843]'
          }`}
        >
          {icon}
        </span>
        <span className="text-[#9ca3af] font-mono flex-1">
          {toolCall.toolName}
        </span>
        {isSuccess ? (
          <span className="material-symbols-outlined text-[#10b981] text-sm">check_circle</span>
        ) : (
          <span className="material-symbols-outlined text-red-400 text-sm">error</span>
        )}
        <span className="material-symbols-outlined text-[#374151] text-sm">
          {expanded ? 'expand_less' : 'expand_more'}
        </span>
      </button>

      {expanded && (
        <div className="border-t border-[#1f2d4e] px-3 py-2">
          <div className="text-[#6b7280] mb-1">Input:</div>
          <pre className="text-[#9ca3af] whitespace-pre-wrap break-all font-mono leading-relaxed">
            {JSON.stringify(toolCall.args, null, 2)}
          </pre>
          {resultData !== undefined && (
            <>
              <div className="text-[#6b7280] mt-2 mb-1">Output:</div>
              <pre className="text-[#9ca3af] whitespace-pre-wrap break-all font-mono leading-relaxed text-[10px]">
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
        className={`flex-none w-8 h-8 rounded-full flex items-center justify-center text-sm ${
          isUser ? 'bg-[#d4a843] text-[#0a0f1e]' : 'bg-[#1b2a5e] text-[#d4a843]'
        }`}
      >
        <span className="material-symbols-outlined text-base">
          {isUser ? 'person' : 'smart_toy'}
        </span>
      </div>

      <div className={`flex-1 max-w-[80%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-2`}>
        {textContent && (
          <div
            className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
              isUser
                ? 'bg-[#d4a843] text-[#0a0f1e] font-medium rounded-tr-sm'
                : 'bg-[#111827] text-[#e5e7eb] rounded-tl-sm border border-[#1f2d4e]'
            }`}
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
                  className="flex items-center gap-2 bg-[#0f1729] border border-[#1f2d4e] rounded-xl px-3 py-2 text-xs"
                >
                  <span className="material-symbols-outlined text-[#d4a843] text-base animate-pulse">
                    hourglass_empty
                  </span>
                  <span className="text-[#6b7280] font-mono">{toolName}</span>
                  <span className="text-[#374151]">running...</span>
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
  const transport = useMemo(
    () => new DefaultChatTransport({ api: '/api/admin/chat' }),
    []
  );

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
    <div className="flex h-screen bg-[#0a0f1e] overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`flex-none flex flex-col bg-[#0d1526] border-r border-[#1f2d4e] transition-all duration-300 ${
          sidebarOpen ? 'w-64' : 'w-0 overflow-hidden'
        }`}
      >
        <div className="flex items-center gap-3 px-4 py-5 border-b border-[#1f2d4e]">
          <img src="/StarBuy.png" alt="StarBuy" className="h-9 w-auto flex-none" />
          <div className="text-[#6b7280] text-xs">Admin</div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-1">
          <p className="text-[#374151] text-xs font-medium uppercase tracking-widest mb-3">Quick Actions</p>
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.label}
              onClick={() => handleQuickAction(action.prompt)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-[#9ca3af] hover:text-white hover:bg-[#1b2a5e]/40 transition-colors text-left group"
            >
              <span className="material-symbols-outlined text-[#374151] group-hover:text-[#d4a843] text-base transition-colors">
                {action.icon}
              </span>
              {action.label}
            </button>
          ))}
        </div>

        <div className="p-4 border-t border-[#1f2d4e]">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-[#6b7280] hover:text-red-400 hover:bg-red-400/5 transition-colors"
          >
            <span className="material-symbols-outlined text-base">logout</span>
            Sign out
          </button>
        </div>
      </aside>

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center gap-3 px-4 py-3 border-b border-[#1f2d4e] bg-[#0d1526]">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-[#6b7280] hover:text-white transition-colors">
            <span className="material-symbols-outlined">{sidebarOpen ? 'menu_open' : 'menu'}</span>
          </button>
          <div className="flex-1">
            <h1 className="text-white font-semibold text-sm" style={{ fontFamily: 'var(--font-heading)' }}>Chat</h1>
          </div>
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-[#10b981]/10 border border-[#10b981]/20">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
            <span className="text-[#10b981] text-xs">Online</span>
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
                  <div className="w-8 h-8 rounded-full bg-[#1b2a5e] flex items-center justify-center flex-none">
                    <span className="material-symbols-outlined text-[#d4a843] text-base">smart_toy</span>
                  </div>
                  <div className="bg-[#111827] border border-[#1f2d4e] rounded-2xl rounded-tl-sm px-4 py-3">
                    <div className="flex gap-1 items-center">
                      {[0, 1, 2].map((i) => (
                        <span key={i} className="w-1.5 h-1.5 bg-[#d4a843] rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
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

        <div className="border-t border-[#1f2d4e] bg-[#0d1526] p-4">
          <div className="relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything about your store... (Enter to send, Shift+Enter for newline)"
              rows={1}
              disabled={isLoading}
              className="w-full bg-[#0f1729] border border-[#1f2d4e] focus:border-[#d4a843] focus:ring-1 focus:ring-[#d4a843] text-white placeholder-[#374151] rounded-2xl px-4 py-3 pr-14 text-sm resize-none outline-none transition-colors leading-relaxed max-h-32 overflow-y-auto"
              style={{ minHeight: '48px' }}
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="absolute right-3 bottom-3 w-9 h-9 bg-[#d4a843] hover:bg-[#e4c06a] disabled:bg-[#1f2d4e] disabled:cursor-not-allowed rounded-xl flex items-center justify-center transition-colors"
            >
              <span className="material-symbols-outlined text-[#0a0f1e] text-base">
                {isLoading ? 'hourglass_empty' : 'send'}
              </span>
            </button>
          </div>
          <p className="text-[#374151] text-xs mt-2 text-center">
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
      <img src="/StarBuy.png" alt="StarBuy" className="h-20 w-auto mb-6" />
      <h2 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
        Admin Assistant
      </h2>
      <p className="text-[#6b7280] text-sm max-w-md mb-8 leading-relaxed">
        Your AI-powered store manager. Ask me to search products, manage orders,
        check inventory, create discounts, and more.
      </p>
      <div className="grid grid-cols-2 gap-3 w-full max-w-lg">
        {QUICK_ACTIONS.slice(0, 4).map((action) => (
          <button
            key={action.label}
            onClick={() => onAction(action.prompt)}
            className="flex items-center gap-3 bg-[#111827] hover:bg-[#1b2a5e]/40 border border-[#1f2d4e] hover:border-[#d4a843]/30 rounded-xl px-4 py-3 text-left transition-all group"
          >
            <span className="material-symbols-outlined text-[#d4a843] text-xl group-hover:scale-110 transition-transform">
              {action.icon}
            </span>
            <span className="text-[#9ca3af] group-hover:text-white text-sm transition-colors">
              {action.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
