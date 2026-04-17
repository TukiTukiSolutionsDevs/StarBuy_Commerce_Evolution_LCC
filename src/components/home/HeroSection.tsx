import Image from 'next/image';
import Link from 'next/link';
import { existsSync } from 'fs';
import { join } from 'path';

const heroMainExists = existsSync(
  join(process.cwd(), 'public', 'images', 'brand', 'hero-main.png'),
);
const heroMobileExists = existsSync(
  join(process.cwd(), 'public', 'images', 'brand', 'hero-mobile.png'),
);

const STARS = [
  { top: '8%', left: '5%', size: 3, duration: '3s', delay: '0s' },
  { top: '15%', left: '82%', size: 4, duration: '4s', delay: '1s' },
  { top: '30%', left: '70%', size: 5, duration: '3.5s', delay: '0.5s' },
  { top: '45%', left: '12%', size: 3, duration: '4.5s', delay: '2s' },
  { top: '60%', left: '88%', size: 4, duration: '3s', delay: '1.5s' },
  { top: '12%', left: '42%', size: 3, duration: '5s', delay: '0.8s' },
  { top: '70%', left: '22%', size: 4, duration: '3.8s', delay: '2.5s' },
  { top: '35%', left: '52%', size: 3, duration: '4.2s', delay: '1.2s' },
  { top: '78%', left: '62%', size: 5, duration: '3.2s', delay: '0.3s' },
  { top: '22%', left: '28%', size: 3, duration: '4.8s', delay: '1.8s' },
  { top: '50%', left: '40%', size: 4, duration: '3.6s', delay: '2.2s' },
  { top: '6%', left: '65%', size: 3, duration: '5.2s', delay: '0.6s' },
  { top: '88%', left: '48%', size: 3, duration: '4s', delay: '0.4s' },
  { top: '42%', left: '95%', size: 4, duration: '3.4s', delay: '1.6s' },
];

