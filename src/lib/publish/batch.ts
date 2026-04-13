/**
 * Publish Pipeline — Batch Publishing
 *
 * Publishes multiple research items concurrently with p-limit(3).
 * Each item is independently isolated — one failure doesn't affect others.
 */

import { randomUUID } from 'crypto';
import { add as addRecord } from './store';
import { executePipeline } from './pipeline';
import type { BatchPublishResult, PipelineResult } from './types';

// ─── Concurrency Limiter (inline, no p-limit dep for MVP) ─────────────────────

async function pLimit<T>(tasks: (() => Promise<T>)[], concurrency: number): Promise<T[]> {
  const results: T[] = [];
  const executing = new Set<Promise<void>>();

  for (const task of tasks) {
    const p = task().then((r) => {
      results.push(r);
    });
    executing.add(p);
    const clean = () => executing.delete(p);
    p.then(clean, clean);
    if (executing.size >= concurrency) {
      await Promise.race(executing);
    }
  }
  await Promise.all(executing);
  return results;
}

// ─── Batch Publish ────────────────────────────────────────────────────────────

/**
 * Publish multiple research items in a batch.
 * Creates records for each, then runs pipelines with concurrency limit.
 */
export async function batchPublish(
  researchIds: string[],
  concurrency = 3,
): Promise<BatchPublishResult> {
  const batchId = randomUUID();

  // Create records for each item
  const records = researchIds.map((researchId) => {
    try {
      return addRecord({ researchId, batchId });
    } catch {
      return null; // skip duplicates or capacity errors
    }
  });

  const validRecords = records.filter((r): r is NonNullable<typeof r> => r !== null);

  // Execute pipelines concurrently
  const tasks = validRecords.map((record) => () => executePipeline(record.id));

  const results = await pLimit<PipelineResult>(tasks, concurrency);

  const succeeded = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  return {
    batchId,
    total: validRecords.length,
    succeeded,
    failed,
    results,
  };
}
