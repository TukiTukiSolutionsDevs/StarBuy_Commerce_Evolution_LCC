'use client';

import Image from 'next/image';
import { useState } from 'react';
import type { ShopifyImage } from '@/lib/shopify/types';

type ImageGalleryProps = {
  images: ShopifyImage[];
  title: string;
};

export function ImageGallery({ images, title }: ImageGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const mainImage = images[selectedIndex];

  if (!mainImage) {
    return (
      <div className="aspect-square w-full rounded-[var(--radius-xl)] bg-gray-100 flex items-center justify-center">
        <svg className="h-20 w-20 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
        </svg>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Main image */}
      <div className="relative aspect-square overflow-hidden rounded-[var(--radius-xl)] bg-gray-100">
        <Image
          src={mainImage.url}
          alt={mainImage.altText ?? title}
          fill
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="object-cover"
          priority
        />
      </div>

      {/* Thumbnails — only if more than 1 image */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => setSelectedIndex(i)}
              className={[
                'relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-[var(--radius-md)] border-2 transition-all',
                i === selectedIndex
                  ? 'border-[var(--color-primary)]'
                  : 'border-transparent hover:border-gray-300',
              ].join(' ')}
              aria-label={`View image ${i + 1}`}
            >
              <Image
                src={img.url}
                alt={img.altText ?? `${title} ${i + 1}`}
                fill
                sizes="64px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
