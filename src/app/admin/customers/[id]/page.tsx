'use client';

/**
 * Admin Customer Profile Page
 *
 * Full customer detail with editable tags, contact info, address, and stats.
 */

import { use, useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { useToast } from '@/components/ui/useToast';
import type { AdminCustomer } from '@/lib/shopify/admin/tools/customers';

// ─── Types ───────────────────────────────────────────────────────────────────────

type PageProps = { params: Promise<{ id: string }> };

// ─── Helpers ──────────────────────────────────────────────────────────────────────

const AVATAR_COLORS = ['#d4a843', '#10b981', '#6b8cff', '#ef4444', '#8b5cf6', '#f59e0b'];

function getInitials(first: string | null, last: string | null): string {
  const f = (first ?? '').trim();
  const l = (last ?? '').trim();
  if (!f && !l) return '?';
  return `${f.charAt(0)}${l.charAt(0)}`.toUpperCase();
}

function getAvatarColor(name: string): string {
  const code = name.charCodeAt(0) || 0;
  return AVATAR_COLORS[code % AVATAR_COLORS.length];
}

function formatMoney(amount: string, currency: string): string {
  const n = parseFloat(amount);
  if (isNaN(n)) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(n);
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(iso));
}

// ─── State Badge ──────────────────────────────────────────────────────────────────

const STATE_STYLE: Record<string, { color: string; label: string }> = {
  ENABLED: { color: '#10b981', label: 'Enabled' },
  DISABLED: { color: '#ef4444', label: 'Disabled' },
  INVITED: { color: '#d4a843', label: 'Invited' },
  DECLINED: { color: '#6b7280', label: 'Declined' },
};

function StateBadge({ state }: { state: string }) {
  const s = STATE_STYLE[state] ?? STATE_STYLE.DECLINED;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
      style={{ backgroundColor: `${s.color}18`, color: s.color }}
    >
      <span className="w-1.5 h-1.5 rounded-full flex-none" style={{ backgroundColor: s.color }} />
      {s.label}
    </span>
  );
}

// ─── Card shell ───────────────────────────────────────────────────────────────────

function Card({
  title,
  icon,
  children,
  action,
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="bg-[#111827] border border-[#1f2d4e] rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#1f2d4e]">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[#6b7280] text-base">{icon}</span>
          <h3
            className="font-semibold text-sm"
            style={{ fontFamily: 'var(--font-heading)', color: '#ffffff' }}
          >
            {title}
          </h3>
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// ─── Info Row ─────────────────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-[#1f2d4e]/50 last:border-0">
      <span className="text-[#6b7280] text-xs flex-none">{label}</span>
      <span className="text-[#e5e7eb] text-xs text-right">{value}</span>
    </div>
  );
}

// ─── Tags Manager ─────────────────────────────────────────────────────────────────

function TagsManager({
  initial,
  customerId,
  onSuccess,
}: {
  initial: string[];
  customerId: string;
  onSuccess: (tags: string[]) => void;
}) {
  const { toast } = useToast();
  const [tags, setTags] = useState<string[]>(initial);
  const [input, setInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function addTag() {
    const t = input.trim();
    if (!t || tags.includes(t)) {
      setInput('');
      return;
    }
    const next = [...tags, t];
    setTags(next);
    setInput('');
    setDirty(true);
  }

  function removeTag(tag: string) {
    const next = tags.filter((t) => t !== tag);
    setTags(next);
    setDirty(true);
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/customers/${customerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags }),
      });
      const data = (await res.json()) as { customer?: AdminCustomer; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Save failed');
      setDirty(false);
      onSuccess(tags);
      toast.success('Tags updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save tags');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      {/* Existing tags */}
      <div className="flex flex-wrap gap-2 min-h-[36px]">
        {tags.length === 0 && <span className="text-[#374151] text-xs italic">No tags</span>}
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-[#1f2d4e] text-[#9ca3af] group"
          >
            {tag}
            <button
              onClick={() => removeTag(tag)}
              className="ml-0.5 text-[#6b7280] hover:text-[#ef4444] transition-colors"
              title={`Remove "${tag}"`}
            >
              <span className="material-symbols-outlined text-sm leading-none">close</span>
            </button>
          </span>
        ))}
      </div>

      {/* Add input */}
      <div className="flex gap-2">
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              addTag();
            }
          }}
          placeholder="Add a tag…"
          className="flex-1 bg-[#0f1729] border border-[#1f2d4e] focus:border-[#d4a843] focus:ring-1 focus:ring-[#d4a843] text-white placeholder-[#374151] rounded-xl px-3 py-2 text-xs outline-none transition-colors"
        />
        <button
          onClick={addTag}
          disabled={!input.trim()}
          className="px-3 py-2 rounded-xl bg-[#1f2d4e] hover:bg-[#263d6e] disabled:opacity-40 text-[#9ca3af] hover:text-white text-xs font-medium transition-all"
        >
          Add
        </button>
      </div>

      {/* Save button — only visible when dirty */}
      {dirty && (
        <button
          onClick={save}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 bg-[#d4a843] hover:bg-[#e4c06a] disabled:bg-[#1f2d4e] text-[#0a0f1e] font-semibold rounded-xl py-2 text-xs transition-colors"
        >
          {saving ? (
            <>
              <span className="material-symbols-outlined text-sm animate-spin">
                progress_activity
              </span>
              Saving…
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-sm">save</span>
              Save Tags
            </>
          )}
        </button>
      )}
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────────

function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <div style={style} className={`bg-[#1f2d4e] rounded animate-pulse ${className ?? ''}`} />;
}

