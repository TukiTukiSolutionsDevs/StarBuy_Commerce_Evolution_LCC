'use client';

import { useState } from 'react';
import { useCart } from '@shopify/hydrogen-react';
import { useCartDrawer } from '@/components/cart/CartDrawerContext';

type ProductCardAddButtonProps = {
  /** The first available variant ID of the product (GID format) */
  variantId: string | null;
  productTitle: string;
};

/**
 * "Add to Cart" icon-button used inside ProductCard.
 * Kept as a dedicated 'use client' component so ProductCard itself
 * can remain a Server Component when rendered in RSC contexts.
 */
export function ProductCardAddButton({ variantId, productTitle }: ProductCardAddButtonProps) {
  const { linesAdd, status } = useCart();
  const { openCart } = useCartDrawer();
  const [added, setAdded] = useState(false);

  const isLoading = status === 'creating' || status === 'updating';

  function handleClick() {
    if (!variantId || isLoading || added) return;

    linesAdd([{ merchandiseId: variantId, quantity: 1 }]);

    setAdded(true);
    setTimeout(() => {
      setAdded(false);
      openCart();
    }, 800);
  }

  return (
    <button
      onClick={handleClick}
      disabled={isLoading || added}
      aria-label={`Add ${productTitle} to cart`}
      className={[
        'p-2 rounded-lg transition-all active:scale-95 flex items-center justify-center',
        added ? 'bg-emerald-500 text-white' : 'bg-[#1B2A5E] hover:bg-[#2a3f7e] text-white',
        isLoading ? 'opacity-70 cursor-wait' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {isLoading ? (
        <span className="material-symbols-outlined text-xl animate-spin" aria-hidden="true">
          progress_activity
        </span>
      ) : added ? (
        <span
          className="material-symbols-outlined text-xl"
          aria-hidden="true"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          check_circle
        </span>
      ) : (
        <span className="material-symbols-outlined text-xl" aria-hidden="true">
          shopping_cart
        </span>
      )}
    </button>
  );
}
