/**
 * Admin Collections API
 *
 * GET  /api/admin/collections — list collections
 * POST /api/admin/collections — create collection
 */

import type { NextRequest } from 'next/server';
import { listCollections, createCollection } from '@/lib/shopify/admin/tools/collections';
import { verifyAdminToken, ADMIN_TOKEN_COOKIE } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

// ─── GET — list collections ────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const token = request.cookies.get(ADMIN_TOKEN_COOKIE)?.value;
  if (!token || !(await verifyAdminToken(token))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') ?? '50', 10);

    const collections = await listCollections(limit);
    return Response.json({ collections });
  } catch (err) {
    console.error('[api/admin/collections GET]', err);
    return Response.json({ error: 'Failed to fetch collections' }, { status: 500 });
  }
}

// ─── POST — create collection ──────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const token = request.cookies.get(ADMIN_TOKEN_COOKIE)?.value;
  if (!token || !(await verifyAdminToken(token))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      title?: string;
      descriptionHtml?: string;
      image?: { src: string; altText?: string };
      ruleSet?: {
        appliedDisjunctively: boolean;
        rules: Array<{ column: string; relation: string; condition: string }>;
      };
      seo?: { title: string; description: string };
      sortOrder?: string;
    };

    if (!body.title) {
      return Response.json({ error: 'Title is required' }, { status: 400 });
    }

    const result = await createCollection({
      title: body.title,
      descriptionHtml: body.descriptionHtml,
      image: body.image,
      ruleSet: body.ruleSet,
      seo: body.seo,
      sortOrder: body.sortOrder,
    });

    if (result.userErrors.length > 0) {
      return Response.json(
        { error: result.userErrors.map((e) => e.message).join(', ') },
        { status: 422 },
      );
    }

    return Response.json({ collection: result.collection }, { status: 201 });
  } catch (err) {
    console.error('[api/admin/collections POST]', err);
    return Response.json({ error: 'Failed to create collection' }, { status: 500 });
  }
}
