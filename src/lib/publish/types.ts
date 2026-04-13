/**
 * Publish Pipeline — Domain Types
 *
 * All types for the publish-to-Shopify pipeline.
 * Research Board items → validate → create DRAFT → complete steps → ACTIVE.
 */

// ─── Status Flow ──────────────────────────────────────────────────────────────

export type PublishStatus =
  | 'pending' // queued for publishing
  | 'validating' // pre-publish checklist running
  | 'publishing' // Shopify pipeline in flight
  | 'published' // ACTIVE on Shopify
  | 'rollback' // unpublish requested
  | 'archived' // DRAFT after rollback
  | 'failed'; // pipeline error

// ─── Validation ───────────────────────────────────────────────────────────────

export type PublishValidation = {
  title: boolean;
  description: boolean;
  price: boolean;
  images: boolean;
  errors: string[];
};

// ─── Core Record ──────────────────────────────────────────────────────────────

export type PublishRecord = {
  id: string; // uuid
  researchId: string; // Research Board item id
  shopifyProductId?: string; // populated after step 1
  shopifyHandle?: string;
  status: PublishStatus;
  validation: PublishValidation;
  publishedAt?: string; // ISO
  archivedAt?: string;
  errorMessage?: string;
  retryCount: number;
  batchId?: string; // groups items published together
  createdAt: string; // ISO
  updatedAt: string; // ISO
};

// ─── Input Types ──────────────────────────────────────────────────────────────

export type AddPublishRecordInput = {
  researchId: string;
  batchId?: string;
};

export type UpdatePublishRecordInput = Partial<
  Pick<
    PublishRecord,
    | 'status'
    | 'shopifyProductId'
    | 'shopifyHandle'
    | 'publishedAt'
    | 'archivedAt'
    | 'errorMessage'
    | 'retryCount'
    | 'validation'
  >
>;

// ─── Pipeline ─────────────────────────────────────────────────────────────────

export type PipelineStep =
  | 'validate'
  | 'create_draft'
  | 'set_price'
  | 'publish_channel'
  | 'set_inventory'
  | 'activate';

export type PipelineResult = {
  success: boolean;
  recordId: string;
  shopifyProductId?: string;
  shopifyHandle?: string;
  failedStep?: PipelineStep;
  error?: string;
};

// ─── Batch ────────────────────────────────────────────────────────────────────

export type BatchPublishResult = {
  batchId: string;
  total: number;
  succeeded: number;
  failed: number;
  results: PipelineResult[];
};

// ─── Stats ────────────────────────────────────────────────────────────────────

export type PublishStats = {
  total: number;
  pending: number;
  publishing: number;
  published: number;
  failed: number;
  archived: number;
};

// ─── API Types ────────────────────────────────────────────────────────────────

export type PublishListResponse = {
  records: PublishRecord[];
  stats: PublishStats;
};

export type PublishDetailResponse = {
  record: PublishRecord;
};

export type PublishActionResponse = {
  record: PublishRecord;
  pipeline?: PipelineResult;
};

export type BatchPublishResponse = {
  batch: BatchPublishResult;
};

export type ValidateResponse = {
  validation: PublishValidation;
  ready: boolean;
};
