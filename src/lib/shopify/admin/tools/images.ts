/**
 * Shopify Admin — Product Image Management
 *
 * 3-step upload flow: stagedUploadsCreate → S3 upload → productCreateMedia
 */

import { adminFetch } from '../client';

// ─── Types ──────────────────────────────────────────────────────────────────────

export type ProductImage = {
  id: string;
  image: { url: string; altText: string | null; width: number; height: number };
  status: string;
};

type StagedTarget = {
  url: string;
  resourceUrl: string;
  parameters: Array<{ name: string; value: string }>;
};

// ─── Get Product Images ─────────────────────────────────────────────────────────

export async function getProductImages(productId: string): Promise<ProductImage[]> {
  const gid = productId.startsWith('gid://') ? productId : `gid://shopify/Product/${productId}`;

  const data = await adminFetch<{
    product: {
      media: {
        edges: Array<{ node: ProductImage }>;
      };
    };
  }>({
    query: `query getProductMedia($id: ID!) {
      product(id: $id) {
        media(first: 20) {
          edges {
            node {
              ... on MediaImage {
                id
                image { url altText width height }
                status
              }
            }
          }
        }
      }
    }`,
    variables: { id: gid },
  });

  return data.product.media.edges
    .map((e) => e.node)
    .filter((n) => n.id); // filter out empty nodes (non-image media)
}

// ─── Upload Product Image ───────────────────────────────────────────────────────

export async function uploadProductImage(
  productId: string,
  file: {
    filename: string;
    mimeType: string;
    fileSize: number;
  },
  fileBuffer: Buffer
): Promise<ProductImage | null> {
  const gid = productId.startsWith('gid://') ? productId : `gid://shopify/Product/${productId}`;

  // Step 1: Get staged upload URL
  const staged = await adminFetch<{
    stagedUploadsCreate: {
      stagedTargets: StagedTarget[];
      userErrors: Array<{ field: string[]; message: string }>;
    };
  }>({
    query: `mutation stagedUploadsCreate($input: [StagedUploadInput!]!) {
      stagedUploadsCreate(input: $input) {
        stagedTargets {
          url
          resourceUrl
          parameters { name value }
        }
        userErrors { field message }
      }
    }`,
    variables: {
      input: [
        {
          filename: file.filename,
          mimeType: file.mimeType,
          httpMethod: 'POST',
          resource: 'IMAGE',
          fileSize: file.fileSize.toString(),
        },
      ],
    },
  });

  if (staged.stagedUploadsCreate.userErrors.length > 0) {
    throw new Error(
      `Staged upload failed: ${staged.stagedUploadsCreate.userErrors.map((e) => e.message).join(', ')}`
    );
  }

  const target = staged.stagedUploadsCreate.stagedTargets[0];
  if (!target) throw new Error('No staged target returned');

  // Step 2: Upload file to the staged URL
  const formData = new FormData();
  for (const param of target.parameters) {
    formData.append(param.name, param.value);
  }
  formData.append('file', new Blob([new Uint8Array(fileBuffer)], { type: file.mimeType }), file.filename);

  const uploadRes = await fetch(target.url, {
    method: 'POST',
    body: formData,
  });

  if (!uploadRes.ok) {
    const text = await uploadRes.text();
    throw new Error(`S3 upload failed (${uploadRes.status}): ${text}`);
  }

  // Step 3: Attach media to product
  const media = await adminFetch<{
    productCreateMedia: {
      media: Array<{
        id: string;
        image: { url: string; altText: string | null; width: number; height: number };
        status: string;
      }>;
      mediaUserErrors: Array<{ field: string[]; message: string }>;
    };
  }>({
    query: `mutation productCreateMedia($media: [CreateMediaInput!]!, $productId: ID!) {
      productCreateMedia(media: $media, productId: $productId) {
        media {
          ... on MediaImage {
            id
            image { url altText width height }
            status
          }
        }
        mediaUserErrors { field message }
      }
    }`,
    variables: {
      productId: gid,
      media: [
        {
          alt: file.filename.replace(/\.[^.]+$/, ''),
          mediaContentType: 'IMAGE',
          originalSource: target.resourceUrl,
        },
      ],
    },
  });

  if (media.productCreateMedia.mediaUserErrors.length > 0) {
    throw new Error(
      `Media attach failed: ${media.productCreateMedia.mediaUserErrors.map((e) => e.message).join(', ')}`
    );
  }

  return media.productCreateMedia.media[0] ?? null;
}

// ─── Delete Product Image ───────────────────────────────────────────────────────

export async function deleteProductImage(
  productId: string,
  mediaId: string
): Promise<boolean> {
  const gid = productId.startsWith('gid://') ? productId : `gid://shopify/Product/${productId}`;

  const data = await adminFetch<{
    productDeleteMedia: {
      deletedMediaIds: string[];
      mediaUserErrors: Array<{ field: string[]; message: string }>;
    };
  }>({
    query: `mutation productDeleteMedia($productId: ID!, $mediaIds: [ID!]!) {
      productDeleteMedia(productId: $productId, mediaIds: $mediaIds) {
        deletedMediaIds
        mediaUserErrors { field message }
      }
    }`,
    variables: {
      productId: gid,
      mediaIds: [mediaId],
    },
  });

  if (data.productDeleteMedia.mediaUserErrors.length > 0) {
    throw new Error(
      `Delete media failed: ${data.productDeleteMedia.mediaUserErrors.map((e) => e.message).join(', ')}`
    );
  }

  return data.productDeleteMedia.deletedMediaIds.length > 0;
}
