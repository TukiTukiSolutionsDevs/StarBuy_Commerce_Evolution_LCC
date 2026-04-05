/**
 * Admin Tools — Products
 *
 * Product CRUD operations via Shopify Admin API.
 */

import { adminFetch } from '../client';

// ─── Types ─────────────────────────────────────────────────────────────────────

type Money = { amount: string; currencyCode: string };
type Image = { url: string; altText: string | null };

export type AdminProduct = {
  id: string;
  title: string;
  handle: string;
  status: string;
  vendor: string;
  productType: string;
  tags: string[];
  descriptionHtml: string;
  priceRangeV2: {
    minVariantPrice: Money;
    maxVariantPrice: Money;
  };
  featuredImage: Image | null;
  variants: {
    edges: Array<{
      node: {
        id: string;
        title: string;
        price: string;
        compareAtPrice: string | null;
        inventoryQuantity: number | null;
      };
    }>;
  };
  createdAt: string;
  updatedAt: string;
};

type UserError = { field: string[] | null; message: string };

const PRODUCT_FRAGMENT = `
  fragment ProductFields on Product {
    id
    title
    handle
    status
    vendor
    productType
    tags
    descriptionHtml
    priceRangeV2 {
      minVariantPrice { amount currencyCode }
      maxVariantPrice { amount currencyCode }
    }
    featuredImage { url altText }
    variants(first: 10) {
      edges {
        node {
          id
          title
          price
          compareAtPrice
          inventoryQuantity
        }
      }
    }
    createdAt
    updatedAt
  }
`;

// ─── Search / List ─────────────────────────────────────────────────────────────

export async function searchProducts(
  query: string = '',
  limit: number = 10
): Promise<AdminProduct[]> {
  const gql = `
    query SearchProducts($query: String, $first: Int!) {
      products(query: $query, first: $first) {
        edges {
          node {
            ...ProductFields
          }
        }
      }
    }
    ${PRODUCT_FRAGMENT}
  `;

  const data = await adminFetch<{
    products: { edges: Array<{ node: AdminProduct }> };
  }>({ query: gql, variables: { query, first: limit } });

  return data.products.edges.map((e) => e.node);
}

// ─── Get by ID ─────────────────────────────────────────────────────────────────

export async function getProductById(id: string): Promise<AdminProduct | null> {
  // Accept numeric IDs or full GIDs
  const gid = id.startsWith('gid://') ? id : `gid://shopify/Product/${id}`;

  const gql = `
    query GetProduct($id: ID!) {
      product(id: $id) {
        ...ProductFields
      }
    }
    ${PRODUCT_FRAGMENT}
  `;

  const data = await adminFetch<{ product: AdminProduct | null }>({
    query: gql,
    variables: { id: gid },
  });

  return data.product;
}

// ─── Create ────────────────────────────────────────────────────────────────────

type CreateProductInput = {
  title: string;
  descriptionHtml?: string;
  vendor?: string;
  productType?: string;
  tags?: string[];
  status?: 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
  price?: string;
};

const HEADLESS_PUBLICATION_ID = 'gid://shopify/Publication/188793356485';
const DEFAULT_LOCATION_ID = 'gid://shopify/Location/86682697925';

export async function createProduct(
  input: CreateProductInput
): Promise<{ product: AdminProduct | null; userErrors: UserError[] }> {
  const createMutation = `
    mutation CreateProduct($input: ProductInput!) {
      productCreate(input: $input) {
        product {
          ...ProductFields
        }
        userErrors { field message }
      }
    }
    ${PRODUCT_FRAGMENT}
  `;

  const productInput = {
    title: input.title,
    descriptionHtml: input.descriptionHtml ?? '',
    vendor: input.vendor ?? '',
    productType: input.productType ?? '',
    tags: input.tags ?? [],
    status: input.status ?? 'ACTIVE',
  };

  const createData = await adminFetch<{
    productCreate: {
      product: AdminProduct | null;
      userErrors: UserError[];
    };
  }>({ query: createMutation, variables: { input: productInput } });

  const { product, userErrors } = createData.productCreate;

  if (userErrors.length > 0 || !product) {
    return { product: null, userErrors: userErrors };
  }

  // Set price on the default variant
  if (input.price && product.variants.edges.length > 0) {
    const variantId = product.variants.edges[0].node.id;
    await setProductPrice(variantId, input.price).catch((err: unknown) =>
      console.error('[createProduct] setProductPrice failed:', err)
    );
  }

  // Publish to Headless channel
  const publishMutation = `
    mutation PublishProduct($id: ID!, $input: [PublicationInput!]!) {
      publishablePublish(id: $id, input: $input) {
        userErrors { field message }
      }
    }
  `;

  await adminFetch({
    query: publishMutation,
    variables: {
      id: product.id,
      input: [{ publicationId: HEADLESS_PUBLICATION_ID }],
    },
  }).catch((err: unknown) =>
    console.error('[createProduct] publish failed:', err)
  );

  // Set inventory to 100 units
  if (product.variants.edges.length > 0) {
    const variantId = product.variants.edges[0].node.id;
    await setInventoryForVariant(variantId, 100, DEFAULT_LOCATION_ID).catch(
      (err: unknown) =>
        console.error('[createProduct] setInventory failed:', err)
    );
  }

  // Return refreshed product
  const refreshed = await getProductById(product.id);
  return { product: refreshed, userErrors: [] };
}

