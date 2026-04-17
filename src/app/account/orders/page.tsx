import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCustomerData } from '@/lib/auth';
import { Container } from '@/components/ui/Container';
import { AccountNav } from '@/components/account/AccountNav';
import { OrderList } from '@/components/account/OrderList';

export const metadata: Metadata = {
  title: 'Order History — StarBuyBaby',
  description: 'View your StarBuyBaby order history and track shipments.',
  robots: { index: false, follow: false },
};

export default async function OrdersPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('shopify_customer_token');

  if (!token?.value) {
    redirect('/account/login');
  }

  const customer = await getCustomerData(token.value);

  if (!customer) {
    redirect('/account/login');
  }

  const orders = customer.orders?.edges?.map((e) => e.node) ?? [];

  return (
    <Container as="main" className="py-8 sm:py-12 bg-[#faf9f6]">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
        {/* Sidebar nav */}
        <aside className="lg:col-span-1">
          <div className="rounded-2xl bg-[#ffffff] p-4 shadow-[0_8px_32px_rgba(0,0,0,0.04)]">
            <div className="flex items-center gap-3 pb-4 border-b border-[#e1e3df] mb-4">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#795a00] text-[#fff8f0] text-sm font-bold">
                {(customer.firstName?.[0] ?? customer.email[0]).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[#303330]">
                  {[customer.firstName, customer.lastName].filter(Boolean).join(' ') ||
                    'My Account'}
                </p>
                <p className="truncate text-xs text-[#5d605c]">{customer.email}</p>
              </div>
            </div>
            <AccountNav />
          </div>
        </aside>

        {/* Main content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h1 className="font-headline text-2xl font-bold text-[#303330]">Order History</h1>
            <Link
              href="/account"
              className="text-sm font-medium text-[#795a00] hover:text-[#6b4f00] transition-colors"
            >
              ← Back to Dashboard
            </Link>
          </div>

          <OrderList orders={orders} />

          {customer.orders?.pageInfo?.hasNextPage && (
            <p className="text-center text-sm text-[#5d605c]">
              Showing your 10 most recent orders.{' '}
              <a
                href={`https://${process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN ?? 'starbuy-78634.myshopify.com'}/account/orders`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-[#795a00] hover:text-[#6b4f00] transition-colors"
              >
                View all orders on Shopify →
              </a>
            </p>
          )}
        </div>
      </div>
    </Container>
  );
}
