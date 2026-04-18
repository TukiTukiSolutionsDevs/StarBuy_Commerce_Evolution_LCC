'use client';

/**
 * Admin Customer Profile Page — Phase 3
 *
 * Migrated to use admin design tokens and shared UI components.
 * Zero hardcoded hex colors.
 *
 * Full customer detail: contact info, editable notes, marketing consent toggle,
 * addresses, tags manager, purchase stats, quick actions.
 */

import { use, useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { useToast } from '@/components/ui/useToast';
import type { AdminCustomer, AdminAddress } from '@/lib/shopify/admin/tools/customers';

// ─── Types ───────────────────────────────────────────────────────────────────────

type PageProps = { params: Promise<{ id: string }> };

// ─── Helpers ──────────────────────────────────────────────────────────────────────

// Intentional: fixed avatar palette for visual differentiation — not admin theme colors
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

function formatAddressLine(addr: AdminAddress): string {
  const parts = [
    addr.address1,
    addr.address2,
    addr.city,
    addr.province,
    addr.zip,
    addr.country,
  ].filter(Boolean);
  return parts.join(', ') || '—';
}

// ─── State Badge ──────────────────────────────────────────────────────────────────

const STATE_STYLE: Record<string, { token: string; label: string }> = {
  ENABLED: { token: 'var(--admin-success)', label: 'Enabled' },
  DISABLED: { token: 'var(--admin-error)', label: 'Disabled' },
  INVITED: { token: 'var(--admin-brand)', label: 'Invited' },
  DECLINED: { token: 'var(--admin-text-muted)', label: 'Declined' },
};

function StateBadge({ state }: { state: string }) {
  const s = STATE_STYLE[state] ?? STATE_STYLE.DECLINED;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
      style={{ backgroundColor: `color-mix(in srgb, ${s.token} 10%, transparent)`, color: s.token }}
    >
      <span className="w-1.5 h-1.5 rounded-full flex-none" style={{ backgroundColor: s.token }} />
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
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        backgroundColor: 'var(--admin-bg-card)',
        border: '1px solid var(--admin-border)',
      }}
    >
      <div
        className="flex items-center justify-between px-5 py-4"
        style={{ borderBottom: '1px solid var(--admin-border)' }}
      >
        <div className="flex items-center gap-2">
          <span
            className="material-symbols-outlined text-base"
            style={{ color: 'var(--admin-text-muted)' }}
          >
            {icon}
          </span>
          <h3 className="admin-h3">{title}</h3>
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
    <div
      className="flex items-start justify-between gap-4 py-2 last:border-0"
      style={{ borderBottom: '1px solid color-mix(in srgb, var(--admin-border) 50%, transparent)' }}
    >
      <span className="text-xs flex-none" style={{ color: 'var(--admin-text-muted)' }}>
        {label}
      </span>
      <span className="text-xs text-right" style={{ color: 'var(--admin-text-body)' }}>
        {value}
      </span>
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
        {tags.length === 0 && (
          <span className="text-xs italic" style={{ color: 'var(--admin-text-disabled)' }}>
            No tags
          </span>
        )}
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium group"
            style={{
              backgroundColor: 'var(--admin-border)',
              color: 'var(--admin-text-secondary)',
            }}
          >
            {tag}
            <button
              onClick={() => removeTag(tag)}
              className="ml-0.5 transition-colors"
              style={{ color: 'var(--admin-text-muted)' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--admin-error)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--admin-text-muted)')}
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
          className="flex-1 rounded-xl px-3 py-2 text-xs outline-none transition-colors"
          style={
            {
              backgroundColor: 'var(--admin-bg-input)',
              border: '1px solid var(--admin-border)',
              color: 'var(--admin-text)',
              '--tw-placeholder-color': 'var(--admin-text-disabled)',
            } as React.CSSProperties
          }
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'var(--admin-brand)';
            e.currentTarget.style.boxShadow = '0 0 0 1px var(--admin-brand)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'var(--admin-border)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        />
        <button
          onClick={addTag}
          disabled={!input.trim()}
          className="px-3 py-2 rounded-xl disabled:opacity-40 text-xs font-medium transition-all"
          style={{
            backgroundColor: 'var(--admin-border)',
            color: 'var(--admin-text-secondary)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--admin-bg-hover)';
            e.currentTarget.style.color = 'var(--admin-text)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--admin-border)';
            e.currentTarget.style.color = 'var(--admin-text-secondary)';
          }}
        >
          Add
        </button>
      </div>

      {/* Save button — only visible when dirty */}
      {dirty && (
        <button
          onClick={save}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 font-semibold rounded-xl py-2 text-xs transition-colors"
          style={{
            backgroundColor: saving ? 'var(--admin-border)' : 'var(--admin-brand)',
            color: saving ? 'var(--admin-text-secondary)' : 'var(--admin-bg)',
          }}
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

// ─── Notes Editor ─────────────────────────────────────────────────────────────────

function NotesEditor({
  initial,
  customerId,
  onSuccess,
}: {
  initial: string | null;
  customerId: string;
  onSuccess: (note: string) => void;
}) {
  const { toast } = useToast();
  const [note, setNote] = useState(initial ?? '');
  const [saving, setSaving] = useState(false);
  const dirty = note !== (initial ?? '');

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/customers/${customerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note }),
      });
      const data = (await res.json()) as { customer?: AdminCustomer; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Save failed');
      onSuccess(note);
      toast.success('Note updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save note');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Add a note about this customer…"
        rows={4}
        className="w-full rounded-xl px-3 py-2.5 text-sm outline-none transition-colors resize-none"
        style={{
          backgroundColor: 'var(--admin-bg-input)',
          border: '1px solid var(--admin-border)',
          color: 'var(--admin-text)',
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = 'var(--admin-brand)';
          e.currentTarget.style.boxShadow = '0 0 0 1px var(--admin-brand)';
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = 'var(--admin-border)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      />
      {dirty && (
        <button
          onClick={save}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 font-semibold rounded-xl py-2 text-xs transition-colors"
          style={{
            backgroundColor: saving ? 'var(--admin-border)' : 'var(--admin-brand)',
            color: saving ? 'var(--admin-text-secondary)' : 'var(--admin-bg)',
          }}
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
              Save Note
            </>
          )}
        </button>
      )}
    </div>
  );
}

