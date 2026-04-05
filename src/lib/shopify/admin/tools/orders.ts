/**
 * Admin Tools — Orders
 *
 * Order management via Shopify Admin API.
 */

import { adminFetch } from '../client';

// ─── Types ─────────────────────────────────────────────────────────────────────

type Money = { amount: string; currencyCode: string };
type UserError = { field: string[] | null; message: string };

export type AdminOrder = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  displayFinancialStatus: string;
  displayFulfillmentStatus: string;
  currentTotalPriceSet: { shopMoney: Money };
  subtotalPriceSet: { shopMoney: Money } | null;
  createdAt: string;
  updatedAt: string;
  cancelledAt: string | null;
  note: string | null;
  tags: string[];
  customer: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
  } | null;
  shippingAddress: {
    firstName: string | null;
    lastName: string | null;
    address1: string | null;
    city: string | null;
    country: string | null;
  } | null;
  lineItems: {
    edges: Array<{
      node: {
        id: string;
        name: string;
        quantity: number;
        originalTotalSet: { shopMoney: Money };
        variant: {
          id: string;
          title: string;
          price: string;
        } | null;
      };
    }>;
  };
};

const ORDER_FRAGMENT = `
  fragment OrderFields on Order {
    id
    name
    email
    phone
    displayFinancialStatus
    displayFulfillmentStatus
    currentTotalPriceSet { shopMoney { amount currencyCode } }
    subtotalPriceSet { shopMoney { amount currencyCode } }
    createdAt
    updatedAt
    cancelledAt
    note
    tags
    customer {
      id
      firstName
      lastName
      email
    }
    shippingAddress {
      firstName
      lastName
      address1
      city
      country
    }
    lineItems(first: 20) {
      edges {
        node {
          id
          name
          quantity
          originalTotalSet { shopMoney { amount currencyCode } }
          variant {
            id
            title
            price
          }
        }
      }
    }
  }
`;

// ─── Search / List ─────────────────────────────────────────────────────────────

export async function searchOrders(
  query: string = '',
  limit: number = 10,
  status?: string
): Promise<AdminOrder[]> {
  // Build query string combining search and status filter
  let queryStr = query;
  if (status) {
    queryStr = queryStr ? `${queryStr} status:${status}` : `status:${status}`;
  }

  const gql = `
    query SearchOrders($query: String, $first: Int!) {
      orders(query: $query, first: $first, sortKey: CREATED_AT, reverse: true) {
        edges {
          node {
            ...OrderFields
          }
        }
      }
    }
    ${ORDER_FRAGMENT}
  `;

  const data = await adminFetch<{
    orders: { edges: Array<{ node: AdminOrder }> };
  }>({ query: gql, variables: { query: queryStr, first: limit } });

  return data.orders.edges.map((e) => e.node);
}

// ─── Get by ID ─────────────────────────────────────────────────────────────────

export async function getOrderById(orderId: string): Promise<AdminOrder | null> {
  // Smart lookup: handle #1234, 1234, or full GID
  let gid: string;

  if (orderId.startsWith('gid://')) {
    gid = orderId;
  } else if (orderId.startsWith('#')) {
    // Look up by order name
    const orders = await searchOrders(`name:${orderId}`, 1);
    return orders[0] ?? null;
  } else if (/^\d+$/.test(orderId)) {
    gid = `gid://shopify/Order/${orderId}`;
  } else {
    // Treat as order name search
    const orders = await searchOrders(`name:#${orderId}`, 1);
    return orders[0] ?? null;
  }

  const gql = `
    query GetOrder($id: ID!) {
      order(id: $id) {
        ...OrderFields
      }
    }
    ${ORDER_FRAGMENT}
  `;

  const data = await adminFetch<{ order: AdminOrder | null }>({
    query: gql,
    variables: { id: gid },
  });

  return data.order;
}

// ─── Cancel ────────────────────────────────────────────────────────────────────

