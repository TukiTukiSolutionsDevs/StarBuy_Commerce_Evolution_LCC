import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPageByHandle } from '@/lib/shopify';
import { Container } from '@/components/ui/Container';

type CmsPageProps = {
  params: Promise<{ handle: string }>;
};

export async function generateMetadata({ params }: CmsPageProps): Promise<Metadata> {
  const { handle } = await params;

  try {
    const page = await getPageByHandle(handle);
    if (!page) return { title: 'Page Not Found' };

    return {
      title: page.seo?.title ?? page.title,
      description: page.seo?.description ?? page.bodySummary?.slice(0, 160) ?? '',
    };
  } catch {
    return { title: 'Page' };
  }
}

export default async function CmsPage({ params }: CmsPageProps) {
  const { handle } = await params;

  let page: Awaited<ReturnType<typeof getPageByHandle>> = null;

  try {
    page = await getPageByHandle(handle);
  } catch {
    // API error
  }

  if (!page) {
    notFound();
  }

  return (
    <Container as="main" className="py-12 sm:py-16 bg-[#faf9f6]" narrow>
      <h1 className="font-headline text-4xl text-[#303330] mb-8">{page.title}</h1>

      {/* Shopify page HTML body */}
      {page.body ? (
        <div
          className={[
            'prose prose-lg max-w-none',
            'text-[#5d605c]',
            '[&_h1]:font-headline [&_h1]:text-[#303330]',
            '[&_h2]:font-headline [&_h2]:text-[#303330]',
            '[&_h3]:font-headline [&_h3]:text-[#303330]',
            '[&_a]:text-[#795a00] [&_a:hover]:text-[#6b4f00]',
            '[&_strong]:text-[#303330]',
          ].join(' ')}
          dangerouslySetInnerHTML={{ __html: page.body }}
        />
      ) : (
        <div className="rounded-2xl bg-[#f4f4f0] p-8 text-center">
          <span
            className="material-symbols-outlined text-5xl text-[#b1b2af] mb-4 block"
            aria-hidden="true"
          >
            article
          </span>
          <p className="text-[#5d605c]">This page has no content yet.</p>
        </div>
      )}

      {/* Timestamps */}
      <p className="mt-8 text-xs text-[#b1b2af]">
        Last updated:{' '}
        {new Date(page.updatedAt).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}
      </p>
    </Container>
  );
}
