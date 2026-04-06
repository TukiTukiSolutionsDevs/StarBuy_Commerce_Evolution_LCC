/**
 * Admin Tools — Discounts
 *
 * Discount code management via Shopify Admin API.
 */

import { adminFetch } from '../client';

// ─── Types ─────────────────────────────────────────────────────────────────────

type UserError = { field: string[] | null; message: string };

export type AdminDiscount = {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  startsAt: string | null;
  endsAt: string | null;
  usageLimit: number | null;
  codes: {
    edges: Array<{
      node: {
        id: string;
        code: string;
        usageCount: number;
      };
    }>;
  };
  customerGets: {
    value: {
      percentage?: number;
      amount?: { amount: string; currencyCode: string };
    };
  };
};

// ─── Create Discount Code ──────────────────────────────────────────────────────

export type CreateDiscountInput = {
  title: string;
  code: string;
  type: 'percentage' | 'fixed';
  /** 1-100 for percentage, absolute amount for fixed */
  value: number;
  startsAt?: string;
  endsAt?: string;
  usageLimit?: number;
  onePerCustomer?: boolean;
};

export async function createDiscountCode(
  input: CreateDiscountInput,
): Promise<{ discount: AdminDiscount | null; userErrors: UserError[] }> {
  const mutation = `
    mutation CreateDiscountCode($discount: DiscountCodeBasicInput!) {
      discountCodeBasicCreate(basicCodeDiscount: $discount) {
        codeDiscountNode {
          id
          codeDiscount {
            ... on DiscountCodeBasic {
              title
              status
              createdAt
              startsAt
              endsAt
              usageLimit
              codes(first: 5) {
                edges {
                  node {
                    id
                    code
                    usageCount
                  }
                }
              }
              customerGets {
                value {
                  ... on DiscountPercentage {
                    percentage
                  }
                  ... on DiscountAmount {
                    amount { amount currencyCode }
                  }
                }
              }
            }
          }
        }
        userErrors { field message code }
      }
    }
  `;

  const customerGetsValue =
    input.type === 'percentage'
      ? { discountAmount: { percentage: input.value / 100 } }
      : { discountAmount: { amount: input.value.toFixed(2), currencyCode: 'USD' } };

  const discountInput: Record<string, unknown> = {
    title: input.title,
    code: input.code,
    startsAt: input.startsAt ?? new Date().toISOString(),
    customerGets: {
      value: customerGetsValue,
      items: { all: true },
    },
    customerSelection: {
      all: true,
    },
  };

  if (input.endsAt) discountInput.endsAt = input.endsAt;
  if (input.usageLimit) discountInput.usageLimit = input.usageLimit;
  if (input.onePerCustomer) discountInput.appliesOncePerCustomer = true;

  const data = await adminFetch<{
    discountCodeBasicCreate: {
      codeDiscountNode: {
        id: string;
        codeDiscount: {
          title: string;
          status: string;
          createdAt: string;
          startsAt: string | null;
          endsAt: string | null;
          usageLimit: number | null;
          codes: {
            edges: Array<{ node: { id: string; code: string; usageCount: number } }>;
          };
          customerGets: {
            value: { percentage?: number; amount?: { amount: string; currencyCode: string } };
          };
        };
      } | null;
      userErrors: UserError[];
    };
  }>({ query: mutation, variables: { discount: discountInput } });

  const { codeDiscountNode, userErrors } = data.discountCodeBasicCreate;

  if (!codeDiscountNode) {
    return { discount: null, userErrors: userErrors };
  }

  const cd = codeDiscountNode.codeDiscount;
  const discount: AdminDiscount = {
    id: codeDiscountNode.id,
    title: cd.title,
    status: cd.status,
    createdAt: cd.createdAt,
    startsAt: cd.startsAt ?? null,
    endsAt: cd.endsAt,
    usageLimit: cd.usageLimit ?? null,
    codes: cd.codes,
    customerGets: { value: cd.customerGets.value },
  };

  return { discount, userErrors: userErrors };
}

// ─── Delete Discount Code ─────────────────────────────────────────────────────

export async function deleteDiscount(
  id: string,
): Promise<{ deleted: boolean; userErrors: UserError[] }> {
  const mutation = `
    mutation DeleteDiscount($id: ID!) {
      discountCodeDelete(id: $id) {
        deletedCodeDiscountId
        userErrors { field message code }
      }
    }
  `;

  const data = await adminFetch<{
    discountCodeDelete: {
      deletedCodeDiscountId: string | null;
      userErrors: UserError[];
    };
  }>({ query: mutation, variables: { id } });

  const { deletedCodeDiscountId, userErrors } = data.discountCodeDelete;
  return { deleted: !!deletedCodeDiscountId, userErrors };
}

// ─── List Active Discounts ─────────────────────────────────────────────────────