// ─── Update ────────────────────────────────────────────────────────────────────

type UpdateProductFields = Partial<
  Pick<
    CreateProductInput,
    'title' | 'descriptionHtml' | 'vendor' | 'productType' | 'tags' | 'status'
  >
>;

export async function updateProduct(
  id: string,
  fields: UpdateProductFields
): Promise<{ product: AdminProduct | null; userErrors: UserError[] }> {
  const gid = id.startsWith('gid://') ? id : `gid://shopify/Product/${id}`;

  const mutation = `
    mutation UpdateProduct($input: ProductInput!) {
      productUpdate(input: $input) {
        product {
          ...ProductFields
        }
        userErrors { field message }
      }
    }
    ${PRODUCT_FRAGMENT}
  `;

  const data = await adminFetch<{
    productUpdate: {
      product: AdminProduct | null;
      userErrors: UserError[];
    };
  }>({ query: mutation, variables: { input: { id: gid, ...fields } } });

  return data.productUpdate;
}

// ─── Delete ────────────────────────────────────────────────────────────────────

export async function deleteProduct(
  id: string
): Promise<{ deleted: boolean; userErrors: UserError[] }> {
  const gid = id.startsWith('gid://') ? id : `gid://shopify/Product/${id}`;

  const mutation = `
    mutation DeleteProduct($input: ProductDeleteInput!) {
      productDelete(input: $input) {
        deletedProductId
        userErrors { field message }
      }
    }
  `;

  const data = await adminFetch<{
    productDelete: {
      deletedProductId: string | null;
      userErrors: UserError[];
    };
  }>({ query: mutation, variables: { input: { id: gid } } });

  return {
    deleted: !!data.productDelete.deletedProductId,
    userErrors: data.productDelete.userErrors,
  };
}

// ─── Set Price ─────────────────────────────────────────────────────────────────

export async function setProductPrice(
  variantId: string,
  price: string,
  compareAtPrice?: string
): Promise<{ userErrors: UserError[] }> {
  const gid = variantId.startsWith('gid://')
    ? variantId
    : `gid://shopify/ProductVariant/${variantId}`;

  const mutation = `
    mutation UpdateVariantPrice($input: ProductVariantInput!) {
      productVariantUpdate(input: $input) {
        productVariant {
          id
          price
          compareAtPrice
        }
        userErrors { field message }
      }
    }
  `;

  const input: Record<string, unknown> = { id: gid, price };
  if (compareAtPrice !== undefined) {
    input.compareAtPrice = compareAtPrice;
  }

  const data = await adminFetch<{
    productVariantUpdate: {
      productVariant: { id: string } | null;
      userErrors: UserError[];
    };
  }>({ query: mutation, variables: { input } });

  return { userErrors: data.productVariantUpdate.userErrors };
}

// ─── Internal: set inventory for a variant ─────────────────────────────────────

async function setInventoryForVariant(
  variantId: string,
  quantity: number,
  locationId: string
): Promise<void> {
  // First get the inventoryItemId from the variant
  const variantQuery = `
    query GetVariantInventory($id: ID!) {
      productVariant(id: $id) {
        inventoryItem { id }
      }
    }
  `;

  const variantData = await adminFetch<{
    productVariant: { inventoryItem: { id: string } } | null;
  }>({ query: variantQuery, variables: { id: variantId } });

  const inventoryItemId = variantData.productVariant?.inventoryItem?.id;
  if (!inventoryItemId) return;

  const mutation = `
    mutation SetInventory($input: InventorySetQuantitiesInput!) {
      inventorySetQuantities(input: $input) {
        inventoryAdjustmentGroup {
          id
        }
        userErrors { field message }
      }
    }
  `;

  await adminFetch({
    query: mutation,
    variables: {
      input: {
        name: 'available',
        reason: 'correction',
        quantities: [
          {
            inventoryItemId,
            locationId,
            quantity,
          },
        ],
      },
    },
  });
}
