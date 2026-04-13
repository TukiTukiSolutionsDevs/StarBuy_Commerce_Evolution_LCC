'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useCart } from '@shopify/hydrogen-react';
import { CartUpsells } from './CartUpsells';
import { RecentlyViewed } from '@/components/product/RecentlyViewed';

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
  const [discountCode, setDiscountCode] = useState('');

  return (
    <div className="min-h-screen bg-[#faf9f6]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Breadcrumbs */}
        <nav aria-label="Breadcrumb" className="mb-6">
          <ol className="flex items-center gap-2 text-sm text-[#5d605c]">
            <li>
              <Link href="/" className="hover:text-[#795a00] transition-colors">
                Home
              </Link>
            </li>
            <li aria-hidden="true">
              <span className="material-symbols-outlined text-sm text-[#b1b2af]">
                chevron_right
              </span>
            </li>
            <li className="text-[#303330] font-medium">Shopping Cart</li>
          </ol>
        </nav>

        {/* Header */}
        <h1 className="font-headline text-3xl sm:text-4xl text-[#303330] mb-8">
          Shopping Cart
          {totalQuantity != null && totalQuantity > 0 && (
            <span className="ml-3 text-lg font-normal text-[#5d605c]">
              ({totalQuantity} {totalQuantity === 1 ? 'item' : 'items'})
            </span>
          )}
        </h1>

        {cartLines.length === 0 ? (
          /* ── Empty cart state ──────────────────────────────────────────── */
          <div className="flex flex-col items-center justify-center gap-6 py-24 text-center">
            <div className="w-24 h-24 rounded-full bg-[#f4f4f0] flex items-center justify-center">
              <span
                className="material-symbols-outlined text-5xl text-[#e1e3df]"
                aria-hidden="true"
              >
                shopping_bag
              </span>
            </div>
            <div>
              <h2 className="font-headline text-xl text-[#303330] mb-2">Your cart is empty</h2>
              <p className="text-[#5d605c] mb-6">Looks like you haven&apos;t added anything yet.</p>
            </div>
            <Link
              href="/collections/all"
              className="inline-flex items-center gap-2 rounded-lg stardust-gradient px-8 py-3 text-sm font-bold tracking-widest text-[#fff8f0] hover:shadow-[0_0_20px_rgba(121,90,0,0.3)] transition-all duration-500"
            >
              <span className="material-symbols-outlined text-base" aria-hidden="true">
                storefront
              </span>
              Continue Shopping
            </Link>
          </div>
        ) : (
          /* ── Cart with items ───────────────────────────────────────────── */
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {/* Left: Cart items (2/3) */}
            <div className="lg:col-span-2">
              <div className="rounded-2xl bg-[#ffffff] p-6 overflow-hidden">
                <ul className="space-y-6">
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
                        ? (merch.image as
                            | { url?: string; altText?: string | null }
                            | null
                            | undefined)
                        : null;
                    const imgUrl = imgData?.url;
                    const imgAlt = imgData?.altText ?? variantTitle;
                    const lineTotal = line.cost?.totalAmount;

                    return (
                      <li key={lineId} className="flex gap-4 sm:gap-5">
                        {/* Product image */}
                        <div className="relative h-20 w-20 sm:h-24 sm:w-24 flex-shrink-0 overflow-hidden rounded-xl bg-[#f4f4f0]">
                          {imgUrl ? (
                            <Image
                              src={imgUrl}
                              alt={imgAlt ?? ''}
                              fill
                              sizes="96px"
                              className="object-cover"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-[#b1b2af]">
                              <span className="material-symbols-outlined text-3xl">image</span>
                            </div>
                          )}
                        </div>

                        {/* Details */}
                        <div className="flex flex-1 flex-col justify-between min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              {productHandle ? (
                                <Link
                                  href={`/products/${productHandle}`}
                                  className="font-headline text-base text-[#303330] hover:text-[#795a00] transition-colors line-clamp-1"
                                >
                                  {productTitle}
                                </Link>
                              ) : (
                                <span className="font-headline text-base text-[#303330] line-clamp-1">
                                  {productTitle}
                                </span>
                              )}
                              {variantTitle && variantTitle !== 'Default Title' && (
                                <p className="text-xs text-[#5d605c] mt-0.5">{variantTitle}</p>
                              )}
                            </div>

                            {/* Line price — desktop */}
                            {lineTotal?.amount && lineTotal?.currencyCode && (
                              <p className="hidden sm:block text-[#795a00] font-bold whitespace-nowrap">
                                {formatMoney(lineTotal.amount, lineTotal.currencyCode)}
                              </p>
                            )}
                          </div>

                          {/* Bottom row: quantity + price (mobile) + remove */}
                          <div className="flex items-center justify-between mt-3">
                            {/* Quantity controls */}
                            <div className="flex items-center rounded-lg bg-[#f4f4f0]">
                              <button
                                onClick={() => {
                                  if (qty > 1) {
                                    linesUpdate([{ id: lineId, quantity: qty - 1 }]);
                                  } else {
                                    linesRemove([lineId]);
                                  }
                                }}
                                disabled={isLoading}
                                className="flex h-8 w-8 items-center justify-center text-[#5d605c] hover:text-[#303330] disabled:opacity-50 transition-colors"
                                aria-label="Decrease quantity"
                              >
                                <span className="material-symbols-outlined text-lg">remove</span>
                              </button>
                              <span className="min-w-[32px] text-center text-sm font-semibold text-[#303330]">
                                {qty}
                              </span>
                              <button
                                onClick={() => linesUpdate([{ id: lineId, quantity: qty + 1 }])}
                                disabled={isLoading}
                                className="flex h-8 w-8 items-center justify-center text-[#5d605c] hover:text-[#303330] disabled:opacity-50 transition-colors"
                                aria-label="Increase quantity"
                              >
                                <span className="material-symbols-outlined text-lg">add</span>
                              </button>
                            </div>

                            <div className="flex items-center gap-3">
                              {/* Line price — mobile */}
                              {lineTotal?.amount && lineTotal?.currencyCode && (
                                <p className="sm:hidden text-[#795a00] font-bold text-sm">
                                  {formatMoney(lineTotal.amount, lineTotal.currencyCode)}
                                </p>
                              )}

                              {/* Remove button */}
                              <button
                                onClick={() => linesRemove([lineId])}
                                disabled={isLoading}
                                className="flex items-center gap-1 text-sm text-[#b1b2af] hover:text-[#ac3149] transition-colors disabled:opacity-50"
                                aria-label={`Remove ${productTitle}`}
                              >
                                <span className="material-symbols-outlined text-lg">delete</span>
                                <span className="hidden sm:inline">Remove</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>

              {/* Continue shopping link */}
              <Link
                href="/collections/all"
                className="inline-flex items-center gap-1.5 mt-4 text-sm font-medium text-[#5d605c] hover:text-[#795a00] transition-colors"
              >
                <span className="material-symbols-outlined text-base">arrow_back</span>
                Continue Shopping
              </Link>

              {/* Upsells */}
              <CartUpsells />
            </div>

            {/* Right: Order summary (1/3) */}
            <div>
              <div className="rounded-2xl bg-[#ffffff] p-6 sticky top-24 shadow-[0_8px_32px_rgba(0,0,0,0.04)]">
                <h2 className="font-headline text-lg text-[#303330] mb-5">Order Summary</h2>

                <dl className="space-y-3 text-sm">
                  {cost?.subtotalAmount?.amount && cost?.subtotalAmount?.currencyCode && (
                    <div className="flex justify-between">
                      <dt className="text-[#5d605c]">Subtotal</dt>
                      <dd className="font-semibold text-[#303330]">
                        {formatMoney(cost.subtotalAmount.amount, cost.subtotalAmount.currencyCode)}
                      </dd>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <dt className="text-[#5d605c]">Shipping</dt>
                    <dd className="text-[#5d605c] italic">Calculated at checkout</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-[#5d605c]">Taxes</dt>
                    <dd className="text-[#5d605c] italic">Calculated at checkout</dd>
                  </div>
                </dl>

                {/* Discount code input */}
                <div className="mt-5 pt-5">
                  <label htmlFor="discount-code" className="block text-sm text-[#5d605c] mb-2">
                    Discount Code
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="discount-code"
                      type="text"
                      value={discountCode}
                      onChange={(e) => setDiscountCode(e.target.value)}
                      placeholder="Enter code"
                      className="flex-1 rounded-lg bg-[#f4f4f0] border-none px-3 py-2 text-sm text-[#303330] placeholder-[#b1b2af] focus:outline-none focus:ring-1 focus:ring-[#795a00]/30 transition-colors"
                    />
                    <button className="rounded-lg bg-[#0060ad] px-4 py-2 text-sm font-bold text-[#f8f8ff] hover:bg-[#005396] transition-colors">
                      Apply
                    </button>
                  </div>
                </div>

                {/* Total */}
                <div className="mt-5 pt-5">
                  {cost?.totalAmount?.amount && cost?.totalAmount?.currencyCode && (
                    <div className="flex justify-between">
                      <dt className="text-base text-[#5d605c]">Total</dt>
                      <dd className="text-xl font-bold text-[#795a00]">
                        {formatMoney(cost.totalAmount.amount, cost.totalAmount.currencyCode)}
                      </dd>
                    </div>
                  )}
                </div>

                {/* Checkout button */}
                {checkoutUrl ? (
                  <a
                    href={checkoutUrl}
                    className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg stardust-gradient py-3.5 text-sm font-bold tracking-widest text-[#fff8f0] hover:shadow-[0_0_20px_rgba(121,90,0,0.3)] transition-all duration-500 active:scale-[0.98]"
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
                  <div className="mt-6 rounded-lg bg-[#f4f4f0] py-3.5 text-center text-sm text-[#b1b2af]">
                    Initializing cart&hellip;
                  </div>
                )}

                {/* Secure badge */}
                <p className="mt-3 text-center text-xs text-[#5d605c] flex items-center justify-center gap-1">
                  <span className="material-symbols-outlined text-sm" aria-hidden="true">
                    shield
                  </span>
                  Secure checkout powered by Shopify
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Recently Viewed */}
        <div className="mt-12">
          <RecentlyViewed />
        </div>
      </div>

      {/* Mobile sticky checkout bar */}
      {cartLines.length > 0 && checkoutUrl && (
        <div className="fixed bottom-0 left-0 right-0 z-30 lg:hidden bg-[#ffffff]/95 backdrop-blur-sm p-4 shadow-[0_-8px_32px_rgba(0,0,0,0.04)]">
          <a
            href={checkoutUrl}
            className="flex w-full items-center justify-center gap-2 rounded-lg stardust-gradient py-3 text-sm font-bold tracking-widest text-[#fff8f0] hover:shadow-[0_0_20px_rgba(121,90,0,0.3)] transition-all duration-500"
          >
            <span className="material-symbols-outlined text-base" aria-hidden="true">
              lock
            </span>
            Checkout
            {cost?.totalAmount?.amount && cost?.totalAmount?.currencyCode && (
              <span>
                &middot; {formatMoney(cost.totalAmount.amount, cost.totalAmount.currencyCode)}
              </span>
            )}
          </a>
        </div>
      )}
    </div>
  );
}
