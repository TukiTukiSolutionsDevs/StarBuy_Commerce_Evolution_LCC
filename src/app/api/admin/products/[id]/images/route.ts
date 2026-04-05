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

export const dynamic = 'force-dynamic';

// ─── Auth ──────────────────────────────────────────────────────────────────────

function isAdmin(request: NextRequest): boolean {
  const password = process.env.ADMIN_CHAT_PASSWORD;
  if (!password) return false;
  const token = request.cookies.get('admin_token')?.value;
  if (!token) return false;
  const expected = Buffer.from(
    `starbuy-admin:${password}:${process.env.NODE_ENV}`
  ).toString('base64');
  return token === expected;
}

// ─── GET — List images ─────────────────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdmin(request))
    return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  try {
    const images = await getProductImages(id);
    return Response.json(images);
  } catch (err) {
    return Response.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}

// ─── POST — Upload image ───────────────────────────────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdmin(request))
    return Response.json({ error: 'Unauthorized' }, { status: 401 });

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
        { status: 400 }
      );
    }

    // Validate size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      return Response.json(
        { error: 'File too large. Max 10MB.' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const media = await uploadProductImage(
      id,
      {
        filename: file.name,
        mimeType: file.type,
        fileSize: file.size,
      },
      buffer
    );

    return Response.json(media);
  } catch (err) {
    console.error('[api/admin/products/images] Upload error:', err);
    return Response.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}

// ─── DELETE — Delete image ─────────────────────────────────────────────────────

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdmin(request))
    return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  try {
    const body = (await request.json()) as { mediaId?: string };
    if (!body.mediaId) {
      return Response.json({ error: 'mediaId required' }, { status: 400 });
    }

    const deleted = await deleteProductImage(id, body.mediaId);
    return Response.json({ deleted });
  } catch (err) {
    return Response.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}
