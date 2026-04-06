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
  descriptionHtml: string;
  productsCount: { count: number };
  image: { url: string; altText: string | null } | null;
  updatedAt: string;
  // NEW fields
  sortOrder: string;
  ruleSet: {
    appliedDisjunctively: boolean;
    rules: Array<{ column: string; relation: string; condition: string }>;
  } | null;
  seo: { title: string | null; description: string | null };
};

// ─── List Collections ──────────────────────────────────────────────────────────

export async function listCollections(limit: number = 20): Promise<AdminCollection[]> {
  const gql = `
    query ListCollections($first: Int!) {
      collections(first: $first, sortKey: TITLE) {
        edges {
          node {
            id
            title
            handle
            description
            descriptionHtml
            productsCount { count }
            image { url altText }
            updatedAt
            sortOrder
            ruleSet {
              appliedDisjunctively
              rules {
                column
                relation
                condition
              }
            }
            seo {
              title
              description
            }
            
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
  collectionId: string,
): Promise<{ success: boolean; userErrors: UserError[] }> {
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
    userErrors: data.collectionAddProducts.userErrors,
  };
}

// ─── Remove Product from Collection ───────────────────────────────────────────

export async function removeProductFromCollection(
  productId: string,
  collectionId: string,
): Promise<{ success: boolean; userErrors: UserError[] }> {
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
    userErrors: data.collectionRemoveProducts.userErrors,
  };
}

// ─── Create Collection ─────────────────────────────────────────────────────────

export type CollectionInput = {
  title: string;
  descriptionHtml?: string;
  image?: { src: string; altText?: string };
  ruleSet?: {
    appliedDisjunctively: boolean;
    rules: Array<{ column: string; relation: string; condition: string }>;
  };
  seo?: { title: string; description: string };
  sortOrder?: string;
};

export async function createCollection(
  input: CollectionInput,
): Promise<{ collection: AdminCollection | null; userErrors: UserError[] }> {
  const mutation = `
    mutation CreateCollection($input: CollectionInput!) {
      collectionCreate(input: $input) {
        collection {
          id
          title
          handle
          description
          descriptionHtml
          productsCount { count }
          image { url altText }
          updatedAt
          sortOrder
          ruleSet {
            appliedDisjunctively
            rules { column relation condition }
          }
          seo { title description }
          publishedOnCurrentPublication
        }
        userErrors { field message }
      }
    }
  `;

  const data = await adminFetch<{
    collectionCreate: {
      collection: AdminCollection | null;
      userErrors: UserError[];
    };
  }>({ query: mutation, variables: { input } });

  return {
    collection: data.collectionCreate.collection,
    userErrors: data.collectionCreate.userErrors,
  };
}

// ─── Update Collection ─────────────────────────────────────────────────────────

export type CollectionUpdateInput = {
  id: string;
  title?: string;
  descriptionHtml?: string;
  image?: { src: string; altText?: string } | null;
  ruleSet?: {
    appliedDisjunctively: boolean;
    rules: Array<{ column: string; relation: string; condition: string }>;
  };
  seo?: { title: string; description: string };
  sortOrder?: string;
};

export async function updateCollection(
  input: CollectionUpdateInput,
): Promise<{ collection: AdminCollection | null; userErrors: UserError[] }> {
  const mutation = `
    mutation UpdateCollection($input: CollectionInput!) {
      collectionUpdate(input: $input) {
        collection {
          id
          title
          handle
          description
          descriptionHtml
          productsCount { count }
          image { url altText }
          updatedAt
          sortOrder
          ruleSet {
            appliedDisjunctively
            rules { column relation condition }
          }
          seo { title description }
          publishedOnCurrentPublication
        }
        userErrors { field message }
      }
    }
  `;

  const data = await adminFetch<{
    collectionUpdate: {
      collection: AdminCollection | null;
      userErrors: UserError[];
    };
  }>({ query: mutation, variables: { input } });

  return {
    collection: data.collectionUpdate.collection,
    userErrors: data.collectionUpdate.userErrors,
  };
}

// ─── Delete Collection ─────────────────────────────────────────────────────────

export async function deleteCollection(
  collectionId: string,
): Promise<{ deleted: boolean; userErrors: UserError[] }> {
  const gid = collectionId.startsWith('gid://')
    ? collectionId
    : `gid://shopify/Collection/${collectionId}`;

  const mutation = `
    mutation DeleteCollection($input: CollectionDeleteInput!) {
      collectionDelete(input: $input) {
        deletedCollectionId
        userErrors { field message }
      }
    }
  `;

  const data = await adminFetch<{
    collectionDelete: {
      deletedCollectionId: string | null;
      userErrors: UserError[];
    };
  }>({ query: mutation, variables: { input: { id: gid } } });

  return {
    deleted: !!data.collectionDelete.deletedCollectionId,
    userErrors: data.collectionDelete.userErrors,
  };
}
