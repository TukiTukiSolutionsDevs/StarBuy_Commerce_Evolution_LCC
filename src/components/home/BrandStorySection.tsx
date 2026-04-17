import Image from 'next/image';
import Link from 'next/link';
import { existsSync } from 'fs';
import { join } from 'path';

function hasImage(name: string): boolean {
  try {
    return existsSync(join(process.cwd(), 'public', 'images', 'brand', `${name}.png`));
  } catch {
    return false;
  }
}

const PILLARS = [
  {
    icon: 'verified_user',
    title: 'Safe & Certified',
    description:
      'Every product meets strict safety standards. Certified, non-toxic, and tested for little hands and curious mouths.',
    bg: 'bg-gradient-to-br from-[#f5e1dc] to-[#faf5f0]',
    iconBg: 'bg-[#e8c4c0]/30',
  },
  {
    icon: 'family_restroom',
    title: 'Parent-Approved',
    description:
      'Curated by parents, for parents. We test everything with real families before it earns a spot.',
    bg: 'bg-gradient-to-br from-[#e8daf0] to-[#faf5f0]',
    iconBg: 'bg-[#d4c5e2]/30',
  },
  {
    icon: 'spa',
    title: 'Gentle on Little Ones',
    description:
      'Organic fabrics, BPA-free gear, and skin-friendly materials that keep your baby comfortable and happy.',
    bg: 'bg-gradient-to-br from-[#f8cc69]/15 to-[#faf5f0]',
    iconBg: 'bg-[#f8cc69]/20',
  },
];

const STATS = [
  { value: '10,000+', label: 'Happy Families' },
  { value: '500+', label: 'Baby Essentials' },
  { value: '4.9', label: 'Parent Rating' },
  { value: '24h', label: 'Support Response' },
];

const CATEGORIES = [
  {
    title: 'Nursery & Sleep',
    description: 'Cribs, bedding, monitors & everything for peaceful nights.',
    image: 'collection-home',
    href: '/collections/all',
    icon: 'crib',
    gradient: 'from-[#e8daf0]/60 to-[#d4c5e2]/20',
  },
  {
    title: 'Feeding & Mealtime',
    description: 'Bottles, bibs, highchairs & mealtime essentials.',
    image: 'collection-lifestyle',
    href: '/collections/all',
    icon: 'lunch_dining',
    gradient: 'from-[#f5e1dc]/60 to-[#e8c4c0]/20',
  },
  {
    title: 'Gear & Travel',
    description: 'Strollers, car seats, carriers & on-the-go must-haves.',
    image: 'collection-tech',
    href: '/collections/all',
    icon: 'stroller',
    gradient: 'from-[#f8cc69]/20 to-[#f5ede5]/40',
  },
  {
    title: 'Bath & Skincare',
    description: 'Gentle soaps, tubs, towels & skincare for sensitive skin.',
    image: 'collection-promo',
    href: '/collections/all',
    icon: 'bathtub',
    gradient: 'from-[#d4c5e2]/40 to-[#e8daf0]/20',
  },
];

const TESTIMONIALS = [
  {
    quote:
      "The quality of everything we've ordered has been amazing. Our baby's nursery looks like a dream thanks to StarBuyBaby!",
    name: 'Sarah M.',
    role: 'Mom of 2',
    rating: 5,
  },
  {
    quote:
      "Finally a baby store that doesn't overwhelm you with choices. Everything here is curated and worth every penny.",
    name: 'James & Lily T.',
    role: 'First-time parents',
    rating: 5,
  },
  {
    quote:
      'Fast shipping and the customer support team was so helpful when I needed to exchange a size. Highly recommend!',
    name: 'Maria C.',
    role: 'Mom of 1',
    rating: 5,
  },
];

