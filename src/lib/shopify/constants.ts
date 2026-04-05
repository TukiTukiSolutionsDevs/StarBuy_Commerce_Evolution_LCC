export const SHOPIFY_GRAPHQL_ENDPOINT = `https://${process.env.SHOPIFY_STORE_DOMAIN}/api/${process.env.SHOPIFY_API_VERSION}/graphql.json`;

export const DEFAULT_REVALIDATE = {
  home: 300, // 5 minutes
  collection: 60, // 1 minute (stock changes frequently with dropshipping)
  product: 60, // 1 minute
  search: 0, // no cache (dynamic)
  policies: 86400, // 24 hours
  pages: 86400, // 24 hours
} as const;
