'use client';

import Image from 'next/image';
import { useCart } from '@shopify/hydrogen-react';
import { useCartDrawer } from './CartDrawerContext';
import { Button } from '@/components/ui/Button';

function formatMoney(amount: string, currencyCode: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 2,
  }).format(parseFloat(amount));
}

export function CartDrawer() {
  const { isOpen, closeCart } = useCartDrawer();
  const { lines, cost, totalQuantity, checkoutUrl, linesRemove, linesUpdate, status } = useCart();

  const cartLines = lines ?? [];

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 transition-opacity"
          onClick={closeCart}
          aria-hidden="true"
        />
      )}

      {/* Drawer panel */}
      <div
        className={[
          'fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-white shadow-2xl transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
        aria-label="Shopping cart"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="font-heading text-lg font-bold text-[var(--color-text-primary)]">
            Your Cart
            {totalQuantity != null && totalQuantity > 0 && (
              <span className="ml-2 text-sm font-medium text-[var(--color-text-secondary)]">
                ({totalQuantity} {totalQuantity === 1 ? 'item' : 'items'})
              </span>
            )}
          </h2>
          <button
            onClick={closeCart}
            className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            aria-label="Close cart"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {cartLines.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
              <svg
                className="h-16 w-16 text-gray-300"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
              </svg>
              <p className="text-[var(--color-text-secondary)]">Your cart is empty</p>
              <Button variant="primary" onClick={closeCart}>
                Continue Shopping
              </Button>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {cartLines.map((line) => {
                if (!line?.merchandise || !line.id) return null;
                const lineId = line.id;
                const qty = line.quantity ?? 1;
                const merch = line.merchandise;
                const productTitle = ('product' in merch && merch.product && 'title' in merch.product)
                  ? (merch.product as { title: string }).title
                  : (merch.title ?? '');
                const variantTitle = merch.title ?? '';
                // Image from merchandise
                const imgData = 'image' in merch ? (merch.image as { url?: string; altText?: string | null } | null | undefined) : null;
                const imgUrl = imgData?.url;
                const imgAlt = imgData?.altText ?? variantTitle;
                const lineTotal = line.cost?.totalAmount;

                return (
                  <li key={lineId} className="flex gap-4 py-4">
                    {/* Image */}
                    <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-[var(--radius-md)] bg-gray-100">
                      {imgUrl ? (
                        <Image
                          src={imgUrl}
                          alt={imgAlt ?? ''}
                          fill
                          sizes="80px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-gray-300">
                          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159" />
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex flex-1 flex-col gap-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium text-[var(--color-text-primary)] line-clamp-2">
                            {productTitle}
                          </p>
                          {variantTitle && variantTitle !== 'Default Title' && (
                            <p className="text-xs text-[var(--color-text-secondary)]">
                              {variantTitle}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => linesRemove([lineId])}
                          className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                          aria-label="Remove item"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>

                      <div className="flex items-center justify-between">
                        {/* Quantity controls */}
                        <div className="flex items-center gap-1 rounded-[var(--radius-md)] border border-gray-200">
                          <button
                            onClick={() => {
                              if (qty > 1) {
                                linesUpdate([{ id: lineId, quantity: qty - 1 }]);
                              } else {
                                linesRemove([lineId]);
                              }
                            }}
                            className="flex h-7 w-7 items-center justify-center text-gray-500 hover:text-gray-700"
                            aria-label="Decrease quantity"
                          >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
                            </svg>
                          </button>
                          <span className="min-w-[20px] text-center text-sm font-medium">
                            {qty}
                          </span>
                          <button
                            onClick={() => linesUpdate([{ id: lineId, quantity: qty + 1 }])}
                            className="flex h-7 w-7 items-center justify-center text-gray-500 hover:text-gray-700"
                            aria-label="Increase quantity"
                          >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                            </svg>
                          </button>
                        </div>

                        {/* Line total */}
                        {lineTotal?.amount && lineTotal?.currencyCode && (
                          <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                            {formatMoney(lineTotal.amount, lineTotal.currencyCode)}
                          </p>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer — totals + checkout */}
        {cartLines.length > 0 && (
          <div className="border-t border-gray-200 px-6 py-4 space-y-4">
            {/* Subtotal */}
            {cost?.subtotalAmount?.amount && cost?.subtotalAmount?.currencyCode && (
              <div className="flex justify-between text-sm">
                <span className="text-[var(--color-text-secondary)]">Subtotal</span>
                <span className="font-semibold text-[var(--color-text-primary)]">
                  {formatMoney(cost.subtotalAmount.amount, cost.subtotalAmount.currencyCode)}
                </span>
              </div>
            )}
            {cost?.totalAmount?.amount && cost?.totalAmount?.currencyCode && (
              <div className="flex justify-between text-base font-bold">
                <span>Total</span>
                <span className="text-[var(--color-primary)]">
                  {formatMoney(cost.totalAmount.amount, cost.totalAmount.currencyCode)}
                </span>
              </div>
            )}

            <p className="text-xs text-[var(--color-text-secondary)] text-center">
              Shipping and taxes calculated at checkout
            </p>

            {/* Checkout button */}
            {checkoutUrl && (
              <a
                href={checkoutUrl}
                className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-6 py-3 text-sm font-semibold text-white hover:bg-[var(--color-primary-light)] transition-colors"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
                Proceed to Checkout
                {status === 'updating' && (
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                )}
              </a>
            )}

            <button
              onClick={closeCart}
              className="w-full text-center text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors underline"
            >
              Continue Shopping
            </button>
          </div>
        )}
      </div>
    </>
  );
}