export async function cancelOrder(
  orderId: string,
  reason: string = 'OTHER',
  restock: boolean = true,
  refund: boolean = false
): Promise<{ order: AdminOrder | null; userErrors: UserError[] }> {
  const gid = orderId.startsWith('gid://')
    ? orderId
    : `gid://shopify/Order/${orderId}`;

  const mutation = `
    mutation CancelOrder($orderId: ID!, $reason: OrderCancelReason!, $restock: Boolean!, $refund: Boolean!) {
      orderCancel(orderId: $orderId, reason: $reason, restock: $restock, refund: $refund) {
        order {
          ...OrderFields
        }
        userErrors { field message }
      }
    }
    ${ORDER_FRAGMENT}
  `;

  const data = await adminFetch<{
    orderCancel: {
      order: AdminOrder | null;
      userErrors: UserError[];
    };
  }>({
    query: mutation,
    variables: {
      orderId: gid,
      reason: reason.toUpperCase(),
      restock,
      refund,
    },
  });

  return data.orderCancel;
}

// ─── Create Fulfillment ────────────────────────────────────────────────────────

export async function createFulfillment(
  orderId: string,
  trackingNumber?: string,
  trackingUrl?: string,
  company?: string
): Promise<{ fulfillment: { id: string; status: string } | null; userErrors: UserError[] }> {
  const gid = orderId.startsWith('gid://')
    ? orderId
    : `gid://shopify/Order/${orderId}`;

  // Get fulfillment order IDs first
  const foQuery = `
    query GetFulfillmentOrders($orderId: ID!) {
      order(id: $orderId) {
        fulfillmentOrders(first: 5) {
          edges {
            node {
              id
              status
            }
          }
        }
      }
    }
  `;

  const foData = await adminFetch<{
    order: {
      fulfillmentOrders: {
        edges: Array<{ node: { id: string; status: string } }>;
      };
    } | null;
  }>({ query: foQuery, variables: { orderId: gid } });

  const openFOs =
    foData.order?.fulfillmentOrders.edges
      .filter((e) => e.node.status === 'OPEN')
      .map((e) => ({ fulfillmentOrderId: e.node.id })) ?? [];

  if (openFOs.length === 0) {
    return {
      fulfillment: null,
      userErrors: [{ field: null, message: 'No open fulfillment orders found for this order.' }],
    };
  }

  const mutation = `
    mutation CreateFulfillment($fulfillment: FulfillmentInput!) {
      fulfillmentCreate(fulfillment: $fulfillment) {
        fulfillment {
          id
          status
        }
        userErrors { field message }
      }
    }
  `;

  const trackingInfo: Record<string, unknown> = {};
  if (trackingNumber) trackingInfo.number = trackingNumber;
  if (trackingUrl) trackingInfo.url = trackingUrl;
  if (company) trackingInfo.company = company;

  const fulfillmentInput: Record<string, unknown> = {
    lineItemsByFulfillmentOrder: openFOs,
    notifyCustomer: true,
  };

  if (Object.keys(trackingInfo).length > 0) {
    fulfillmentInput.trackingInfo = trackingInfo;
  }

  const data = await adminFetch<{
    fulfillmentCreate: {
      fulfillment: { id: string; status: string } | null;
      userErrors: UserError[];
    };
  }>({ query: mutation, variables: { fulfillment: fulfillmentInput } });

  return data.fulfillmentCreate;
}

// ─── Refund ────────────────────────────────────────────────────────────────────

type RefundLineItem = {
  lineItemId: string;
  quantity: number;
  restockType?: 'RETURN' | 'CANCEL' | 'NO_RESTOCK';
  locationId?: string;
};

export async function refundOrder(
  orderId: string,
  lineItems?: RefundLineItem[],
  note?: string
): Promise<{ refund: { id: string } | null; userErrors: UserError[] }> {
  const gid = orderId.startsWith('gid://')
    ? orderId
    : `gid://shopify/Order/${orderId}`;

  const mutation = `
    mutation RefundOrder($input: RefundInput!) {
      refundCreate(input: $input) {
        refund {
          id
        }
        userErrors { field message }
      }
    }
  `;

  const input: Record<string, unknown> = {
    orderId: gid,
    notify: true,
  };

  if (note) input.note = note;

  if (lineItems && lineItems.length > 0) {
    input.refundLineItems = lineItems.map((li) => ({
      lineItemId: li.lineItemId.startsWith('gid://')
        ? li.lineItemId
        : `gid://shopify/LineItem/${li.lineItemId}`,
      quantity: li.quantity,
      restockType: li.restockType ?? 'NO_RESTOCK',
      ...(li.locationId ? { locationId: li.locationId } : {}),
    }));
  }

  const data = await adminFetch<{
    refundCreate: {
      refund: { id: string } | null;
      userErrors: UserError[];
    };
  }>({ query: mutation, variables: { input } });

  return data.refundCreate;
}
