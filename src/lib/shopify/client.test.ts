/**
 * Unit tests — shopify/client.ts
 *
 * fetch is mocked globally with vi.fn() so no real HTTP requests are made.
 *
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { shopifyFetch } from './client';

// ─── Setup ─────────────────────────────────────────────────────────────────────

const STORE_DOMAIN = 'test-store.myshopify.com';
const API_VERSION = '2024-01';
const PRIVATE_TOKEN = 'shpat_test_private_token';

beforeEach(() => {
  vi.stubEnv('SHOPIFY_STORE_DOMAIN', STORE_DOMAIN);
  vi.stubEnv('SHOPIFY_API_VERSION', API_VERSION);
  vi.stubEnv('SHOPIFY_STOREFRONT_PRIVATE_TOKEN', PRIVATE_TOKEN);
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

// ─── Helpers ───────────────────────────────────────────────────────────────────

type MockResponseOptions = {
  ok?: boolean;
  status?: number;
  data?: unknown;
  errors?: Array<{ message: string }>;
  text?: string;
};

function mockFetchResponse(opts: MockResponseOptions) {
  const { ok = true, status = 200, data, errors, text } = opts;

  const mockRes = {
    ok,
    status,
    text: vi.fn().mockResolvedValue(text ?? ''),
    json: vi.fn().mockResolvedValue({ data, errors }),
  };

  vi.mocked(fetch).mockResolvedValue(mockRes as unknown as Response);
  return mockRes;
}

const SIMPLE_QUERY = `{ shop { name } }`;

// ─── URL construction ──────────────────────────────────────────────────────────

describe('shopifyFetch — URL construction', () => {
  it('constructs the correct endpoint from env vars', async () => {
    mockFetchResponse({ data: { shop: { name: 'Test' } } });

    await shopifyFetch({ query: SIMPLE_QUERY });

    const [calledUrl] = vi.mocked(fetch).mock.calls[0];
    expect(calledUrl).toBe(`https://${STORE_DOMAIN}/api/${API_VERSION}/graphql.json`);
  });

  it('uses POST method', async () => {
    mockFetchResponse({ data: {} });

    await shopifyFetch({ query: SIMPLE_QUERY });

    const [, options] = vi.mocked(fetch).mock.calls[0];
    expect((options as RequestInit).method).toBe('POST');
  });
});

// ─── Headers ──────────────────────────────────────────────────────────────────

describe('shopifyFetch — headers', () => {
  it('sends Content-Type: application/json', async () => {
    mockFetchResponse({ data: {} });

    await shopifyFetch({ query: SIMPLE_QUERY });

    const [, options] = vi.mocked(fetch).mock.calls[0];
    const headers = (options as RequestInit).headers as Record<string, string>;
    expect(headers['Content-Type']).toBe('application/json');
  });

  it('sends the private storefront token header', async () => {
    mockFetchResponse({ data: {} });

    await shopifyFetch({ query: SIMPLE_QUERY });

    const [, options] = vi.mocked(fetch).mock.calls[0];
    const headers = (options as RequestInit).headers as Record<string, string>;
    expect(headers['Shopify-Storefront-Private-Token']).toBe(PRIVATE_TOKEN);
  });
});

// ─── Body / variables ─────────────────────────────────────────────────────────

describe('shopifyFetch — request body', () => {
  it('serializes query and variables in the body', async () => {
    mockFetchResponse({ data: {} });

    const variables = { handle: 'test-product' };
    await shopifyFetch({ query: SIMPLE_QUERY, variables });

    const [, options] = vi.mocked(fetch).mock.calls[0];
    const body = JSON.parse((options as RequestInit).body as string);
    expect(body.query).toBe(SIMPLE_QUERY);
    expect(body.variables).toEqual(variables);
  });
});

// ─── Success path ─────────────────────────────────────────────────────────────

describe('shopifyFetch — success', () => {
  it('returns the data property from a successful response', async () => {
    const expectedData = { shop: { name: 'StarBuy' } };
    mockFetchResponse({ data: expectedData });

    const result = await shopifyFetch<typeof expectedData>({ query: SIMPLE_QUERY });
    expect(result).toEqual(expectedData);
  });

  it('handles undefined variables gracefully', async () => {
    mockFetchResponse({ data: { products: [] } });

    await expect(shopifyFetch({ query: SIMPLE_QUERY })).resolves.not.toThrow();
  });
});

// ─── Error handling ───────────────────────────────────────────────────────────

describe('shopifyFetch — error handling', () => {
  it('throws when the HTTP response is not ok (e.g. 500)', async () => {
    mockFetchResponse({ ok: false, status: 500, text: 'Internal Server Error' });

    await expect(shopifyFetch({ query: SIMPLE_QUERY })).rejects.toThrow(
      'Shopify API error: 500 - Internal Server Error',
    );
  });

  it('throws when the response contains GraphQL errors', async () => {
    mockFetchResponse({
      data: null,
      errors: [{ message: 'Product not found' }, { message: 'Unauthorized' }],
    });

    await expect(shopifyFetch({ query: SIMPLE_QUERY })).rejects.toThrow(
      'Shopify GraphQL error: Product not found, Unauthorized',
    );
  });

  it('throws when response is 401 Unauthorized', async () => {
    mockFetchResponse({ ok: false, status: 401, text: 'Unauthorized' });

    await expect(shopifyFetch({ query: SIMPLE_QUERY })).rejects.toThrow('Shopify API error: 401');
  });
});

// ─── Cache options ─────────────────────────────────────────────────────────────

describe('shopifyFetch — Next.js cache options', () => {
  it('defaults revalidate to 60 and tags to [shopify]', async () => {
    mockFetchResponse({ data: {} });

    await shopifyFetch({ query: SIMPLE_QUERY });

    const [, options] = vi.mocked(fetch).mock.calls[0];
    const nextOpts = (options as RequestInit & { next?: unknown }).next as {
      revalidate: number;
      tags: string[];
    };
    expect(nextOpts.revalidate).toBe(60);
    expect(nextOpts.tags).toEqual(['shopify']);
  });

  it('respects custom revalidate and tags when provided', async () => {
    mockFetchResponse({ data: {} });

    await shopifyFetch({
      query: SIMPLE_QUERY,
      revalidate: 300,
      tags: ['products', 'collection-1'],
    });

    const [, options] = vi.mocked(fetch).mock.calls[0];
    const nextOpts = (options as RequestInit & { next?: unknown }).next as {
      revalidate: number;
      tags: string[];
    };
    expect(nextOpts.revalidate).toBe(300);
    expect(nextOpts.tags).toEqual(['products', 'collection-1']);
  });
});
