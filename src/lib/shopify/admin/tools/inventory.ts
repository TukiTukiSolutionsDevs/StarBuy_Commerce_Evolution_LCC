/**
 * Admin Tools — Inventory
 *
 * Stock management via Shopify Admin API.
 */

import { adminFetch } from '../client';

// ─── Types ─────────────────────────────────────────────────────────────────────

export type InventoryLevel = {
  location: {
    id: string;
    name: string;
  };
  quantities: Array<{
    name: string;
    quantity: number;
  }>;
};

export type ProductInventory = {
  productId: string;
  variants: Array<{
    variantId: string;
    variantTitle: string;
    inventoryItemId: string;
    levels: InventoryLevel[];
  }>;
};

// ─── Get Inventory Levels ──────────────────────────────────────────────────────

export async function getInventoryLevels(
  productId: string
): Promise<ProductInventory> {
  const gid = productId.startsWith('gid://')
    ? productId
    : `gid://shopify/Product/${productId}`;

  const gql = `
    query GetInventory($id: ID!) {
      product(id: $id) {
        id
        variants(first: 20) {
          edges {
            node {
              id
              title
              inventoryItem {
                id
                inventoryLevels(first: 10) {
                  edges {
                    node {
                      location {
                        id
                        name
                      }
                      quantities(names: ["available", "on_hand", "committed"]) {
                        name
                        quantity
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  `;

  const data = await adminFetch<{
    product: {
      id: string;
      variants: {
        edges: Array<{
          node: {
            id: string;
            title: string;
            inventoryItem: {
              id: string;
              inventoryLevels: {
                edges: Array<{
                  node: InventoryLevel;
                }>;
              };
            };
          };
        }>;
      };
    } | null;
  }>({ query: gql, variables: { id: gid } });

  if (!data.product) {
    return { productId: gid, variants: [] };
  }

  return {
    productId: data.product.id,
    variants: data.product.variants.edges.map((e) => ({
      variantId: e.node.id,
      variantTitle: e.node.title,
      inventoryItemId: e.node.inventoryItem.id,
      levels: e.node.inventoryItem.inventoryLevels.edges.map((l) => l.node),
    })),
  };
}

// ─── Set Inventory Quantity ────────────────────────────────────────────────────

/**
 * Sets the available stock for all variants of a product at the default location.
 * Resolves: productId → variants → inventoryItems → set quantities.
 */
export async function setInventoryQuantity(
  productId: string,
  quantity: number,
  locationId: string = 'gid://shopify/Location/86682697925'
): Promise<{ success: boolean; message: string }> {
  const inventory = await getInventoryLevels(productId);

  if (inventory.variants.length === 0) {
    return { success: false, message: 'No variants found for this product.' };
  }

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

  const quantities = inventory.variants.map((v) => ({
    inventoryItemId: v.inventoryItemId,
    locationId,
    quantity,
  }));

  const data = await adminFetch<{
    inventorySetQuantities: {
      inventoryAdjustmentGroup: { id: string } | null;
      userErrors: Array<{ field: string[] | null; message: string }>;
    };
  }>({
    query: mutation,
    variables: {
      input: {
        name: 'available',
        reason: 'correction',
        quantities,
      },
    },
  });

  const { userErrors } = data.inventorySetQuantities;

  if (userErrors.length > 0) {
    return {
      success: false,
      message: `Inventory update failed: ${userErrors.map((e) => e.message).join(', ')}`,
    };
  }

  return {
    success: true,
    message: `Inventory set to ${quantity} units for ${inventory.variants.length} variant(s).`,
  };
}
