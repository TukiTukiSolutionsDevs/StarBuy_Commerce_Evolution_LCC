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
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all group relative"
      style={
        active
          ? {
              backgroundColor: 'var(--admin-brand-bg)',
              color: 'var(--admin-brand)',
              border: '1px solid var(--admin-brand-border)',
            }
          : { color: 'var(--admin-text-secondary)' }
      }
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.backgroundColor = 'var(--admin-bg-hover)';
          e.currentTarget.style.color = 'var(--admin-text)';
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.backgroundColor = 'transparent';
          e.currentTarget.style.color = 'var(--admin-text-secondary)';
        }
      }}
    >
      <span
        className="material-symbols-outlined text-xl flex-none transition-colors"
        style={{ color: active ? 'var(--admin-brand)' : 'var(--admin-text-muted)' }}
      >
        {icon}
      </span>
      {!collapsed && (
        <span className="font-medium" style={active ? { color: 'var(--admin-brand)' } : undefined}>
          {label}
        </span>
      )}
      {active && !collapsed && (
        <span
          className="ml-auto w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: 'var(--admin-brand)' }}
        />
      )}
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
        <div
          className="fixed inset-0 z-50 flex overflow-hidden"
          style={{ backgroundColor: 'var(--admin-bg)' }}
        >
          {/* ── Mobile backdrop ──────────────────────────────────────────── */}
          {mobileOpen && (
            <div
              className="fixed inset-0 z-[51] lg:hidden"
              style={{ backgroundColor: 'var(--admin-overlay)' }}
              onClick={() => setMobileOpen(false)}
              aria-hidden="true"
            />
          )}

          {/* ── Sidebar ─────────────────────────────────────────────────── */}
          <aside
            className={[
              'flex-none flex flex-col border-r transition-all duration-300',
              'fixed inset-y-0 left-0 z-[52] lg:relative lg:z-auto',
              mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
              collapsed ? 'w-[60px]' : 'w-64',
            ].join(' ')}
            style={{
              backgroundColor: 'var(--admin-bg-sidebar)',
              borderColor: 'var(--admin-border)',
            }}
          >
            {/* Logo */}
            <div
              className={`flex items-center border-b h-16 transition-all ${
                collapsed ? 'px-3 justify-center' : 'px-4 gap-2.5'
              }`}
              style={{ borderColor: 'var(--admin-border)' }}
            >
              <Image
                src="/logo.png"
                alt="StarBuy"
                width={collapsed ? 32 : 36}
                height={collapsed ? 32 : 36}
                className={`${collapsed ? 'h-8' : 'h-9'} w-auto flex-none object-contain transition-all`}
              />
              {!collapsed && (
                <div className="flex flex-col leading-none">
                  <span
                    className="font-bold text-sm tracking-wide"
                    style={{ fontFamily: 'var(--font-heading)', color: 'var(--admin-text)' }}
                  >
                    StarBuy
                  </span>
                  <span
                    className="text-[10px] font-medium uppercase tracking-widest mt-0.5"
                    style={{ color: 'var(--admin-text-muted)' }}
                  >
                    Admin
                  </span>
                </div>
              )}
            </div>

            {/* Nav */}
            <nav className={`flex-1 overflow-y-auto py-4 ${collapsed ? 'px-2' : 'px-3'}`}>
              {/* Search button */}
              <button
                onClick={() => window.dispatchEvent(new Event('open-command-palette'))}
                title={collapsed ? 'Search (⌘K)' : undefined}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all group mb-3"
                style={{ color: 'var(--admin-text-secondary)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--admin-bg-hover)';
                  e.currentTarget.style.color = 'var(--admin-text)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'var(--admin-text-secondary)';
                }}
              >
                <span
                  className="material-symbols-outlined text-xl flex-none transition-colors"
                  style={{ color: 'var(--admin-text-muted)' }}
                >
                  search
                </span>
                {!collapsed && (
                  <>
                    <span className="font-medium flex-1 text-left">Search</span>
                    <kbd
                      className="px-1.5 py-0.5 rounded font-mono text-[10px] flex-none"
                      style={{
                        backgroundColor: 'color-mix(in srgb, var(--admin-border) 60%, transparent)',
                        color: 'var(--admin-text-muted)',
                      }}
                    >
                      ⌘K
                    </kbd>
                  </>
                )}
              </button>

              {/* Grouped navigation */}
              {NAV_GROUPS.map((group, gi) => (
                <div key={group.label} className={gi > 0 ? 'mt-4' : ''}>
                  {!collapsed && (
                    <p
                      className="text-[10px] font-semibold uppercase tracking-widest mb-2 px-3"
                      style={{ color: 'var(--admin-text-disabled)' }}
                    >
                      {group.label}
                    </p>
                  )}
                  {collapsed && gi > 0 && (
                    <div
                      className="mx-2 mb-2 border-t"
                      style={{ borderColor: 'var(--admin-border)' }}
                    />
                  )}
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
              className={`py-4 space-y-1 ${collapsed ? 'px-2' : 'px-3'}`}
              style={{ borderTop: '1px solid var(--admin-border)' }}
            >
              {/* AI Chat toggle */}
              <button
                onClick={() => setChatOpen((v) => !v)}
                title={collapsed ? 'AI Assistant' : undefined}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all group"
                style={
                  chatOpen
                    ? {
                        backgroundColor: 'var(--admin-brand-bg)',
                        color: 'var(--admin-brand)',
                        border: '1px solid var(--admin-brand-border)',
                      }
                    : { color: 'var(--admin-text-secondary)' }
                }
                onMouseEnter={(e) => {
                  if (!chatOpen) {
                    e.currentTarget.style.backgroundColor = 'var(--admin-bg-hover)';
                    e.currentTarget.style.color = 'var(--admin-text)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!chatOpen) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = 'var(--admin-text-secondary)';
                  }
                }}
              >
                <span
                  className="material-symbols-outlined text-xl flex-none transition-colors"
                  style={{ color: chatOpen ? 'var(--admin-brand)' : 'var(--admin-text-muted)' }}
                >
                  smart_toy
                </span>
                {!collapsed && <span className="font-medium">AI Assistant</span>}
              </button>

              {/* Logout */}
              <button
                onClick={handleLogout}
                title={collapsed ? 'Sign out' : undefined}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all group"
                style={{ color: 'var(--admin-text-muted)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--admin-error)';
                  e.currentTarget.style.backgroundColor = 'var(--admin-error-bg)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--admin-text-muted)';
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <span className="material-symbols-outlined text-xl flex-none transition-colors">
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
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl transition-all text-xs"
                style={{ color: 'var(--admin-text-disabled)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--admin-text-muted)';
                  e.currentTarget.style.backgroundColor = 'var(--admin-bg-hover)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--admin-text-disabled)';
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
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
            <header
              className="flex-none flex items-center gap-3 px-4 lg:px-6 h-16"
              style={{
                borderBottom: '1px solid var(--admin-border)',
                backgroundColor: 'var(--admin-bg-sidebar)',
              }}
            >
              {/* Mobile hamburger */}
              <button
                onClick={() => setMobileOpen(true)}
                className="lg:hidden p-2 rounded-xl transition-colors"
                style={{ color: 'var(--admin-text-muted)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--admin-text)';
                  e.currentTarget.style.backgroundColor = 'var(--admin-bg-hover)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--admin-text-muted)';
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
                aria-label="Open navigation menu"
              >
                <span className="material-symbols-outlined text-xl">menu</span>
              </button>

              {/* Page title */}
              <h2
                className="text-sm font-semibold truncate flex-1"
                style={{ fontFamily: 'var(--font-heading)', color: 'var(--admin-text)' }}
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
              <div
                className="flex items-center gap-2 px-3 py-1.5 rounded-full"
                style={{
                  backgroundColor: 'var(--admin-success-bg)',
                  border: '1px solid color-mix(in srgb, var(--admin-success) 20%, transparent)',
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: 'var(--admin-success)' }}
                />
                <span className="text-xs font-medium" style={{ color: 'var(--admin-success)' }}>
                  Store Online
                </span>
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
