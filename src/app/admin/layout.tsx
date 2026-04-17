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
import { AdminThemeProvider } from '@/components/admin/ThemeProvider';
import { ThemeToggle } from '@/components/admin/ThemeToggle';

const ChatWidget = dynamic(() => import('@/components/admin/ChatWidget'), {
  ssr: false,
});

const CommandPalette = dynamic(() => import('@/components/admin/CommandPalette'), {
  ssr: false,
});

const AlertBellWidget = dynamic(
  () => import('@/components/admin/alerts/AlertBell').then((m) => ({ default: m.AlertBell })),
  { ssr: false },
);

// ─── Navigation ────────────────────────────────────────────────────────────────

type NavItem = { href: string; label: string; icon: string; exact: boolean };
type NavGroup = { label: string; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Store',
    items: [
      { href: '/admin', label: 'Dashboard', icon: 'dashboard', exact: true },
      { href: '/admin/products', label: 'Products', icon: 'inventory_2', exact: false },
      { href: '/admin/inventory', label: 'Inventory', icon: 'warehouse', exact: false },
      {
        href: '/admin/collections',
        label: 'Collections',
        icon: 'collections_bookmark',
        exact: false,
      },
      { href: '/admin/orders', label: 'Orders', icon: 'receipt_long', exact: false },
      { href: '/admin/customers', label: 'Customers', icon: 'people', exact: false },
    ],
  },
  {
    label: 'Marketing',
    items: [
      { href: '/admin/discounts', label: 'Discounts', icon: 'local_offer', exact: false },
      { href: '/admin/market-research', label: 'Market Intel', icon: 'query_stats', exact: false },
    ],
  },
  {
    label: 'Automation',
    items: [
      { href: '/admin/automations', label: 'Automations', icon: 'electric_bolt', exact: false },
      {
        href: '/admin/activity',
        label: 'Activity Log',
        icon: 'notifications_active',
        exact: false,
      },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { href: '/admin/trends', label: 'Trend Engine', icon: 'trending_up', exact: false },
      { href: '/admin/explorer', label: 'Market Explorer', icon: 'explore', exact: false },
      { href: '/admin/research', label: 'Research Board', icon: 'science', exact: false },
      { href: '/admin/states', label: 'State Intel', icon: 'map', exact: false },
      { href: '/admin/monitor', label: 'Monitor', icon: 'monitoring', exact: false },
      { href: '/admin/alerts', label: 'Alerts', icon: 'notifications', exact: false },
    ],
  },
  {
    label: 'System',
    items: [{ href: '/admin/settings', label: 'Settings', icon: 'settings', exact: false }],
  },
];

// ─── Sidebar Nav Item ──────────────────────────────────────────────────────────

function NavItem({
  href,
  label,
  icon,
  collapsed,
  active,
  onClick,
}: {
  href: string;
  label: string;
  icon: string;
  exact?: boolean;
  collapsed: boolean;
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
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
  const [mobileOpen, setMobileOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [alertCount, setAlertCount] = useState(0);

  // Close mobile sidebar when clicking a nav link
  function closeMobile() {
    setMobileOpen(false);
  }

  // Fetch unread alert count (poll every 60s)
  useEffect(() => {
    async function fetchAlertCount() {
      try {
        const res = await fetch('/api/admin/alerts/unread-count');
        if (res.ok) {
          const data = await res.json();
          setAlertCount(data.count ?? 0);
        }
      } catch {
        /* silent */
      }
    }
    fetchAlertCount();
    const interval = setInterval(fetchAlertCount, 60_000);
    return () => clearInterval(interval);
  }, []);

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
      <AdminThemeProvider>
        <div className="fixed inset-0 z-50 bg-[#0a0f1e] flex overflow-hidden">
          {/* ── Mobile backdrop ──────────────────────────────────────────── */}
          {mobileOpen && (
            <div
              className="fixed inset-0 z-[51] bg-black/60 lg:hidden"
              onClick={() => setMobileOpen(false)}
              aria-hidden="true"
            />
          )}

          {/* ── Sidebar ─────────────────────────────────────────────────── */}
          <aside
            className={[
              'flex-none flex flex-col bg-[#0d1526] border-r border-[#1f2d4e] transition-all duration-300',
              // Mobile: fixed drawer, hidden by default
              'fixed inset-y-0 left-0 z-[52] lg:relative lg:z-auto',
              mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
              collapsed ? 'w-[60px]' : 'w-64',
            ].join(' ')}
          >
            {/* Logo */}
            <div
              className={`flex items-center gap-3 border-b border-[#1f2d4e] h-16 transition-all ${
                collapsed ? 'px-3 justify-center' : 'px-4'
              }`}
            >
              <Image
                src="/logo.png"
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
            <nav className={`flex-1 overflow-y-auto py-4 ${collapsed ? 'px-2' : 'px-3'}`}>
              {/* Search button */}
              <button
                onClick={() => window.dispatchEvent(new Event('open-command-palette'))}
                title={collapsed ? 'Search (⌘K)' : undefined}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all group mb-3 text-[#9ca3af] hover:text-white hover:bg-[#1b2a5e]/40"
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

              {/* Grouped navigation */}
              {NAV_GROUPS.map((group, gi) => (
                <div key={group.label} className={gi > 0 ? 'mt-4' : ''}>
                  {!collapsed && (
                    <p className="text-[#374151] text-[10px] font-semibold uppercase tracking-widest mb-2 px-3">
                      {group.label}
                    </p>
                  )}
                  {collapsed && gi > 0 && <div className="mx-2 mb-2 border-t border-[#1f2d4e]" />}
                  <div className="space-y-0.5">
                    {group.items.map((item) => (
                      <NavItem
                        key={item.href}
                        {...item}
                        collapsed={collapsed}
                        active={isActive(item.href, item.exact)}
                        onClick={closeMobile}
                      />
                    ))}
                  </div>
                </div>
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
            <header className="flex-none flex items-center gap-3 px-4 lg:px-6 h-16 border-b border-[#1f2d4e] bg-[#0d1526]">
              {/* Mobile hamburger */}
              <button
                onClick={() => setMobileOpen(true)}
                className="lg:hidden p-2 text-[#6b7280] hover:text-white hover:bg-[#1f2d4e] rounded-xl transition-colors"
                aria-label="Open navigation menu"
              >
                <span className="material-symbols-outlined text-xl">menu</span>
              </button>

              {/* Page title */}
              <h2
                className="text-white text-sm font-semibold truncate flex-1"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                {pathname === '/admin'
                  ? 'Dashboard'
                  : (pathname
                      .split('/')
                      .pop()
                      ?.replace(/-/g, ' ')
                      .replace(/^\w/, (c) => c.toUpperCase()) ?? '')}
              </h2>
              <ThemeToggle />
              <AlertBellWidget unreadCount={alertCount} />
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
      </AdminThemeProvider>
    </ToastProvider>
  );
}
