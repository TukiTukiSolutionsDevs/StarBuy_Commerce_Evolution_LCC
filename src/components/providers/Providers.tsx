'use client';

import { ShopifyProvider } from './ShopifyProvider';
import { CartProvider } from './CartProvider';
import { CartDrawerProvider } from '@/components/cart/CartDrawerContext';
import { CartDrawer } from '@/components/cart/CartDrawer';

type ProvidersProps = {
  children: React.ReactNode;
};

export function Providers({ children }: ProvidersProps) {
  return (
    <ShopifyProvider>
      <CartProvider>
        <CartDrawerProvider>
          {children}
          <CartDrawer />
        </CartDrawerProvider>
      </CartProvider>
    </ShopifyProvider>
  );
}
