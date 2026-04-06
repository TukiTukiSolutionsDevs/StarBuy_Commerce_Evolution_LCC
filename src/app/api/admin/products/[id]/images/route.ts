/**
 * Product Images API
 * GET    /api/admin/products/[id]/images — list images
 * POST   /api/admin/products/[id]/images — upload image (multipart form)
 * DELETE /api/admin/products/[id]/images — delete image { mediaId }
 */

import type { NextRequest } from 'next/server';
import {
  getProductImages,
  uploadProductImage,
  deleteProductImage,
} from '@/lib/shopify/admin/tools/images';
import { verifyAdminToken, ADMIN_TOKEN_COOKIE } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

// ─── Auth (same as all other admin routes) ─────────────────────────────────────

async function isAdmin(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get(ADMIN_TOKEN_COOKIE)?.value;
  if (!token) return false;
  return (await verifyAdminToken(token)) !== null;
}

// ─── GET — List images ─────────────────────────────────────────────────────────

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin(request))) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  try {
    const images = await getProductImages(id);
    return Response.json(images);
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 500 });
  }
}

// ─── POST — Upload image ───────────────────────────────────────────────────────

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin(request))) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return Response.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate type
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.type)) {
      return Response.json(
        { error: `Invalid file type: ${file.type}. Allowed: ${allowed.join(', ')}` },
        { status: 400 },
      );
    }

    // Validate size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      return Response.json({ error: 'File too large. Max 10MB.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const media = await uploadProductImage(
      id,
      {
        filename: file.name,
        mimeType: file.type,
        fileSize: file.size,
      },
      buffer,
    );

    return Response.json(media);
  } catch (err) {
    console.error('[api/admin/products/images] Upload error:', err);
    return Response.json({ error: (err as Error).message }, { status: 500 });
  }
}

// ─── DELETE — Delete image ─────────────────────────────────────────────────────

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAdmin(request))) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  try {
    const body = (await request.json()) as { mediaId?: string };
    if (!body.mediaId) {
      return Response.json({ error: 'mediaId required' }, { status: 400 });
    }

    const deleted = await deleteProductImage(id, body.mediaId);
    return Response.json({ deleted });
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 500 });
  }
}
