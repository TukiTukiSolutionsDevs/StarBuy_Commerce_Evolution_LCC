import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Container } from '@/components/ui/Container';
import { RegisterForm } from '@/components/auth/RegisterForm';

export const metadata: Metadata = {
  title: 'Create Account — StarBuyBaby',
  description: 'Create your StarBuyBaby account and start shopping curated essentials.',
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
    <Container as="main" className="py-12 sm:py-16 bg-[#faf9f6]" narrow>
      <div className="mx-auto max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="font-headline text-3xl text-[#303330]">Create Account</h1>
          <p className="mt-2 text-[#5d605c]">Join StarBuyBaby and discover curated essentials</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl bg-[#ffffff] p-8 shadow-[0_8px_32px_rgba(0,0,0,0.04)]">
          <RegisterForm />
        </div>
      </div>
    </Container>
  );
}
