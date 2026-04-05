import { Container } from '@/components/ui/Container';

export default function GlobalLoading() {
  return (
    <Container className="flex min-h-[50vh] items-center justify-center py-20">
      <div className="flex flex-col items-center gap-4">
        {/* Animated logo */}
        <div className="relative">
          <div className="h-12 w-12 rounded-full border-4 border-[var(--color-primary)] border-t-transparent animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <svg
              className="h-5 w-5 text-[var(--color-secondary)]"
              fill="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
            </svg>
          </div>
        </div>
        <p className="text-sm font-medium text-[var(--color-text-secondary)]">Loading…</p>
      </div>
    </Container>
  );
}
