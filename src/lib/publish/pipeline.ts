/**
 * Publish Pipeline — DRAFT-first Shopify Publishing
 *
 * Steps:
 *   1. validate     — pre-publish checklist
 *   2. create_draft — productCreate with status: DRAFT
 *   3. set_price    — productVariantUpdate with price
 *   4. publish_channel — publishablePublish to Headless channel
 *   5. set_inventory — inventorySetQuantities (100 units default)
 *   6. activate     — productUpdate status: ACTIVE
 *
 * Uses adminFetch directly (NOT createProduct) for granular error handling.
 * Each step updates the PublishRecord so progress is visible via polling.
 */

import { adminFetch } from '@/lib/shopify/admin/client';
import { getById as getResearchItem } from '@/lib/research/store';
import { update as updateResearch } from '@/lib/research/store';
import { update as updateRecord } from './store';
import { validateForPublish, isReadyToPublish } from './validator';
import type { PipelineResult, PipelineStep } from './types';

// ─── Constants ────────────────────────────────────────────────────────────────

const HEADLESS_PUBLICATION_ID = 'gid://shopify/Publication/188793356485';
const DEFAULT_LOCATION_ID = 'gid://shopify/Location/86682697925';
const DEFAULT_INVENTORY = 100;

// ─── GraphQL Mutations ────────────────────────────────────────────────────────

const CREATE_DRAFT_MUTATION = `
  mutation CreateDraftProduct($input: ProductInput!) {
    productCreate(input: $input) {
      product {
        id handle status
        variants(first: 1) { edges { node { id inventoryItem { id } } } }
      }
      userErrors { field message }
    }
  }
`;

const SET_PRICE_MUTATION = `
  mutation SetVariantPrice($input: ProductVariantInput!) {
    productVariantUpdate(input: $input) {
      productVariant { id price }
      userErrors { field message }
    }
  }
`;

const PUBLISH_CHANNEL_MUTATION = `
  mutation PublishToChannel($id: ID!, $input: [PublicationInput!]!) {
    publishablePublish(id: $id, input: $input) {
      userErrors { field message }
    }
  }
`;

const SET_INVENTORY_MUTATION = `
  mutation SetInventory($input: InventorySetQuantitiesInput!) {
    inventorySetQuantities(input: $input) {
      inventoryAdjustmentGroup { id }
      userErrors { field message }
    }
  }
`;

const ACTIVATE_MUTATION = `
  mutation ActivateProduct($input: ProductInput!) {
    productUpdate(input: $input) {
      product { id status handle }
      userErrors { field message }
    }
  }
`;

// ─── Pipeline Execution ───────────────────────────────────────────────────────

type UserError = { field: string[] | null; message: string };

function checkUserErrors(errors: UserError[], step: PipelineStep): void {
  if (errors.length > 0) {
    throw new PipelineError(step, errors.map((e) => e.message).join('; '));
  }
}

class PipelineError extends Error {
  constructor(
    public step: PipelineStep,
    message: string,
  ) {
    super(`[${step}] ${message}`);
    this.name = 'PipelineError';
  }
}

/**
 * Execute the full publish pipeline for a single record.
 * Updates the PublishRecord at each step for progress tracking.
 */
