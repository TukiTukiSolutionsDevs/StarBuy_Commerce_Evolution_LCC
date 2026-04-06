import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Container } from '@/components/ui/Container';
import { RegisterForm } from '@/components/auth/RegisterForm';

export const metadata: Metadata = {
  title: 'Create Account — Starbuy',
  description: 'Create your Starbuy account and start shopping trending products.',
  robots: { index: false, follow: false },
};

export default async function RegisterPage() {
  // Redirect to account if already logged in
  const cookieStore = await cookies();
  const token = cookieStore.get('shopify_customer_token');
  if (token?.value) {
    redirect('/account');
  }

  return (
    <Container as="main" className="py-16" narrow>
      <div className="mx-auto max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="font-heading text-3xl font-bold text-[#1B2A5E]">Create Account</h1>
          <p className="mt-2 text-[var(--color-text-secondary)]">
            Join Starbuy and discover trending products
          </p>
        </div>

        {/* Card */}
        <div className="rounded-[var(--radius-lg)] border border-gray-200 bg-white p-8 shadow-[var(--shadow-card)]">
          <RegisterForm />
        </div>
      </div>
    </Container>
  );
}
