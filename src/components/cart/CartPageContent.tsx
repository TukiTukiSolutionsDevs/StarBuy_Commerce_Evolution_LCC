'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCart } from '@shopify/hydrogen-react';
import { Container } from '@/components/ui/Container';

function formatMoney(amount: string, currencyCode: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 2,
  }).format(parseFloat(amount));
}

export function CartPageContent() {
  const { lines, cost, totalQuantity, checkoutUrl, linesRemove, linesUpdate, status } = useCart();
  const cartLines = lines ?? [];
  const isLoading = status === 'creating' || status === 'updating';

  return (
    <Container as="main" className="py-8 sm:py-12">
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="mb-6">
        <ol className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
          <li>
            <Link href="/" className="hover:text-[var(--color-primary)] transition-colors">
              Home
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-[var(--color-text-primary)] font-medium">Shopping Cart</li>
        </ol>
      </nav>

      <h1 className="font-heading text-3xl font-bold text-[var(--color-text-primary)] sm:text-4xl mb-8">
        Shopping Cart
        {totalQuantity != null && totalQuantity > 0 && (
          <span className="ml-3 text-lg font-normal text-[var(--color-text-secondary)]">
            ({totalQuantity} {totalQuantity === 1 ? 'item' : 'items'})
          </span>
        )}
      </h1>

      {cartLines.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-6 py-24 text-center">
          <svg
            className="h-24 w-24 text-gray-200"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
          </svg>
          <div>
            <h2 className="font-heading text-xl font-bold text-[var(--color-text-primary)] mb-2">
              Your cart is empty
            </h2>
            <p className="text-[var(--color-text-secondary)] mb-6">
              Looks like you haven&apos;t added anything yet.
            </p>
          </div>
          <Link
            href="/collections/all"
            className="inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-6 py-3 text-sm font-semibold text-white hover:bg-[var(--color-primary-light)] transition-colors"
          >
            Start Shopping
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Cart items */}
          <div className="lg:col-span-2">
            <ul className="divide-y divide-gray-200">
              {cartLines.map((line) => {
                if (!line?.merchandise || !line.id) return null;
                const lineId = line.id;
                const qty = line.quantity ?? 1;
                const merch = line.merchandise;
                const productTitle = ('product' in merch && merch.product && 'title' in merch.product)
                  ? (merch.product as { title: string; handle?: string }).title
                  : (merch.title ?? '');
                const productHandle = ('product' in merch && merch.product && 'handle' in merch.product)
                  ? (merch.product as { handle: string }).handle
                  : null;
                const variantTitle = merch.title ?? '';
                const imgData = 'image' in merch ? (merch.image as { url?: string; altText?: string | null } | null | undefined) : null;
                const imgUrl = imgData?.url;
                const imgAlt = imgData?.altText ?? variantTitle;
                const lineTotal = line.cost?.totalAmount;

                return (
                  <li key={lineId} className="flex gap-5 py-6">
                    {/* Image */}
                    <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-[var(--radius-lg)] bg-gray-100 sm:h-32 sm:w-32">
                      {imgUrl ? (
                        <Image
                          src={imgUrl}
                          alt={imgAlt ?? ''}
                          fill
                          sizes="128px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-gray-300">
                          <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159" />
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex flex-1 flex-col gap-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          {productHandle ? (
                            <Link
                              href={`/products/${productHandle}`}
                              className="font-medium text-[var(--color-text-primary)] hover:text-[var(--color-primary)] transition-colors"
                            >
                              {productTitle}
                            </Link>
                          ) : (
                            <span className="font-medium text-[var(--color-text-primary)]">
                              {productTitle}
                            </span>
                          )}
                          {variantTitle && variantTitle !== 'Default Title' && (
                            <p className="text-sm text-[var(--color-text-secondary)]">
                              {variantTitle}
                            </p>
                          )}
                        </div>
                        {lineTotal?.amount && lineTotal?.currencyCode && (
                          <p className="font-semibold text-[var(--color-text-primary)]">
                            {formatMoney(lineTotal.amount, lineTotal.currencyCode)}
                          </p>
                        )}
                      </div>

                      {/* Quantity controls + remove */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center rounded-[var(--radius-md)] border border-gray-200">
                          <button
                            onClick={() => {
                              if (qty > 1) {
                                linesUpdate([{ id: lineId, quantity: qty - 1 }]);
                              } else {
                                linesRemove([lineId]);
                              }
                            }}
                            disabled={isLoading}
                            className="flex h-9 w-9 items-center justify-center text-gray-500 hover:text-gray-700 disabled:opacity-50"
                            aria-label="Decrease quantity"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
                            </svg>
                          </button>
                          <span className="min-w-[36px] text-center text-sm font-semibold">
                            {qty}
                          </span>
                          <button
                            onClick={() => linesUpdate([{ id: lineId, quantity: qty + 1 }])}
                            disabled={isLoading}
                            className="flex h-9 w-9 items-center justify-center text-gray-500 hover:text-gray-700 disabled:opacity-50"
                            aria-label="Increase quantity"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                            </svg>
                          </button>
                        </div>
                        <button
                          onClick={() => linesRemove([lineId])}
                          disabled={isLoading}
                          className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-error)] transition-colors disabled:opacity-50"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>

            <Link
              href="/collections/all"
              className="inline-flex items-center gap-1 text-sm font-medium text-[var(--color-primary)] hover:text-[var(--color-primary-light)] transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
              Continue Shopping
            </Link>
          </div>

          {/* Order summary */}
          <div>
            <div className="rounded-[var(--radius-lg)] border border-gray-200 bg-white p-6 shadow-[var(--shadow-card)]">
              <h2 className="font-heading text-lg font-bold text-[var(--color-text-primary)] mb-4">
                Order Summary
              </h2>

              <dl className="space-y-3">
                {cost?.subtotalAmount?.amount && cost?.subtotalAmount?.currencyCode && (
                  <div className="flex justify-between text-sm">
                    <dt className="text-[var(--color-text-secondary)]">Subtotal</dt>
                    <dd className="font-medium">
                      {formatMoney(cost.subtotalAmount.amount, cost.subtotalAmount.currencyCode)}
                    </dd>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <dt className="text-[var(--color-text-secondary)]">Shipping</dt>
                  <dd className="font-medium text-[var(--color-success)]">Calculated at checkout</dd>
                </div>
                <div className="flex justify-between text-sm">
                  <dt className="text-[var(--color-text-secondary)]">Taxes</dt>
                  <dd className="font-medium">Calculated at checkout</dd>
                </div>

                <div className="border-t border-gray-200 pt-3">
                  {cost?.totalAmount?.amount && cost?.totalAmount?.currencyCode && (
                    <div className="flex justify-between">
                      <dt className="text-base font-bold">Total</dt>
                      <dd className="text-base font-bold text-[var(--color-primary)]">
                        {formatMoney(cost.totalAmount.amount, cost.totalAmount.currencyCode)}
                      </dd>
                    </div>
                  )}
                </div>
              </dl>

              {checkoutUrl ? (
                <a
                  href={checkoutUrl}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] py-3.5 text-sm font-bold text-white hover:bg-[var(--color-primary-light)] transition-colors"
                >
                  Proceed to Checkout
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </a>
              ) : (
                <div className="mt-6 rounded-[var(--radius-md)] bg-gray-100 py-3.5 text-center text-sm text-[var(--color-text-secondary)]">
                  Initializing cart...
                </div>
              )}

              <p className="mt-3 text-center text-xs text-[var(--color-text-secondary)]">
                Secure checkout powered by Shopify
              </p>
            </div>
          </div>
        </div>
      )}
    </Container>
  );
}
