/**
 * Admin Tools — Customers
 *
 * Customer CRUD via Shopify Admin API.
 */

import { adminFetch } from '../client';

// ─── Types ─────────────────────────────────────────────────────────────────────

type UserError = { field: string[] | null; message: string };

export type AdminCustomer = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  phone: string | null;
  tags: string[];
  ordersCount: number;
  totalSpentV2: { amount: string; currencyCode: string };
  createdAt: string;
  updatedAt: string;
  state: string;
  verifiedEmail: boolean;
  defaultAddress: {
    id: string;
    address1: string | null;
    city: string | null;
    country: string | null;
  } | null;
};

const CUSTOMER_FRAGMENT = `
  fragment CustomerFields on Customer {
    id
    firstName
    lastName
    email
    phone
    tags
    ordersCount
    totalSpentV2 { amount currencyCode }
    createdAt
    updatedAt
    state
    verifiedEmail
    defaultAddress {
      id
      address1
      city
      country
    }
  }
`;

// ─── Search / List ─────────────────────────────────────────────────────────────

export async function searchCustomers(
  query: string = '',
  limit: number = 10
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

  return data.customers.edges.map((e) => e.node);
}

// ─── Get by ID ─────────────────────────────────────────────────────────────────

export async function getCustomerById(
  id: string
): Promise<AdminCustomer | null> {
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

  return data.customer;
}

// ─── Create ────────────────────────────────────────────────────────────────────

type CreateCustomerInput = {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  tags?: string[];
};

export async function createCustomer(
  input: CreateCustomerInput
): Promise<{ customer: AdminCustomer | null; errors: UserError[] }> {
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
  Omit<CreateCustomerInput, 'email'> & { email: string }
>;

export async function updateCustomer(
  id: string,
  fields: UpdateCustomerFields
): Promise<{ customer: AdminCustomer | null; errors: UserError[] }> {
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
  id: string
): Promise<{ deleted: boolean; errors: UserError[] }> {
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
    errors: data.customerDelete.userErrors,
  };
}
