import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getProductByHandle, getProducts, getProductRecommendations } from '@/lib/shopify';
import { Container } from '@/components/ui/Container';
import { StarRating } from '@/components/ui/StarRating';
import { ProductCard } from '@/components/ui/ProductCard';
import { ImageGallery } from '@/components/product/ImageGallery';
import { ProductActions } from '@/components/product/ProductActions';
import { ProductTabs } from '@/components/product/ProductTabs';
import { ProductJsonLd, BreadcrumbJsonLd } from '@/components/seo/JsonLd';
import { WishlistButton } from '@/components/product/WishlistButton';

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
        `Buy ${product.title} at Starbuy.`,
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
    // non-critical — related products are optional
  }

  const images = product.images.edges.map((e) => e.node);

  return (
    <Container as="main" className="py-8 sm:py-12">
      {/* JSON-LD structured data */}
      <ProductJsonLd product={product} />
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: '/' },
          { name: 'Shop', url: '/collections/all' },
          { name: product.title, url: `/products/${product.handle}` },
        ]}
      />

      {/* Breadcrumbs — Stitch style */}
      <nav aria-label="Breadcrumb" className="flex text-sm text-slate-500 mb-8">
        <ol className="flex items-center space-x-2">
          <li>
            <Link href="/" className="hover:text-[#1B2A5E] transition-colors">
              Home
            </Link>
          </li>
          <li className="flex items-center gap-2">
            <span className="material-symbols-outlined text-sm text-slate-300">chevron_right</span>
            <Link href="/collections/all" className="hover:text-[#1B2A5E] transition-colors">
              Shop
            </Link>
          </li>
          <li className="flex items-center gap-2">
            <span className="material-symbols-outlined text-sm text-slate-300">chevron_right</span>
            <span className="text-[#1B2A5E] font-medium line-clamp-1 max-w-[200px]">
              {product.title}
            </span>
          </li>
        </ol>
      </nav>

      {/* Product section — 2 columns */}
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 items-start mb-16">
        {/* Left — Image Gallery */}
        <ImageGallery images={images} title={product.title} />

        {/* Right — Product Info */}
        <div className="flex flex-col">
          {/* Vendor */}
          {product.vendor && (
            <p className="text-sm font-medium text-[#D4A843] uppercase tracking-wider mb-2">
              {product.vendor}
            </p>
          )}

          {/* Title + wishlist */}
          <div className="flex items-start gap-3 mb-2">
            <h1 className="text-4xl font-extrabold text-[#1B2A5E] flex-1 font-[var(--font-heading)]">
              {product.title}
            </h1>
            <WishlistButton productId={product.id} size="md" className="mt-1 flex-shrink-0" />
          </div>

          {/* Star Rating */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex items-center text-[#D4A843]">
              <StarRating rating={4.5} />
              <span className="ml-2 text-[#1A1A2E] font-semibold">4.5</span>
            </div>
            <a href="#reviews" className="text-sm text-slate-500 hover:text-[#1B2A5E] underline">
              128 reviews
            </a>
          </div>

          {/* Short description */}
          {product.description && (
            <p className="text-slate-500 text-lg mb-8 leading-relaxed">
              {product.description.slice(0, 200)}
              {product.description.length > 200 ? '...' : ''}
            </p>
          )}

          {/* Product actions (variant, qty, cart — client) */}
          <ProductActions product={product} />

          {/* Share */}
          <div className="flex items-center gap-4 mt-4">
            <span className="text-sm font-bold text-[#1A1A2E]">Share:</span>
            <div className="flex gap-2">
              <button className="w-8 h-8 rounded-full flex items-center justify-center border border-slate-200 hover:bg-[#1B2A5E] hover:text-white transition-colors">
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
          <h2 className="text-3xl font-extrabold text-[#1A1A2E] mb-8 font-[var(--font-heading)]">
            You May Also Like
          </h2>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {relatedProducts.map((rp) => (
              <ProductCard key={rp.id} product={rp} />
            ))}
          </div>
        </section>
      )}
    </Container>
  );
}
