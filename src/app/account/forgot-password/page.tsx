import type { Metadata } from 'next';
import { Container } from '@/components/ui/Container';
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';

export const metadata: Metadata = {
  title: 'Forgot Password — StarBuyBaby',
  description: 'Reset your StarBuyBaby account password.',
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <Container as="main" className="py-12 sm:py-16 bg-[#faf9f6]" narrow>
      <div className="mx-auto max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="font-headline text-3xl text-[#303330]">Reset Password</h1>
          <p className="mt-2 text-[#5d605c]">
            Enter your email and we&apos;ll send you a recovery link
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl bg-[#ffffff] p-8 shadow-[0_8px_32px_rgba(0,0,0,0.04)]">
          <ForgotPasswordForm />
        </div>
      </div>
    </Container>
  );
}
