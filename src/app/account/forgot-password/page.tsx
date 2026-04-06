import type { Metadata } from 'next';
import { Container } from '@/components/ui/Container';
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';

export const metadata: Metadata = {
  title: 'Forgot Password — Starbuy',
  description: 'Reset your Starbuy account password.',
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <Container as="main" className="py-16" narrow>
      <div className="mx-auto max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="font-heading text-3xl font-bold text-[#1B2A5E]">Reset Password</h1>
          <p className="mt-2 text-[var(--color-text-secondary)]">
            Enter your email and we&apos;ll send you a recovery link
          </p>
        </div>

        {/* Card */}
        <div className="rounded-[var(--radius-lg)] border border-gray-200 bg-white p-8 shadow-[var(--shadow-card)]">
          <ForgotPasswordForm />
        </div>
      </div>
    </Container>
  );
}
