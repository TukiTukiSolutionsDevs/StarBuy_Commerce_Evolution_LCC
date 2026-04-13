'use client';

import { useState } from 'react';
import { QuickViewModal } from '@/components/product/QuickViewModal';

type ProductCardQuickViewProps = {
  product: {
    id: string;
    handle: string;
    title: string;
    vendor: string;
    availableForSale: boolean;
    priceRange: {
      minVariantPrice: { amount: string; currencyCode: string };
    };
    featuredImage: {
      url: string;
      altText: string | null;
      width: number | null;
      height: number | null;
    } | null;
    variants: {
      edges: Array<{
        node: {
          id: string;
          availableForSale: boolean;
        };
      }>;
    };
  };
};

export function ProductCardQuickView({ product }: ProductCardQuickViewProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Build the product shape that QuickViewModal expects
  const modalProduct = {
    id: product.id,
    handle: product.handle,
    title: product.title,
    description: '',
    vendor: product.vendor,
    availableForSale: product.availableForSale,
    priceRange: product.priceRange,
    images: {
      edges: product.featuredImage ? [{ node: product.featuredImage }] : [],
    },
    variants: {
      edges: product.variants.edges.map((e) => ({
        node: {
          id: e.node.id,
          title: 'Default Title',
          availableForSale: e.node.availableForSale,
          selectedOptions: [],
          price: product.priceRange.minVariantPrice,
        },
      })),
    },
  };

  return (
    <>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(true);
        }}
        className="flex items-center justify-center h-9 w-9 rounded-full bg-[#1a2332]/80 backdrop-blur text-white/80 hover:text-white hover:bg-[#1a2332] transition-all active:scale-95"
        aria-label={`Quick view ${product.title}`}
        title="Quick view"
      >
        <span className="material-symbols-outlined text-lg" aria-hidden="true">
          visibility
        </span>
      </button>

      <QuickViewModal product={modalProduct} isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