export async function executePipeline(recordId: string): Promise<PipelineResult> {
  let shopifyProductId: string | undefined;
  let shopifyHandle: string | undefined;

  try {
    // ── Step 1: Validate ──────────────────────────────────────────────────
    updateRecord(recordId, { status: 'validating' });

    const record = (await import('./store')).getById(recordId);
    if (!record) throw new PipelineError('validate', `Record ${recordId} not found`);

    const researchItem = getResearchItem(record.researchId);
    if (!researchItem)
      throw new PipelineError('validate', `Research item ${record.researchId} not found`);

    const validation = validateForPublish(researchItem);
    updateRecord(recordId, { validation });

    if (!isReadyToPublish(validation)) {
      updateRecord(recordId, {
        status: 'failed',
        errorMessage: `Validation failed: ${validation.errors.join(', ')}`,
      });
      return {
        success: false,
        recordId,
        failedStep: 'validate',
        error: validation.errors.join(', '),
      };
    }

    // ── Step 2: Create DRAFT ──────────────────────────────────────────────
    updateRecord(recordId, { status: 'publishing' });

    const createData = await adminFetch<{
      productCreate: {
        product: {
          id: string;
          handle: string;
          status: string;
          variants: { edges: Array<{ node: { id: string; inventoryItem: { id: string } } }> };
        } | null;
        userErrors: UserError[];
      };
    }>({
      query: CREATE_DRAFT_MUTATION,
      variables: {
        input: {
          title: researchItem.title || researchItem.keyword,
          descriptionHtml: researchItem.description ?? '',
          status: 'DRAFT',
          tags: [researchItem.keyword, 'starbuy-intelligence'],
        },
      },
    });

    checkUserErrors(createData.productCreate.userErrors, 'create_draft');
    if (!createData.productCreate.product)
      throw new PipelineError('create_draft', 'No product returned');

    shopifyProductId = createData.productCreate.product.id;
    shopifyHandle = createData.productCreate.product.handle;
    const variantId = createData.productCreate.product.variants.edges[0]?.node.id;
    const inventoryItemId =
      createData.productCreate.product.variants.edges[0]?.node.inventoryItem?.id;

    updateRecord(recordId, { shopifyProductId, shopifyHandle });

    // ── Step 3: Set Price ─────────────────────────────────────────────────
    if (variantId && researchItem.salePrice > 0) {
      const priceData = await adminFetch<{
        productVariantUpdate: { userErrors: UserError[] };
      }>({
        query: SET_PRICE_MUTATION,
        variables: { input: { id: variantId, price: String(researchItem.salePrice) } },
      });
      checkUserErrors(priceData.productVariantUpdate.userErrors, 'set_price');
    }

    // ── Step 4: Publish to Channel ────────────────────────────────────────
    const publishData = await adminFetch<{
      publishablePublish: { userErrors: UserError[] };
    }>({
      query: PUBLISH_CHANNEL_MUTATION,
      variables: {
        id: shopifyProductId,
        input: [{ publicationId: HEADLESS_PUBLICATION_ID }],
      },
    });
    checkUserErrors(publishData.publishablePublish.userErrors, 'publish_channel');

    // ── Step 5: Set Inventory ─────────────────────────────────────────────
    if (inventoryItemId) {
      const invData = await adminFetch<{
        inventorySetQuantities: { userErrors: UserError[] };
      }>({
        query: SET_INVENTORY_MUTATION,
        variables: {
          input: {
            name: 'available',
            reason: 'correction',
            quantities: [
              { inventoryItemId, locationId: DEFAULT_LOCATION_ID, quantity: DEFAULT_INVENTORY },
            ],
          },
        },
      });
      checkUserErrors(invData.inventorySetQuantities.userErrors, 'set_inventory');
    }

    // ── Step 6: Activate ──────────────────────────────────────────────────
    const activateData = await adminFetch<{
      productUpdate: {
        product: { id: string; status: string; handle: string } | null;
        userErrors: UserError[];
      };
    }>({
      query: ACTIVATE_MUTATION,
      variables: { input: { id: shopifyProductId, status: 'ACTIVE' } },
    });
    checkUserErrors(activateData.productUpdate.userErrors, 'activate');

    // ── Success ───────────────────────────────────────────────────────────
    const now = new Date().toISOString();
    updateRecord(recordId, { status: 'published', publishedAt: now });

    // Update Research Board item status
    try {
      updateResearch(researchItem.id, { status: 'imported' });
    } catch {
      // Non-critical — research status sync failure shouldn't fail the pipeline
    }

    return { success: true, recordId, shopifyProductId, shopifyHandle };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    const failedStep = err instanceof PipelineError ? err.step : 'validate';

    updateRecord(recordId, {
      status: 'failed',
      errorMessage: error,
      retryCount: ((await import('./store')).getById(recordId)?.retryCount ?? 0) + 1,
    });

    return { success: false, recordId, shopifyProductId, shopifyHandle, failedStep, error };
  }
}
