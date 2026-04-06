'use client';

/**
 * Admin Order Detail Page
 *
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

const PAYMENT_COLORS: Record<string, string> = {
  PAID: '#10b981',
  PENDING: '#d4a843',
  PARTIALLY_PAID: '#f59e0b',
  REFUNDED: '#ef4444',
  PARTIALLY_REFUNDED: '#f97316',
  VOIDED: '#6b7280',
};

const FULFILLMENT_COLORS: Record<string, string> = {
  FULFILLED: '#10b981',
  UNFULFILLED: '#f59e0b',
  PARTIALLY_FULFILLED: '#eab308',
  SCHEDULED: '#6366f1',
  ON_HOLD: '#8b5cf6',
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

function StatusBadge({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
      style={{ backgroundColor: `${color}15`, color, border: `1px solid ${color}30` }}
    >
      <span className="w-1.5 h-1.5 rounded-full flex-none" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

function RiskBadge({ level }: { level: string }) {
  if (!level || level === 'LOW') return null;
  const color = level === 'HIGH' ? '#ef4444' : '#f59e0b';
  const icon = level === 'HIGH' ? 'gpp_bad' : 'gpp_maybe';
  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
      style={{ backgroundColor: `${color}15`, color, border: `1px solid ${color}30` }}
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
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div
        className={`bg-[#111827] border border-[#1f2d4e] rounded-2xl w-full ${maxWidth} max-h-[90vh] flex flex-col shadow-2xl shadow-black/60`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1f2d4e]">
          <h2
            className="font-semibold"
            style={{ fontFamily: 'var(--font-heading)', color: '#ffffff' }}
          >
            {title}
          </h2>
          <button
            onClick={onClose}
            className="text-[#6b7280] hover:text-white transition-colors p-1 rounded-lg hover:bg-[#1f2d4e]"
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

  const inputClass =
    'w-full bg-[#0a0f1e] border border-[#1f2d4e] focus:border-[#d4a843] focus:ring-1 focus:ring-[#d4a843] text-white placeholder-[#374151] rounded-xl px-4 py-2.5 text-sm outline-none transition-colors';

  // Auto-fill tracking URL when carrier + number are set
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
        <p className="text-[#9ca3af] text-sm">
          Mark this order as fulfilled. Tracking information is optional.
        </p>

        <div>
          <label className="block text-xs font-medium text-[#9ca3af] mb-1.5">
            Shipping Carrier
          </label>
          <select
            value={company}
            onChange={(e) => {
              setCompany(e.target.value);
              setTrackingUrl(''); // reset URL so auto-fill kicks in
            }}
            className="w-full bg-[#0a0f1e] border border-[#1f2d4e] focus:border-[#d4a843] focus:ring-1 focus:ring-[#d4a843] text-white rounded-xl px-4 py-2.5 text-sm outline-none transition-colors cursor-pointer"
          >
            {SHIPPING_CARRIERS.map((c) => (
              <option key={c} value={c}>
                {c || '— Select carrier —'}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-[#9ca3af] mb-1.5">Tracking Number</label>
          <input
            value={trackingNumber}
            onChange={(e) => setTrackingNumber(e.target.value)}
            placeholder="e.g. 1Z999AA10123456784"
            className={inputClass}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-[#9ca3af] mb-1.5">Tracking URL</label>
          <input
            type="url"
            value={trackingUrl}
            onChange={(e) => setTrackingUrl(e.target.value)}
            placeholder="https://track.example.com/…"
            className={inputClass}
          />
          {company && trackingNumber && trackingUrl && (
            <p className="text-[#6b7280] text-xs mt-1">Auto-filled based on carrier</p>
          )}
        </div>

        <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl bg-[#0a0f1e] border border-[#1f2d4e]">
          <input
            type="checkbox"
            checked={notifyCustomer}
            onChange={(e) => setNotifyCustomer(e.target.checked)}
            className="w-4 h-4 rounded border-[#1f2d4e] bg-[#0a0f1e] accent-[#d4a843] cursor-pointer"
          />
          <div>
            <p className="text-[#e5e7eb] text-sm font-medium">Notify customer</p>
            <p className="text-[#6b7280] text-xs">Send shipping confirmation email</p>
          </div>
        </label>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 bg-[#1f2d4e] hover:bg-[#263d6e] text-white rounded-xl py-2.5 text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-[#d4a843] hover:bg-[#e4c06a] disabled:bg-[#1f2d4e] disabled:cursor-not-allowed text-[#0a0f1e] font-semibold rounded-xl py-2.5 text-sm transition-colors flex items-center justify-center gap-2"
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

  const selectClass =
    'w-full bg-[#0a0f1e] border border-[#1f2d4e] focus:border-[#d4a843] focus:ring-1 focus:ring-[#d4a843] text-white rounded-xl px-4 py-2.5 text-sm outline-none transition-colors cursor-pointer';

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
        <div className="flex items-start gap-3 p-3 rounded-xl bg-[#ef4444]/8 border border-[#ef4444]/20">
          <span className="material-symbols-outlined text-[#ef4444] text-xl flex-none mt-0.5">
            warning
          </span>
          <p className="text-[#fca5a5] text-sm">
            Cancelling an order cannot be undone. The order will be permanently cancelled in
            Shopify.
          </p>
        </div>

        <div>
          <label className="block text-xs font-medium text-[#9ca3af] mb-1.5">
            Reason <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <select
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className={selectClass}
          >
            {CANCEL_REASONS.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={restock}
              onChange={(e) => setRestock(e.target.checked)}
              className="w-4 h-4 rounded border-[#1f2d4e] bg-[#0a0f1e] accent-[#d4a843] cursor-pointer"
            />
            <div>
              <p className="text-[#e5e7eb] text-sm font-medium">Restock inventory</p>
              <p className="text-[#6b7280] text-xs">Return items to available inventory</p>
            </div>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={refund}
              onChange={(e) => setRefund(e.target.checked)}
              className="w-4 h-4 rounded border-[#1f2d4e] bg-[#0a0f1e] accent-[#d4a843] cursor-pointer"
            />
            <div>
              <p className="text-[#e5e7eb] text-sm font-medium">Issue refund</p>
              <p className="text-[#6b7280] text-xs">Automatically refund payment to customer</p>
            </div>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={notifyCustomer}
              onChange={(e) => setNotifyCustomer(e.target.checked)}
              className="w-4 h-4 rounded border-[#1f2d4e] bg-[#0a0f1e] accent-[#d4a843] cursor-pointer"
            />
            <div>
              <p className="text-[#e5e7eb] text-sm font-medium">Notify customer</p>
              <p className="text-[#6b7280] text-xs">Send cancellation email to customer</p>
            </div>
          </label>
        </div>

        {/* Confirmation checkbox */}
        <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl bg-[#ef4444]/5 border border-[#ef4444]/20">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="w-4 h-4 rounded border-[#ef4444]/40 bg-[#0a0f1e] accent-[#ef4444] cursor-pointer"
          />
          <p className="text-[#fca5a5] text-sm font-medium">
            I understand this action cannot be undone
          </p>
        </label>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 bg-[#1f2d4e] hover:bg-[#263d6e] text-white rounded-xl py-2.5 text-sm font-medium transition-colors"
          >
            Keep Order
          </button>
          <button
            type="submit"
            disabled={loading || !confirmed}
            className="flex-1 bg-[#ef4444] hover:bg-[#dc2626] disabled:bg-[#374151] disabled:cursor-not-allowed text-white font-semibold rounded-xl py-2.5 text-sm transition-colors flex items-center justify-center gap-2"
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

  const inputClass =
    'w-full bg-[#0a0f1e] border border-[#1f2d4e] focus:border-[#d4a843] focus:ring-1 focus:ring-[#d4a843] text-white placeholder-[#374151] rounded-xl px-4 py-2.5 text-sm outline-none transition-colors';

  function setQty(id: string, val: number, max: number) {
    setQuantities((prev) => ({ ...prev, [id]: Math.min(max, Math.max(0, val)) }));
  }

  // Compute refund total based on quantities and unit prices
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
        <p className="text-[#9ca3af] text-sm">
          Select items to refund. Leave all at 0 to issue a manual/custom refund.
        </p>

        {/* Line items */}
        <div className="space-y-2">
          {lineItems.map((li) => {
            const unitMoney = li.originalUnitPriceSet.shopMoney;
            const totalMoney = li.originalTotalSet.shopMoney;
            const qty = quantities[li.id] ?? 0;

            return (
              <div
                key={li.id}
                className="p-3 rounded-xl bg-[#0a0f1e] border border-[#1f2d4e] space-y-2"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-[#e5e7eb] text-sm font-medium truncate">{li.name}</p>
                    {li.variant && li.variant.title !== 'Default Title' && (
                      <p className="text-[#6b7280] text-xs">{li.variant.title}</p>
                    )}
                    {(li.sku ?? li.variant?.sku) && (
                      <p className="text-[#4b5563] text-xs">SKU: {li.sku ?? li.variant?.sku}</p>
                    )}
                    <p className="text-[#9ca3af] text-xs mt-0.5">
                      {formatCurrency(unitMoney.amount, unitMoney.currencyCode)} × {li.quantity} ={' '}
                      {formatCurrency(totalMoney.amount, totalMoney.currencyCode)}
                    </p>
                  </div>
                  {/* Qty stepper */}
                  <div className="flex items-center gap-2 flex-none">
                    <button
                      type="button"
                      onClick={() => setQty(li.id, qty - 1, li.quantity)}
                      className="w-7 h-7 rounded-lg bg-[#1f2d4e] hover:bg-[#263d6e] text-[#9ca3af] hover:text-white flex items-center justify-center transition-colors"
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
                      className="w-12 text-center bg-[#1f2d4e] border border-[#1f2d4e] text-white rounded-lg py-1 text-sm outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setQty(li.id, qty + 1, li.quantity)}
                      className="w-7 h-7 rounded-lg bg-[#1f2d4e] hover:bg-[#263d6e] text-[#9ca3af] hover:text-white flex items-center justify-center transition-colors"
                    >
                      <span className="material-symbols-outlined text-sm">add</span>
                    </button>
                  </div>
                </div>
                {/* Restock type — only show when qty > 0 */}
                {qty > 0 && (
                  <div>
                    <label className="block text-xs font-medium text-[#6b7280] mb-1">Restock</label>
                    <select
                      value={restockTypes[li.id] ?? 'NO_RESTOCK'}
                      onChange={(e) =>
                        setRestockTypes((prev) => ({ ...prev, [li.id]: e.target.value }))
                      }
                      className="w-full bg-[#111827] border border-[#1f2d4e] focus:border-[#d4a843] text-[#9ca3af] rounded-lg px-3 py-1.5 text-xs outline-none cursor-pointer"
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

        {/* Refund total */}
        {refundTotal > 0 && (
          <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-[#10b981]/8 border border-[#10b981]/20">
            <span className="text-[#6b7280] text-sm">Estimated refund</span>
            <span className="text-[#10b981] text-sm font-bold">
              {formatCurrency(refundTotal.toFixed(2), currency)}
            </span>
          </div>
        )}

        {/* Note */}
        <div>
          <label className="block text-xs font-medium text-[#9ca3af] mb-1.5">
            Internal note (optional)
          </label>
          <textarea
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Reason for refund…"
            className={`${inputClass} resize-none`}
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 bg-[#1f2d4e] hover:bg-[#263d6e] text-white rounded-xl py-2.5 text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-[#d4a843] hover:bg-[#e4c06a] disabled:bg-[#1f2d4e] disabled:cursor-not-allowed text-[#0a0f1e] font-semibold rounded-xl py-2.5 text-sm transition-colors flex items-center justify-center gap-2"
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
    <div className="bg-[#111827] border border-[#1f2d4e] rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-5 py-3.5 border-b border-[#1f2d4e]">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[#d4a843] text-base">{icon}</span>
          <h3
            className="text-sm font-semibold"
            style={{ fontFamily: 'var(--font-heading)', color: '#ffffff' }}
          >
            {title}
          </h3>
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
  if (lines.length === 0) return <p className="text-[#6b7280] text-sm">No address provided</p>;
  return (
    <div className="space-y-0.5">
      {lines.map((line, i) => (
        <p
          key={i}
          className={`text-sm ${i === 0 ? 'text-[#e5e7eb] font-medium' : 'text-[#9ca3af]'}`}
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
  color,
}: {
  label: string;
  value: string;
  bold?: boolean;
  color?: string;
}) {
  return (
    <div className="flex justify-between items-center">
      <span
        className="text-sm"
        style={{ color: bold ? '#ffffff' : '#6b7280', fontWeight: bold ? 600 : 400 }}
      >
        {label}
      </span>
      <span
        className="text-sm"
        style={{ color: color ?? (bold ? '#ffffff' : '#9ca3af'), fontWeight: bold ? 700 : 400 }}
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

  // ── Fetch order ─────────────────────────────────────────────────────────────

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

  // ── Derived state ────────────────────────────────────────────────────────────

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

  const paymentColor = order
    ? (PAYMENT_COLORS[order.displayFinancialStatus] ?? '#6b7280')
    : '#6b7280';
  const fulfillColor = order
    ? (FULFILLMENT_COLORS[order.displayFulfillmentStatus] ?? '#6b7280')
    : '#6b7280';

  const existingFulfillments = order?.fulfillments ?? [];
  const timeline = order?.events?.edges?.map((e) => e.node) ?? [];

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      {/* ── Back + Header ────────────────────────────────────────── */}
      <div className="flex items-start gap-4 flex-wrap">
        <Link
          href="/admin/orders"
          className="flex items-center gap-1.5 text-[#6b7280] hover:text-white text-sm transition-colors mt-1"
        >
          <span className="material-symbols-outlined text-base">arrow_back</span>
          Orders
        </Link>
        <div className="flex-1">
          {loading ? (
            <div className="h-8 w-40 bg-[#1f2d4e] rounded-lg animate-pulse" />
          ) : order ? (
            <div className="flex items-center gap-3 flex-wrap">
              <h1
                className="text-2xl font-bold"
                style={{ fontFamily: 'var(--font-heading)', color: '#ffffff' }}
              >
                Order {order.name}
              </h1>
              <StatusBadge
                label={order.displayFinancialStatus.replace(/_/g, ' ')}
                color={paymentColor}
              />
              <StatusBadge
                label={order.displayFulfillmentStatus?.replace(/_/g, ' ') ?? 'No status'}
                color={fulfillColor}
              />
              {isCancelled && <StatusBadge label="CANCELLED" color="#ef4444" />}
              {order.riskLevel && order.riskLevel !== 'LOW' && (
                <RiskBadge level={order.riskLevel} />
              )}
            </div>
          ) : null}
          {order && (
            <p className="text-[#6b7280] text-sm mt-1">
              {order.createdAt ? formatDate(order.createdAt) : ''}
              {order.cancelledAt && (
                <span className="text-[#ef4444] ml-2">
                  · Cancelled {formatDate(order.cancelledAt)}
                  {order.cancelReason && ` (${order.cancelReason.toLowerCase()})`}
                </span>
              )}
            </p>
          )}
        </div>
      </div>

      {/* ── Action Bar ──────────────────────────────────────────── */}
      {!loading && order && (
        <div className="flex items-center gap-3 flex-wrap">
          {!isCancelled && !isFulfilled && (
            <button
              onClick={() => setFulfillOpen(true)}
              className="flex items-center gap-2 bg-[#10b981]/10 hover:bg-[#10b981]/20 border border-[#10b981]/30 text-[#10b981] rounded-xl px-4 py-2.5 text-sm font-medium transition-all"
            >
              <span className="material-symbols-outlined text-base">local_shipping</span>
              Fulfill Order
            </button>
          )}
          {!isCancelled && !isRefunded && (
            <button
              onClick={() => setRefundOpen(true)}
              className="flex items-center gap-2 bg-[#d4a843]/10 hover:bg-[#d4a843]/20 border border-[#d4a843]/30 text-[#d4a843] rounded-xl px-4 py-2.5 text-sm font-medium transition-all"
            >
              <span className="material-symbols-outlined text-base">currency_exchange</span>
              Issue Refund
            </button>
          )}
          {!isCancelled && (
            <button
              onClick={() => setCancelOpen(true)}
              className="flex items-center gap-2 bg-[#ef4444]/10 hover:bg-[#ef4444]/20 border border-[#ef4444]/30 text-[#ef4444] rounded-xl px-4 py-2.5 text-sm font-medium transition-all"
            >
              <span className="material-symbols-outlined text-base">cancel</span>
              Cancel Order
            </button>
          )}
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-[#111827] border border-[#1f2d4e] hover:border-[#374151] text-[#9ca3af] hover:text-white rounded-xl px-4 py-2.5 text-sm font-medium transition-all ml-auto"
          >
            <span className="material-symbols-outlined text-base">print</span>
            Print
          </button>
        </div>
      )}

      {/* ── Error ──────────────────────────────────────────────── */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-[#ef4444]/8 border border-[#ef4444]/20">
          <span className="material-symbols-outlined text-[#ef4444] text-xl">error</span>
          <p className="text-[#fca5a5] text-sm">{error}</p>
          <button
            onClick={fetchOrder}
            className="ml-auto text-[#d4a843] text-sm hover:text-[#e4c06a] transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Loading skeleton ──────────────────────────────────── */}
      {loading && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <div className="xl:col-span-2 space-y-5">
            {[220, 140].map((h, i) => (
              <div
                key={i}
                className="bg-[#111827] border border-[#1f2d4e] rounded-2xl animate-pulse"
                style={{ height: h }}
              />
            ))}
          </div>
          <div className="space-y-5">
            {[150, 140, 160, 120].map((h, i) => (
              <div
                key={i}
                className="bg-[#111827] border border-[#1f2d4e] rounded-2xl animate-pulse"
                style={{ height: h }}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Main Content ─────────────────────────────────────── */}
      {!loading && order && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          {/* ── Left Column ─────────────────────────────────── */}
          <div className="xl:col-span-2 space-y-5">
            {/* Line Items */}
            <InfoCard title="Line Items" icon="shopping_cart">
              <div className="space-y-0 -mx-5">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#1f2d4e]">
                      <th className="text-left text-xs font-medium uppercase tracking-wider text-[#6b7280] px-5 py-2.5">
                        Product
                      </th>
                      <th className="text-right text-xs font-medium uppercase tracking-wider text-[#6b7280] px-5 py-2.5">
                        Unit Price
                      </th>
                      <th className="text-center text-xs font-medium uppercase tracking-wider text-[#6b7280] px-5 py-2.5">
                        Qty
                      </th>
                      <th className="text-right text-xs font-medium uppercase tracking-wider text-[#6b7280] px-5 py-2.5">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1f2d4e]">
                    {lineItems.map((li) => {
                      const unitMoney = li.originalUnitPriceSet.shopMoney;
                      const totalMoney = li.originalTotalSet.shopMoney;
                      const sku = li.sku ?? li.variant?.sku;
                      return (
                        <tr key={li.id} className="hover:bg-[#1f2d4e]/10 transition-colors">
                          <td className="px-5 py-3.5">
                            <p className="text-[#e5e7eb] text-sm font-medium">{li.name}</p>
                            {li.variant && li.variant.title !== 'Default Title' && (
                              <p className="text-[#6b7280] text-xs mt-0.5">{li.variant.title}</p>
                            )}
                            {sku && <p className="text-[#4b5563] text-xs mt-0.5">SKU: {sku}</p>}
                            {li.fulfillmentStatus && li.fulfillmentStatus !== 'UNFULFILLED' && (
                              <span
                                className="inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-medium"
                                style={{
                                  backgroundColor: `${FULFILLMENT_COLORS[li.fulfillmentStatus] ?? '#6b7280'}20`,
                                  color: FULFILLMENT_COLORS[li.fulfillmentStatus] ?? '#6b7280',
                                }}
                              >
                                {li.fulfillmentStatus.replace(/_/g, ' ').toLowerCase()}
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <span className="text-[#9ca3af] text-sm">
                              {formatCurrency(unitMoney.amount, unitMoney.currencyCode)}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            <span className="text-[#9ca3af] text-sm">{li.quantity}</span>
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <span className="text-[#e5e7eb] text-sm font-medium">
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
                  {existingFulfillments.map((f) => (
                    <div key={f.id} className="p-4 rounded-xl bg-[#0a0f1e] border border-[#1f2d4e]">
                      <div className="flex items-center justify-between mb-2">
                        <span
                          className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-semibold"
                          style={{
                            backgroundColor: `${FULFILLMENT_COLORS[f.status] ?? '#6b7280'}15`,
                            color: FULFILLMENT_COLORS[f.status] ?? '#6b7280',
                          }}
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: FULFILLMENT_COLORS[f.status] ?? '#6b7280' }}
                          />
                          {f.status}
                        </span>
                        <span className="text-[#4b5563] text-xs">
                          {formatDateShort(f.createdAt)}
                        </span>
                      </div>
                      {f.trackingInfo.map((t, ti) => (
                        <div key={ti} className="space-y-1">
                          {t.company && (
                            <p className="text-[#9ca3af] text-xs flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-xs text-[#6b7280]">
                                business
                              </span>
                              {t.company}
                            </p>
                          )}
                          {t.number && (
                            <p className="text-[#9ca3af] text-xs flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-xs text-[#6b7280]">
                                tag
                              </span>
                              {t.url ? (
                                <a
                                  href={t.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[#d4a843] hover:text-[#e4c06a] transition-colors"
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
                  ))}
                </div>
              </InfoCard>
            )}

            {/* Notes */}
            {order.note && (
              <InfoCard title="Order Notes" icon="sticky_note_2">
                <p className="text-[#9ca3af] text-sm leading-relaxed whitespace-pre-wrap">
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
                      className="px-2.5 py-1 rounded-full text-xs font-medium bg-[#1f2d4e] text-[#9ca3af]"
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
                          style={{ backgroundColor: idx === 0 ? '#d4a843' : '#1f2d4e' }}
                        />
                        {idx < timeline.length - 1 && (
                          <div className="w-px flex-1 bg-[#1f2d4e] mt-1 min-h-[20px]" />
                        )}
                      </div>
                      <div className="pb-3">
                        <p className="text-[#e5e7eb] text-sm leading-snug">{event.message}</p>
                        <p className="text-[#4b5563] text-xs mt-0.5">
                          {formatDateShort(event.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </InfoCard>
            )}
          </div>

          {/* ── Right Column ────────────────────────────────── */}
          <div className="space-y-5">
            {/* Customer */}
            <InfoCard title="Customer" icon="person">
              {order.customer ? (
                <div className="space-y-2">
                  {(order.customer.firstName || order.customer.lastName) && (
                    <p className="text-[#e5e7eb] text-sm font-medium">
                      {[order.customer.firstName, order.customer.lastName]
                        .filter(Boolean)
                        .join(' ')}
                    </p>
                  )}
                  {order.customer.email && (
                    <a
                      href={`mailto:${order.customer.email}`}
                      className="text-[#d4a843] hover:text-[#e4c06a] text-sm flex items-center gap-1.5 transition-colors"
                    >
                      <span className="material-symbols-outlined text-sm text-[#6b7280]">
                        email
                      </span>
                      {order.customer.email}
                    </a>
                  )}
                  {(order.customer.phone ?? order.phone) && (
                    <p className="text-[#9ca3af] text-sm flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-[#6b7280]">
                        phone
                      </span>
                      {order.customer.phone ?? order.phone}
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-[#6b7280] text-sm">Guest checkout</p>
                  {order.email && (
                    <a
                      href={`mailto:${order.email}`}
                      className="text-[#d4a843] hover:text-[#e4c06a] text-sm flex items-center gap-1.5 transition-colors"
                    >
                      <span className="material-symbols-outlined text-sm text-[#6b7280]">
                        email
                      </span>
                      {order.email}
                    </a>
                  )}
                  {order.phone && (
                    <p className="text-[#9ca3af] text-sm flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-[#6b7280]">
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
                <p className="text-[#6b7280] text-sm">No shipping address</p>
              )}
            </InfoCard>

            {/* Billing Address */}
            <InfoCard title="Billing Address" icon="receipt">
              {order.billingAddress ? (
                <AddressBlock addr={order.billingAddress} />
              ) : (
                <p className="text-[#6b7280] text-sm">No billing address</p>
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
                    color="#10b981"
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
                    color={parseFloat(shipping.amount) === 0 ? '#10b981' : undefined}
                  />
                )}
                {tax && (
                  <SummaryRow label="Tax" value={formatCurrency(tax.amount, tax.currencyCode)} />
                )}
                <div className="border-t border-[#1f2d4e] pt-2.5 mt-0.5">
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

      {/* ── Modals ───────────────────────────────────────────── */}
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
