/**
 * Unit tests — batchPublish
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Hoist mock vars ──────────────────────────────────────────────────────────

const { mockAdd, mockExecutePipeline } = vi.hoisted(() => ({
  mockAdd: vi.fn(),
  mockExecutePipeline: vi.fn(),
}));

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('./store', () => ({
  add: mockAdd,
}));

vi.mock('./pipeline', () => ({
  executePipeline: mockExecutePipeline,
}));

// ─── Import AFTER mocking ─────────────────────────────────────────────────────

import { batchPublish } from './batch';

// ─── Helpers ──────────────────────────────────────────────────────────────────

let recordCounter = 0;

function makeRecord(researchId: string, batchId: string) {
  return {
    id: `rec-${++recordCounter}`,
    researchId,
    batchId,
    status: 'pending' as const,
    validation: { title: false, description: false, price: false, images: false, errors: [] },
    retryCount: 0,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  recordCounter = 0;
  mockAdd.mockImplementation(({ researchId, batchId }: { researchId: string; batchId: string }) =>
    makeRecord(researchId, batchId),
  );
  mockExecutePipeline.mockResolvedValue({ success: true, recordId: 'rec-1' });
});

// ─── batchId ──────────────────────────────────────────────────────────────────

describe('batchPublish — batchId', () => {
  it('generates a unique batchId string', async () => {
    const result = await batchPublish(['res-1']);
    expect(typeof result.batchId).toBe('string');
    expect(result.batchId.length).toBeGreaterThan(0);
  });

  it('each record receives the same batchId', async () => {
    await batchPublish(['res-1', 'res-2', 'res-3']);
    const calls = mockAdd.mock.calls as Array<[{ researchId: string; batchId: string }]>;
    const batchIds = calls.map((c) => c[0].batchId);
    expect(new Set(batchIds).size).toBe(1);
  });

  it('batchId is a valid UUID format', async () => {
    const result = await batchPublish(['res-1']);
    expect(result.batchId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });
});

// ─── Empty input ──────────────────────────────────────────────────────────────

describe('batchPublish — empty input', () => {
  it('returns total 0, succeeded 0, failed 0 for empty array', async () => {
    const result = await batchPublish([]);
    expect(result.total).toBe(0);
    expect(result.succeeded).toBe(0);
    expect(result.failed).toBe(0);
  });

  it('returns empty results array for empty input', async () => {
    const result = await batchPublish([]);
    expect(result.results).toHaveLength(0);
  });

  it('does not call executePipeline for empty input', async () => {
    await batchPublish([]);
    expect(mockExecutePipeline).not.toHaveBeenCalled();
  });
});

// ─── Succeeded / failed counts ────────────────────────────────────────────────

describe('batchPublish — succeeded and failed counts', () => {
  it('counts all as succeeded when all pipelines succeed', async () => {
    mockExecutePipeline.mockResolvedValue({ success: true, recordId: 'rec' });
    const result = await batchPublish(['res-1', 'res-2']);
    expect(result.succeeded).toBe(2);
    expect(result.failed).toBe(0);
    expect(result.total).toBe(2);
  });

  it('counts failed correctly when some pipelines fail', async () => {
    mockExecutePipeline
      .mockResolvedValueOnce({ success: true, recordId: 'rec-1' })
      .mockResolvedValueOnce({ success: false, recordId: 'rec-2', error: 'Shopify error' })
      .mockResolvedValueOnce({ success: true, recordId: 'rec-3' });
    const result = await batchPublish(['res-1', 'res-2', 'res-3']);
    expect(result.succeeded).toBe(2);
    expect(result.failed).toBe(1);
    expect(result.total).toBe(3);
  });

  it('returns all pipeline results in results array', async () => {
    const result = await batchPublish(['res-1', 'res-2', 'res-3']);
    expect(result.results).toHaveLength(3);
  });
});

// ─── Concurrency ──────────────────────────────────────────────────────────────

describe('batchPublish — concurrency', () => {
  it('processes all items even with more than default concurrency limit', async () => {
    const ids = Array.from({ length: 9 }, (_, i) => `res-${i}`);
    mockExecutePipeline.mockResolvedValue({ success: true, recordId: 'rec' });
    const result = await batchPublish(ids);
    expect(result.total).toBe(9);
    expect(mockExecutePipeline).toHaveBeenCalledTimes(9);
  });

  it('respects custom concurrency parameter without hanging', async () => {
    const ids = Array.from({ length: 4 }, (_, i) => `res-${i}`);
    mockExecutePipeline.mockResolvedValue({ success: true, recordId: 'rec' });
    const result = await batchPublish(ids, 2);
    expect(result.total).toBe(4);
  });
});

// ─── Add failures (duplicates skipped) ───────────────────────────────────────

describe('batchPublish — add failures', () => {
  it('skips research ids where add throws (e.g. duplicate)', async () => {
    mockAdd
      .mockImplementationOnce(({ researchId, batchId }: { researchId: string; batchId: string }) =>
        makeRecord(researchId, batchId),
      )
      .mockImplementationOnce(() => {
        throw new Error('already has an active publish record');
      });
    const result = await batchPublish(['res-1', 'res-dup']);
    expect(result.total).toBe(1);
    expect(mockExecutePipeline).toHaveBeenCalledTimes(1);
  });
});

// ─── Pipeline execution ───────────────────────────────────────────────────────

describe('batchPublish — pipeline execution', () => {
  it('calls executePipeline for each valid record', async () => {
    await batchPublish(['res-1', 'res-2']);
    expect(mockExecutePipeline).toHaveBeenCalledTimes(2);
  });

  it('passes record id to executePipeline', async () => {
    await batchPublish(['res-1']);
    expect(mockExecutePipeline).toHaveBeenCalledWith(expect.stringMatching(/^rec-/));
  });
});
