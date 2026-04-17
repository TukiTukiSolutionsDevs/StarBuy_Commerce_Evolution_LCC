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
      <div className="rounded-2xl bg-[#f4f4f0] py-16 text-center">
        <span
          className="material-symbols-outlined text-5xl text-[#b1b2af] mb-4 block mx-auto"
          aria-hidden="true"
        >
          local_shipping
        </span>
        <h3 className="font-headline text-base font-semibold text-[#303330] mb-1">No orders yet</h3>
        <p className="text-sm text-[#5d605c] mb-4">Once you place an order, it will appear here.</p>
        <Link
          href="/collections/all"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[#795a00] hover:text-[#6b4f00] transition-colors"
        >
          Start Shopping →
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl bg-[#ffffff] shadow-[0_8px_32px_rgba(0,0,0,0.04)]">
      {/* Desktop table */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="min-w-full divide-y divide-[#e1e3df]">
          <thead className="bg-[#f4f4f0]">
            <tr>
              {['Order', 'Date', 'Payment', 'Fulfillment', 'Total'].map((h) => (
                <th
                  key={h}
                  className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-widest text-[#5d605c]"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f4f4f0] bg-[#ffffff]">
            {orders.map((order) => (
              <tr key={order.id} className="hover:bg-[#faf9f6] transition-colors">
                <td className="whitespace-nowrap px-6 py-4 text-sm font-semibold text-[#795a00]">
                  #{order.orderNumber}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-[#5d605c]">
                  {formatDate(order.processedAt)}
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <StatusBadge status={order.financialStatus} />
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <StatusBadge status={order.fulfillmentStatus} />
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm font-semibold text-[#303330]">
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
      <ul className="divide-y divide-[#f4f4f0] sm:hidden">
        {orders.map((order) => (
          <li key={order.id} className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-[#795a00]">
                Order #{order.orderNumber}
              </span>
              <span className="text-sm font-bold text-[#303330]">
                {formatMoney(order.currentTotalPrice.amount, order.currentTotalPrice.currencyCode)}
              </span>
            </div>
            <p className="text-xs text-[#5d605c]">{formatDate(order.processedAt)}</p>
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
