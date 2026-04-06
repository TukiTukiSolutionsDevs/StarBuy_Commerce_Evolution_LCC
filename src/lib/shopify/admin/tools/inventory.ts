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
    sku: string;
    barcode: string | null;
    inventoryItemId: string;
    tracked: boolean;
    levels: InventoryLevel[];
  }>;
};

export type InventoryAdjustmentReason =
  | 'correction'
  | 'cycle_count_available'
  | 'damaged'
  | 'promotion_or_exchange'
  | 'received'
  | 'restock'
  | 'safety_stock'
  | 'shrinkage'
  | 'quality_control'
  | 'other';

// ─── Get Inventory Levels ──────────────────────────────────────────────────────

export async function getInventoryLevels(productId: string): Promise<ProductInventory> {
  const gid = productId.startsWith('gid://') ? productId : `gid://shopify/Product/${productId}`;

  const gql = `
    query GetInventory($id: ID!) {
      product(id: $id) {
        id
        variants(first: 20) {
          edges {
            node {
              id
              title
              sku
              barcode
              inventoryItem {
                id
                tracked
                inventoryLevels(first: 10) {
                  edges {
                    node {
                      location {
                        id
                        name
                      }
                      quantities(names: ["available", "on_hand", "committed", "incoming"]) {
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
            sku: string;
            barcode: string | null;
            inventoryItem: {
              id: string;
              tracked: boolean;
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
      sku: e.node.sku ?? '',
      barcode: e.node.barcode ?? null,
      inventoryItemId: e.node.inventoryItem.id,
      tracked: e.node.inventoryItem.tracked,
      levels: e.node.inventoryItem.inventoryLevels.edges.map((l) => l.node),
    })),
  };
}

// ─── Set Inventory by Item ID ─────────────────────────────────────────────────

/**
 * Sets or adjusts inventory for a specific inventoryItemId + locationId.
 * mode 'set'    → absolute quantity
 * mode 'adjust' → relative delta (+/-)
 */
export async function setInventoryByItemId(
  inventoryItemId: string,
  locationId: string,
  value: number,
  mode: 'set' | 'adjust' = 'set',
  reason: InventoryAdjustmentReason = 'correction',
): Promise<{ success: boolean; message: string }> {
  const itemGid = inventoryItemId.startsWith('gid://')
    ? inventoryItemId
    : `gid://shopify/InventoryItem/${inventoryItemId}`;
  const locationGid = locationId.startsWith('gid://')
    ? locationId
    : `gid://shopify/Location/${locationId}`;

  if (mode === 'adjust') {
    // Use inventoryAdjustQuantities for relative delta
    const mutation = `
      mutation AdjustInventory($input: InventoryAdjustQuantitiesInput!) {
        inventoryAdjustQuantities(input: $input) {
          inventoryAdjustmentGroup {
            id
          }
          userErrors { field message }
        }
      }
    `;

    const data = await adminFetch<{
      inventoryAdjustQuantities: {
        inventoryAdjustmentGroup: { id: string } | null;
        userErrors: Array<{ field: string[] | null; message: string }>;
      };
    }>({
      query: mutation,
      variables: {
        input: {
          name: 'available',
          reason,
          changes: [
            {
              inventoryItemId: itemGid,
              locationId: locationGid,
              delta: value,
            },
          ],
        },
      },
    });

    const { userErrors } = data.inventoryAdjustQuantities;
    if (userErrors.length > 0) {
      return {
        success: false,
        message: `Adjustment failed: ${userErrors.map((e) => e.message).join(', ')}`,
      };
    }
    return {
      success: true,
      message: `Inventory adjusted by ${value > 0 ? '+' : ''}${value} units.`,
    };
  }

  // mode === 'set'
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
        reason,
        quantities: [
          {
            inventoryItemId: itemGid,
            locationId: locationGid,
            quantity: value,
          },
        ],
      },
    },
  });

  const { userErrors } = data.inventorySetQuantities;
  if (userErrors.length > 0) {
    return {
      success: false,
      message: `Set failed: ${userErrors.map((e) => e.message).join(', ')}`,
    };
  }
  return {
    success: true,
    message: `Inventory set to ${value} units.`,
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
  locationId: string = 'gid://shopify/Location/86682697925',
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
