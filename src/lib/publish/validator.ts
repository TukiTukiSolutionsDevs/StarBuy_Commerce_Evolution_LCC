/**
 * Publish Pipeline — Pre-publish Validator
 *
 * Validates a Research Board item is ready for Shopify publishing.
 * Pure function — no I/O, no Shopify calls.
 */

import type { ResearchItem } from '@/lib/research/types';
import type { PublishValidation } from './types';

// ─── Validation Rules ─────────────────────────────────────────────────────────

/**
 * Validate a research item for publishing readiness.
 * Returns a PublishValidation with per-field status and error messages.
 */
export function validateForPublish(item: ResearchItem): PublishValidation {
  const errors: string[] = [];

  // Title: required, min 3 chars
  const title = !!(item.title && item.title.trim().length >= 3);
  if (!title) errors.push('Title must be at least 3 characters');

  // Description: optional but recommended — passes if present or empty
  const description = true; // descriptions are optional for Shopify

  // Price: salePrice must be positive, costPrice must be non-negative
  const price = item.salePrice > 0 && item.costPrice >= 0 && item.salePrice > item.costPrice;
  if (!price) {
    if (item.salePrice <= 0) errors.push('Sale price must be positive');
    if (item.costPrice < 0) errors.push('Cost price cannot be negative');
    if (item.salePrice <= item.costPrice) errors.push('Sale price must be greater than cost price');
  }

  // Images: always passes for MVP (Shopify allows products without images)
  const images = true;

  return { title, description, price, images, errors };
}

/**
 * Check if a validation result means the item is ready to publish.
 */
export function isReadyToPublish(validation: PublishValidation): boolean {
  return validation.title && validation.price;
}
