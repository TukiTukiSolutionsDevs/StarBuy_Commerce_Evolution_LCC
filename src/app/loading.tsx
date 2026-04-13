import { Container } from '@/components/ui/Container';

export default function GlobalLoading() {
  return (
    <Container className="flex min-h-[50vh] items-center justify-center py-20 bg-[#faf9f6]">
      <div className="flex flex-col items-center gap-4">
        {/* Animated spinner */}
        <div className="relative">
          <div className="h-12 w-12 rounded-full border-4 border-[#f8cc69] border-t-transparent animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span
              className="material-symbols-outlined text-xl text-[#795a00]"
              style={{ fontVariationSettings: "'FILL' 1" }}
              aria-hidden="true"
            >
              star
            </span>
          </div>
        </div>
        <p className="text-sm font-medium text-[#5d605c]">Loading...</p>
      </div>
    </Container>
  );
}
