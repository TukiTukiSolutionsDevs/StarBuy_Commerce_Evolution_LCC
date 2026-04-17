import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCustomerData } from '@/lib/auth';
import { Container } from '@/components/ui/Container';
import { AccountNav } from '@/components/account/AccountNav';

export const metadata: Metadata = {
  title: 'My Account — StarBuyBaby',
  description: 'Manage your StarBuyBaby account, orders, and profile.',
  robots: { index: false, follow: false },
};

export default async function AccountPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('shopify_customer_token');

  if (!token?.value) {
    redirect('/account/login');
  }

  const customer = await getCustomerData(token.value);

  if (!customer) {
    // Token is invalid or expired — clear it and redirect
    redirect('/account/login');
  }

  const fullName = [customer.firstName, customer.lastName].filter(Boolean).join(' ');
  const orderCount = customer.orders?.edges?.length ?? 0;

  return (
    <Container as="main" className="py-8 sm:py-12">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
        {/* Sidebar nav */}
        <aside className="lg:col-span-1">
          <div className="rounded-2xl bg-[#ffffff] shadow-[0_8px_32px_rgba(0,0,0,0.04)] p-4 shadow-[0_8px_32px_rgba(0,0,0,0.04)]">
            {/* Avatar / name */}
            <div className="flex items-center gap-3 pb-4 border-b border-[#e1e3df] mb-4">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] text-white text-sm font-bold">
                {(customer.firstName?.[0] ?? customer.email[0]).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[#303330]">
                  {fullName || 'My Account'}
                </p>
                <p className="truncate text-xs text-[#5d605c]">{customer.email}</p>
              </div>
            </div>
            <AccountNav />
          </div>
        </aside>

        {/* Main content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Welcome banner */}
          <div
            className="rounded-2xl p-6 text-[#fff8f0]"
            style={{ background: 'radial-gradient(circle at center, #f8cc69 0%, #795a00 100%)' }}
          >
            <h1 className="font-headline text-2xl font-bold text-[#fff8f0]">
              Welcome back{fullName ? `, ${customer.firstName}` : ''}!
            </h1>
            <p className="mt-1 text-[#fff8f0]/70 text-sm">
              Manage your orders, profile, and account preferences.
            </p>
          </div>

          {/* Stats cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl bg-[#ffffff] shadow-[0_8px_32px_rgba(0,0,0,0.04)] p-5 shadow-[0_8px_32px_rgba(0,0,0,0.04)]">
              <p className="text-sm text-[#5d605c]">Total Orders</p>
              <p className="mt-1 text-3xl font-bold text-[#303330]">{orderCount}</p>
            </div>
            <div className="rounded-2xl bg-[#ffffff] shadow-[0_8px_32px_rgba(0,0,0,0.04)] p-5 shadow-[0_8px_32px_rgba(0,0,0,0.04)]">
              <p className="text-sm text-[#5d605c]">Saved Addresses</p>
              <p className="mt-1 text-3xl font-bold text-[#303330]">
                {customer.addresses?.edges?.length ?? 0}
              </p>
            </div>
            <div className="rounded-2xl bg-[#ffffff] shadow-[0_8px_32px_rgba(0,0,0,0.04)] p-5 shadow-[0_8px_32px_rgba(0,0,0,0.04)]">
              <p className="text-sm text-[#5d605c]">Member Since</p>
              <p className="mt-1 text-lg font-bold text-[#303330]">
                {new Date(customer.createdAt).getFullYear()}
              </p>
            </div>
          </div>

          {/* Account info */}
          <div className="rounded-2xl bg-[#ffffff] shadow-[0_8px_32px_rgba(0,0,0,0.04)] p-6 shadow-[0_8px_32px_rgba(0,0,0,0.04)]">
            <h2 className="font-headline text-lg font-bold text-[#303330] mb-4">
              Account Information
            </h2>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-[#5d605c]">
                  Name
                </dt>
                <dd className="mt-1 text-sm text-[#303330]">{fullName || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-[#5d605c]">
                  Email
                </dt>
                <dd className="mt-1 text-sm text-[#303330]">{customer.email}</dd>
              </div>
              {customer.phone && (
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wider text-[#5d605c]">
                    Phone
                  </dt>
                  <dd className="mt-1 text-sm text-[#303330]">{customer.phone}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Quick links */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Link
              href="/account/orders"
              className="flex items-center gap-4 rounded-2xl bg-[#ffffff] shadow-[0_8px_32px_rgba(0,0,0,0.04)] p-5 shadow-[0_8px_32px_rgba(0,0,0,0.04)] hover:shadow-[0_16px_48px_rgba(0,0,0,0.08)] transition-all"
            >
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[var(--color-surface)] text-[var(--color-primary)]">
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12"
                  />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-sm text-[#303330]">Order History</p>
                <p className="text-xs text-[#5d605c]">
                  {orderCount} {orderCount === 1 ? 'order' : 'orders'}
                </p>
              </div>
            </Link>

            <Link
              href="/collections/all"
              className="flex items-center gap-4 rounded-2xl bg-[#ffffff] shadow-[0_8px_32px_rgba(0,0,0,0.04)] p-5 shadow-[0_8px_32px_rgba(0,0,0,0.04)] hover:shadow-[0_16px_48px_rgba(0,0,0,0.08)] transition-all"
            >
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[var(--color-surface)] text-[var(--color-primary)]">
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
                  />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-sm text-[#303330]">Continue Shopping</p>
                <p className="text-xs text-[#5d605c]">Browse our catalog</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </Container>
  );
}
