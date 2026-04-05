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
    <Container as="main" className="py-16" narrow>
      <h1 className="font-heading text-4xl font-bold text-[var(--color-primary)] mb-6">
        {page.title}
      </h1>

      {/* Shopify page HTML body */}
      {page.body ? (
        <div
          className="prose prose-lg max-w-none text-[var(--color-text-primary)] [&_h2]:font-heading [&_h2]:text-[var(--color-primary)] [&_a]:text-[var(--color-primary)] [&_a:hover]:text-[var(--color-primary-light)]"
          dangerouslySetInnerHTML={{ __html: page.body }}
        />
      ) : (
        <p className="text-[var(--color-text-secondary)]">This page has no content yet.</p>
      )}

      {/* Timestamps */}
      <p className="mt-8 text-xs text-gray-400">
        Last updated: {new Date(page.updatedAt).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}
      </p>
    </Container>
  );
}