export async function listDiscounts(limit: number = 20): Promise<AdminDiscount[]> {
  const gql = `
    query ListDiscounts($first: Int!) {
      codeDiscountNodes(first: $first, sortKey: CREATED_AT, reverse: true) {
        edges {
          node {
            id
            codeDiscount {
              ... on DiscountCodeBasic {
                title
                status
                createdAt
                startsAt
                endsAt
                usageLimit
                codes(first: 3) {
                  edges {
                    node {
                      id
                      code
                      usageCount
                    }
                  }
                }
                customerGets {
                  value {
                    ... on DiscountPercentage {
                      percentage
                    }
                    ... on DiscountAmount {
                      amount { amount currencyCode }
                    }
                  }
                }
              }
              ... on DiscountCodeFreeShipping {
                title
                status
                createdAt
                startsAt
                endsAt
                usageLimit
                codes(first: 3) {
                  edges {
                    node {
                      id
                      code
                      usageCount
                    }
                  }
                }
                customerGets {
                  value {
                    ... on DiscountShippingDestinationSelection {
                      allEntitled
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
    codeDiscountNodes: {
      edges: Array<{
        node: {
          id: string;
          codeDiscount: {
            title?: string;
            status?: string;
            createdAt?: string;
            startsAt?: string | null;
            endsAt?: string | null;
            usageLimit?: number | null;
            codes?: {
              edges: Array<{ node: { id: string; code: string; usageCount: number } }>;
            };
            customerGets?: {
              value: { percentage?: number; amount?: { amount: string; currencyCode: string } };
            };
          };
        };
      }>;
    };
  }>({ query: gql, variables: { first: limit } });

  return data.codeDiscountNodes.edges
    .filter((e) => e.node.codeDiscount.title) // filter out unsupported types
    .map((e) => ({
      id: e.node.id,
      title: e.node.codeDiscount.title ?? '',
      status: e.node.codeDiscount.status ?? 'UNKNOWN',
      createdAt: e.node.codeDiscount.createdAt ?? '',
      startsAt: e.node.codeDiscount.startsAt ?? null,
      endsAt: e.node.codeDiscount.endsAt ?? null,
      usageLimit: e.node.codeDiscount.usageLimit ?? null,
      codes: e.node.codeDiscount.codes ?? { edges: [] },
      customerGets: e.node.codeDiscount.customerGets ?? { value: {} },
    }));
}

// ─── Update Discount Code ─────────────────────────────────────────────────────

export type UpdateDiscountInput = {
  id: string; // full GID e.g. gid://shopify/DiscountCodeNode/xxx
  title?: string;
  type?: 'percentage' | 'fixed';
  value?: number;
  startsAt?: string;
  endsAt?: string | null;
  usageLimit?: number | null;
  onePerCustomer?: boolean;
};

export async function updateDiscount(
  input: UpdateDiscountInput,
): Promise<{ discount: AdminDiscount | null; userErrors: UserError[] }> {
  const mutation = `
    mutation UpdateDiscountCode($id: ID!, $discount: DiscountCodeBasicInput!) {
      discountCodeBasicUpdate(id: $id, basicCodeDiscount: $discount) {
        codeDiscountNode {
          id
          codeDiscount {
            ... on DiscountCodeBasic {
              title
              status
              createdAt
              startsAt
              endsAt
              usageLimit
              codes(first: 5) {
                edges {
                  node {
                    id
                    code
                    usageCount
                  }
                }
              }
              customerGets {
                value {
                  ... on DiscountPercentage {
                    percentage
                  }
                  ... on DiscountAmount {
                    amount { amount currencyCode }
                  }
                }
              }
            }
          }
        }
        userErrors { field message code }
      }
    }
  `;

  const discountInput: Record<string, unknown> = {};

  if (input.title !== undefined) discountInput.title = input.title;
  if (input.startsAt !== undefined) discountInput.startsAt = input.startsAt;
  if (input.endsAt !== undefined) discountInput.endsAt = input.endsAt;
  if (input.usageLimit !== undefined) discountInput.usageLimit = input.usageLimit;
  if (input.onePerCustomer !== undefined)
    discountInput.appliesOncePerCustomer = input.onePerCustomer;

  if (input.type !== undefined && input.value !== undefined) {
    const customerGetsValue =
      input.type === 'percentage'
        ? { discountAmount: { percentage: input.value / 100 } }
        : { discountAmount: { amount: input.value.toFixed(2), currencyCode: 'USD' } };
    discountInput.customerGets = {
      value: customerGetsValue,
      items: { all: true },
    };
  }

  const data = await adminFetch<{
    discountCodeBasicUpdate: {
      codeDiscountNode: {
        id: string;
        codeDiscount: {
          title: string;
          status: string;
          createdAt: string;
          startsAt: string | null;
          endsAt: string | null;
          usageLimit: number | null;
          codes: {
            edges: Array<{ node: { id: string; code: string; usageCount: number } }>;
          };
          customerGets: {
            value: { percentage?: number; amount?: { amount: string; currencyCode: string } };
          };
        };
      } | null;
      userErrors: UserError[];
    };
  }>({ query: mutation, variables: { id: input.id, discount: discountInput } });

  const { codeDiscountNode, userErrors } = data.discountCodeBasicUpdate;

  if (!codeDiscountNode) {
    return { discount: null, userErrors };
  }

  const cd = codeDiscountNode.codeDiscount;
  const discount: AdminDiscount = {
    id: codeDiscountNode.id,
    title: cd.title,
    status: cd.status,
    createdAt: cd.createdAt,
    startsAt: cd.startsAt ?? null,
    endsAt: cd.endsAt,
    usageLimit: cd.usageLimit ?? null,
    codes: cd.codes,
    customerGets: { value: cd.customerGets.value },
  };

  return { discount, userErrors };
}
