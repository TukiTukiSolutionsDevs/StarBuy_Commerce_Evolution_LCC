/**
 * Admin Tools — Collections
 *
 * Collection management via Shopify Admin API.
 */

import { adminFetch } from '../client';

// ─── Types ─────────────────────────────────────────────────────────────────────

type UserError = { field: string[] | null; message: string };

export type AdminCollection = {
  id: string;
  title: string;
  handle: string;
  description: string;
  productsCount: { count: number };
  image: { url: string; altText: string | null } | null;
  updatedAt: string;
};

// ─── List Collections ──────────────────────────────────────────────────────────

export async function listCollections(
  limit: number = 20
): Promise<AdminCollection[]> {
  const gql = `
    query ListCollections($first: Int!) {
      collections(first: $first, sortKey: TITLE) {
        edges {
          node {
            id
            title
            handle
            description
            productsCount { count }
            image { url altText }
            updatedAt
          }
        }
      }
    }
  `;

  const data = await adminFetch<{
    collections: { edges: Array<{ node: AdminCollection }> };
  }>({ query: gql, variables: { first: limit } });

  return data.collections.edges.map((e) => e.node);
}

// ─── Add Product to Collection ─────────────────────────────────────────────────

export async function addProductToCollection(
  productId: string,
  collectionId: string
): Promise<{ success: boolean; errors: UserError[] }> {
  const productGid = productId.startsWith('gid://')
    ? productId
    : `gid://shopify/Product/${productId}`;

  const collectionGid = collectionId.startsWith('gid://')
    ? collectionId
    : `gid://shopify/Collection/${collectionId}`;

  const mutation = `
    mutation AddProductToCollection($id: ID!, $productIds: [ID!]!) {
      collectionAddProducts(id: $id, productIds: $productIds) {
        collection {
          id
          title
        }
        userErrors { field message }
      }
    }
  `;

  const data = await adminFetch<{
    collectionAddProducts: {
      collection: { id: string; title: string } | null;
      userErrors: UserError[];
    };
  }>({
    query: mutation,
    variables: { id: collectionGid, productIds: [productGid] },
  });

  return {
    success: !!data.collectionAddProducts.collection,
    errors: data.collectionAddProducts.userErrors,
  };
}

// ─── Remove Product from Collection ───────────────────────────────────────────

export async function removeProductFromCollection(
  productId: string,
  collectionId: string
): Promise<{ success: boolean; errors: UserError[] }> {
  const productGid = productId.startsWith('gid://')
    ? productId
    : `gid://shopify/Product/${productId}`;

  const collectionGid = collectionId.startsWith('gid://')
    ? collectionId
    : `gid://shopify/Collection/${collectionId}`;

  const mutation = `
    mutation RemoveProductFromCollection($id: ID!, $productIds: [ID!]!) {
      collectionRemoveProducts(id: $id, productIds: $productIds) {
        job {
          id
          done
        }
        userErrors { field message }
      }
    }
  `;

  const data = await adminFetch<{
    collectionRemoveProducts: {
      job: { id: string; done: boolean } | null;
      userErrors: UserError[];
    };
  }>({
    query: mutation,
    variables: { id: collectionGid, productIds: [productGid] },
  });

  return {
    success: !!data.collectionRemoveProducts.job,
    errors: data.collectionRemoveProducts.userErrors,
  };
}
