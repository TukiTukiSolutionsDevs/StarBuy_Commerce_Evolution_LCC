'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useCart } from '@shopify/hydrogen-react';
import { useCartDrawer } from '@/components/cart/CartDrawerContext';

type QuickViewProduct = {
  id: string;
  handle: string;
  title: string;
  description: string;
  vendor: string;
  availableForSale: boolean;
  priceRange: {
    minVariantPrice: { amount: string; currencyCode: string };
  };
  images: {
    edges: Array<{
      node: { url: string; altText: string | null; width: number | null; height: number | null };
    }>;
  };
  variants: {
    edges: Array<{
      node: {
        id: string;
        title: string;
        availableForSale: boolean;
        selectedOptions: Array<{ name: string; value: string }>;
        price: { amount: string; currencyCode: string };
      };
    }>;
  };
  options?: Array<{ id: string; name: string; values: string[] }>;
};

type QuickViewModalProps = {
  product: QuickViewProduct;
  isOpen: boolean;
  onClose: () => void;
};

function formatPrice(amount: string, currencyCode: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 2,
  }).format(parseFloat(amount));
}

export function QuickViewModal({ product, isOpen, onClose }: QuickViewModalProps) {
  const { linesAdd, status } = useCart();
  const { openCart } = useCartDrawer();
  const [added, setAdded] = useState(false);
  const [visible, setVisible] = useState(false);

  const variants = product.variants.edges.map((e) => e.node);
  const hasMultipleVariants =
    variants.length > 1 && !(variants.length === 1 && variants[0].title === 'Default Title');

  const [selectedVariantId, setSelectedVariantId] = useState(variants[0]?.id ?? '');
  const selectedVariant = variants.find((v) => v.id === selectedVariantId) ?? variants[0];

  const options = product.options?.filter(
    (opt) => !(opt.values.length === 1 && opt.values[0] === 'Default Title'),
  );

  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    options?.forEach((opt) => {
      initial[opt.name] = opt.values[0];
    });
    return initial;
  });

  const isLoading = status === 'creating' || status === 'updating';
  const firstImage = product.images.edges[0]?.node;

  // Animate in/out
  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => setVisible(true));
    } else {
      requestAnimationFrame(() => setVisible(false));
    }
  }, [isOpen]);

  // Escape key handler
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleEscape]);

  function handleOptionSelect(optionName: string, value: string) {
    const newOptions = { ...selectedOptions, [optionName]: value };
    setSelectedOptions(newOptions);

    const matchingVariant = variants.find((v) =>
      v.selectedOptions.every((so) => newOptions[so.name] === so.value),
    );
    if (matchingVariant) {
      setSelectedVariantId(matchingVariant.id);
    }
  }

  function handleAddToCart() {
    if (!selectedVariant || !selectedVariant.availableForSale || isLoading || added) return;

    linesAdd([{ merchandiseId: selectedVariant.id, quantity: 1 }]);
    setAdded(true);
    setTimeout(() => {
      setAdded(false);
      onClose();
      openCart();
    }, 800);
  }

  if (!isOpen) return null;

  const currentPrice = selectedVariant?.price ?? product.priceRange.minVariantPrice;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-300 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-[#303330]/30 backdrop-blur-sm" onClick={onClose} />

      {/* Modal content */}
      <div
        className={`relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-[#ffffff] shadow-[0_32px_64px_rgba(0,0,0,0.08)] transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${
          visible ? 'scale-100' : 'scale-95'
        }`}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 flex h-8 w-8 items-center justify-center rounded-full text-[#5d605c] hover:text-[#303330] hover:bg-[#f4f4f0] transition-colors"
          aria-label="Close quick view"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
          {/* Image */}
          <div className="relative aspect-square rounded-xl overflow-hidden bg-[#f4f4f0]">
            {firstImage ? (
              <Image
                src={firstImage.url}
                alt={firstImage.altText ?? product.title}
                fill
                sizes="(min-width: 768px) 50vw, 100vw"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <span className="material-symbols-outlined text-5xl text-[#b1b2af]">
                  shopping_bag
                </span>
              </div>
            )}
          </div>

          {/* Details */}
          <div className="flex flex-col justify-center gap-4">
            {/* Vendor */}
            {product.vendor && (
              <p className="font-label text-xs uppercase tracking-widest text-[#5d605c]">
                {product.vendor}
              </p>
            )}

            {/* Title */}
            <h2 className="font-headline text-2xl text-[#303330]">{product.title}</h2>

            {/* Price */}
            <p className="text-2xl font-bold text-[#795a00]">
              {formatPrice(currentPrice.amount, currentPrice.currencyCode)}
            </p>

            {/* Description */}
            {product.description && (
              <p className="font-body text-[#5d605c] leading-relaxed line-clamp-3">
                {product.description}
              </p>
            )}

            {/* Variant selector */}
            {hasMultipleVariants && options && options.length > 0 && (
              <div className="space-y-3">
                {options.map((option) => (
                  <div key={option.id}>
                    <label className="block text-sm font-medium text-[#5d605c] mb-1.5">
                      {option.name}
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {option.values.map((value) => {
                        const isSelected = selectedOptions[option.name] === value;
                        return (
                          <button
                            key={value}
                            onClick={() => handleOptionSelect(option.name, value)}
                            className={`min-w-[40px] rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                              isSelected
                                ? 'bg-[#795a00] text-[#fff8f0]'
                                : 'bg-[#f4f4f0] text-[#303330] hover:bg-[#e8e8e4]'
                            }`}
                          >
                            {value}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add to Cart */}
            <button
              onClick={handleAddToCart}
              disabled={isLoading || added || !selectedVariant?.availableForSale}
              className={`w-full font-bold tracking-widest py-3 rounded-lg transition-all duration-500 active:scale-[0.98] flex items-center justify-center gap-2 ${
                added
                  ? 'bg-emerald-500 text-white'
                  : !selectedVariant?.availableForSale
                    ? 'bg-[#eeeeea] text-[#b1b2af] cursor-not-allowed'
                    : 'stardust-gradient text-[#fff8f0] px-8 hover:shadow-[0_0_20px_rgba(121,90,0,0.3)]'
              }`}
            >
              {isLoading ? (
                <>
                  <span className="material-symbols-outlined text-lg animate-spin">
                    progress_activity
                  </span>
                  Adding...
                </>
              ) : added ? (
                <>
                  <span className="material-symbols-outlined text-lg">check_circle</span>
                  Added!
                </>
              ) : !selectedVariant?.availableForSale ? (
                'Out of Stock'
              ) : (
                <>
                  <span className="material-symbols-outlined text-lg">shopping_cart</span>
                  Add to Cart
                </>
              )}
            </button>

            {/* View Full Details */}
            <Link
              href={`/products/${product.handle}`}
              onClick={onClose}
              className="text-center text-sm font-medium text-[#0060ad] hover:text-[#005396] transition-colors"
            >
              View Full Details
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
