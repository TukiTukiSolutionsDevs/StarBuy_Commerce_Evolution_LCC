import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getShopPolicies } from '@/lib/shopify';
import { Container } from '@/components/ui/Container';

type PolicyPageProps = {
  params: Promise<{ handle: string }>;
};

type PolicyData = {
  id: string;
  title: string;
  handle: string;
  body: string;
  url: string;
} | null;

const HANDLE_TO_POLICY_KEY: Record<
  string,
  'privacyPolicy' | 'refundPolicy' | 'shippingPolicy' | 'termsOfService'
> = {
  'privacy-policy': 'privacyPolicy',
  'refund-policy': 'refundPolicy',
  'shipping-policy': 'shippingPolicy',
  'terms-of-service': 'termsOfService',
};

async function getPolicyData(handle: string): Promise<PolicyData> {
  const key = HANDLE_TO_POLICY_KEY[handle];
  if (!key) return null;

  try {
    const policies = await getShopPolicies();
    return policies[key] ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: PolicyPageProps): Promise<Metadata> {
  const { handle } = await params;
  const policy = await getPolicyData(handle);

  if (!policy) {
    return { title: 'Policy Not Found — StarBuyBaby' };
  }

  return {
    title: `${policy.title} — StarBuyBaby`,
    description: `Read StarBuyBaby's ${policy.title.toLowerCase()}.`,
    robots: { index: true, follow: true },
  };
}

export default async function PolicyPage({ params }: PolicyPageProps) {
  const { handle } = await params;
  const policy = await getPolicyData(handle);

  if (!policy) {
    notFound();
  }

  const allPolicies = [
    { label: 'Privacy Policy', href: '/policies/privacy-policy' },
    { label: 'Refund Policy', href: '/policies/refund-policy' },
    { label: 'Shipping Policy', href: '/policies/shipping-policy' },
    { label: 'Terms of Service', href: '/policies/terms-of-service' },
  ];

  return (
    <Container as="main" className="py-12 sm:py-16 bg-[#faf9f6]">
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="mb-8">
        <ol className="flex items-center gap-2 text-sm text-[#5d605c]">
          <li>
            <Link href="/" className="hover:text-[#795a00] transition-colors">
              Home
            </Link>
          </li>
          <li aria-hidden="true">
            <span className="material-symbols-outlined text-sm text-[#b1b2af]">chevron_right</span>
          </li>
          <li className="text-[#303330] font-medium">{policy.title}</li>
        </ol>
      </nav>

      <div className="grid grid-cols-1 gap-12 lg:grid-cols-4">
        {/* Sidebar nav */}
        <aside className="lg:col-span-1">
          <div className="sticky top-24">
            <h2 className="font-label text-xs font-semibold uppercase tracking-widest text-[#5d605c] mb-4">
              Policies
            </h2>
            <nav>
              <ul className="space-y-1">
                {allPolicies.map((p) => {
                  const isActive = p.href === `/policies/${handle}`;
                  return (
                    <li key={p.href}>
                      <Link
                        href={p.href}
                        className={[
                          'block rounded-xl px-4 py-2.5 text-sm transition-all duration-300',
                          isActive
                            ? 'bg-[#795a00] font-semibold text-[#fff8f0]'
                            : 'text-[#5d605c] hover:bg-[#f4f4f0] hover:text-[#303330]',
                        ].join(' ')}
                        aria-current={isActive ? 'page' : undefined}
                      >
                        {p.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </div>
        </aside>

        {/* Policy content */}
        <article className="lg:col-span-3">
          <h1 className="font-headline text-4xl text-[#303330] mb-8">{policy.title}</h1>

          {policy.body ? (
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
              dangerouslySetInnerHTML={{ __html: policy.body }}
            />
          ) : (
            <div className="rounded-2xl bg-[#f4f4f0] p-8 text-center">
              <span
                className="material-symbols-outlined text-5xl text-[#b1b2af] mb-4 block"
                aria-hidden="true"
              >
                description
              </span>
              <p className="text-[#5d605c] mb-4">
                This policy is not yet available. Please check back soon or{' '}
                <Link
                  href="/contact"
                  className="text-[#795a00] hover:text-[#6b4f00] underline transition-colors"
                >
                  contact us
                </Link>{' '}
                for more information.
              </p>
            </div>
          )}
        </article>
      </div>
    </Container>
  );
}
