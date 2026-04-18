'use client';

/**
 * Admin Order Detail Page — Phase 3
 *
 * Migrated to use admin design tokens. Zero hardcoded hex colors.
 * Full Shopify Admin parity:
 * - Header with order #, date, status badges, risk indicator
 * - Line items: product, variant, SKU, unit price, qty, total, fulfillment status
 * - Payment summary: subtotal, discounts, shipping, tax, total
 * - Customer: name, email, phone (from customer & order)
 * - Shipping + Billing address (full with province/zip)
 * - Existing fulfillments with tracking info
 * - Timeline of events
 * - Order notes (display)
 * - Tags
 * - Actions: Fulfill (notify toggle, carrier select), Refund (restock type), Cancel, Print
 */

import { useEffect, useCallback, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useToast } from '@/components/ui/useToast';
import type { AdminOrder } from '@/lib/shopify/admin/tools/orders';

// ─── Constants ──────────────────────────────────────────────────────────────────

const PAYMENT_TOKENS: Record<string, string> = {
  PAID: 'var(--admin-success)',
  PENDING: 'var(--admin-brand)',
  PARTIALLY_PAID: 'var(--admin-warning)',
  REFUNDED: 'var(--admin-error)',
  PARTIALLY_REFUNDED: 'var(--admin-warning)',
  VOIDED: 'var(--admin-text-muted)',
};

const FULFILLMENT_TOKENS: Record<string, string> = {
  FULFILLED: 'var(--admin-success)',
  UNFULFILLED: 'var(--admin-warning)',
  PARTIALLY_FULFILLED: 'var(--admin-warning)',
  SCHEDULED: 'var(--admin-accent)',
  ON_HOLD: 'var(--admin-accent)',
};

const CANCEL_REASONS = [
  { value: 'CUSTOMER', label: 'Customer requested' },
  { value: 'FRAUD', label: 'Fraudulent order' },
  { value: 'INVENTORY', label: 'Out of inventory' },
  { value: 'DECLINED', label: 'Payment declined' },
  { value: 'OTHER', label: 'Other' },
] as const;

const SHIPPING_CARRIERS = [
  '',
  'UPS',
  'FedEx',
  'DHL',
  'USPS',
  'Canada Post',
  'Royal Mail',
  'Australia Post',
  'Other',
];

const RESTOCK_TYPES = [
  { value: 'NO_RESTOCK', label: 'No restock' },
  { value: 'RETURN', label: 'Return to stock' },
  { value: 'CANCEL', label: 'Remove from inventory' },
] as const;

// ─── Helpers ────────────────────────────────────────────────────────────────────