export function BrandStorySection() {
  return (
    <>
      {/* ── Brand Pillars ──────────────────────────────────────────────── */}
      <section className="px-6 mb-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="font-label text-[#c9a84c] uppercase tracking-[0.3em] text-xs font-bold mb-3">
              The StarBuyBaby Promise
            </p>
            <h2 className="font-headline text-4xl md:text-5xl text-[#1a1a2e] mb-5">
              Because They Deserve the Best
            </h2>
            <p className="font-body text-[#6b6580] max-w-2xl mx-auto text-lg leading-relaxed">
              Every product in our collection is handpicked with one thing in mind: your baby&apos;s
              safety, comfort, and joy.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            {PILLARS.map((pillar) => (
              <div
                key={pillar.title}
                className={`group ${pillar.bg} rounded-[1.5rem] p-8 hover:shadow-[0_16px_48px_rgba(45,27,78,0.08)] transition-all duration-500 overflow-hidden`}
              >
                <div
                  className={`w-16 h-16 ${pillar.iconBg} rounded-2xl flex items-center justify-center mb-6`}
                >
                  <span
                    className="material-symbols-outlined text-[#c9a84c] text-3xl"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                    aria-hidden="true"
                  >
                    {pillar.icon}
                  </span>
                </div>
                <h3 className="font-headline text-xl text-[#1a1a2e] mb-3">{pillar.title}</h3>
                <p className="font-body text-[#6b6580] leading-relaxed text-[15px]">
                  {pillar.description}
                </p>
              </div>
            ))}
          </div>

          {/* Stats */}
          <div className="bg-gradient-to-r from-[#1a1a3e] to-[#2d1b4e] rounded-[1.5rem] p-8 md:p-12">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {STATS.map((stat) => (
                <div key={stat.label} className="text-center">
                  <p className="font-headline text-3xl md:text-4xl text-[#f8cc69] mb-1">
                    {stat.value}
                  </p>
                  <p className="font-label text-xs text-[#d4c5e2]/60 uppercase tracking-[0.2em]">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Shop by Category ───────────────────────────────────────────── */}
      <section className="px-6 mb-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <p className="font-label text-[#c9a84c] uppercase tracking-[0.3em] text-xs font-bold mb-3">
              Shop by Category
            </p>
            <h2 className="font-headline text-4xl text-[#1a1a2e]">
              Everything for Your Little One
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {CATEGORIES.map((cat) => {
              const imgExists = hasImage(cat.image);
              return (
                <Link
                  key={cat.title}
                  href={cat.href}
                  className="group bg-white rounded-[1.5rem] overflow-hidden shadow-[0_4px_24px_rgba(45,27,78,0.06)] hover:shadow-[0_16px_48px_rgba(45,27,78,0.12)] hover:-translate-y-1 transition-all duration-500"
                >
                  <div className="relative aspect-[4/3] overflow-hidden">
                    {imgExists ? (
                      <Image
                        src={`/images/brand/${cat.image}.png`}
                        alt={cat.title}
                        fill
                        sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div
                        className={`flex items-center justify-center h-full bg-gradient-to-br ${cat.gradient}`}
                      >
                        <span
                          className="material-symbols-outlined text-[#c4bfd0] text-5xl"
                          style={{ fontVariationSettings: "'FILL' 1" }}
                          aria-hidden="true"
                        >
                          {cat.icon}
                        </span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a2e]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  </div>

                  <div className="p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className="material-symbols-outlined text-[#c9a84c] text-xl"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                        aria-hidden="true"
                      >
                        {cat.icon}
                      </span>
                      <h3 className="font-headline text-lg text-[#1a1a2e] group-hover:text-[#c9a84c] transition-colors">
                        {cat.title}
                      </h3>
                    </div>
                    <p className="text-[#6b6580] text-sm leading-relaxed">{cat.description}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Parent Testimonials ────────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-[#f5e1dc] via-[#faf5f0] to-[#e8daf0] py-20 px-6 mb-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <p className="font-label text-[#c9a84c] uppercase tracking-[0.3em] text-xs font-bold mb-3">
              Loved by Parents
            </p>
            <h2 className="font-headline text-4xl text-[#1a1a2e]">What Families Are Saying</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((testimonial) => (
              <div
                key={testimonial.name}
                className="bg-white/80 backdrop-blur-sm rounded-[1.5rem] p-8 shadow-[0_4px_24px_rgba(45,27,78,0.06)]"
              >
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: testimonial.rating }).map((_, i) => (
                    <span
                      key={i}
                      className="material-symbols-outlined text-[#f8cc69] text-lg"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                      aria-hidden="true"
                    >
                      star
                    </span>
                  ))}
                </div>

                <p className="font-body text-[#1a1a2e] leading-relaxed mb-6 italic">
                  &ldquo;{testimonial.quote}&rdquo;
                </p>

                <div>
                  <p className="font-body font-bold text-sm text-[#1a1a2e]">{testimonial.name}</p>
                  <p className="font-label text-xs text-[#6b6580]">{testimonial.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
