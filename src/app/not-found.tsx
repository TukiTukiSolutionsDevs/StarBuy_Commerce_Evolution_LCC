import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="relative flex min-h-[70vh] items-center justify-center px-6 py-20 overflow-hidden bg-[#faf9f6]">
      {/* Decorative blobs */}
      <div className="absolute -top-10 -left-20 w-64 h-64 bg-[#bcd6ff]/30 blur-[100px] rounded-full -z-10" />
      <div className="absolute top-40 -right-20 w-80 h-80 bg-[#f8cc69]/20 blur-[120px] rounded-full -z-10" />

      <div className="mx-auto max-w-lg text-center">
        {/* Big 404 */}
        <p className="font-headline text-8xl md:text-[12rem] font-black leading-none text-[#f8cc69] select-none">
          404
        </p>

        <div className="-mt-4 md:-mt-8">
          <h1 className="font-headline text-3xl text-[#303330]">Page Not Found</h1>
          <p className="mt-4 text-[#5d605c] leading-relaxed max-w-md mx-auto">
            The page you&apos;re looking for doesn&apos;t exist or has been moved. Let&apos;s get
            you back on track.
          </p>

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-bold tracking-widest text-[#fff8f0] transition-all duration-500 hover:shadow-[0_0_20px_rgba(121,90,0,0.3)]"
              style={{
                background: 'radial-gradient(circle at center, #f8cc69 0%, #795a00 100%)',
              }}
            >
              <span className="material-symbols-outlined text-base" aria-hidden="true">
                home
              </span>
              Go Home
            </Link>
            <Link
              href="/collections/all"
              className="inline-flex items-center gap-2 rounded-lg bg-[#d4e3ff] px-6 py-3 text-sm font-bold text-[#005396] hover:bg-[#c0d6ff] transition-colors"
            >
              Browse Products
            </Link>
          </div>

          <p className="mt-8 text-sm text-[#5d605c]">
            Looking for something?{' '}
            <Link
              href="/search"
              className="font-medium text-[#795a00] hover:text-[#6b4f00] transition-colors"
            >
              Try searching
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
