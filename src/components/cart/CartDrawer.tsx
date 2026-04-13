'use client';

import Image from 'next/image';
import { useCart } from '@shopify/hydrogen-react';
import { useCartDrawer } from './CartDrawerContext';
import Link from 'next/link';
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
          className="fixed inset-0 z-40 bg-[#303330]/30 backdrop-blur-sm transition-opacity"
          onClick={closeCart}
          aria-hidden="true"
        />
      )}

      {/* Drawer panel */}
      <div
        className={[
          'fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-[#faf9f6] shadow-2xl transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]',
          isOpen ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
        aria-label="Shopping cart"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4">
          <h2 className="font-headline text-xl text-[#303330]">
            Your Cart
            {totalQuantity != null && totalQuantity > 0 && (
              <span className="ml-2 text-sm font-medium text-[#5d605c]">
                ({totalQuantity} {totalQuantity === 1 ? 'item' : 'items'})
              </span>
            )}
          </h2>
          <button
            onClick={closeCart}
            className="rounded-full p-2 text-[#5d605c] hover:text-[#303330] hover:bg-[#f4f4f0] transition-colors"
            aria-label="Close cart"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {cartLines.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-5 py-12 text-center">
              <div className="w-20 h-20 rounded-full bg-[#f4f4f0] flex items-center justify-center">
                <span
                  className="material-symbols-outlined text-4xl text-[#e1e3df]"
                  aria-hidden="true"
                >
                  shopping_bag
                </span>
              </div>
              <p className="text-[#5d605c] font-medium">Your cart is empty</p>
              <p className="text-sm text-[#5d605c]">Discover our latest products and deals</p>
              <Button variant="primary" onClick={closeCart}>
                Continue Shopping
              </Button>

              {/* Quick links */}
              <div className="w-full mt-4 pt-6 space-y-2">
                <p className="text-xs font-semibold text-[#5d605c] uppercase tracking-wider">
                  Popular Categories
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {[
                    { label: 'Trending', href: '/collections/trending' },
                    { label: 'New Arrivals', href: '/collections/new-arrivals' },
                    { label: 'Deals', href: '/collections/deals' },
                    { label: 'All Products', href: '/collections/all' },
                  ].map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={closeCart}
                      className="rounded-full bg-[#f4f4f0] px-3 py-1.5 text-xs font-medium text-[#303330] hover:text-[#795a00] transition-colors"
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <ul className="space-y-4">
              {cartLines.map((line, index) => {
                if (!line?.merchandise || !line.id) return null;
                const lineId = line.id;
                const qty = line.quantity ?? 1;
                const merch = line.merchandise;
                const productTitle =
                  'product' in merch && merch.product && 'title' in merch.product
                    ? (merch.product as { title: string }).title
                    : (merch.title ?? '');
                const variantTitle = merch.title ?? '';
                // Image from merchandise
                const imgData =
                  'image' in merch
                    ? (merch.image as { url?: string; altText?: string | null } | null | undefined)
                    : null;
                const imgUrl = imgData?.url;
                const imgAlt = imgData?.altText ?? variantTitle;
                const lineTotal = line.cost?.totalAmount;

                return (
                  <li
                    key={lineId}
                    className={`flex gap-4 py-4 ${index % 2 === 1 ? 'bg-[#f4f4f0] -mx-2 px-2 rounded-xl' : ''}`}
                  >
                    {/* Image */}
                    <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-[#f4f4f0]">
                      {imgUrl ? (
                        <Image
                          src={imgUrl}
                          alt={imgAlt ?? ''}
                          fill
                          sizes="80px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-[#b1b2af]">
                          <span className="material-symbols-outlined text-2xl">image</span>
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex flex-1 flex-col gap-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium text-[#303330] line-clamp-2">
                            {productTitle}
                          </p>
                          {variantTitle && variantTitle !== 'Default Title' && (
                            <p className="text-xs text-[#5d605c]">{variantTitle}</p>
                          )}
                        </div>
                        <button
                          onClick={() => linesRemove([lineId])}
                          className="text-[#b1b2af] hover:text-[#ac3149] transition-colors flex-shrink-0"
                          aria-label="Remove item"
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
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      </div>

                      <div className="flex items-center justify-between">
                        {/* Quantity controls */}
                        <div className="flex items-center gap-1 rounded-lg bg-[#f4f4f0]">
                          <button
                            onClick={() => {
                              if (qty > 1) {
                                linesUpdate([{ id: lineId, quantity: qty - 1 }]);
                              } else {
                                linesRemove([lineId]);
                              }
                            }}
                            className="flex h-7 w-7 items-center justify-center text-[#5d605c] hover:text-[#303330]"
                            aria-label="Decrease quantity"
                          >
                            <svg
                              className="h-3.5 w-3.5"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
                            </svg>
                          </button>
                          <span className="min-w-[20px] text-center text-sm font-medium text-[#303330]">
                            {qty}
                          </span>
                          <button
                            onClick={() => linesUpdate([{ id: lineId, quantity: qty + 1 }])}
                            className="flex h-7 w-7 items-center justify-center text-[#5d605c] hover:text-[#303330]"
                            aria-label="Increase quantity"
                          >
                            <svg
                              className="h-3.5 w-3.5"
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

                        {/* Line total */}
                        {lineTotal?.amount && lineTotal?.currencyCode && (
                          <p className="text-sm font-bold text-[#795a00]">
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
          <div className="px-6 py-4 space-y-4">
            {/* Subtotal */}
            {cost?.subtotalAmount?.amount && cost?.subtotalAmount?.currencyCode && (
              <div className="flex justify-between text-sm">
                <span className="text-[#5d605c]">Subtotal</span>
                <span className="font-semibold text-[#303330]">
                  {formatMoney(cost.subtotalAmount.amount, cost.subtotalAmount.currencyCode)}
                </span>
              </div>
            )}
            {cost?.totalAmount?.amount && cost?.totalAmount?.currencyCode && (
              <div className="flex justify-between text-base font-bold">
                <span className="text-[#303330]">Total</span>
                <span className="text-[#795a00]">
                  {formatMoney(cost.totalAmount.amount, cost.totalAmount.currencyCode)}
                </span>
              </div>
            )}

            <p className="text-xs text-[#5d605c] text-center">
              Shipping and taxes calculated at checkout
            </p>

            {/* Checkout button */}
            {checkoutUrl && (
              <a
                href={checkoutUrl}
                className="flex w-full items-center justify-center gap-2 rounded-lg stardust-gradient px-6 py-3 text-sm font-bold tracking-widest text-[#fff8f0] hover:shadow-[0_0_20px_rgba(121,90,0,0.3)] transition-all duration-500"
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
                    d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
                  />
                </svg>
                Proceed to Checkout
                {status === 'updating' && (
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                )}
              </a>
            )}

            <button
              onClick={closeCart}
              className="w-full text-center text-sm text-[#5d605c] hover:text-[#795a00] transition-colors"
            >
              Continue Shopping
            </button>
          </div>
        )}
      </div>
    </>
  );
}