function formatCurrency(amount: string, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(parseFloat(amount));
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function addressLines(addr: {
  firstName?: string | null;
  lastName?: string | null;
  address1?: string | null;
  address2?: string | null;
  city?: string | null;
  province?: string | null;
  zip?: string | null;
  country?: string | null;
  phone?: string | null;
}): string[] {
  const lines: string[] = [];
  const name = [addr.firstName, addr.lastName].filter(Boolean).join(' ');
  if (name) lines.push(name);
  if (addr.address1) lines.push(addr.address1);
  if (addr.address2) lines.push(addr.address2);
  const cityLine = [addr.city, addr.province, addr.zip].filter(Boolean).join(', ');
  if (cityLine) lines.push(cityLine);
  if (addr.country) lines.push(addr.country);
  if (addr.phone) lines.push(addr.phone);
  return lines;
}

// ─── Badges ─────────────────────────────────────────────────────────────────────

function StatusBadge({ label, colorToken }: { label: string; colorToken: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
      style={{
        backgroundColor: `color-mix(in srgb, ${colorToken} 8%, transparent)`,
        color: colorToken,
        border: `1px solid color-mix(in srgb, ${colorToken} 20%, transparent)`,
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full flex-none"
        style={{ backgroundColor: colorToken }}
      />
      {label}
    </span>
  );
}

function RiskBadge({ level }: { level: string }) {
  if (!level || level === 'LOW') return null;
  const token = level === 'HIGH' ? 'var(--admin-error)' : 'var(--admin-warning)';
  const icon = level === 'HIGH' ? 'gpp_bad' : 'gpp_maybe';
  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
      style={{
        backgroundColor: `color-mix(in srgb, ${token} 8%, transparent)`,
        color: token,
        border: `1px solid color-mix(in srgb, ${token} 20%, transparent)`,
      }}
    >
      <span className="material-symbols-outlined text-sm">{icon}</span>
      {level === 'HIGH' ? 'High fraud risk' : 'Medium fraud risk'}
    </span>
  );
}

// ─── Modal wrapper ───────────────────────────────────────────────────────────────

function Modal({
  title,
  onClose,
  children,
  maxWidth = 'max-w-lg',
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 backdrop-blur-sm"
      style={{ backgroundColor: 'var(--admin-overlay)' }}
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div
        className={`rounded-2xl w-full ${maxWidth} max-h-[90vh] flex flex-col`}
        style={{
          backgroundColor: 'var(--admin-bg-card)',
          border: '1px solid var(--admin-border)',
          boxShadow: 'var(--admin-shadow-dropdown)',
        }}
      >
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid var(--admin-border)' }}
        >
          <h2 className="admin-h2">{title}</h2>
          <button
            onClick={onClose}
            className="transition-colors p-1 rounded-lg"
            style={{ color: 'var(--admin-text-muted)' }}
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

// ─── Fulfill Modal ───────────────────────────────────────────────────────────────

function FulfillModal({
  orderId,
  onSuccess,
  onClose,
}: {
  orderId: string;
  onSuccess: () => void;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackingUrl, setTrackingUrl] = useState('');
  const [company, setCompany] = useState('');
  const [notifyCustomer, setNotifyCustomer] = useState(true);
  const [loading, setLoading] = useState(false);

  const inputStyle: React.CSSProperties = {
    backgroundColor: 'var(--admin-bg-input)',
    border: '1px solid var(--admin-border)',
    color: 'var(--admin-text)',
  };

  useEffect(() => {
    if (!trackingNumber || !company) return;
    const num = encodeURIComponent(trackingNumber);
    const urls: Record<string, string> = {
      UPS: `https://www.ups.com/track?tracknum=${num}`,
      FedEx: `https://www.fedex.com/fedextrack/?trknbr=${num}`,
      DHL: `https://www.dhl.com/us-en/home/tracking.html?tracking-id=${num}`,
      USPS: `https://tools.usps.com/go/TrackConfirmAction?tLabels=${num}`,
    };
    if (urls[company] && !trackingUrl) {
      setTrackingUrl(urls[company]);
    }
  }, [trackingNumber, company, trackingUrl]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/fulfill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(trackingNumber && { trackingNumber }),
          ...(trackingUrl && { trackingUrl }),
          ...(company && { company }),
          notifyCustomer,
        }),
      });
      const data = (await res.json()) as { fulfillment?: unknown; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Fulfillment failed');
      toast.success('Order fulfilled successfully');
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to fulfill order');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal title="Fulfill Order" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm" style={{ color: 'var(--admin-text-secondary)' }}>
          Mark this order as fulfilled. Tracking information is optional.
        </p>

        <div>
          <label className="admin-label block mb-1.5">Shipping Carrier</label>
          <select
            value={company}
            onChange={(e) => {
              setCompany(e.target.value);
              setTrackingUrl('');
            }}
            className="w-full rounded-xl px-4 py-2.5 text-sm outline-none transition-colors cursor-pointer"
            style={inputStyle}
          >
            {SHIPPING_CARRIERS.map((c) => (
              <option key={c} value={c}>
                {c || '— Select carrier —'}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="admin-label block mb-1.5">Tracking Number</label>
          <input
            value={trackingNumber}
            onChange={(e) => setTrackingNumber(e.target.value)}
            placeholder="e.g. 1Z999AA10123456784"
            className="w-full rounded-xl px-4 py-2.5 text-sm outline-none transition-colors"
            style={inputStyle}
          />
        </div>

        <div>
          <label className="admin-label block mb-1.5">Tracking URL</label>
          <input
            type="url"
            value={trackingUrl}
            onChange={(e) => setTrackingUrl(e.target.value)}
            placeholder="https://track.example.com/…"
            className="w-full rounded-xl px-4 py-2.5 text-sm outline-none transition-colors"
            style={inputStyle}
          />
          {company && trackingNumber && trackingUrl && (
            <p className="text-xs mt-1" style={{ color: 'var(--admin-text-muted)' }}>
              Auto-filled based on carrier
            </p>
          )}
        </div>

        <label
          className="flex items-center gap-3 cursor-pointer p-3 rounded-xl"
          style={{
            backgroundColor: 'var(--admin-bg-input)',
            border: '1px solid var(--admin-border)',
          }}
        >
          <input
            type="checkbox"
            checked={notifyCustomer}
            onChange={(e) => setNotifyCustomer(e.target.checked)}
            className="w-4 h-4 rounded cursor-pointer"
            style={{ accentColor: 'var(--admin-brand)' }}
          />
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--admin-text-body)' }}>
              Notify customer
            </p>
            <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
              Send shipping confirmation email
            </p>
          </div>
        </label>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 rounded-xl py-2.5 text-sm font-medium transition-colors"
            style={{ backgroundColor: 'var(--admin-border)', color: 'var(--admin-text)' }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 font-semibold rounded-xl py-2.5 text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ backgroundColor: 'var(--admin-brand)', color: 'var(--admin-bg)' }}
          >
            {loading ? (
              <>
                <span className="material-symbols-outlined text-base animate-spin">
                  progress_activity
                </span>
                Fulfilling…
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-base">local_shipping</span>
                Fulfill Order
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Cancel Modal ────────────────────────────────────────────────────────────────

function CancelModal({
  orderId,
  onSuccess,
  onClose,
}: {
  orderId: string;
  onSuccess: () => void;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [reason, setReason] = useState<string>('OTHER');
  const [restock, setRestock] = useState(true);
  const [refund, setRefund] = useState(false);
  const [notifyCustomer, setNotifyCustomer] = useState(true);
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);

  const inputStyle: React.CSSProperties = {
    backgroundColor: 'var(--admin-bg-input)',
    border: '1px solid var(--admin-border)',
    color: 'var(--admin-text)',
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!confirmed) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason, restock, refund, notifyCustomer }),
      });
      const data = (await res.json()) as { order?: unknown; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Cancel failed');
      toast.success('Order cancelled successfully');
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to cancel order');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal title="Cancel Order" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div
          className="flex items-start gap-3 p-3 rounded-xl"
          style={{
            backgroundColor: 'var(--admin-error-bg)',
            border: '1px solid color-mix(in srgb, var(--admin-error) 20%, transparent)',
          }}
        >
          <span
            className="material-symbols-outlined text-xl flex-none mt-0.5"
            style={{ color: 'var(--admin-error)' }}
          >
            warning
          </span>
          <p className="text-sm" style={{ color: 'var(--admin-error)' }}>
            Cancelling an order cannot be undone. The order will be permanently cancelled in
            Shopify.
          </p>
        </div>

        <div>
          <label className="admin-label block mb-1.5">
            Reason <span style={{ color: 'var(--admin-error)' }}>*</span>
          </label>
          <select
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full rounded-xl px-4 py-2.5 text-sm outline-none transition-colors cursor-pointer"
            style={inputStyle}
          >
            {CANCEL_REASONS.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-3">
          {[
            {
              checked: restock,
              onChange: setRestock,
              title: 'Restock inventory',
              desc: 'Return items to available inventory',
            },
            {
              checked: refund,
              onChange: setRefund,
              title: 'Issue refund',
              desc: 'Automatically refund payment to customer',
            },
            {
              checked: notifyCustomer,
              onChange: setNotifyCustomer,
              title: 'Notify customer',
              desc: 'Send cancellation email to customer',
            },
          ].map(({ checked, onChange, title, desc }) => (
            <label key={title} className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
                className="w-4 h-4 rounded cursor-pointer"
                style={{ accentColor: 'var(--admin-brand)' }}
              />
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--admin-text-body)' }}>
                  {title}
                </p>
                <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                  {desc}
                </p>
              </div>
            </label>
          ))}
        </div>

        <label
          className="flex items-center gap-3 cursor-pointer p-3 rounded-xl"
          style={{
            backgroundColor: 'var(--admin-error-bg)',
            border: '1px solid color-mix(in srgb, var(--admin-error) 20%, transparent)',
          }}
        >
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="w-4 h-4 rounded cursor-pointer"
            style={{ accentColor: 'var(--admin-error)' }}
          />
          <p className="text-sm font-medium" style={{ color: 'var(--admin-error)' }}>
            I understand this action cannot be undone
          </p>
        </label>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 rounded-xl py-2.5 text-sm font-medium transition-colors"
            style={{ backgroundColor: 'var(--admin-border)', color: 'var(--admin-text)' }}
          >
            Keep Order
          </button>
          <button
            type="submit"
            disabled={loading || !confirmed}
            className="flex-1 rounded-xl py-2.5 text-sm font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ backgroundColor: 'var(--admin-error)', color: 'white' }}
          >
            {loading ? (
              <>
                <span className="material-symbols-outlined text-base animate-spin">
                  progress_activity
                </span>
                Cancelling…
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-base">cancel</span>
                Cancel Order
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Refund Modal ────────────────────────────────────────────────────────────────

type LineItemNode = AdminOrder['lineItems']['edges'][number]['node'];

function RefundModal({
  orderId,
  lineItems,
  currency,
  onSuccess,
  onClose,
}: {
  orderId: string;
  lineItems: LineItemNode[];
  currency: string;
  onSuccess: () => void;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [restockTypes, setRestockTypes] = useState<Record<string, string>>({});
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  const inputStyle: React.CSSProperties = {
    backgroundColor: 'var(--admin-bg-input)',
    border: '1px solid var(--admin-border)',
    color: 'var(--admin-text)',
  };

  function setQty(id: string, val: number, max: number) {
    setQuantities((prev) => ({ ...prev, [id]: Math.min(max, Math.max(0, val)) }));
  }

  const refundTotal = lineItems.reduce((sum, li) => {
    const qty = quantities[li.id] ?? 0;
    const unitPrice = parseFloat(li.originalUnitPriceSet.shopMoney.amount);
    return sum + qty * unitPrice;
  }, 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const selectedItems = lineItems
        .filter((li) => (quantities[li.id] ?? 0) > 0)
        .map((li) => ({
          lineItemId: li.id,
          quantity: quantities[li.id],
          restockType: (restockTypes[li.id] ?? 'NO_RESTOCK') as 'RETURN' | 'CANCEL' | 'NO_RESTOCK',
        }));

      const res = await fetch(`/api/admin/orders/${orderId}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(selectedItems.length > 0 && { lineItems: selectedItems }),
          ...(note && { note }),
        }),
      });
      const data = (await res.json()) as { refund?: unknown; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Refund failed');
      toast.success('Refund processed successfully');
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to process refund');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal title="Issue Refund" onClose={onClose} maxWidth="max-w-xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm" style={{ color: 'var(--admin-text-secondary)' }}>
          Select items to refund. Leave all at 0 to issue a manual/custom refund.
        </p>

        <div className="space-y-2">
          {lineItems.map((li) => {
            const unitMoney = li.originalUnitPriceSet.shopMoney;
            const totalMoney = li.originalTotalSet.shopMoney;
            const qty = quantities[li.id] ?? 0;

            return (
              <div
                key={li.id}
                className="p-3 rounded-xl space-y-2"
                style={{
                  backgroundColor: 'var(--admin-bg-input)',
                  border: '1px solid var(--admin-border)',
                }}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm font-medium truncate"
                      style={{ color: 'var(--admin-text-body)' }}
                    >
                      {li.name}
                    </p>
                    {li.variant && li.variant.title !== 'Default Title' && (
                      <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                        {li.variant.title}
                      </p>
                    )}
                    {(li.sku ?? li.variant?.sku) && (
                      <p className="text-xs" style={{ color: 'var(--admin-text-disabled)' }}>
                        SKU: {li.sku ?? li.variant?.sku}
                      </p>
                    )}
                    <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-secondary)' }}>
                      {formatCurrency(unitMoney.amount, unitMoney.currencyCode)} × {li.quantity} ={' '}
                      {formatCurrency(totalMoney.amount, totalMoney.currencyCode)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-none">
                    <button
                      type="button"
                      onClick={() => setQty(li.id, qty - 1, li.quantity)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                      style={{
                        backgroundColor: 'var(--admin-border)',
                        color: 'var(--admin-text-secondary)',
                      }}
                    >
                      <span className="material-symbols-outlined text-sm">remove</span>
                    </button>
                    <input
                      type="number"
                      min={0}
                      max={li.quantity}
                      value={qty}
                      onChange={(e) =>
                        setQty(li.id, parseInt(e.target.value, 10) || 0, li.quantity)
                      }
                      className="w-12 text-center rounded-lg py-1 text-sm outline-none"
                      style={{
                        backgroundColor: 'var(--admin-border)',
                        color: 'var(--admin-text)',
                        border: '1px solid var(--admin-border)',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setQty(li.id, qty + 1, li.quantity)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                      style={{
                        backgroundColor: 'var(--admin-border)',
                        color: 'var(--admin-text-secondary)',
                      }}
                    >
                      <span className="material-symbols-outlined text-sm">add</span>
                    </button>
                  </div>
                </div>
                {qty > 0 && (
                  <div>
                    <label
                      className="block text-xs font-medium mb-1"
                      style={{ color: 'var(--admin-text-muted)' }}
                    >
                      Restock
                    </label>
                    <select
                      value={restockTypes[li.id] ?? 'NO_RESTOCK'}
                      onChange={(e) =>
                        setRestockTypes((prev) => ({ ...prev, [li.id]: e.target.value }))
                      }
                      className="w-full rounded-lg px-3 py-1.5 text-xs outline-none cursor-pointer"
                      style={{
                        backgroundColor: 'var(--admin-bg-card)',
                        border: '1px solid var(--admin-border)',
                        color: 'var(--admin-text-secondary)',
                      }}
                    >
                      {RESTOCK_TYPES.map(({ value, label }) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {refundTotal > 0 && (
          <div
            className="flex items-center justify-between px-4 py-3 rounded-xl"
            style={{
              backgroundColor: 'var(--admin-success-bg)',
              border: '1px solid color-mix(in srgb, var(--admin-success) 20%, transparent)',
            }}
          >
            <span className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>
              Estimated refund
            </span>
            <span className="text-sm font-bold" style={{ color: 'var(--admin-success)' }}>
              {formatCurrency(refundTotal.toFixed(2), currency)}
            </span>
          </div>
        )}

        <div>
          <label className="admin-label block mb-1.5">Internal note (optional)</label>
          <textarea
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Reason for refund…"
            className="w-full rounded-xl px-4 py-2.5 text-sm outline-none transition-colors resize-none"
            style={inputStyle}
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 rounded-xl py-2.5 text-sm font-medium transition-colors"
            style={{ backgroundColor: 'var(--admin-border)', color: 'var(--admin-text)' }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 font-semibold rounded-xl py-2.5 text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ backgroundColor: 'var(--admin-brand)', color: 'var(--admin-bg)' }}
          >
            {loading ? (
              <>
                <span className="material-symbols-outlined text-base animate-spin">
                  progress_activity
                </span>
                Processing…
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-base">currency_exchange</span>
                Issue Refund
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Info Card ───────────────────────────────────────────────────────────────────

function InfoCard({
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
      style={{ backgroundColor: 'var(--admin-bg-card)', border: '1px solid var(--admin-border)' }}
    >
      <div
        className="flex items-center justify-between gap-2 px-5 py-3.5"
        style={{ borderBottom: '1px solid var(--admin-border)' }}
      >
        <div className="flex items-center gap-2">
          <span
            className="material-symbols-outlined text-base"
            style={{ color: 'var(--admin-brand)' }}
          >
            {icon}
          </span>
          <h3 className="admin-h3">{title}</h3>
        </div>
        {action}
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

// ─── Address Block ───────────────────────────────────────────────────────────────

function AddressBlock({ addr }: { addr: Parameters<typeof addressLines>[0] }) {
  const lines = addressLines(addr);
  if (lines.length === 0)
    return (
      <p className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>
        No address provided
      </p>
    );
  return (
    <div className="space-y-0.5">
      {lines.map((line, i) => (
        <p
          key={i}
          className="text-sm"
          style={{
            color: i === 0 ? 'var(--admin-text-body)' : 'var(--admin-text-secondary)',
            fontWeight: i === 0 ? 500 : 400,
          }}
        >
          {line}
        </p>
      ))}
    </div>
  );
}

// ─── Row helper ─────────────────────────────────────────────────────────────────

function SummaryRow({
  label,
  value,
  bold = false,
  colorToken,
}: {
  label: string;
  value: string;
  bold?: boolean;
  colorToken?: string;
}) {
  return (
    <div className="flex justify-between items-center">
      <span
        className="text-sm"
        style={{
          color: bold ? 'var(--admin-text)' : 'var(--admin-text-muted)',
          fontWeight: bold ? 600 : 400,
        }}
      >
        {label}
      </span>
      <span
        className="text-sm"
        style={{
          color: colorToken ?? (bold ? 'var(--admin-text)' : 'var(--admin-text-secondary)'),
          fontWeight: bold ? 700 : 400,
        }}
      >
        {value}
      </span>
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────────

export default function OrderDetailPage() {
  const params = useParams();
  const orderId = params.id as string;
  const { toast } = useToast();

  const [order, setOrder] = useState<AdminOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [fulfillOpen, setFulfillOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);

  const fetchOrder = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`);
      const data = (await res.json()) as { order?: AdminOrder; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Order not found');
      setOrder(data.order ?? null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load order';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [orderId, toast]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  function handlePrint() {
    window.print();
  }

  const isCancelled = !!order?.cancelledAt;
  const isFulfilled = order?.displayFulfillmentStatus === 'FULFILLED';
  const isRefunded = order?.displayFinancialStatus === 'REFUNDED';
  const lineItems = order?.lineItems.edges.map((e) => e.node) ?? [];

  const subtotal = order?.subtotalPriceSet?.shopMoney;
  const tax = order?.totalTaxSet?.shopMoney;
  const shipping = order?.totalShippingPriceSet?.shopMoney;
  const discounts = order?.totalDiscountsSet?.shopMoney;
  const total = order?.currentTotalPriceSet.shopMoney;
  const currency = total?.currencyCode ?? 'USD';

  const paymentToken = order
    ? (PAYMENT_TOKENS[order.displayFinancialStatus] ?? 'var(--admin-text-muted)')
    : 'var(--admin-text-muted)';
  const fulfillToken = order
    ? (FULFILLMENT_TOKENS[order.displayFulfillmentStatus] ?? 'var(--admin-text-muted)')
    : 'var(--admin-text-muted)';

  const existingFulfillments = order?.fulfillments ?? [];
  const timeline = order?.events?.edges?.map((e) => e.node) ?? [];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start gap-4 flex-wrap">
        <Link
          href="/admin/orders"
          className="flex items-center gap-1.5 text-sm transition-colors mt-1"
          style={{ color: 'var(--admin-text-muted)' }}
        >
          <span className="material-symbols-outlined text-base">arrow_back</span>
          Orders
        </Link>
        <div className="flex-1">
          {loading ? (
            <div
              className="h-8 w-40 rounded-lg animate-pulse"
              style={{ backgroundColor: 'var(--admin-border)' }}
            />
          ) : order ? (
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="admin-h1 text-2xl">Order {order.name}</h1>
              <StatusBadge
                label={order.displayFinancialStatus.replace(/_/g, ' ')}
                colorToken={paymentToken}
              />
              <StatusBadge
                label={order.displayFulfillmentStatus?.replace(/_/g, ' ') ?? 'No status'}
                colorToken={fulfillToken}
              />
              {isCancelled && <StatusBadge label="CANCELLED" colorToken="var(--admin-error)" />}
              {order.riskLevel && order.riskLevel !== 'LOW' && (
                <RiskBadge level={order.riskLevel} />
              )}
            </div>
          ) : null}
          {order && (
            <p className="text-sm mt-1" style={{ color: 'var(--admin-text-muted)' }}>
              {order.createdAt ? formatDate(order.createdAt) : ''}
              {order.cancelledAt && (
                <span className="ml-2" style={{ color: 'var(--admin-error)' }}>
                  · Cancelled {formatDate(order.cancelledAt)}
                  {order.cancelReason && ` (${order.cancelReason.toLowerCase()})`}
                </span>
              )}
            </p>
          )}
        </div>
      </div>

      {/* Action Bar */}
      {!loading && order && (
        <div className="flex items-center gap-3 flex-wrap">
          {!isCancelled && !isFulfilled && (
            <button
              onClick={() => setFulfillOpen(true)}
              className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all"
              style={{
                backgroundColor: 'var(--admin-success-bg)',
                border: '1px solid color-mix(in srgb, var(--admin-success) 30%, transparent)',
                color: 'var(--admin-success)',
              }}
            >
              <span className="material-symbols-outlined text-base">local_shipping</span>
              Fulfill Order
            </button>
          )}
          {!isCancelled && !isRefunded && (
            <button
              onClick={() => setRefundOpen(true)}
              className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all"
              style={{
                backgroundColor: 'var(--admin-brand-bg)',
                border: '1px solid var(--admin-brand-border)',
                color: 'var(--admin-brand)',
              }}
            >
              <span className="material-symbols-outlined text-base">currency_exchange</span>
              Issue Refund
            </button>
          )}
          {!isCancelled && (
            <button
              onClick={() => setCancelOpen(true)}
              className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all"
              style={{
                backgroundColor: 'var(--admin-error-bg)',
                border: '1px solid color-mix(in srgb, var(--admin-error) 30%, transparent)',
                color: 'var(--admin-error)',
              }}
            >
              <span className="material-symbols-outlined text-base">cancel</span>
              Cancel Order
            </button>
          )}
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ml-auto"
            style={{
              backgroundColor: 'var(--admin-bg-card)',
              border: '1px solid var(--admin-border)',
              color: 'var(--admin-text-secondary)',
            }}
          >
            <span className="material-symbols-outlined text-base">print</span>
            Print
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div
          className="flex items-center gap-3 p-4 rounded-xl"
          style={{
            backgroundColor: 'var(--admin-error-bg)',
            border: '1px solid color-mix(in srgb, var(--admin-error) 20%, transparent)',
          }}
        >
          <span
            className="material-symbols-outlined text-xl"
            style={{ color: 'var(--admin-error)' }}
          >
            error
          </span>
          <p className="text-sm" style={{ color: 'var(--admin-error)' }}>
            {error}
          </p>
          <button
            onClick={fetchOrder}
            className="ml-auto text-sm transition-colors"
            style={{ color: 'var(--admin-brand)' }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <div className="xl:col-span-2 space-y-5">
            {[220, 140].map((h, i) => (
              <div
                key={i}
                className="rounded-2xl animate-pulse"
                style={{
                  height: h,
                  backgroundColor: 'var(--admin-bg-card)',
                  border: '1px solid var(--admin-border)',
                }}
              />
            ))}
          </div>
          <div className="space-y-5">
            {[150, 140, 160, 120].map((h, i) => (
              <div
                key={i}
                className="rounded-2xl animate-pulse"
                style={{
                  height: h,
                  backgroundColor: 'var(--admin-bg-card)',
                  border: '1px solid var(--admin-border)',
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Main Content */}
      {!loading && order && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          {/* Left Column */}
          <div className="xl:col-span-2 space-y-5">
            {/* Line Items */}
            <InfoCard title="Line Items" icon="shopping_cart">
              <div className="space-y-0 -mx-5">
                <table className="w-full">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--admin-border)' }}>
                      {[
                        { label: 'Product', align: 'left' },
                        { label: 'Unit Price', align: 'right' },
                        { label: 'Qty', align: 'center' },
                        { label: 'Total', align: 'right' },
                      ].map((h) => (
                        <th
                          key={h.label}
                          className={`text-${h.align} text-xs font-medium uppercase tracking-wider px-5 py-2.5`}
                          style={{ color: 'var(--admin-text-muted)' }}
                        >
                          {h.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.map((li) => {
                      const unitMoney = li.originalUnitPriceSet.shopMoney;
                      const totalMoney = li.originalTotalSet.shopMoney;
                      const sku = li.sku ?? li.variant?.sku;
                      const fToken =
                        FULFILLMENT_TOKENS[li.fulfillmentStatus] ?? 'var(--admin-text-muted)';
                      return (
                        <tr
                          key={li.id}
                          className="transition-colors"
                          style={{ borderBottom: '1px solid var(--admin-border)' }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.backgroundColor = 'var(--admin-bg-hover)')
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.backgroundColor = 'transparent')
                          }
                        >
                          <td className="px-5 py-3.5">
                            <p
                              className="text-sm font-medium"
                              style={{ color: 'var(--admin-text-body)' }}
                            >
                              {li.name}
                            </p>
                            {li.variant && li.variant.title !== 'Default Title' && (
                              <p
                                className="text-xs mt-0.5"
                                style={{ color: 'var(--admin-text-muted)' }}
                              >
                                {li.variant.title}
                              </p>
                            )}
                            {sku && (
                              <p
                                className="text-xs mt-0.5"
                                style={{ color: 'var(--admin-text-disabled)' }}
                              >
                                SKU: {sku}
                              </p>
                            )}
                            {li.fulfillmentStatus && li.fulfillmentStatus !== 'UNFULFILLED' && (
                              <span
                                className="inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-medium"
                                style={{
                                  backgroundColor: `color-mix(in srgb, ${fToken} 12%, transparent)`,
                                  color: fToken,
                                }}
                              >
                                {li.fulfillmentStatus.replace(/_/g, ' ').toLowerCase()}
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <span
                              className="text-sm"
                              style={{ color: 'var(--admin-text-secondary)' }}
                            >
                              {formatCurrency(unitMoney.amount, unitMoney.currencyCode)}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            <span
                              className="text-sm"
                              style={{ color: 'var(--admin-text-secondary)' }}
                            >
                              {li.quantity}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <span
                              className="text-sm font-medium"
                              style={{ color: 'var(--admin-text-body)' }}
                            >
                              {formatCurrency(totalMoney.amount, totalMoney.currencyCode)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </InfoCard>

            {/* Existing Fulfillments */}
            {existingFulfillments.length > 0 && (
              <InfoCard title="Fulfillments" icon="local_shipping">
                <div className="space-y-4">
                  {existingFulfillments.map((f) => {
                    const fToken = FULFILLMENT_TOKENS[f.status] ?? 'var(--admin-text-muted)';
                    return (
                      <div
                        key={f.id}
                        className="p-4 rounded-xl"
                        style={{
                          backgroundColor: 'var(--admin-bg)',
                          border: '1px solid var(--admin-border)',
                        }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span
                            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-semibold"
                            style={{
                              backgroundColor: `color-mix(in srgb, ${fToken} 10%, transparent)`,
                              color: fToken,
                            }}
                          >
                            <span
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ backgroundColor: fToken }}
                            />
                            {f.status}
                          </span>
                          <span className="text-xs" style={{ color: 'var(--admin-text-disabled)' }}>
                            {formatDateShort(f.createdAt)}
                          </span>
                        </div>
                        {f.trackingInfo.map((t, ti) => (
                          <div key={ti} className="space-y-1">
                            {t.company && (
                              <p
                                className="text-xs flex items-center gap-1.5"
                                style={{ color: 'var(--admin-text-secondary)' }}
                              >
                                <span
                                  className="material-symbols-outlined text-xs"
                                  style={{ color: 'var(--admin-text-muted)' }}
                                >
                                  business
                                </span>
                                {t.company}
                              </p>
                            )}
                            {t.number && (
                              <p
                                className="text-xs flex items-center gap-1.5"
                                style={{ color: 'var(--admin-text-secondary)' }}
                              >
                                <span
                                  className="material-symbols-outlined text-xs"
                                  style={{ color: 'var(--admin-text-muted)' }}
                                >
                                  tag
                                </span>
                                {t.url ? (
                                  <a
                                    href={t.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="transition-colors"
                                    style={{ color: 'var(--admin-brand)' }}
                                  >
                                    {t.number}
                                  </a>
                                ) : (
                                  t.number
                                )}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </InfoCard>
            )}

            {/* Notes */}
            {order.note && (
              <InfoCard title="Order Notes" icon="sticky_note_2">
                <p
                  className="text-sm leading-relaxed whitespace-pre-wrap"
                  style={{ color: 'var(--admin-text-secondary)' }}
                >
                  {order.note}
                </p>
              </InfoCard>
            )}

            {/* Tags */}
            {order.tags.length > 0 && (
              <InfoCard title="Tags" icon="label">
                <div className="flex flex-wrap gap-2">
                  {order.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2.5 py-1 rounded-full text-xs font-medium"
                      style={{
                        backgroundColor: 'var(--admin-border)',
                        color: 'var(--admin-text-secondary)',
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </InfoCard>
            )}

            {/* Timeline */}
            {timeline.length > 0 && (
              <InfoCard title="Timeline" icon="history">
                <div className="space-y-3">
                  {timeline.map((event, idx) => (
                    <div key={event.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <span
                          className="w-2 h-2 rounded-full mt-1.5 flex-none"
                          style={{
                            backgroundColor:
                              idx === 0 ? 'var(--admin-brand)' : 'var(--admin-border)',
                          }}
                        />
                        {idx < timeline.length - 1 && (
                          <div
                            className="w-px flex-1 mt-1 min-h-[20px]"
                            style={{ backgroundColor: 'var(--admin-border)' }}
                          />
                        )}
                      </div>
                      <div className="pb-3">
                        <p
                          className="text-sm leading-snug"
                          style={{ color: 'var(--admin-text-body)' }}
                        >
                          {event.message}
                        </p>
                        <p
                          className="text-xs mt-0.5"
                          style={{ color: 'var(--admin-text-disabled)' }}
                        >
                          {formatDateShort(event.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </InfoCard>
            )}
          </div>

          {/* Right Column */}
          <div className="space-y-5">
            {/* Customer */}
            <InfoCard title="Customer" icon="person">
              {order.customer ? (
                <div className="space-y-2">
                  {(order.customer.firstName || order.customer.lastName) && (
                    <p className="text-sm font-medium" style={{ color: 'var(--admin-text-body)' }}>
                      {[order.customer.firstName, order.customer.lastName]
                        .filter(Boolean)
                        .join(' ')}
                    </p>
                  )}
                  {order.customer.email && (
                    <a
                      href={`mailto:${order.customer.email}`}
                      className="text-sm flex items-center gap-1.5 transition-colors"
                      style={{ color: 'var(--admin-brand)' }}
                    >
                      <span
                        className="material-symbols-outlined text-sm"
                        style={{ color: 'var(--admin-text-muted)' }}
                      >
                        email
                      </span>
                      {order.customer.email}
                    </a>
                  )}
                  {(order.customer.phone ?? order.phone) && (
                    <p
                      className="text-sm flex items-center gap-1.5"
                      style={{ color: 'var(--admin-text-secondary)' }}
                    >
                      <span
                        className="material-symbols-outlined text-sm"
                        style={{ color: 'var(--admin-text-muted)' }}
                      >
                        phone
                      </span>
                      {order.customer.phone ?? order.phone}
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>
                    Guest checkout
                  </p>
                  {order.email && (
                    <a
                      href={`mailto:${order.email}`}
                      className="text-sm flex items-center gap-1.5 transition-colors"
                      style={{ color: 'var(--admin-brand)' }}
                    >
                      <span
                        className="material-symbols-outlined text-sm"
                        style={{ color: 'var(--admin-text-muted)' }}
                      >
                        email
                      </span>
                      {order.email}
                    </a>
                  )}
                  {order.phone && (
                    <p
                      className="text-sm flex items-center gap-1.5"
                      style={{ color: 'var(--admin-text-secondary)' }}
                    >
                      <span
                        className="material-symbols-outlined text-sm"
                        style={{ color: 'var(--admin-text-muted)' }}
                      >
                        phone
                      </span>
                      {order.phone}
                    </p>
                  )}
                </div>
              )}
            </InfoCard>

            {/* Shipping Address */}
            <InfoCard title="Shipping Address" icon="local_shipping">
              {order.shippingAddress ? (
                <AddressBlock addr={order.shippingAddress} />
              ) : (
                <p className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>
                  No shipping address
                </p>
              )}
            </InfoCard>

            {/* Billing Address */}
            <InfoCard title="Billing Address" icon="receipt">
              {order.billingAddress ? (
                <AddressBlock addr={order.billingAddress} />
              ) : (
                <p className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>
                  No billing address
                </p>
              )}
            </InfoCard>

            {/* Payment Summary */}
            <InfoCard title="Payment Summary" icon="payments">
              <div className="space-y-2.5">
                {subtotal && (
                  <SummaryRow
                    label="Subtotal"
                    value={formatCurrency(subtotal.amount, subtotal.currencyCode)}
                  />
                )}
                {discounts && parseFloat(discounts.amount) > 0 && (
                  <SummaryRow
                    label="Discounts"
                    value={`-${formatCurrency(discounts.amount, discounts.currencyCode)}`}
                    colorToken="var(--admin-success)"
                  />
                )}
                {shipping && (
                  <SummaryRow
                    label="Shipping"
                    value={
                      parseFloat(shipping.amount) === 0
                        ? 'Free'
                        : formatCurrency(shipping.amount, shipping.currencyCode)
                    }
                    colorToken={
                      parseFloat(shipping.amount) === 0 ? 'var(--admin-success)' : undefined
                    }
                  />
                )}
                {tax && (
                  <SummaryRow label="Tax" value={formatCurrency(tax.amount, tax.currencyCode)} />
                )}
                <div
                  className="pt-2.5 mt-0.5"
                  style={{ borderTop: '1px solid var(--admin-border)' }}
                >
                  <SummaryRow
                    label="Total"
                    value={total ? formatCurrency(total.amount, total.currencyCode) : '—'}
                    bold
                  />
                </div>
              </div>
            </InfoCard>
          </div>
        </div>
      )}

      {/* Modals */}
      {fulfillOpen && (
        <FulfillModal
          orderId={orderId}
          onSuccess={fetchOrder}
          onClose={() => setFulfillOpen(false)}
        />
      )}
      {cancelOpen && (
        <CancelModal
          orderId={orderId}
          onSuccess={fetchOrder}
          onClose={() => setCancelOpen(false)}
        />
      )}
      {refundOpen && order && (
        <RefundModal
          orderId={orderId}
          lineItems={lineItems}
          currency={currency}
          onSuccess={fetchOrder}
          onClose={() => setRefundOpen(false)}
        />
      )}
    </div>
  );
}
