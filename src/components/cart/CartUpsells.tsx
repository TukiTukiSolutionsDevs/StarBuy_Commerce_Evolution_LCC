'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useCart } from '@shopify/hydrogen-react';

type UpsellProduct = {
  id: string;
  title: string;
  handle: string;
  availableForSale: boolean;
  featuredImage: { url: string; altText: string | null } | null;
  priceRange: {
    minVariantPrice: { amount: string; currencyCode: string };
  };
  variants: {
    edges: Array<{
      node: { id: string; availableForSale: boolean };
    }>;
  };
};

function formatPrice(amount: string, currencyCode: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 2,
  }).format(parseFloat(amount));
}

export function CartUpsells() {
  const { lines, linesAdd, status } = useCart();
  const [products, setProducts] = useState<UpsellProduct[]>([]);
  const [addingId, setAddingId] = useState<string | null>(null);

  useEffect(() => {
    const cartProductIds = (lines ?? [])
      .map((line) => {
        const merch = line?.merchandise;
        if (merch && 'product' in merch && merch.product && 'id' in merch.product) {
          return (merch.product as { id: string }).id;
        }
        return null;
      })
      .filter(Boolean);

    const excludeParam = cartProductIds.join(',');

    fetch(`/api/recommendations?exclude=${encodeURIComponent(excludeParam)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.products?.length > 0) {
          setProducts(data.products);
        }
      })
      .catch(() => {
        // Silently fail — hide section
      });
  }, [lines]);

  if (products.length === 0) return null;

  const isUpdating = status === 'creating' || status === 'updating';

  function handleAdd(product: UpsellProduct) {
    const variantId = product.variants?.edges?.[0]?.node?.id;
    if (!variantId) return;
    setAddingId(product.id);
    linesAdd([{ merchandiseId: variantId, quantity: 1 }]);
    // Clear adding state after a delay
    setTimeout(() => setAddingId(null), 1500);
  }

  return (
    <section className="mt-10">
      <div className="flex items-center gap-4 mb-6">
        <h2 className="font-headline text-2xl text-[#303330] whitespace-nowrap">
          Complete Your Order
        </h2>
        <div className="flex-1 h-px bg-[#eeeeea]" />
      </div>

      <div className="flex overflow-x-auto gap-4 snap-x snap-mandatory pb-2 scrollbar-thin scrollbar-thumb-[#e1e3df] scrollbar-track-transparent">
        {products.map((product) => (
          <div
            key={product.id}
            className="min-w-[200px] max-w-[220px] flex-shrink-0 snap-start rounded-2xl bg-[#ffffff] overflow-hidden group hover:shadow-[0_32px_64px_rgba(0,0,0,0.04)] hover:-translate-y-1 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]"
          >
            <Link
              href={`/products/${product.handle}`}
              className="relative block aspect-square bg-[#f4f4f0]"
            >
              {product.featuredImage ? (
                <Image
                  src={product.featuredImage.url}
                  alt={product.featuredImage.altText ?? product.title}
                  fill
                  sizes="220px"
                  className="object-cover group-hover:scale-105 transition-transform duration-700"
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <span className="material-symbols-outlined text-4xl text-[#b1b2af]">
                    shopping_bag
                  </span>
                </div>
              )}
            </Link>
            <div className="p-4">
              <Link href={`/products/${product.handle}`}>
                <h3 className="font-body text-sm text-[#303330] line-clamp-2 hover:text-[#795a00] transition-colors mb-1">
                  {product.title}
                </h3>
              </Link>
              <p className="text-sm font-bold text-[#795a00] mb-2">
                {formatPrice(
                  product.priceRange.minVariantPrice.amount,
                  product.priceRange.minVariantPrice.currencyCode,
                )}
              </p>
              {product.availableForSale ? (
                <button
                  onClick={() => handleAdd(product)}
                  disabled={isUpdating || addingId === product.id}
                  className="w-full flex items-center justify-center gap-1.5 rounded border border-[#0060ad]/20 text-[#0060ad] py-2 text-xs font-bold tracking-widest hover:bg-[#0060ad]/5 transition-colors disabled:opacity-50"
                >
                  {addingId === product.id ? (
                    <>
                      <span className="material-symbols-outlined text-sm animate-spin">
                        progress_activity
                      </span>
                      Added
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-sm">add_shopping_cart</span>
                      Add to Cart
                    </>
                  )}
                </button>
              ) : (
                <span className="block w-full text-center rounded bg-[#f4f4f0] text-[#b1b2af] py-2 text-xs font-medium">
                  Out of Stock
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
