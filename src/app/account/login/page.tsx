import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Container } from '@/components/ui/Container';
import { LoginForm } from '@/components/auth/LoginForm';

export const metadata: Metadata = {
  title: 'Sign In — StarBuyBaby',
  description: 'Sign in to your StarBuyBaby account to manage orders, wishlist, and more.',
  robots: { index: false, follow: false },
};

export default async function LoginPage() {
  // Redirect to account if already logged in
  const cookieStore = await cookies();
  const token = cookieStore.get('shopify_customer_token');
  if (token?.value) {
    redirect('/account');
  }

  return (
    <Container as="main" className="py-12 sm:py-16 bg-[#faf9f6]" narrow>
      <div className="mx-auto max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="font-headline text-3xl text-[#303330]">Welcome Back</h1>
          <p className="mt-2 text-[#5d605c]">Sign in to your StarBuyBaby account</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl bg-[#ffffff] p-8 shadow-[0_8px_32px_rgba(0,0,0,0.04)]">
          <LoginForm />
        </div>
      </div>
    </Container>
  );
}
