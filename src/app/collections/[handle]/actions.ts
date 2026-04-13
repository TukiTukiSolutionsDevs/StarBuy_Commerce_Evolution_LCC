'use server';

import { getCollectionByHandle } from '@/lib/shopify';

export async function loadMoreCollectionProducts(
  handle: string,
  cursor: string,
  sortKey: string = 'BEST_SELLING',
  reverse: boolean = false,
  filters?: Record<string, unknown>[],
) {
  const collection = await getCollectionByHandle(handle, {
    first: 12,
    after: cursor,
    sortKey,
    reverse,
    filters,
  });

  if (!collection) {
    return { products: [], pageInfo: { hasNextPage: false, endCursor: null } };
  }

  return {
    products: (collection.products?.edges ?? []).map((e) => e.node),
    pageInfo: collection.products?.pageInfo ?? { hasNextPage: false, endCursor: null },
  };
}
