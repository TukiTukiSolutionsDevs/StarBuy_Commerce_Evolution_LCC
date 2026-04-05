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
  endsAt: string | null;
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

// ─── Create Percentage Discount Code ──────────────────────────────────────────

type CreateDiscountInput = {
  title: string;
  code: string;
  percentage: number;
  startsAt?: string;
  endsAt?: string;
  usageLimit?: number;
};

export async function createDiscountCode(
  input: CreateDiscountInput
): Promise<{ discount: AdminDiscount | null; errors: UserError[] }> {
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
              endsAt
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
                }
              }
            }
          }
        }
        userErrors { field message code }
      }
    }
  `;

  const discountInput: Record<string, unknown> = {
    title: input.title,
    code: input.code,
    startsAt: input.startsAt ?? new Date().toISOString(),
    customerGets: {
      value: {
        discountAmount: {
          percentage: input.percentage / 100,
        },
      },
      items: {
        all: true,
      },
    },
    customerSelection: {
      all: true,
    },
  };

  if (input.endsAt) discountInput.endsAt = input.endsAt;
  if (input.usageLimit) discountInput.usageLimit = input.usageLimit;

  const data = await adminFetch<{
    discountCodeBasicCreate: {
      codeDiscountNode: {
        id: string;
        codeDiscount: {
          title: string;
          status: string;
          createdAt: string;
          endsAt: string | null;
          codes: {
            edges: Array<{ node: { id: string; code: string; usageCount: number } }>;
          };
          customerGets: {
            value: { percentage?: number };
          };
        };
      } | null;
      userErrors: UserError[];
    };
  }>({ query: mutation, variables: { discount: discountInput } });

  const { codeDiscountNode, userErrors } = data.discountCodeBasicCreate;

  if (!codeDiscountNode) {
    return { discount: null, errors: userErrors };
  }

  // Shape into AdminDiscount format
  const discount: AdminDiscount = {
    id: codeDiscountNode.id,
    title: codeDiscountNode.codeDiscount.title,
    status: codeDiscountNode.codeDiscount.status,
    createdAt: codeDiscountNode.codeDiscount.createdAt,
    endsAt: codeDiscountNode.codeDiscount.endsAt,
    codes: codeDiscountNode.codeDiscount.codes,
    customerGets: {
      value: {
        percentage: codeDiscountNode.codeDiscount.customerGets.value.percentage,
      },
    },
  };

  return { discount, errors: userErrors };
}

// ─── List Active Discounts ─────────────────────────────────────────────────────

export async function listDiscounts(
  limit: number = 20
): Promise<AdminDiscount[]> {
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
                endsAt
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
                endsAt
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
            endsAt?: string | null;
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
      endsAt: e.node.codeDiscount.endsAt ?? null,
      codes: e.node.codeDiscount.codes ?? { edges: [] },
      customerGets: e.node.codeDiscount.customerGets ?? { value: {} },
    }));
}
