/**
 * Admin Collections — Single Resource
 *
 * PATCH  /api/admin/collections/[id] — update collection
 * DELETE /api/admin/collections/[id] — delete collection
 */

import type { NextRequest } from 'next/server';
import { updateCollection, deleteCollection } from '@/lib/shopify/admin/tools/collections';
import { verifyAdminToken, ADMIN_TOKEN_COOKIE } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

// ─── PATCH — update collection ─────────────────────────────────────────────────

export async function PATCH(request: NextRequest, context: RouteContext) {
  const token = request.cookies.get(ADMIN_TOKEN_COOKIE)?.value;
  if (!token || !(await verifyAdminToken(token))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const body = (await request.json()) as {
      title?: string;
      descriptionHtml?: string;
      image?: { src: string; altText?: string } | null;
      ruleSet?: {
        appliedDisjunctively: boolean;
        rules: Array<{ column: string; relation: string; condition: string }>;
      };
    };

    // Ensure id is GID format
    const gid = id.startsWith('gid://') ? id : `gid://shopify/Collection/${id}`;

    const result = await updateCollection({ id: gid, ...body });

    if (result.userErrors.length > 0) {
      return Response.json(
        { error: result.userErrors.map((e) => e.message).join(', ') },
        { status: 422 },
      );
    }

    return Response.json({ collection: result.collection });
  } catch (err) {
    console.error('[api/admin/collections/[id] PATCH]', err);
    return Response.json({ error: 'Failed to update collection' }, { status: 500 });
  }
}

// ─── DELETE — delete collection ────────────────────────────────────────────────

export async function DELETE(request: NextRequest, context: RouteContext) {
  const token = request.cookies.get(ADMIN_TOKEN_COOKIE)?.value;
  if (!token || !(await verifyAdminToken(token))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const result = await deleteCollection(id);

    if (result.userErrors.length > 0) {
      return Response.json(
        { error: result.userErrors.map((e) => e.message).join(', ') },
        { status: 422 },
      );
    }

    if (!result.deleted) {
      return Response.json({ error: 'Collection could not be deleted' }, { status: 400 });
    }

    return Response.json({ success: true });
  } catch (err) {
    console.error('[api/admin/collections/[id] DELETE]', err);
    return Response.json({ error: 'Failed to delete collection' }, { status: 500 });
  }
}