// ─── Marketing Toggle ─────────────────────────────────────────────────────────────

function MarketingToggle({
  initial,
  customerId,
  onSuccess,
}: {
  initial: boolean;
  customerId: string;
  onSuccess: (val: boolean) => void;
}) {
  const { toast } = useToast();
  const [value, setValue] = useState(initial);
  const [saving, setSaving] = useState(false);

  async function toggle() {
    const next = !value;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/customers/${customerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acceptsMarketing: next }),
      });
      const data = (await res.json()) as { customer?: AdminCustomer; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Update failed');
      setValue(next);
      onSuccess(next);
      toast.success(next ? 'Customer subscribed to marketing' : 'Customer unsubscribed');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update marketing preference');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium" style={{ color: 'var(--admin-text-body)' }}>
          {value ? 'Subscribed' : 'Not subscribed'}
        </p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>
          {value
            ? 'Customer receives marketing emails'
            : 'Customer does not receive marketing emails'}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={toggle}
        disabled={saving}
        className="relative w-11 h-6 rounded-full transition-colors flex-none disabled:opacity-50"
        style={{
          backgroundColor: value ? 'var(--admin-success)' : 'var(--admin-border)',
        }}
      >
        {saving ? (
          <span className="absolute inset-0 flex items-center justify-center">
            <span
              className="material-symbols-outlined text-xs animate-spin"
              style={{ color: 'var(--admin-text)' }}
            >
              progress_activity
            </span>
          </span>
        ) : (
          <span
            className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
              value ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        )}
      </button>
    </div>
  );
}

// ─── Address Card ─────────────────────────────────────────────────────────────────

function AddressBlock({ address, isDefault }: { address: AdminAddress; isDefault?: boolean }) {
  const name = [address.firstName, address.lastName].filter(Boolean).join(' ');
  return (
    <div
      className="rounded-xl p-3"
      style={{
        border: `1px solid ${isDefault ? 'var(--admin-brand-border)' : 'var(--admin-border)'}`,
        backgroundColor: isDefault
          ? 'var(--admin-brand-bg)'
          : 'color-mix(in srgb, var(--admin-bg) 50%, transparent)',
      }}
    >
      {isDefault && (
        <span
          className="text-[10px] font-semibold uppercase tracking-wider mb-1 block"
          style={{ color: 'var(--admin-brand)' }}
        >
          Default
        </span>
      )}
      {name && (
        <p className="text-xs font-medium" style={{ color: 'var(--admin-text-body)' }}>
          {name}
        </p>
      )}
      {address.company && (
        <p className="text-xs" style={{ color: 'var(--admin-text-secondary)' }}>
          {address.company}
        </p>
      )}
      <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-secondary)' }}>
        {formatAddressLine(address)}
      </p>
      {address.phone && (
        <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-secondary)' }}>
          {address.phone}
        </p>
      )}
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────────

