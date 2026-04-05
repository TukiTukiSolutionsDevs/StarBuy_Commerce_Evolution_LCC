'use client';

/**
 * Admin Orders Page
 *
 * Placeholder — order management via AI chat assistant.
 */

import { useState } from 'react';

export default function OrdersPage() {
  const [, forceUpdate] = useState(0);

  // Trigger the AI chat by dispatching a custom event that ChatWidget can listen to
  // For now, we just reload to the admin page where the chat can be opened
  function openChat() {
    // Dispatch a custom event to open the chat widget
    window.dispatchEvent(new CustomEvent('open-admin-chat'));
    // Small visual feedback
    forceUpdate((n) => n + 1);
  }

  const CAPABILITIES = [
    { icon: 'receipt_long', label: 'View recent orders', prompt: 'Show me the 10 most recent orders' },
    { icon: 'local_shipping', label: 'Pending fulfillments', prompt: 'Show me all open/unfulfilled orders' },
    { icon: 'search', label: 'Search by customer', prompt: 'Find orders for a specific customer' },
    { icon: 'currency_exchange', label: 'Process refunds', prompt: 'I need to refund an order' },
    { icon: 'cancel', label: 'Cancel an order', prompt: 'I need to cancel an order' },
    { icon: 'package_2', label: 'Fulfillment status', prompt: 'Show me orders waiting to be fulfilled' },
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1
          className="text-2xl font-bold text-white"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          Orders
        </h1>
        <p className="text-[#6b7280] text-sm mt-1">
          Manage orders via the AI assistant
        </p>
      </div>

      {/* Main callout */}
      <div className="bg-[#111827] border border-[#1f2d4e] rounded-2xl p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#d4a843]/10 border border-[#d4a843]/20 flex items-center justify-center mx-auto mb-5">
          <span className="material-symbols-outlined text-[#d4a843] text-3xl">smart_toy</span>
        </div>
        <h2
          className="text-xl font-bold text-white mb-3"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          Order Management via AI Assistant
        </h2>
        <p className="text-[#9ca3af] text-sm max-w-md mx-auto mb-6 leading-relaxed">
          Order management is handled through the AI assistant. Ask it to search
          orders, process fulfillments, issue refunds, and cancel orders — all in
          natural language.
        </p>
        <button
          onClick={openChat}
          className="inline-flex items-center gap-2 bg-[#d4a843] hover:bg-[#e4c06a] text-[#0a0f1e] font-semibold rounded-xl px-6 py-3 text-sm transition-colors"
        >
          <span className="material-symbols-outlined text-base">chat</span>
          Open AI Assistant
        </button>
      </div>

      {/* Capabilities */}
      <div>
        <h3
          className="text-white font-semibold mb-4"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          What you can do
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {CAPABILITIES.map((cap) => (
            <div
              key={cap.label}
              className="bg-[#111827] border border-[#1f2d4e] rounded-xl p-4 flex items-start gap-3"
            >
              <div className="w-9 h-9 rounded-lg bg-[#1f2d4e] flex items-center justify-center flex-none">
                <span className="material-symbols-outlined text-[#d4a843] text-base">{cap.icon}</span>
              </div>
              <div>
                <p className="text-[#e5e7eb] text-sm font-medium">{cap.label}</p>
                <p className="text-[#6b7280] text-xs mt-0.5 leading-relaxed line-clamp-2">
                  &ldquo;{cap.prompt}&rdquo;
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
