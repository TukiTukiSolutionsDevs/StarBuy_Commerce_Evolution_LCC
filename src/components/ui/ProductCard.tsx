import Image from 'next/image';
import Link from 'next/link';
import { WishlistButton } from '@/components/product/WishlistButton';
import { ProductCardAddButton } from './ProductCardAddButton';
import { ProductCardQuickView } from './ProductCardQuickView';
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
  trending: 'bg-[#795a00] text-[#fff8f0]',
  new: 'bg-[#795a00] text-[#fff8f0]',
  sale: 'bg-[#ac3149] text-white',
};

export function ProductCard({ product, priority = false }: ProductCardProps) {
  const badge = getProductBadge(product);
  const compareAt = product.compareAtPriceRange?.minVariantPrice;
  const hasDiscount =
    compareAt &&
    parseFloat(compareAt.amount) > parseFloat(product.priceRange.minVariantPrice.amount);

  const price = product.priceRange.minVariantPrice;

  // First available variant ID for quick Add to Cart
  const firstVariant = product.variants?.edges?.[0]?.node ?? null;
  const variantId = firstVariant?.availableForSale ? firstVariant.id : null;

  return (
    <article className="group bg-[#ffffff] rounded-2xl overflow-hidden hover:shadow-[0_32px_64px_rgba(0,0,0,0.04)] hover:-translate-y-1 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]">
      {/* Image container — relative wrapper for badge + wishlist overlay */}
      <div className="relative">
        <Link
          href={`/products/${product.handle}`}
          className="relative block overflow-hidden aspect-square bg-[#f4f4f0]"
          aria-label={`View ${product.title}`}
          tabIndex={-1}
        >
          {product.featuredImage ? (
            <Image
              src={product.featuredImage.url}
              alt={product.featuredImage.altText ?? product.title}
              fill
              sizes="(min-width: 1280px) 280px, (min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              priority={priority}
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-[#f4f4f0] to-[#eeeeea]">
              <div className="text-center">
                <span
                  className="material-symbols-outlined text-5xl text-[#b1b2af]"
                  aria-hidden="true"
                >
                  shopping_bag
                </span>
                <p className="text-xs text-[#b1b2af] mt-2 font-medium">Coming soon</p>
              </div>
            </div>
          )}

          {/* Out of stock overlay */}
          {!product.availableForSale && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#303330]/40">
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
        </Link>

        {/* Wishlist button — outside Link to prevent navigation on click */}
        <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
          <WishlistButton productId={product.id} size="sm" />
        </div>

        {/* Quick view button — bottom right on hover */}
        <div className="absolute right-2 bottom-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
          <ProductCardQuickView product={product} />
        </div>
      </div>

      {/* Content below image */}
      <div className="p-5 space-y-2">
        {/* Vendor */}
        {product.vendor && (
          <p className="font-label text-xs uppercase tracking-widest text-[#5d605c]">
            {product.vendor}
          </p>
        )}

        {/* Title */}
        <Link href={`/products/${product.handle}`} className="block">
          <h3 className="font-headline text-lg text-[#303330] line-clamp-1 hover:text-[#795a00] transition-colors">
            {product.title}
          </h3>
        </Link>

        {/* Price + Cart button */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-baseline gap-2">
            {parseFloat(price.amount) === 0 ? (
              <span className="text-sm font-medium text-[#b1b2af] italic">Price unavailable</span>
            ) : hasDiscount ? (
              <>
                <span className="font-body font-bold text-[#795a00]">
                  {formatPrice(price.amount, price.currencyCode)}
                </span>
                <span className="text-sm text-[#b1b2af] line-through">
                  {formatPrice(compareAt!.amount, compareAt!.currencyCode)}
                </span>
              </>
            ) : (
              <span className="font-body font-bold text-[#795a00]">
                {formatPrice(price.amount, price.currencyCode)}
              </span>
            )}
          </div>

          {product.availableForSale ? (
            <ProductCardAddButton variantId={variantId} productTitle={product.title} />
          ) : (
            <button
              className="bg-[#eeeeea] text-[#b1b2af] p-2 rounded-lg cursor-not-allowed"
              disabled
              aria-label="Out of stock"
            >
              <span className="material-symbols-outlined text-xl" aria-hidden="true">
                remove_shopping_cart
              </span>
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
