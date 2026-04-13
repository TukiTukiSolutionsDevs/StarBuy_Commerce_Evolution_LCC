'use client';

import { useEffect, useState } from 'react';
import { useCart } from '@shopify/hydrogen-react';
import { useCartDrawer } from '@/components/cart/CartDrawerContext';

type StickyAddToCartProps = {
  variantId: string | undefined;
  availableForSale: boolean;
  price: { amount: string; currencyCode: string };
  title: string;
};

function formatPrice(amount: string, currencyCode: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 2,
  }).format(parseFloat(amount));
}

export function StickyAddToCart({
  variantId,
  availableForSale,
  price,
  title,
}: StickyAddToCartProps) {
  const { linesAdd, status } = useCart();
  const { openCart } = useCartDrawer();
  const [visible, setVisible] = useState(false);
  const [added, setAdded] = useState(false);

  const isLoading = status === 'creating' || status === 'updating';

  useEffect(() => {
    function handleScroll() {
      // Show after scrolling past the main add-to-cart button (~500px)
      setVisible(window.scrollY > 500);
    }

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  function handleAdd() {
    if (!availableForSale || !variantId) return;

    linesAdd([{ merchandiseId: variantId, quantity: 1 }]);
    setAdded(true);
    setTimeout(() => {
      setAdded(false);
      openCart();
    }, 800);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#b1b2af] bg-[#faf9f6]/95 backdrop-blur-xl px-4 py-3 shadow-[0_-4px_12px_rgba(48,51,48,0.08)] lg:hidden">
      <div className="flex items-center gap-3 max-w-7xl mx-auto">
        {/* Product info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-[#303330] font-headline line-clamp-1">{title}</p>
          <p className="text-sm font-semibold text-[#795a00]">
            {formatPrice(price.amount, price.currencyCode)}
          </p>
        </div>

        {/* Add to Cart button */}
        {availableForSale ? (
          <button
            onClick={handleAdd}
            disabled={isLoading || added || !variantId}
            className={[
              'flex-shrink-0 flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold transition-all active:scale-[0.97]',
              added
                ? 'bg-green-600 text-white'
                : 'stardust-gradient text-[#5c4300] hover:shadow-lg',
              isLoading || added ? 'opacity-90' : '',
            ].join(' ')}
          >
            {isLoading ? (
              <span className="material-symbols-outlined text-lg animate-spin" aria-hidden="true">
                progress_activity
              </span>
            ) : added ? (
              <>
                <span className="material-symbols-outlined text-lg" aria-hidden="true">
                  check_circle
                </span>
                Added!
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-lg" aria-hidden="true">
                  shopping_cart
                </span>
                Add to Cart
              </>
            )}
          </button>
        ) : (
          <span className="flex-shrink-0 rounded-full bg-[#f4f4f0] px-6 py-3 text-sm font-bold text-[#5d605c]">
            Out of Stock
          </span>
        )}
      </div>
    </div>
  );
}
