/**
 * Publish Pipeline — Rollback
 *
 * Reverts a published product from ACTIVE → DRAFT on Shopify.
 * Updates the PublishRecord to 'archived' and Research item to 'saved'.
 */

import { adminFetch } from '@/lib/shopify/admin/client';
import { update as updateRecord, getById } from './store';
import { update as updateResearch } from '@/lib/research/store';

// ─── GraphQL ──────────────────────────────────────────────────────────────────

const ARCHIVE_MUTATION = `
  mutation ArchiveProduct($input: ProductInput!) {
    productUpdate(input: $input) {
      product { id status }
      userErrors { field message }
    }
  }
`;

// ─── Rollback ─────────────────────────────────────────────────────────────────

export type RollbackResult = {
  success: boolean;
  recordId: string;
  error?: string;
};

/**
 * Rollback a published product to DRAFT status on Shopify.
 * Updates PublishRecord to 'archived' and Research item to 'saved'.
 */
export async function rollbackPublish(recordId: string): Promise<RollbackResult> {
  try {
    const record = getById(recordId);
    if (!record) {
      return { success: false, recordId, error: `Record ${recordId} not found` };
    }

    if (record.status !== 'published') {
      return {
        success: false,
        recordId,
        error: `Cannot rollback record with status '${record.status}' — must be 'published'`,
      };
    }

    if (!record.shopifyProductId) {
      return { success: false, recordId, error: 'No Shopify product ID — nothing to rollback' };
    }

    // Update status to rollback in progress
    updateRecord(recordId, { status: 'rollback' });

    // Set product to DRAFT on Shopify
    const data = await adminFetch<{
      productUpdate: {
        product: { id: string; status: string } | null;
        userErrors: Array<{ field: string[] | null; message: string }>;
      };
    }>({
      query: ARCHIVE_MUTATION,
      variables: { input: { id: record.shopifyProductId, status: 'DRAFT' } },
    });

    if (data.productUpdate.userErrors.length > 0) {
      const error = data.productUpdate.userErrors.map((e) => e.message).join('; ');
      updateRecord(recordId, { status: 'published', errorMessage: `Rollback failed: ${error}` });
      return { success: false, recordId, error };
    }

    // Mark as archived
    const now = new Date().toISOString();
    updateRecord(recordId, { status: 'archived', archivedAt: now });

    // Revert Research Board item to 'saved'
    try {
      updateResearch(record.researchId, { status: 'saved' });
    } catch {
      // Non-critical — research status sync failure shouldn't fail the rollback
    }

    return { success: true, recordId };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    updateRecord(recordId, { status: 'published', errorMessage: `Rollback error: ${error}` });
    return { success: false, recordId, error };
  }
}
