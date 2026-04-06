/**
 * Admin Tools — Customers
 *
 * Customer CRUD via Shopify Admin API.
 */

import { adminFetch } from '../client';

// ─── Types ─────────────────────────────────────────────────────────────────────

type UserError = { field: string[] | null; message: string };

export type AdminAddress = {
  id: string;
  address1: string | null;
  address2: string | null;
  city: string | null;
  province: string | null;
  country: string | null;
  zip: string | null;
  phone: string | null;
  firstName: string | null;
  lastName: string | null;
  company: string | null;
};

export type AdminCustomer = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  phone: string | null;
  tags: string[];
  note: string | null;
  acceptsMarketing: boolean;
  numberOfOrders: number;
  amountSpent: { amount: string; currencyCode: string };
  /** @deprecated Alias for numberOfOrders — for backward compatibility */
  ordersCount: number;
  /** @deprecated Alias for amountSpent — for backward compatibility */
  totalSpentV2: { amount: string; currencyCode: string };
  createdAt: string;
  updatedAt: string;
  state: string;
  verifiedEmail: boolean;
  defaultAddress: AdminAddress | null;
  addresses: AdminAddress[];
};

const ADDRESS_FIELDS = `
  id
  address1
  address2
  city
  province
  country
  zip
  phone
  firstName
  lastName
  company
`;

const CUSTOMER_FRAGMENT = `
  fragment CustomerFields on Customer {
    id
    firstName
    lastName
    email
    phone
    tags
    note
    acceptsMarketing
    numberOfOrders
    amountSpent { amount currencyCode }
    createdAt
    updatedAt
    state
    verifiedEmail
    defaultAddress {
      ${ADDRESS_FIELDS}
    }
    addresses(first: 10) {
      edges {
        node {
          ${ADDRESS_FIELDS}
        }
      }
    }
  }
`;

// ─── Search / List ─────────────────────────────────────────────────────────────

export async function searchCustomers(
  query: string = '',
  limit: number = 10,
): Promise<AdminCustomer[]> {
  const gql = `
    query SearchCustomers($query: String, $first: Int!) {
      customers(query: $query, first: $first, sortKey: CREATED_AT, reverse: true) {
        edges {
          node {
            ...CustomerFields
          }
        }
      }
    }
    ${CUSTOMER_FRAGMENT}
  `;

  const data = await adminFetch<{
    customers: { edges: Array<{ node: AdminCustomer }> };
  }>({ query: gql, variables: { query, first: limit } });

  return data.customers.edges.map((e) => mapCustomerCompat(e.node));
}

/** Add backward-compatible aliases for renamed fields and flatten addresses */
function mapCustomerCompat(c: Record<string, unknown>): AdminCustomer {
  const customer = c as AdminCustomer & {
    addresses?: { edges?: Array<{ node: AdminAddress }> } | AdminAddress[];
  };
  // API 2026-04 renamed ordersCount → numberOfOrders, totalSpentV2 → amountSpent
  customer.ordersCount = customer.numberOfOrders ?? 0;
  customer.totalSpentV2 = customer.amountSpent ?? { amount: '0', currencyCode: 'USD' };

  // Flatten addresses from GraphQL connection to plain array
  const rawAddresses = customer.addresses as
    | { edges?: Array<{ node: AdminAddress }> }
    | AdminAddress[]
    | undefined;
  if (rawAddresses && !Array.isArray(rawAddresses) && rawAddresses.edges) {
    customer.addresses = rawAddresses.edges.map((e) => e.node);
  } else if (!customer.addresses) {
    customer.addresses = [];
  }

  return customer;
}

// ─── Get by ID ─────────────────────────────────────────────────────────────────

export async function getCustomerById(id: string): Promise<AdminCustomer | null> {
  const gid = id.startsWith('gid://') ? id : `gid://shopify/Customer/${id}`;

  const gql = `
    query GetCustomer($id: ID!) {
      customer(id: $id) {
        ...CustomerFields
      }
    }
    ${CUSTOMER_FRAGMENT}
  `;

  const data = await adminFetch<{ customer: AdminCustomer | null }>({
    query: gql,
    variables: { id: gid },
  });

  return data.customer ? mapCustomerCompat(data.customer as Record<string, unknown>) : null;
}

// ─── Create ────────────────────────────────────────────────────────────────────

type CreateCustomerInput = {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  tags?: string[];
  note?: string;
  acceptsMarketing?: boolean;
};

export async function createCustomer(
  input: CreateCustomerInput,
): Promise<{ customer: AdminCustomer | null; userErrors: UserError[] }> {
  const mutation = `
    mutation CreateCustomer($input: CustomerInput!) {
      customerCreate(input: $input) {
        customer {
          ...CustomerFields
        }
        userErrors { field message }
      }
    }
    ${CUSTOMER_FRAGMENT}
  `;

  const data = await adminFetch<{
    customerCreate: {
      customer: AdminCustomer | null;
      userErrors: UserError[];
    };
  }>({ query: mutation, variables: { input } });

  return data.customerCreate;
}

// ─── Update ────────────────────────────────────────────────────────────────────

type UpdateCustomerFields = Partial<
  Omit<CreateCustomerInput, 'email'> & { email: string; note: string; acceptsMarketing: boolean }
>;

export async function updateCustomer(
  id: string,
  fields: UpdateCustomerFields,
): Promise<{ customer: AdminCustomer | null; userErrors: UserError[] }> {
  const gid = id.startsWith('gid://') ? id : `gid://shopify/Customer/${id}`;

  const mutation = `
    mutation UpdateCustomer($input: CustomerInput!) {
      customerUpdate(input: $input) {
        customer {
          ...CustomerFields
        }
        userErrors { field message }
      }
    }
    ${CUSTOMER_FRAGMENT}
  `;

  const data = await adminFetch<{
    customerUpdate: {
      customer: AdminCustomer | null;
      userErrors: UserError[];
    };
  }>({ query: mutation, variables: { input: { id: gid, ...fields } } });

  return data.customerUpdate;
}

// ─── Delete ────────────────────────────────────────────────────────────────────

export async function deleteCustomer(
  id: string,
): Promise<{ deleted: boolean; userErrors: UserError[] }> {
  const gid = id.startsWith('gid://') ? id : `gid://shopify/Customer/${id}`;

  const mutation = `
    mutation DeleteCustomer($input: CustomerDeleteInput!) {
      customerDelete(input: $input) {
        deletedCustomerId
        userErrors { field message }
      }
    }
  `;

  const data = await adminFetch<{
    customerDelete: {
      deletedCustomerId: string | null;
      userErrors: UserError[];
    };
  }>({ query: mutation, variables: { input: { id: gid } } });

  return {
    deleted: !!data.customerDelete.deletedCustomerId,
    userErrors: data.customerDelete.userErrors,
  };
}
