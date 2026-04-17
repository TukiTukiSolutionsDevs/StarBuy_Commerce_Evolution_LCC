'use client';

import { useState } from 'react';
import type { ShopifyProduct, ShopifyProductVariant } from '@/lib/shopify/types';
import { VariantSelector } from './VariantSelector';
import { QuantitySelector } from './QuantitySelector';
import { AddToCartButton } from './AddToCartButton';

type ProductActionsProps = {
  product: ShopifyProduct;
};

function formatPrice(amount: string, currencyCode: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 2,
  }).format(parseFloat(amount));
}

export function ProductActions({ product }: ProductActionsProps) {
  const variants = product.variants.edges.map((e) => e.node);
  const defaultVariant = variants[0];

  const [selectedVariant, setSelectedVariant] = useState<ShopifyProductVariant | undefined>(
    defaultVariant,
  );
  const [quantity, setQuantity] = useState(1);

  const currentPrice = selectedVariant?.price ?? product.priceRange.minVariantPrice;
  const currentCompareAt =
    selectedVariant?.compareAtPrice ??
    (parseFloat(product.compareAtPriceRange?.minVariantPrice?.amount ?? '0') > 0
      ? product.compareAtPriceRange?.minVariantPrice
      : null);

  const hasDiscount =
    currentCompareAt && parseFloat(currentCompareAt.amount) > parseFloat(currentPrice.amount);

  const hasOptions =
    product.options.length > 0 &&
    !(
      product.options.length === 1 &&
      product.options[0].values.length === 1 &&
      product.options[0].values[0] === 'Default Title'
    );

  // Calculate savings percentage
  const savingsPct =
    hasDiscount && currentCompareAt
      ? Math.round(
          ((parseFloat(currentCompareAt.amount) - parseFloat(currentPrice.amount)) /
            parseFloat(currentCompareAt.amount)) *
            100,
        )
      : 0;

  return (
    <div className="space-y-6">
      {/* Price — Stitch style */}
      <div className="flex items-baseline gap-4">
        <span className="text-4xl font-bold text-[#795a00]">
          {formatPrice(currentPrice.amount, currentPrice.currencyCode)}
        </span>
        {hasDiscount && currentCompareAt && (
          <>
            <span className="text-xl text-[#b1b2af] line-through">
              {formatPrice(currentCompareAt.amount, currentCompareAt.currencyCode)}
            </span>
            <span className="bg-[#ac3149] text-white text-xs font-bold px-2 py-1 rounded-full">
              Save {savingsPct}%
            </span>
          </>
        )}
      </div>

      {/* Variant Selector */}
      {hasOptions && (
        <VariantSelector
          options={product.options}
          variants={variants}
          onVariantChange={setSelectedVariant}
        />
      )}

      {/* Quantity + Add to Cart — Stitch style (side by side) */}
      <div className="flex flex-col sm:flex-row gap-4">
        <QuantitySelector
          quantity={quantity}
          onQuantityChange={setQuantity}
          max={selectedVariant?.quantityAvailable ?? 99}
        />

        {/* Add to Cart */}
        {selectedVariant && (
          <div className="flex-[2]">
            <AddToCartButton
              variantId={selectedVariant.id}
              availableForSale={selectedVariant.availableForSale}
              quantity={quantity}
            />
          </div>
        )}
      </div>

      {/* Availability indicator */}
      {selectedVariant && (
        <div className="flex items-center gap-2">
          {selectedVariant.availableForSale ? (
            <>
              <span
                className="inline-block h-2 w-2 rounded-full bg-emerald-500"
                aria-hidden="true"
              />
              <span className="text-sm font-medium text-emerald-600">
                {selectedVariant.quantityAvailable != null &&
                selectedVariant.quantityAvailable <= 10 &&
                selectedVariant.quantityAvailable > 0
                  ? `Only ${selectedVariant.quantityAvailable} left in stock`
                  : 'In Stock — Ready to Ship'}
              </span>
            </>
          ) : (
            <>
              <span className="inline-block h-2 w-2 rounded-full bg-red-500" aria-hidden="true" />
              <span className="text-sm font-medium text-red-600">Out of Stock</span>
            </>
          )}
        </div>
      )}

      {/* Shipping note — Stitch style */}
      <div className="flex items-center gap-3 p-4 bg-[#f4f4f0] rounded-xl">
        <span
          className="material-symbols-outlined text-[#795a00]"
          style={{ fontVariationSettings: "'FILL' 1" }}
          aria-hidden="true"
        >
          local_shipping
        </span>
        <span className="text-sm font-medium text-[#303330]">Free shipping on orders over $50</span>
      </div>
    </div>
  );
}
