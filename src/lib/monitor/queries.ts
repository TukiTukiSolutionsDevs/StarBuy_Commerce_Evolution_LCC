/**
 * Monitor Module — GraphQL Query Strings
 *
 * SHOPIFYQL_VIEWS_QUERY accepts a pre-built `$query` string variable
 * so we avoid interpolating JS vars into a module-level template literal.
 */

// ─── Views (ShopifyQL — query string built in fetcher) ────────────────────────

export const SHOPIFYQL_VIEWS_QUERY = `
  query ProductViews($query: String!) {
    shopifyqlQuery(query: $query) {
      tableData {
        rowData
      }
      parseErrors {
        code
        message
      }
    }
  }
`;

// ─── Orders (slim — no heavy ORDER_FRAGMENT) ──────────────────────────────────

export const SLIM_ORDERS_QUERY = `
  query MonitorOrders($query: String!) {
    orders(first: 250, query: $query) {
      pageInfo { hasNextPage endCursor }
      edges {
        node {
          id
          lineItems(first: 50) {
            edges {
              node {
                product { id }
                quantity
                originalTotalSet { shopMoney { amount } }
              }
            }
          }
        }
      }
    }
  }
`;

// ─── Inventory ────────────────────────────────────────────────────────────────

export const INVENTORY_LEVELS_QUERY = `
  query MonitorInventory($productId: ID!) {
    product(id: $productId) {
      variants(first: 100) {
        edges {
          node {
            inventoryItem {
              inventoryLevels(first: 20) {
                edges {
                  node {
                    available
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
