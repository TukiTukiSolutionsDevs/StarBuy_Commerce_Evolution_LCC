'use client';

import { useState } from 'react';
import { useCart } from '@shopify/hydrogen-react';
import { useCartDrawer } from '@/components/cart/CartDrawerContext';

type AddToCartButtonProps = {
  variantId: string;
  availableForSale: boolean;
  quantity: number;
};

export function AddToCartButton({ variantId, availableForSale, quantity }: AddToCartButtonProps) {
  const { linesAdd, status } = useCart();
  const { openCart } = useCartDrawer();
  const [added, setAdded] = useState(false);

  const isLoading = status === 'creating' || status === 'updating';

  async function handleAddToCart() {
    if (!availableForSale || !variantId) return;

    try {
      linesAdd([
        {
          merchandiseId: variantId,
          quantity,
        },
      ]);

      setAdded(true);
      setTimeout(() => {
        setAdded(false);
        openCart();
      }, 800);
    } catch {
      // Error handled by hydrogen-react internally
    }
  }

  if (!availableForSale) {
    return (
      <button
        disabled
        className="w-full bg-slate-200 text-slate-400 font-bold h-[56px] rounded-lg cursor-not-allowed"
      >
        Out of Stock
      </button>
    );
  }

  return (
    <button
      onClick={handleAddToCart}
      disabled={isLoading || added}
      className={[
        'w-full font-bold h-[56px] rounded-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2',
        added ? 'bg-[#10B981] text-white' : 'bg-[#795a00] hover:bg-[#6b4f00] text-[#fff8f0]',
        isLoading || added ? 'opacity-90' : '',
      ].join(' ')}
    >
      {isLoading ? (
        <>
          <span className="material-symbols-outlined text-xl animate-spin" aria-hidden="true">
            progress_activity
          </span>
          Adding...
        </>
      ) : added ? (
        <>
          <span className="material-symbols-outlined text-xl" aria-hidden="true">
            check_circle
          </span>
          Added to Cart!
        </>
      ) : (
        <>
          <span className="material-symbols-outlined text-xl" aria-hidden="true">
            shopping_cart
          </span>
          Add to Cart
        </>
      )}
    </button>
  );
}