function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      style={{ backgroundColor: 'var(--admin-border)', ...style }}
      className={`rounded animate-pulse ${className ?? ''}`}
    />
  );
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
          <span
            className="material-symbols-outlined text-5xl mb-4"
            style={{ color: 'var(--admin-error)' }}
          >
            person_off
          </span>
          <p className="font-semibold mb-1" style={{ color: 'var(--admin-error)' }}>
            Customer not found
          </p>
          <p className="text-sm mb-6" style={{ color: 'var(--admin-text-muted)' }}>
            {error}
          </p>
          <Link
            href="/admin/customers"
            className="flex items-center gap-2 text-sm transition-colors"
            style={{ color: 'var(--admin-brand)' }}
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

  // Deduplicate addresses — defaultAddress may already be in addresses[]
  const allAddresses = customer?.addresses ?? [];
  const extraAddresses = customer?.defaultAddress
    ? allAddresses.filter((a) => a.id !== customer.defaultAddress?.id)
    : allAddresses;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 flex-wrap">
        <Link
          href="/admin/customers"
          className="flex items-center justify-center w-9 h-9 rounded-xl transition-all"
          style={{
            backgroundColor: 'var(--admin-bg-card)',
            border: '1px solid var(--admin-border)',
            color: 'var(--admin-text-muted)',
          }}
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
              className="w-12 h-12 rounded-full flex items-center justify-center flex-none text-sm font-bold"
              style={{ backgroundColor: avatarBg, color: 'var(--admin-bg)' }}
            >
              {initials}
            </div>
            <div>
              <h1 className="admin-h1 text-xl">{fullName}</h1>
              <p className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>
                {customer?.email}
              </p>
            </div>
          </div>
        )}

        {customer && (
          <div className="ml-auto flex items-center gap-2">
            {customer.acceptsMarketing && (
              <span
                className="inline-flex items-center gap-1 text-[10px] font-medium px-2.5 py-1 rounded-full"
                style={{
                  backgroundColor: 'var(--admin-success-bg)',
                  color: 'var(--admin-success)',
                }}
              >
                <span className="material-symbols-outlined text-xs">mark_email_read</span>
                Marketing
              </span>
            )}
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
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="flex justify-between py-2"
                    style={{
                      borderBottom:
                        '1px solid color-mix(in srgb, var(--admin-border) 50%, transparent)',
                    }}
                  >
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
                          className="inline-flex items-center gap-0.5 text-[10px]"
                          style={{ color: 'var(--admin-success)' }}
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
                <InfoRow label="Customer since" value={formatDate(customer.createdAt)} />
                <InfoRow label="Last updated" value={formatDate(customer.updatedAt)} />
              </div>
            ) : null}
          </Card>

          {/* Addresses */}
          <Card title="Addresses" icon="location_on">
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-20 rounded-xl" />
                <Skeleton className="h-16 rounded-xl" />
              </div>
            ) : customer?.defaultAddress ? (
              <div className="space-y-2">
                <AddressBlock address={customer.defaultAddress} isDefault />
                {extraAddresses.map((addr) => (
                  <AddressBlock key={addr.id} address={addr} />
                ))}
                {allAddresses.length === 0 && extraAddresses.length === 0 && (
                  <p className="text-xs italic" style={{ color: 'var(--admin-text-disabled)' }}>
                    No additional addresses
                  </p>
                )}
              </div>
            ) : (
              <p className="text-xs italic" style={{ color: 'var(--admin-text-disabled)' }}>
                No address on file
              </p>
            )}
          </Card>

          {/* Notes */}
          <Card title="Notes" icon="sticky_note_2">
            {loading ? (
              <Skeleton className="h-24 rounded-xl" />
            ) : customer ? (
              <NotesEditor
                initial={customer.note}
                customerId={id}
                onSuccess={(note) => setCustomer((prev) => (prev ? { ...prev, note } : prev))}
              />
            ) : null}
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
                  <div
                    key={i}
                    className="flex justify-between py-2"
                    style={{
                      borderBottom:
                        '1px solid color-mix(in srgb, var(--admin-border) 50%, transparent)',
                    }}
                  >
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
                    <span className="font-semibold" style={{ color: 'var(--admin-brand)' }}>
                      {customer.ordersCount}
                    </span>
                  }
                />
                <InfoRow
                  label="Total spent"
                  value={
                    <span className="font-semibold" style={{ color: 'var(--admin-success)' }}>
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

          {/* Email Marketing */}
          <Card title="Email Marketing" icon="mark_email_read">
            {loading ? (
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="w-24 h-3" />
                  <Skeleton className="w-40 h-2.5" />
                </div>
                <Skeleton className="w-11 h-6 rounded-full" />
              </div>
            ) : customer ? (
              <MarketingToggle
                initial={customer.acceptsMarketing}
                customerId={id}
                onSuccess={(val) =>
                  setCustomer((prev) => (prev ? { ...prev, acceptsMarketing: val } : prev))
                }
              />
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
                  className="flex items-center gap-2 w-full px-4 py-2.5 rounded-xl text-xs font-medium transition-all"
                  style={{
                    backgroundColor: 'var(--admin-border)',
                    color: 'var(--admin-text-secondary)',
                  }}
                >
                  <span className="material-symbols-outlined text-sm">open_in_new</span>
                  View in Shopify Admin
                </a>
                <Link
                  href="/admin/customers"
                  className="flex items-center gap-2 w-full px-4 py-2.5 rounded-xl text-xs font-medium transition-all"
                  style={{
                    backgroundColor: 'var(--admin-border)',
                    color: 'var(--admin-text-secondary)',
                  }}
                >
                  <span className="material-symbols-outlined text-sm">people</span>
                  Back to all customers
                </Link>
              </div>
            ) : null}
          </Card>

          {/* Shopify GID */}
          {customer && (
            <div
              className="rounded-xl p-3"
              style={{
                backgroundColor: 'var(--admin-bg)',
                border: '1px solid color-mix(in srgb, var(--admin-border) 50%, transparent)',
              }}
            >
              <p
                className="text-[10px] font-mono break-all"
                style={{ color: 'var(--admin-text-disabled)' }}
              >
                {customer.id}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
