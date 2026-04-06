'use client';

/**
 * Admin Layout
 *
 * Full-screen fixed overlay that hides the storefront shell (Header + Footer).
 * Contains the persistent sidebar with navigation and floating chat widget.
 */

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { ToastProvider } from '@/components/ui/ToastProvider';

const ChatWidget = dynamic(() => import('@/components/admin/ChatWidget'), {
  ssr: false,
});

const CommandPalette = dynamic(() => import('@/components/admin/CommandPalette'), {
  ssr: false,
});

// ─── Navigation ────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard', icon: 'dashboard', exact: true },
  { href: '/admin/products', label: 'Products', icon: 'inventory_2', exact: false },
  { href: '/admin/inventory', label: 'Inventory', icon: 'warehouse', exact: false },
  { href: '/admin/collections', label: 'Collections', icon: 'collections_bookmark', exact: false },
  { href: '/admin/orders', label: 'Orders', icon: 'receipt_long', exact: false },
  { href: '/admin/customers', label: 'Customers', icon: 'people', exact: false },
  { href: '/admin/discounts', label: 'Discounts', icon: 'local_offer', exact: false },
  { href: '/admin/activity', label: 'Activity', icon: 'notifications_active', exact: false },
  { href: '/admin/automations', label: 'Automations', icon: 'electric_bolt', exact: false },
  { href: '/admin/market-research', label: 'Market Intel', icon: 'query_stats', exact: false },
  { href: '/admin/settings', label: 'Settings', icon: 'settings', exact: false },
] as const;

// ─── Sidebar Nav Item ──────────────────────────────────────────────────────────

