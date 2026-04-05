type ShopifyFetchOptions = {
  query: string;
  variables?: Record<string, unknown>;
  revalidate?: number;
  tags?: string[];
};

export async function shopifyFetch<T>({
  query,
  variables,
  revalidate,
  tags,
}: ShopifyFetchOptions): Promise<T> {
  const endpoint = `https://${process.env.SHOPIFY_STORE_DOMAIN}/api/${process.env.SHOPIFY_API_VERSION}/graphql.json`;

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Shopify-Storefront-Private-Token':
        process.env.SHOPIFY_STOREFRONT_PRIVATE_TOKEN!,
    },
    body: JSON.stringify({ query, variables }),
    next: {
      revalidate: revalidate ?? 60,
      tags: tags ?? ['shopify'],
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Shopify API error: ${res.status} - ${text}`);
  }

  const json = (await res.json()) as {
    data?: T;
    errors?: Array<{ message: string }>;
  };

  if (json.errors) {
    throw new Error(
      `Shopify GraphQL error: ${json.errors.map((e) => e.message).join(', ')}`
    );
  }

  return json.data as T;
}
