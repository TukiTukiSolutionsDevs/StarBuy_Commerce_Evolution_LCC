import type { ShopifyOrder } from '@/lib/shopify/types';
import Link from 'next/link';

type OrderListProps = {
  orders: ShopifyOrder[];
};

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatMoney(amount: string, currencyCode: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 2,
  }).format(parseFloat(amount));
}

const STATUS_COLORS: Record<string, string> = {
  FULFILLED: 'bg-green-100 text-green-800',
  PARTIAL: 'bg-yellow-100 text-yellow-800',
  UNFULFILLED: 'bg-gray-100 text-gray-700',
  RESTOCKED: 'bg-blue-100 text-blue-800',
  PAID: 'bg-green-100 text-green-800',
  PENDING: 'bg-yellow-100 text-yellow-800',
  REFUNDED: 'bg-red-100 text-red-800',
  VOIDED: 'bg-red-100 text-red-800',
};

function StatusBadge({ status }: { status: string }) {
  const colorClass = STATUS_COLORS[status.toUpperCase()] ?? 'bg-gray-100 text-gray-700';
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${colorClass}`}
    >
      {status.toLowerCase().replace('_', ' ')}
    </span>
  );
}

export function OrderList({ orders }: OrderListProps) {
  if (orders.length === 0) {
    return (
      <div className="rounded-[var(--radius-lg)] border border-dashed border-gray-300 py-16 text-center">
        <svg
          className="mx-auto h-12 w-12 text-gray-300 mb-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12"
          />
        </svg>
        <h3 className="font-heading text-base font-semibold text-[#1B2A5E] mb-1">No orders yet</h3>
        <p className="text-sm text-[var(--color-text-secondary)] mb-4">
          Once you place an order, it will appear here.
        </p>
        <Link
          href="/collections/all"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-primary)] hover:text-[var(--color-primary-light)] transition-colors"
        >
          Start Shopping →
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[var(--radius-lg)] border border-gray-200">
      {/* Desktop table */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {['Order', 'Date', 'Payment', 'Fulfillment', 'Total'].map((h) => (
                <th
                  key={h}
                  className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {orders.map((order) => (
              <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                <td className="whitespace-nowrap px-6 py-4 text-sm font-semibold text-[var(--color-primary)]">
                  #{order.orderNumber}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-[var(--color-text-secondary)]">
                  {formatDate(order.processedAt)}
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <StatusBadge status={order.financialStatus} />
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <StatusBadge status={order.fulfillmentStatus} />
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm font-semibold text-[var(--color-text-primary)]">
                  {formatMoney(
                    order.currentTotalPrice.amount,
                    order.currentTotalPrice.currencyCode,
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile card list */}
      <ul className="divide-y divide-gray-100 sm:hidden">
        {orders.map((order) => (
          <li key={order.id} className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-[var(--color-primary)]">
                Order #{order.orderNumber}
              </span>
              <span className="text-sm font-bold text-[var(--color-text-primary)]">
                {formatMoney(order.currentTotalPrice.amount, order.currentTotalPrice.currencyCode)}
              </span>
            </div>
            <p className="text-xs text-[var(--color-text-secondary)]">
              {formatDate(order.processedAt)}
            </p>
            <div className="flex items-center gap-2">
              <StatusBadge status={order.financialStatus} />
              <StatusBadge status={order.fulfillmentStatus} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
