import type { Metadata } from 'next';
import { CartPageContent } from '@/components/cart/CartPageContent';

export const metadata: Metadata = {
  title: 'Shopping Cart',
  description: 'View and manage your shopping cart.',
};

export default function CartPage() {
  return <CartPageContent />;
}
