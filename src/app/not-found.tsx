import Link from 'next/link';
import { Container } from '@/components/ui/Container';

export default function NotFound() {
  return (
    <Container as="main" className="flex min-h-[60vh] items-center py-20">
      <div className="mx-auto max-w-lg text-center">
        {/* Big 404 */}
        <p className="font-heading text-[120px] font-extrabold leading-none text-[var(--color-primary)] opacity-10 select-none">
          404
        </p>

        <div className="-mt-6">
          <h1 className="font-heading text-3xl font-bold text-[var(--color-text-primary)] sm:text-4xl">
            Page Not Found
          </h1>
          <p className="mt-4 text-[var(--color-text-secondary)] leading-relaxed">
            Oops! The page you&apos;re looking for doesn&apos;t exist or has been moved. Let&apos;s
            get you back on track.
          </p>

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-6 py-3 text-sm font-semibold text-white hover:bg-[var(--color-primary-light)] transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
              </svg>
              Back to Home
            </Link>
            <Link
              href="/collections/all"
              className="inline-flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-primary)] px-6 py-3 text-sm font-semibold text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white transition-colors"
            >
              Browse Products
            </Link>
          </div>

          <p className="mt-8 text-sm text-[var(--color-text-secondary)]">
            Looking for something?{' '}
            <Link
              href="/search"
              className="font-medium text-[var(--color-primary)] hover:text-[var(--color-primary-light)] transition-colors"
            >
              Try searching
            </Link>
          </p>
        </div>
      </div>
    </Container>
  );
}
