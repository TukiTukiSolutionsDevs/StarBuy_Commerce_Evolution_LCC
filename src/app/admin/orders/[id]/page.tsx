'use client';

/**
 * Admin Order Detail Page
 *
 * Shows full order info with action modals: Fulfill, Cancel, Refund.
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
  VOIDED: '#6b7280',
};

const FULFILLMENT_COLORS: Record<string, string> = {
  FULFILLED: '#10b981',
  UNFULFILLED: '#f59e0b',
  PARTIALLY_FULFILLED: '#eab308',
};

const CANCEL_REASONS = [
  { value: 'CUSTOMER', label: 'Customer requested' },
  { value: 'FRAUD', label: 'Fraudulent order' },
  { value: 'INVENTORY', label: 'Out of inventory' },
  { value: 'DECLINED', label: 'Payment declined' },
  { value: 'OTHER', label: 'Other' },
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

// ─── Badges ─────────────────────────────────────────────────────────────────────

function StatusBadge({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
      style={{ backgroundColor: `${color}15`, color, border: `1px solid ${color}30` }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

// ─── Modal wrapper ───────────────────────────────────────────────────────────────

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
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
      <div className="bg-[#111827] border border-[#1f2d4e] rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl shadow-black/60">
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
  const [loading, setLoading] = useState(false);

  const inputClass =
    'w-full bg-[#0f1729] border border-[#1f2d4e] focus:border-[#d4a843] focus:ring-1 focus:ring-[#d4a843] text-white placeholder-[#374151] rounded-xl px-4 py-2.5 text-sm outline-none transition-colors';

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
          Mark this order as fulfilled. You can optionally provide tracking information.
        </p>
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
            placeholder="https://track.example.com/..."
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-[#9ca3af] mb-1.5">
            Shipping Company
          </label>
          <input
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="e.g. UPS, FedEx, DHL"
            className={inputClass}
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
  const [loading, setLoading] = useState(false);

  const selectClass =
    'w-full bg-[#0f1729] border border-[#1f2d4e] focus:border-[#d4a843] focus:ring-1 focus:ring-[#d4a843] text-white rounded-xl px-4 py-2.5 text-sm outline-none transition-colors cursor-pointer';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason, restock, refund }),
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
            This action cannot be undone. The order will be permanently cancelled.
          </p>
        </div>
        <div>
          <label className="block text-xs font-medium text-[#9ca3af] mb-1.5">
            Reason <span className="text-[#ef4444]">*</span>
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
          <label className="flex items-center gap-3 cursor-pointer group">
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
          <label className="flex items-center gap-3 cursor-pointer group">
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
        </div>
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
            disabled={loading}
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
  onSuccess,
  onClose,
}: {
  orderId: string;
  lineItems: LineItemNode[];
  onSuccess: () => void;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  const inputClass =
    'w-full bg-[#0f1729] border border-[#1f2d4e] focus:border-[#d4a843] focus:ring-1 focus:ring-[#d4a843] text-white placeholder-[#374151] rounded-xl px-4 py-2.5 text-sm outline-none transition-colors';

  function setQty(id: string, val: number) {
    setQuantities((prev) => ({ ...prev, [id]: Math.max(0, val) }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const selectedItems = lineItems
        .filter((li) => (quantities[li.id] ?? 0) > 0)
        .map((li) => ({
          lineItemId: li.id,
          quantity: quantities[li.id],
          restockType: 'NO_RESTOCK' as const,
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
    <Modal title="Issue Refund" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-[#9ca3af] text-sm">
          Select items and quantities to refund. Leave quantities at 0 to issue a full order refund.
        </p>

        {/* Line items */}
        <div className="space-y-2">
          {lineItems.map((li) => {
            const money = li.originalTotalSet.shopMoney;
            return (
              <div
                key={li.id}
                className="flex items-center gap-3 p-3 rounded-xl bg-[#0f1729] border border-[#1f2d4e]"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[#e5e7eb] text-sm font-medium truncate">{li.name}</p>
                  {li.variant && <p className="text-[#6b7280] text-xs">{li.variant.title}</p>}
                  <p className="text-[#9ca3af] text-xs mt-0.5">
                    {formatCurrency(money.amount, money.currencyCode)} · qty {li.quantity}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-none">
                  <button
                    type="button"
                    onClick={() => setQty(li.id, (quantities[li.id] ?? 0) - 1)}
                    className="w-7 h-7 rounded-lg bg-[#1f2d4e] hover:bg-[#263d6e] text-[#9ca3af] hover:text-white flex items-center justify-center transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">remove</span>
                  </button>
                  <input
                    type="number"
                    min={0}
                    max={li.quantity}
                    value={quantities[li.id] ?? 0}
                    onChange={(e) => setQty(li.id, parseInt(e.target.value, 10) || 0)}
                    className="w-12 text-center bg-[#0f1729] border border-[#1f2d4e] text-white rounded-lg py-1 text-sm outline-none"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setQty(li.id, Math.min(li.quantity, (quantities[li.id] ?? 0) + 1))
                    }
                    className="w-7 h-7 rounded-lg bg-[#1f2d4e] hover:bg-[#263d6e] text-[#9ca3af] hover:text-white flex items-center justify-center transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">add</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Note */}
        <div>
          <label className="block text-xs font-medium text-[#9ca3af] mb-1.5">
            Refund Note (optional)
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
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-[#111827] border border-[#1f2d4e] rounded-2xl overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3.5 border-b border-[#1f2d4e]">
        <span className="material-symbols-outlined text-[#d4a843] text-base">{icon}</span>
        <h3
          className="text-sm font-semibold"
          style={{ fontFamily: 'var(--font-heading)', color: '#ffffff' }}
        >
          {title}
        </h3>
      </div>
      <div className="px-5 py-4">{children}</div>
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

  // ── Derived state ────────────────────────────────────────────────────────────

  const isCancelled = !!order?.cancelledAt;
  const isFulfilled = order?.displayFulfillmentStatus === 'FULFILLED';
  const isRefunded = order?.displayFinancialStatus === 'REFUNDED';
  const lineItems = order?.lineItems.edges.map((e) => e.node) ?? [];
  const subtotal = order?.subtotalPriceSet?.shopMoney;
  const total = order?.currentTotalPriceSet.shopMoney;

  const paymentColor = order
    ? (PAYMENT_COLORS[order.displayFinancialStatus] ?? '#6b7280')
    : '#6b7280';
  const fulfillColor = order
    ? (FULFILLMENT_COLORS[order.displayFulfillmentStatus] ?? '#6b7280')
    : '#6b7280';

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
            </div>
          ) : null}
          {order && (
            <p className="text-[#6b7280] text-sm mt-1">
              {order.createdAt ? formatDate(order.createdAt) : ''}
            </p>
          )}
        </div>
      </div>

      {/* ── Action Bar ──────────────────────────────────────────── */}
      {!loading && order && !isCancelled && (
        <div className="flex items-center gap-3 flex-wrap">
          {!isFulfilled && (
            <button
              onClick={() => setFulfillOpen(true)}
              className="flex items-center gap-2 bg-[#10b981]/10 hover:bg-[#10b981]/20 border border-[#10b981]/30 text-[#10b981] rounded-xl px-4 py-2.5 text-sm font-medium transition-all"
            >
              <span className="material-symbols-outlined text-base">local_shipping</span>
              Fulfill Order
            </button>
          )}
          {!isRefunded && (
            <button
              onClick={() => setRefundOpen(true)}
              className="flex items-center gap-2 bg-[#d4a843]/10 hover:bg-[#d4a843]/20 border border-[#d4a843]/30 text-[#d4a843] rounded-xl px-4 py-2.5 text-sm font-medium transition-all"
            >
              <span className="material-symbols-outlined text-base">currency_exchange</span>
              Issue Refund
            </button>
          )}
          <button
            onClick={() => setCancelOpen(true)}
            className="flex items-center gap-2 bg-[#ef4444]/10 hover:bg-[#ef4444]/20 border border-[#ef4444]/30 text-[#ef4444] rounded-xl px-4 py-2.5 text-sm font-medium transition-all"
          >
            <span className="material-symbols-outlined text-base">cancel</span>
            Cancel Order
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
            {[180, 120].map((h, i) => (
              <div
                key={i}
                className="bg-[#111827] border border-[#1f2d4e] rounded-2xl animate-pulse"
                style={{ height: h }}
              />
            ))}
          </div>
          <div className="space-y-5">
            {[120, 120, 100].map((h, i) => (
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
                      const money = li.originalTotalSet.shopMoney;
                      return (
                        <tr key={li.id} className="hover:bg-[#1f2d4e]/10 transition-colors">
                          <td className="px-5 py-3.5">
                            <p className="text-[#e5e7eb] text-sm font-medium">{li.name}</p>
                            {li.variant && li.variant.title !== 'Default Title' && (
                              <p className="text-[#6b7280] text-xs mt-0.5">
                                {li.variant.title}
                                {li.variant.price && (
                                  <span className="text-[#374151]"> · ${li.variant.price}</span>
                                )}
                              </p>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            <span className="text-[#9ca3af] text-sm">{li.quantity}</span>
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <span className="text-[#e5e7eb] text-sm font-medium">
                              {formatCurrency(money.amount, money.currencyCode)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </InfoCard>

            {/* Notes */}
            {order.note && (
              <InfoCard title="Order Notes" icon="sticky_note_2">
                <p className="text-[#9ca3af] text-sm leading-relaxed">{order.note}</p>
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
                    <p className="text-[#9ca3af] text-sm flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-[#6b7280]">
                        email
                      </span>
                      {order.customer.email}
                    </p>
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
              ) : (
                <p className="text-[#6b7280] text-sm">{order.email ?? 'Guest checkout'}</p>
              )}
            </InfoCard>

            {/* Shipping Address */}
            {order.shippingAddress && (
              <InfoCard title="Shipping Address" icon="location_on">
                <div className="space-y-1">
                  {(order.shippingAddress.firstName || order.shippingAddress.lastName) && (
                    <p className="text-[#e5e7eb] text-sm font-medium">
                      {[order.shippingAddress.firstName, order.shippingAddress.lastName]
                        .filter(Boolean)
                        .join(' ')}
                    </p>
                  )}
                  {order.shippingAddress.address1 && (
                    <p className="text-[#9ca3af] text-sm">{order.shippingAddress.address1}</p>
                  )}
                  {(order.shippingAddress.city || order.shippingAddress.country) && (
                    <p className="text-[#9ca3af] text-sm">
                      {[order.shippingAddress.city, order.shippingAddress.country]
                        .filter(Boolean)
                        .join(', ')}
                    </p>
                  )}
                </div>
              </InfoCard>
            )}

            {/* Payment Summary */}
            <InfoCard title="Payment Summary" icon="payments">
              <div className="space-y-2.5">
                {subtotal && (
                  <div className="flex justify-between items-center">
                    <span className="text-[#6b7280] text-sm">Subtotal</span>
                    <span className="text-[#9ca3af] text-sm">
                      {formatCurrency(subtotal.amount, subtotal.currencyCode)}
                    </span>
                  </div>
                )}
                {total && subtotal && (
                  <div className="flex justify-between items-center">
                    <span className="text-[#6b7280] text-sm">Tax</span>
                    <span className="text-[#9ca3af] text-sm">
                      {formatCurrency(
                        String(parseFloat(total.amount) - parseFloat(subtotal.amount)),
                        total.currencyCode,
                      )}
                    </span>
                  </div>
                )}
                <div className="border-t border-[#1f2d4e] pt-2.5 mt-0.5">
                  <div className="flex justify-between items-center">
                    <span className="text-white text-sm font-semibold">Total</span>
                    <span className="text-white text-base font-bold">
                      {total ? formatCurrency(total.amount, total.currencyCode) : '—'}
                    </span>
                  </div>
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
          onSuccess={fetchOrder}
          onClose={() => setRefundOpen(false)}
        />
      )}
    </div>
  );
}