export function HeroSection() {
  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden bg-gradient-to-br from-[#faf5f0] via-[#f5e1dc] to-[#e8daf0]">
      {/* Soft pastel glow layers */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_30%_20%,rgba(232,218,240,0.5),transparent)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_50%_at_70%_60%,rgba(245,225,220,0.4),transparent)]" />
      <div className="absolute top-1/4 right-1/4 w-[500px] h-[500px] bg-[#d4c5e2]/20 blur-[150px] rounded-full" />
      <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] bg-[#f8cc69]/10 blur-[120px] rounded-full" />
      <div className="absolute top-10 left-10 w-[300px] h-[300px] bg-[#a8d8ea]/15 blur-[100px] rounded-full" />

      {/* Gold star field on pastel */}
      {STARS.map((star, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-[#c9a84c] animate-twinkle"
          style={
            {
              top: star.top,
              left: star.left,
              width: star.size,
              height: star.size,
              '--twinkle-duration': star.duration,
              '--twinkle-delay': star.delay,
            } as React.CSSProperties
          }
        />
      ))}

      {/* Content */}
      <div className="relative z-10 w-full max-w-6xl mx-auto px-6 py-16 md:py-0">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-12 items-center">
          {/* Left — Logo + Copy */}
          <div
            className="animate-float-up text-center md:text-left"
            style={{ animationDelay: '0.1s' }}
          >
            {/* StarBuyBaby Logo — above heading */}
            <div className="mb-4 md:mb-6">
              <img
                src="/logo.png"
                alt="StarBuyBaby"
                className="h-28 md:h-36 lg:h-44 w-auto mx-auto md:mx-0 drop-shadow-[0_6px_20px_rgba(200,168,76,0.25)]"
              />
            </div>

            <h1 className="font-headline text-4xl md:text-5xl lg:text-6xl text-[#1a1a2e] leading-[1.1] tracking-tight mb-6 text-center md:text-left">
              Where Every{' '}
              <span className="bg-gradient-to-r from-[#c9a84c] via-[#f8cc69] to-[#c9a84c] bg-clip-text text-transparent">
                Little Star
              </span>{' '}
              Shines
            </h1>

            <p className="font-body text-[#6b6580] max-w-md mx-auto md:mx-0 leading-relaxed text-lg mb-10">
              Curated baby essentials that parents trust and little ones love. Safe, beautiful, and
              designed to make every moment magical.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
              <Link
                href="/collections/all"
                className="inline-flex items-center gap-2 px-10 py-4 rounded-full font-bold tracking-widest text-white text-sm transition-all duration-500 hover:scale-[1.02] shadow-[0_8px_30px_rgba(200,168,76,0.3)] hover:shadow-[0_12px_40px_rgba(200,168,76,0.4)]"
                style={{
                  background: 'linear-gradient(135deg, #c9a84c 0%, #b8963a 50%, #c9a84c 100%)',
                }}
              >
                Shop Baby Essentials
                <span className="material-symbols-outlined text-lg" aria-hidden="true">
                  arrow_forward
                </span>
              </Link>

              <Link
                href="/about"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-bold tracking-widest text-[#1a1a2e] text-sm border-2 border-[#d4c5e2] hover:border-[#c9a84c] hover:text-[#c9a84c] transition-all duration-500 bg-white/50 backdrop-blur-sm"
              >
                Our Story
              </Link>
            </div>
          </div>

          {/* Right — Hero image (desktop) */}
          <div
            className="hidden md:flex items-center justify-center animate-float-up"
            style={{ animationDelay: '0.3s' }}
          >
            {heroMainExists ? (
              <div className="relative w-full max-w-lg aspect-[4/5] rounded-[2.5rem] overflow-hidden shadow-[0_32px_80px_rgba(45,27,78,0.15)]">
                <Image
                  src="/images/brand/hero-main.png"
                  alt="Beautiful baby essentials curated by StarBuyBaby"
                  fill
                  sizes="(min-width: 768px) 50vw, 100vw"
                  className="object-cover"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-tr from-[#f5e1dc]/20 via-transparent to-[#e8daf0]/15" />
                <div className="absolute inset-0 rounded-[2.5rem] ring-1 ring-inset ring-[#c9a84c]/20" />
              </div>
            ) : (
              <div className="relative w-full max-w-md aspect-square">
                <div className="absolute inset-0 rounded-full border border-[#d4c5e2]/40 animate-[spin_30s_linear_infinite]" />
                <div className="absolute inset-4 rounded-full border border-[#f8cc69]/25 animate-[spin_25s_linear_infinite_reverse]" />
                <div className="absolute inset-12 rounded-full bg-gradient-to-br from-white/60 to-[#e8daf0]/30 backdrop-blur-sm flex items-center justify-center shadow-[0_16px_48px_rgba(45,27,78,0.08)]">
                  <div className="text-center">
                    <img
                      src="/logo.png"
                      alt="StarBuyBaby"
                      className="h-24 w-auto mx-auto drop-shadow-[0_4px_20px_rgba(200,168,76,0.3)]"
                    />
                    <p className="font-label text-xs text-[#6b6580] uppercase tracking-[0.3em] mt-3">
                      For Little Stars
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Mobile hero image */}
        {heroMobileExists && (
          <div className="md:hidden mt-10 animate-float-up" style={{ animationDelay: '0.3s' }}>
            <div className="relative w-full max-w-sm mx-auto aspect-[3/4] rounded-[2rem] overflow-hidden shadow-[0_24px_60px_rgba(45,27,78,0.12)]">
              <Image
                src="/images/brand/hero-mobile.png"
                alt="Beautiful baby essentials curated by StarBuyBaby"
                fill
                sizes="100vw"
                className="object-cover"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#faf5f0]/30 via-transparent to-transparent" />
              <div className="absolute inset-0 rounded-[2rem] ring-1 ring-inset ring-[#c9a84c]/15" />
            </div>
          </div>
        )}
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-scroll-hint">
        <p className="font-label text-[10px] text-[#6b6580]/50 uppercase tracking-[0.3em]">
          Scroll
        </p>
        <span className="material-symbols-outlined text-[#6b6580]/50 text-lg" aria-hidden="true">
          keyboard_arrow_down
        </span>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#faf5f0] to-transparent" />
    </section>
  );
}