// ─── Page ─────────────────────────────────────────────────────────────────────────

export default function CustomerProfilePage({ params }: PageProps) {
  const { id } = use(params);

  const [customer, setCustomer] = useState<AdminCustomer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchCustomer = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/customers/${id}`);
      const data = (await res.json()) as { customer?: AdminCustomer; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Not found');
      setCustomer(data.customer ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load customer');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchCustomer();
  }, [fetchCustomer]);

  // ─────────────────────────────────────────────────────────────────────────────

  if (error) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <span className="material-symbols-outlined text-[#ef4444] text-5xl mb-4">person_off</span>
          <p className="text-[#ef4444] font-semibold mb-1">Customer not found</p>
          <p className="text-[#6b7280] text-sm mb-6">{error}</p>
          <Link
            href="/admin/customers"
            className="flex items-center gap-2 text-[#d4a843] hover:text-[#e4c06a] text-sm transition-colors"
          >
            <span className="material-symbols-outlined text-base">arrow_back</span>
            Back to customers
          </Link>
        </div>
      </div>
    );
  }

  const initials = customer ? getInitials(customer.firstName, customer.lastName) : '?';
  const avatarBg = customer
    ? getAvatarColor((customer.firstName ?? customer.email ?? '').trim())
    : '#6b8cff';
  const fullName = customer
    ? [customer.firstName, customer.lastName].filter(Boolean).join(' ') || customer.email
    : '';

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/admin/customers"
          className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#111827] border border-[#1f2d4e] text-[#6b7280] hover:text-white hover:border-[#374151] transition-all"
        >
          <span className="material-symbols-outlined text-xl">arrow_back</span>
        </Link>

        {loading ? (
          <div className="flex items-center gap-3">
            <Skeleton className="w-12 h-12 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="w-40 h-5" />
              <Skeleton className="w-56 h-3" />
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center flex-none text-sm font-bold text-[#0a0f1e]"
              style={{ backgroundColor: avatarBg }}
            >
              {initials}
            </div>
            <div>
              <h1
                className="text-xl font-bold"
                style={{ fontFamily: 'var(--font-heading)', color: '#ffffff' }}
              >
                {fullName}
              </h1>
              <p className="text-[#6b7280] text-sm">{customer?.email}</p>
            </div>
          </div>
        )}

        {customer && (
          <div className="ml-auto">
            <StateBadge state={customer.state} />
          </div>
        )}
      </div>

      {/* 2-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left — 3 cols */}
        <div className="lg:col-span-3 space-y-5">
          {/* Contact Info */}
          <Card title="Contact Info" icon="contact_page">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex justify-between py-2 border-b border-[#1f2d4e]/50">
                    <Skeleton className="w-16 h-3" />
                    <Skeleton className="w-32 h-3" />
                  </div>
                ))}
              </div>
            ) : customer ? (
              <div>
                <InfoRow label="Full name" value={fullName} />
                <InfoRow
                  label="Email"
                  value={
                    <span className="flex items-center gap-1.5">
                      {customer.email}
                      {customer.verifiedEmail && (
                        <span
                          className="inline-flex items-center gap-0.5 text-[#10b981] text-[10px]"
                          title="Verified email"
                        >
                          <span className="material-symbols-outlined text-xs">verified</span>
                          Verified
                        </span>
                      )}
                    </span>
                  }
                />
                <InfoRow label="Phone" value={customer.phone ?? '—'} />
                <InfoRow label="Member since" value={formatDate(customer.createdAt)} />
                <InfoRow label="Last updated" value={formatDate(customer.updatedAt)} />
              </div>
            ) : null}
          </Card>

          {/* Default Address */}
          <Card title="Default Address" icon="location_on">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex justify-between py-2 border-b border-[#1f2d4e]/50">
                    <Skeleton className="w-16 h-3" />
                    <Skeleton className="w-32 h-3" />
                  </div>
                ))}
              </div>
            ) : customer?.defaultAddress ? (
              <div>
                <InfoRow label="Street" value={customer.defaultAddress.address1 ?? '—'} />
                <InfoRow label="City" value={customer.defaultAddress.city ?? '—'} />
                <InfoRow label="Country" value={customer.defaultAddress.country ?? '—'} />
              </div>
            ) : (
              <p className="text-[#374151] text-xs italic">No address on file</p>
            )}
          </Card>

          {/* Tags */}
          <Card title="Tags" icon="label">
            {loading ? (
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton
                    key={i}
                    className="h-6 rounded-full"
                    style={{ width: `${50 + i * 20}px` } as React.CSSProperties}
                  />
                ))}
              </div>
            ) : customer ? (
              <TagsManager
                initial={customer.tags}
                customerId={id}
                onSuccess={(tags) => {
                  setCustomer((prev) => (prev ? { ...prev, tags } : prev));
                }}
              />
            ) : null}
          </Card>
        </div>

        {/* Right — 2 cols */}
        <div className="lg:col-span-2 space-y-5">
          {/* Stats */}
          <Card title="Purchase Stats" icon="bar_chart">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex justify-between py-2 border-b border-[#1f2d4e]/50">
                    <Skeleton className="w-16 h-3" />
                    <Skeleton className="w-24 h-3" />
                  </div>
                ))}
              </div>
            ) : customer ? (
              <div>
                <InfoRow
                  label="Orders placed"
                  value={
                    <span className="text-[#d4a843] font-semibold">{customer.ordersCount}</span>
                  }
                />
                <InfoRow
                  label="Total spent"
                  value={
                    <span className="text-[#10b981] font-semibold">
                      {formatMoney(
                        customer.totalSpentV2.amount,
                        customer.totalSpentV2.currencyCode,
                      )}
                    </span>
                  }
                />
                <InfoRow
                  label="Customer type"
                  value={customer.ordersCount > 1 ? 'Returning' : 'New'}
                />
              </div>
            ) : null}
          </Card>

          {/* Quick Actions */}
          <Card title="Actions" icon="settings">
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-9 rounded-xl" />
                <Skeleton className="h-9 rounded-xl" />
              </div>
            ) : customer ? (
              <div className="space-y-2">
                <a
                  href={`https://admin.shopify.com/store/customers/${id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 w-full px-4 py-2.5 rounded-xl bg-[#1f2d4e] hover:bg-[#263d6e] text-[#9ca3af] hover:text-white text-xs font-medium transition-all"
                >
                  <span className="material-symbols-outlined text-sm">open_in_new</span>
                  View in Shopify Admin
                </a>
                <Link
                  href="/admin/customers"
                  className="flex items-center gap-2 w-full px-4 py-2.5 rounded-xl bg-[#1f2d4e] hover:bg-[#263d6e] text-[#9ca3af] hover:text-white text-xs font-medium transition-all"
                >
                  <span className="material-symbols-outlined text-sm">people</span>
                  Back to all customers
                </Link>
              </div>
            ) : null}
          </Card>

          {/* Shopify GID */}
          {customer && (
            <div className="bg-[#0a0f1e] border border-[#1f2d4e]/50 rounded-xl p-3">
              <p className="text-[#374151] text-[10px] font-mono break-all">{customer.id}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
