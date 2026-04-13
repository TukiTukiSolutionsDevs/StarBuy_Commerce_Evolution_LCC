import type { Metadata } from 'next';
import { CartPageContent } from '@/components/cart/CartPageContent';

export const metadata: Metadata = {
  title: 'Shopping Cart — StarBuyBaby',
  description: 'View and manage your shopping cart at StarBuyBaby.',
};

export default function CartPage() {
  return <CartPageContent />;
}
