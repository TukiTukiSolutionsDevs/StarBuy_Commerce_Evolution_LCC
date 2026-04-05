'use client';

/**
 * Admin Customers Page
 *
 * Placeholder — customer management via AI chat assistant.
 */

export default function CustomersPage() {
  function openChat() {
    window.dispatchEvent(new CustomEvent('open-admin-chat'));
  }

  const CAPABILITIES = [
    { icon: 'people', label: 'Search customers', prompt: 'Search for a customer by name or email' },
    { icon: 'person_add', label: 'Create customer', prompt: 'I want to create a new customer' },
    { icon: 'manage_accounts', label: 'Update customer', prompt: 'Update a customer\'s information' },
    { icon: 'email', label: 'Email lookup', prompt: 'Find a customer by their email address' },
    { icon: 'history', label: 'Order history', prompt: 'Show purchase history for a customer' },
    { icon: 'person_remove', label: 'Delete customer', prompt: 'Remove a customer from the store' },
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1
          className="text-2xl font-bold text-white"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          Customers
        </h1>
        <p className="text-[#6b7280] text-sm mt-1">
          Manage customers via the AI assistant
        </p>
      </div>

      {/* Main callout */}
      <div className="bg-[#111827] border border-[#1f2d4e] rounded-2xl p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#1b2a5e]/40 border border-[#1b2a5e] flex items-center justify-center mx-auto mb-5">
          <span className="material-symbols-outlined text-[#6b8cff] text-3xl">people</span>
        </div>
        <h2
          className="text-xl font-bold text-white mb-3"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          Customer Management via AI Assistant
        </h2>
        <p className="text-[#9ca3af] text-sm max-w-md mx-auto mb-6 leading-relaxed">
          Customer management is handled through the AI assistant. Search
          customers, view purchase history, create or update accounts — just ask.
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
              <div className="w-9 h-9 rounded-lg bg-[#1b2a5e]/30 flex items-center justify-center flex-none">
                <span className="material-symbols-outlined text-[#6b8cff] text-base">{cap.icon}</span>
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
