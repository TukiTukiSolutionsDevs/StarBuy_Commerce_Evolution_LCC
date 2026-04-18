import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getProductByHandle, getProducts, getProductRecommendations } from '@/lib/shopify';
import { Container } from '@/components/ui/Container';
import { ProductCard } from '@/components/ui/ProductCard';
import { ImageGallery } from '@/components/product/ImageGallery';
import { ProductActions } from '@/components/product/ProductActions';
import { ProductTabs } from '@/components/product/ProductTabs';
import { ProductJsonLd, BreadcrumbJsonLd } from '@/components/seo/JsonLd';
import { WishlistButton } from '@/components/product/WishlistButton';
import { StickyAddToCart } from '@/components/product/StickyAddToCart';
import { TrackProductView } from '@/components/product/TrackProductView';
import { RecentlyViewed } from '@/components/product/RecentlyViewed';

type ProductPageProps = {
  params: Promise<{ handle: string }>;
};

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { handle } = await params;

  try {
    const product = await getProductByHandle(handle);
    if (!product) return { title: 'Product Not Found' };

    const ogImage = product.featuredImage?.url;

    return {
      title: product.seo?.title ?? product.title,
      description:
        product.seo?.description ??
        product.description?.slice(0, 160) ??
        `Buy ${product.title} at StarBuyBaby.`,
      openGraph: ogImage
        ? {
            images: [
              {
                url: ogImage,
                width: product.featuredImage?.width ?? 800,
                height: product.featuredImage?.height ?? 800,
                alt: product.featuredImage?.altText ?? product.title,
              },
            ],
          }
        : undefined,
    };
  } catch {
    return { title: 'Product' };
  }
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { handle } = await params;

  let product: Awaited<ReturnType<typeof getProductByHandle>> = null;

  try {
    product = await getProductByHandle(handle);
  } catch {
    // API error
  }

  if (!product) {
    notFound();
  }

  // Fetch recommendations — fallback to best selling if none
  let relatedProducts: Awaited<ReturnType<typeof getProducts>> = [];
  try {
    const recs = await getProductRecommendations(product.id);
    if (recs.length > 0) {
      relatedProducts = recs.slice(0, 4);
    } else {
      relatedProducts = (await getProducts({ first: 4, sortKey: 'BEST_SELLING' }))
        .filter((p) => p.handle !== handle)
        .slice(0, 4);
    }
  } catch {
    // non-critical
  }

  const images = product.images.edges.map((e) => e.node);

  return (
    <Container as="main" className="py-8 sm:py-12 bg-[#faf9f6]">
      {/* JSON-LD structured data */}
      <ProductJsonLd product={product} />
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: '/' },
          { name: 'Shop', url: '/collections/all' },
          { name: product.title, url: `/products/${product.handle}` },
        ]}
      />

      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="flex text-sm text-[#5d605c] mb-8">
        <ol className="flex items-center space-x-2">
          <li>
            <Link href="/" className="hover:text-[#795a00] transition-colors">
              Home
            </Link>
          </li>
          <li className="flex items-center gap-2">
            <span className="material-symbols-outlined text-sm text-[#b1b2af]">chevron_right</span>
            <Link href="/collections/all" className="hover:text-[#795a00] transition-colors">
              Shop
            </Link>
          </li>
          <li className="flex items-center gap-2">
            <span className="material-symbols-outlined text-sm text-[#b1b2af]">chevron_right</span>
            <span className="text-[#303330] font-medium line-clamp-1 max-w-[200px]">
              {product.title}
            </span>
          </li>
        </ol>
      </nav>

      {/* Product section — 2 columns */}
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-16 items-start mb-16">
        {/* Left — Image Gallery */}
        <ImageGallery images={images} title={product.title} />

        {/* Right — Product Info */}
        <div className="flex flex-col">
          {/* Vendor */}
          {product.vendor && (
            <p className="font-label text-xs uppercase tracking-[0.3em] text-[#795a00] mb-4">
              {product.vendor}
            </p>
          )}

          {/* Title + wishlist */}
          <div className="flex items-start gap-3 mb-2">
            <h1 className="font-headline text-2xl md:text-4xl text-[#303330] flex-1">
              {product.title}
            </h1>
            <WishlistButton productId={product.id} size="md" className="mt-1 flex-shrink-0" />
          </div>

          {/* Short description */}
          {product.description && (
            <p className="font-body text-[#5d605c] text-lg mb-8 leading-relaxed">
              {product.description.slice(0, 200)}
              {product.description.length > 200 ? '...' : ''}
            </p>
          )}

          {/* Product actions (variant, qty, cart — client) */}
          <ProductActions product={product} />

          {/* Share */}
          <div className="flex items-center gap-4 mt-4">
            <span className="font-label text-xs uppercase tracking-widest text-[#303330]">
              Share:
            </span>
            <div className="flex gap-2">
              <button className="w-8 h-8 rounded-full flex items-center justify-center bg-[#f4f4f0] hover:bg-[#795a00] hover:text-[#fff8f0] text-[#5d605c] transition-colors duration-400">
                <span className="material-symbols-outlined text-sm" aria-hidden="true">
                  share
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Product details tabs */}
      <ProductTabs
        descriptionHtml={product.descriptionHtml}
        productType={product.productType}
        vendor={product.vendor}
        tags={product.tags}
      />

      {/* Related products */}
      {relatedProducts.length > 0 && (
        <section className="mb-20">
          <h2 className="font-headline text-2xl md:text-3xl text-[#303330] mb-6 md:mb-8">
            Other Parents Also Love
          </h2>
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 md:gap-8">
            {relatedProducts.map((rp) => (
              <ProductCard key={rp.id} product={rp} />
            ))}
          </div>
        </section>
      )}

      {/* Track product view for recently viewed */}
      <TrackProductView
        id={product.id}
        handle={product.handle}
        title={product.title}
        price={product.priceRange.minVariantPrice.amount}
        currencyCode={product.priceRange.minVariantPrice.currencyCode}
        image={product.featuredImage?.url ?? ''}
      />

      {/* Recently Viewed */}
      <RecentlyViewed currentHandle={product.handle} />

      {/* Sticky Add to Cart — mobile only */}
      <StickyAddToCart
        variantId={product.variants.edges[0]?.node.id}
        availableForSale={product.availableForSale}
        price={product.priceRange.minVariantPrice}
        title={product.title}
      />
    </Container>
  );
}