function NavItem({
  href,
  label,
  icon,
  collapsed,
  active,
}: {
  href: string;
  label: string;
  icon: string;
  exact?: boolean;
  collapsed: boolean;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all group relative ${
        active
          ? 'bg-[#d4a843]/10 text-[#d4a843] border border-[#d4a843]/20'
          : 'text-[#9ca3af] hover:text-white hover:bg-[#1b2a5e]/40'
      }`}
    >
      <span
        className={`material-symbols-outlined text-xl flex-none transition-colors ${
          active ? 'text-[#d4a843]' : 'text-[#4b5563] group-hover:text-[#d4a843]'
        }`}
      >
        {icon}
      </span>
      {!collapsed && (
        <span className={`font-medium ${active ? 'text-[#d4a843]' : ''}`}>{label}</span>
      )}
      {active && !collapsed && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#d4a843]" />}
    </Link>
  );
}

// ─── Main Layout ───────────────────────────────────────────────────────────────

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  // Listen for the custom event dispatched by Orders/Customers pages
  useEffect(() => {
    function handleOpenChat() {
      setChatOpen(true);
    }
    window.addEventListener('open-admin-chat', handleOpenChat);
    return () => window.removeEventListener('open-admin-chat', handleOpenChat);
  }, []);

  async function handleLogout() {
    await fetch('/api/admin/auth', { method: 'DELETE' });
    router.push('/admin/login');
  }

  function isActive(href: string, exact: boolean) {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  }

  return (
    <ToastProvider>
      <div className="fixed inset-0 z-50 bg-[#0a0f1e] flex overflow-hidden">
        {/* ── Sidebar ─────────────────────────────────────────────────── */}
        <aside
          className={`flex-none flex flex-col bg-[#0d1526] border-r border-[#1f2d4e] transition-all duration-300 ${
            collapsed ? 'w-[60px]' : 'w-64'
          }`}
        >
          {/* Logo */}
          <div
            className={`flex items-center gap-3 border-b border-[#1f2d4e] h-16 transition-all ${
              collapsed ? 'px-3 justify-center' : 'px-4'
            }`}
          >
            <Image
              src="/StarBuy.png"
              alt="StarBuy"
              width={40}
              height={40}
              className="h-10 w-auto flex-none object-contain"
            />
            {!collapsed && (
              <span
                className="text-white font-bold text-sm tracking-wide"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                Admin
              </span>
            )}
          </div>

          {/* Nav */}
          <nav className={`flex-1 overflow-y-auto py-4 space-y-1 ${collapsed ? 'px-2' : 'px-3'}`}>
            {/* Search button */}
            <button
              onClick={() => window.dispatchEvent(new Event('open-command-palette'))}
              title={collapsed ? 'Search (⌘K)' : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all group mb-2 text-[#9ca3af] hover:text-white hover:bg-[#1b2a5e]/40`}
            >
              <span className="material-symbols-outlined text-xl flex-none text-[#4b5563] group-hover:text-[#d4a843] transition-colors">
                search
              </span>
              {!collapsed && (
                <>
                  <span className="font-medium flex-1 text-left">Search</span>
                  <kbd className="px-1.5 py-0.5 rounded bg-[#1f2d4e] text-[#4b5563] font-mono text-[10px] flex-none">
                    ⌘K
                  </kbd>
                </>
              )}
            </button>

            {!collapsed && (
              <p className="text-[#374151] text-[10px] font-semibold uppercase tracking-widest mb-3 px-3 mt-2">
                Navigation
              </p>
            )}
            {NAV_ITEMS.map((item) => (
              <NavItem
                key={item.href}
                {...item}
                collapsed={collapsed}
                active={isActive(item.href, item.exact)}
              />
            ))}
          </nav>

          {/* Bottom actions */}
          <div
            className={`border-t border-[#1f2d4e] py-4 space-y-1 ${collapsed ? 'px-2' : 'px-3'}`}
          >
            {/* AI Chat toggle */}
            <button
              onClick={() => setChatOpen((v) => !v)}
              title={collapsed ? 'AI Assistant' : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all group ${
                chatOpen
                  ? 'bg-[#d4a843]/10 text-[#d4a843] border border-[#d4a843]/20'
                  : 'text-[#9ca3af] hover:text-white hover:bg-[#1b2a5e]/40'
              }`}
            >
              <span
                className={`material-symbols-outlined text-xl flex-none transition-colors ${
                  chatOpen ? 'text-[#d4a843]' : 'text-[#4b5563] group-hover:text-[#d4a843]'
                }`}
              >
                smart_toy
              </span>
              {!collapsed && <span className="font-medium">AI Assistant</span>}
            </button>

            {/* Logout */}
            <button
              onClick={handleLogout}
              title={collapsed ? 'Sign out' : undefined}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-[#6b7280] hover:text-[#ef4444] hover:bg-[#ef4444]/5 transition-all group"
            >
              <span className="material-symbols-outlined text-xl flex-none group-hover:text-[#ef4444] transition-colors">
                logout
              </span>
              {!collapsed && <span>Sign out</span>}
            </button>
          </div>

          {/* Collapse toggle */}
          <div className={`pb-4 ${collapsed ? 'px-2' : 'px-3'}`}>
            <button
              onClick={() => setCollapsed((v) => !v)}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-[#374151] hover:text-[#6b7280] hover:bg-[#1f2d4e]/50 transition-all text-xs"
            >
              <span className="material-symbols-outlined text-base">
                {collapsed ? 'chevron_right' : 'chevron_left'}
              </span>
              {!collapsed && <span>Collapse</span>}
            </button>
          </div>
        </aside>

        {/* ── Main Content ────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Top bar */}
          <header className="flex-none flex items-center gap-3 px-6 h-16 border-b border-[#1f2d4e] bg-[#0d1526]">
            <div className="flex-1" />
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#10b981]/10 border border-[#10b981]/20">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
              <span className="text-[#10b981] text-xs font-medium">Store Online</span>
            </div>
          </header>

          {/* Page content */}
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>

        {/* ── Floating Chat Widget ─────────────────────────────────────── */}
        <ChatWidget isOpen={chatOpen} onToggle={() => setChatOpen((v) => !v)} />

        {/* ── Command Palette ──────────────────────────────────────────── */}
        <CommandPalette />
      </div>
    </ToastProvider>
  );
}
