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
    return { title: 'Policy Not Found — Starbuy' };
  }

  return {
    title: `${policy.title} — Starbuy`,
    description: `Read Starbuy's ${policy.title.toLowerCase()}.`,
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
    <Container as="main" className="py-16">
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-4">
        {/* Sidebar nav */}
        <aside className="lg:col-span-1">
          <div className="sticky top-8">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] mb-3">
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
                          'block rounded-[var(--radius-md)] px-3 py-2 text-sm transition-colors',
                          isActive
                            ? 'bg-[var(--color-primary)] font-semibold text-white'
                            : 'text-[var(--color-text-secondary)] hover:bg-gray-100 hover:text-[var(--color-text-primary)]',
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
          <h1 className="font-heading text-4xl font-bold text-[var(--color-primary)] mb-8">
            {policy.title}
          </h1>

          {policy.body ? (
            <div
              className={[
                'prose prose-lg max-w-none',
                'text-[var(--color-text-primary)]',
                '[&_h1]:font-heading [&_h1]:text-[var(--color-primary)]',
                '[&_h2]:font-heading [&_h2]:text-[var(--color-primary)]',
                '[&_h3]:font-heading [&_h3]:text-[var(--color-text-primary)]',
                '[&_a]:text-[var(--color-primary)] [&_a:hover]:text-[var(--color-primary-light)]',
                '[&_strong]:text-[var(--color-text-primary)]',
              ].join(' ')}
              dangerouslySetInnerHTML={{ __html: policy.body }}
            />
          ) : (
            <p className="text-[var(--color-text-secondary)]">
              This policy is not yet available. Please check back soon or{' '}
              <Link href="/contact" className="text-[var(--color-primary)] underline">
                contact us
              </Link>{' '}
              for more information.
            </p>
          )}
        </article>
      </div>
    </Container>
  );
}
