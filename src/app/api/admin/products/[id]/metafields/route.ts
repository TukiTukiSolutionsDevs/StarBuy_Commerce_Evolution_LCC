/**
 * Admin Product Metafields API
 *
 * GET  /api/admin/products/[id]/metafields — list metafields
 * POST /api/admin/products/[id]/metafields — create or update metafield
 */

import type { NextRequest } from 'next/server';
import { adminFetch } from '@/lib/shopify/admin/client';
import { verifyAdminToken, ADMIN_TOKEN_COOKIE } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

// ─── Types ─────────────────────────────────────────────────────────────────────

type Metafield = {
  id: string;
  namespace: string;
  key: string;
  value: string;
  type: string;
  updatedAt: string;
};

type UserError = {
  field: string[] | null;
  message: string;
};

// ─── GET — list metafields ─────────────────────────────────────────────────────

export async function GET(request: NextRequest, context: RouteContext) {
  const token = request.cookies.get(ADMIN_TOKEN_COOKIE)?.value;
  if (!token || !(await verifyAdminToken(token))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await context.params;

    // Build GID
    const gid = id.startsWith('gid://') ? id : `gid://shopify/Product/${id}`;

    const query = `
      query GetProductMetafields($id: ID!, $first: Int!) {
        product(id: $id) {
          id
          title
          metafields(first: $first) {
            edges {
              node {
                id
                namespace
                key
                value
                type
                updatedAt
              }
            }
          }
        }
      }
    `;

    const data = await adminFetch<{
      product: {
        id: string;
        title: string;
        metafields: {
          edges: Array<{ node: Metafield }>;
        };
      } | null;
    }>({ query, variables: { id: gid, first: 100 } });

    if (!data.product) {
      return Response.json({ error: 'Product not found' }, { status: 404 });
    }

    const metafields = data.product.metafields.edges.map((e) => e.node);

    return Response.json({
      product: { id: data.product.id, title: data.product.title },
      metafields,
    });
  } catch (err) {
    console.error('[api/admin/products/[id]/metafields GET]', err);
    return Response.json({ error: 'Failed to fetch metafields' }, { status: 500 });
  }
}

// ─── POST — create / update metafield ─────────────────────────────────────────

export async function POST(request: NextRequest, context: RouteContext) {
  const token = request.cookies.get(ADMIN_TOKEN_COOKIE)?.value;
  if (!token || !(await verifyAdminToken(token))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await context.params;

    const body = (await request.json()) as {
      namespace?: string;
      key?: string;
      type?: string;
      value?: string;
    };

    if (!body.namespace || !body.key || !body.type || body.value === undefined) {
      return Response.json(
        { error: 'namespace, key, type, and value are required' },
        { status: 400 },
      );
    }

    const ownerId = id.startsWith('gid://') ? id : `gid://shopify/Product/${id}`;

    const mutation = `
      mutation MetafieldsSet($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          metafields {
            id
            namespace
            key
            value
            type
            updatedAt
          }
          userErrors { field message }
        }
      }
    `;

    const data = await adminFetch<{
      metafieldsSet: {
        metafields: Metafield[];
        userErrors: UserError[];
      };
    }>({
      query: mutation,
      variables: {
        metafields: [
          {
            ownerId,
            namespace: body.namespace,
            key: body.key,
            type: body.type,
            value: body.value,
          },
        ],
      },
    });

    if (data.metafieldsSet.userErrors.length > 0) {
      return Response.json(
        { error: data.metafieldsSet.userErrors.map((e) => e.message).join(', ') },
        { status: 422 },
      );
    }

    return Response.json({ metafield: data.metafieldsSet.metafields[0] ?? null }, { status: 201 });
  } catch (err) {
    console.error('[api/admin/products/[id]/metafields POST]', err);
    return Response.json({ error: 'Failed to save metafield' }, { status: 500 });
  }
}

// ─── DELETE — delete metafield ─────────────────────────────────────────────────

export async function DELETE(request: NextRequest, context: RouteContext) {
  const token = request.cookies.get(ADMIN_TOKEN_COOKIE)?.value;
  if (!token || !(await verifyAdminToken(token))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await context.params; // required to resolve, but we read ID from body

    const body = (await request.json()) as { metafieldId?: string };

    if (!body.metafieldId) {
      return Response.json({ error: 'metafieldId is required' }, { status: 400 });
    }

    const gid = body.metafieldId.startsWith('gid://')
      ? body.metafieldId
      : `gid://shopify/Metafield/${body.metafieldId}`;

    const mutation = `
      mutation MetafieldDelete($input: MetafieldDeleteInput!) {
        metafieldDelete(input: $input) {
          deletedId
          userErrors { field message }
        }
      }
    `;

    const data = await adminFetch<{
      metafieldDelete: {
        deletedId: string | null;
        userErrors: UserError[];
      };
    }>({ query: mutation, variables: { input: { id: gid } } });

    if (data.metafieldDelete.userErrors.length > 0) {
      return Response.json(
        { error: data.metafieldDelete.userErrors.map((e) => e.message).join(', ') },
        { status: 422 },
      );
    }

    return Response.json({ success: true, deletedId: data.metafieldDelete.deletedId });
  } catch (err) {
    console.error('[api/admin/products/[id]/metafields DELETE]', err);
    return Response.json({ error: 'Failed to delete metafield' }, { status: 500 });
  }
}
