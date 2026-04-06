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
        <ol className="flex items-center gap-2 text-sm text-slate-500">
          <li>
            <Link href="/" className="hover:text-[#1B2A5E] transition-colors">
              Home
            </Link>
          </li>
          <li aria-hidden="true">
            <span className="material-symbols-outlined text-sm text-slate-300">chevron_right</span>
          </li>
          <li className="text-[#1B2A5E] font-medium">Shopping Cart</li>
        </ol>
      </nav>

      <h1 className="text-4xl font-extrabold text-[#1B2A5E] font-[var(--font-heading)] mb-8">
        Shopping Cart
        {totalQuantity != null && totalQuantity > 0 && (
          <span className="ml-3 text-lg font-normal text-slate-500">
            ({totalQuantity} {totalQuantity === 1 ? 'item' : 'items'})
          </span>
        )}
      </h1>

      {cartLines.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-6 py-24 text-center">
          <span className="material-symbols-outlined text-[96px] text-gray-200" aria-hidden="true">
            shopping_cart
          </span>
          <div>
            <h2 className="text-xl font-bold text-[#1B2A5E] font-[var(--font-heading)] mb-2">
              Your cart is empty
            </h2>
            <p className="text-slate-500 mb-6">Looks like you haven&apos;t added anything yet.</p>
          </div>
          <Link
            href="/collections/all"
            className="inline-flex items-center gap-2 rounded-lg bg-[#1B2A5E] px-6 py-3 text-sm font-semibold text-white hover:bg-[#2a3f7e] transition-colors"
          >
            <span className="material-symbols-outlined text-base" aria-hidden="true">
              storefront
            </span>
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
                const productTitle =
                  'product' in merch && merch.product && 'title' in merch.product
                    ? (merch.product as { title: string; handle?: string }).title
                    : (merch.title ?? '');
                const productHandle =
                  'product' in merch && merch.product && 'handle' in merch.product
                    ? (merch.product as { handle: string }).handle
                    : null;
                const variantTitle = merch.title ?? '';
                const imgData =
                  'image' in merch
                    ? (merch.image as { url?: string; altText?: string | null } | null | undefined)
                    : null;
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
                          <svg
                            className="h-10 w-10"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={1}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159"
                            />
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
                            <svg
                              className="h-4 w-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
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
                            <svg
                              className="h-4 w-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M12 4v16m8-8H4"
                              />
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
              className="inline-flex items-center gap-1 text-sm font-medium text-[#1B2A5E] hover:text-[#2a3f7e] transition-colors"
            >
              <span className="material-symbols-outlined text-base" aria-hidden="true">
                arrow_back
              </span>
              Continue Shopping
            </Link>
          </div>

          {/* Order summary */}
          <div>
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sticky top-24">
              <h2 className="text-lg font-bold text-[#1B2A5E] font-[var(--font-heading)] mb-4">
                Order Summary
              </h2>

              <dl className="space-y-3">
                {cost?.subtotalAmount?.amount && cost?.subtotalAmount?.currencyCode && (
                  <div className="flex justify-between text-sm">
                    <dt className="text-slate-500">Subtotal</dt>
                    <dd className="font-semibold text-[#1A1A2E]">
                      {formatMoney(cost.subtotalAmount.amount, cost.subtotalAmount.currencyCode)}
                    </dd>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <dt className="text-slate-500">Shipping</dt>
                  <dd className="font-medium text-emerald-600">Calculated at checkout</dd>
                </div>
                <div className="flex justify-between text-sm">
                  <dt className="text-slate-500">Taxes</dt>
                  <dd className="font-medium text-slate-500">Calculated at checkout</dd>
                </div>

                <div className="border-t border-gray-200 pt-3">
                  {cost?.totalAmount?.amount && cost?.totalAmount?.currencyCode && (
                    <div className="flex justify-between">
                      <dt className="text-base font-bold text-[#1A1A2E]">Total</dt>
                      <dd className="text-base font-bold text-[#1B2A5E]">
                        {formatMoney(cost.totalAmount.amount, cost.totalAmount.currencyCode)}
                      </dd>
                    </div>
                  )}
                </div>
              </dl>

              {checkoutUrl ? (
                <a
                  href={checkoutUrl}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-[#1B2A5E] py-3.5 text-sm font-bold text-white hover:bg-[#2a3f7e] transition-colors active:scale-[0.98]"
                >
                  <span className="material-symbols-outlined text-base" aria-hidden="true">
                    lock
                  </span>
                  Proceed to Checkout
                  {isLoading && (
                    <span
                      className="material-symbols-outlined text-base animate-spin"
                      aria-hidden="true"
                    >
                      progress_activity
                    </span>
                  )}
                </a>
              ) : (
                <div className="mt-6 rounded-lg bg-gray-100 py-3.5 text-center text-sm text-slate-400">
                  Initializing cart…
                </div>
              )}

              <p className="mt-3 text-center text-xs text-slate-400 flex items-center justify-center gap-1">
                <span className="material-symbols-outlined text-sm" aria-hidden="true">
                  shield
                </span>
                Secure checkout powered by Shopify
              </p>
            </div>
          </div>
        </div>
      )}
    </Container>
  );
}
