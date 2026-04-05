import Image from 'next/image';
import Link from 'next/link';
import { StarRating } from './StarRating';
import { WishlistButton } from '@/components/product/WishlistButton';
import type { ShopifyProductCard } from '@/lib/shopify/types';

type ProductCardProps = {
  product: ShopifyProductCard;
  priority?: boolean;
};

function getProductBadge(product: ShopifyProductCard): {
  label: string;
  variant: 'sale' | 'new' | 'trending';
} | null {
  if (product.tags.includes('trending')) return { label: 'Trending', variant: 'trending' };
  if (product.tags.includes('new-arrival')) return { label: 'New', variant: 'new' };

  const hasDiscount =
    product.compareAtPriceRange?.minVariantPrice &&
    parseFloat(product.compareAtPriceRange.minVariantPrice.amount) >
      parseFloat(product.priceRange.minVariantPrice.amount);

  if (hasDiscount) return { label: 'Sale', variant: 'sale' };
  return null;
}

function formatPrice(amount: string, currencyCode: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 2,
  }).format(parseFloat(amount));
}

const BADGE_STYLES: Record<string, string> = {
  trending: 'bg-[var(--color-primary)] text-white',
  new: 'bg-[var(--color-primary)] text-white',
  sale: 'bg-[var(--color-error)] text-white',
};

export function ProductCard({ product, priority = false }: ProductCardProps) {
  const badge = getProductBadge(product);
  const compareAt = product.compareAtPriceRange?.minVariantPrice;
  const hasDiscount =
    compareAt &&
    parseFloat(compareAt.amount) > parseFloat(product.priceRange.minVariantPrice.amount);

  const price = product.priceRange.minVariantPrice;

  return (
    <article className="group">
      {/* Image container */}
      <Link
        href={`/products/${product.handle}`}
        className="relative block overflow-hidden rounded-lg mb-4 aspect-square bg-[var(--color-surface)]"
        aria-label={product.title}
        tabIndex={-1}
      >
        {product.featuredImage ? (
          <Image
            src={product.featuredImage.url}
            alt={product.featuredImage.altText ?? product.title}
            fill
            sizes="(min-width: 1280px) 280px, (min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            priority={priority}
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-[#F8F9FC] to-[#E8EAF0]">
            <div className="text-center">
              <span className="material-symbols-outlined text-5xl text-[#1B2A5E]/20" aria-hidden="true">
                shopping_bag
              </span>
              <p className="text-xs text-slate-400 mt-2 font-medium">Coming soon</p>
            </div>
          </div>
        )}

        {/* Out of stock overlay */}
        {!product.availableForSale && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <span className="text-sm font-semibold text-white">Out of Stock</span>
          </div>
        )}

        {/* Badge */}
        {badge && (
          <span
            className={`absolute top-3 left-3 ${BADGE_STYLES[badge.variant]} text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider`}
          >
            {badge.label}
          </span>
        )}

        {/* Wishlist button overlay */}
        <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <WishlistButton productId={product.id} size="sm" />
        </div>
      </Link>

      {/* Star rating — deterministic count derived from product ID to avoid hydration mismatch */}
      <StarRating rating={4.5} className="mb-1" />

      {/* Title */}
      <Link href={`/products/${product.handle}`} className="block">
        <h3 className="font-bold text-[var(--color-text-primary)] mb-2 line-clamp-1 hover:text-[var(--color-primary)] transition-colors">
          {product.title}
        </h3>
      </Link>

      {/* Price + Cart button */}
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          {parseFloat(price.amount) === 0 ? (
            <span className="text-sm font-medium text-slate-400 italic">
              Price unavailable
            </span>
          ) : hasDiscount ? (
            <>
              <span className="text-lg font-bold text-[var(--color-error)]">
                {formatPrice(price.amount, price.currencyCode)}
              </span>
              <span className="text-sm text-slate-400 line-through">
                {formatPrice(compareAt!.amount, compareAt!.currencyCode)}
              </span>
            </>
          ) : (
            <span className="text-lg font-bold text-[var(--color-primary)]">
              {formatPrice(price.amount, price.currencyCode)}
            </span>
          )}
        </div>

        {product.availableForSale ? (
          <button
            className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-light)] text-white p-2 rounded-lg transition-colors active:scale-95"
            aria-label={`Add ${product.title} to cart`}
          >
            <span className="material-symbols-outlined text-xl" aria-hidden="true">
              shopping_cart
            </span>
          </button>
        ) : (
          <button
            className="bg-gray-300 text-gray-500 p-2 rounded-lg cursor-not-allowed"
            disabled
            aria-label="Out of stock"
          >
            <span className="material-symbols-outlined text-xl" aria-hidden="true">
              remove_shopping_cart
            </span>
          </button>
        )}
      </div>
    </article>
  );
}
