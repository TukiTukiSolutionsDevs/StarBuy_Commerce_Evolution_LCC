'use client';

import { useCart } from '@shopify/hydrogen-react';
import { useCartDrawer } from '@/components/cart/CartDrawerContext';

export function CartCount() {
  const { totalQuantity = 0 } = useCart();
  const { openCart } = useCartDrawer();

  return (
    <button
      onClick={openCart}
      aria-label={`Open cart, ${totalQuantity} items`}
      className="relative p-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors active:scale-95"
    >
      <span className="material-symbols-outlined text-xl" aria-hidden="true">
        shopping_cart
      </span>
      {totalQuantity > 0 && (
        <span
          aria-label={`${totalQuantity} items`}
          className="absolute top-1 right-1 bg-amber-400 text-[#1B2A5E] text-[10px] font-bold h-4 w-4 rounded-full flex items-center justify-center"
        >
          {totalQuantity > 99 ? '99+' : totalQuantity}
        </span>
      )}
    </button>
  );
}
