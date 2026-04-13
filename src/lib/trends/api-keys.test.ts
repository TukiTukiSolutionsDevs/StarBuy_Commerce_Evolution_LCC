/**
 * Unit tests — trends/api-keys.ts
 *
 * Tests runtime key management: set, get, delete, mask, status.
 * Uses a temp STARBUY_DATA_DIR so no real files are touched.
 * Env vars for fallback testing are controlled via vi.stubEnv.
 *
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { maskKey, getApiKey, setApiKey, deleteApiKey, getProviderKeyStatus } from './api-keys';
import type { TrendApiKey } from './api-keys';

// ─── Setup ────────────────────────────────────────────────────────────────────

let tmpDir: string;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'starbuy-keys-test-'));
  vi.stubEnv('STARBUY_DATA_DIR', tmpDir);
  // Ensure no env var leakage
  vi.stubEnv('SERPAPI_KEY', '');
  vi.stubEnv('AMAZON_ACCESS_KEY', '');
  vi.stubEnv('AMAZON_SECRET_KEY', '');
  vi.stubEnv('AMAZON_PARTNER_TAG', '');
  vi.stubEnv('META_ACCESS_TOKEN', '');
});

afterEach(() => {
  vi.unstubAllEnvs();
  rmSync(tmpDir, { recursive: true, force: true });
});

// ─── maskKey ──────────────────────────────────────────────────────────────────

describe('maskKey', () => {
  it('masks long keys showing first 8 and last 4 chars', () => {
    const key = 'sk-ant-api03-abc123xyz789';
    const masked = maskKey(key);
    expect(masked).toBe('sk-ant-a...z789');
  });

  it('returns **** for keys of 12 chars or fewer', () => {
    expect(maskKey('short')).toBe('****');
    expect(maskKey('exactlytwelv')).toBe('****'); // 12 chars
  });

  it('never exposes the full key for normal keys', () => {
    const key = 'SERPAPI_KEY_LONG_ENOUGH_TO_MASK';
    const masked = maskKey(key);
    expect(masked).not.toBe(key);
    expect(masked).toContain('...');
  });
});

// ─── getApiKey ────────────────────────────────────────────────────────────────

describe('getApiKey', () => {
  it('returns undefined when key is not set', () => {
    expect(getApiKey('serpapi')).toBeUndefined();
    expect(getApiKey('meta-access-token')).toBeUndefined();
  });

  it('returns the runtime key after setApiKey', () => {
    setApiKey('serpapi', 'test-serpapi-key-long-enough');
    expect(getApiKey('serpapi')).toBe('test-serpapi-key-long-enough');
  });

  it('falls back to environment variable when no runtime key is set', () => {
    vi.stubEnv('SERPAPI_KEY', 'env-serpapi-key-long-enough');
    expect(getApiKey('serpapi')).toBe('env-serpapi-key-long-enough');
  });

  it('runtime key takes priority over env var', () => {
    vi.stubEnv('SERPAPI_KEY', 'env-serpapi-key-value');
    setApiKey('serpapi', 'runtime-serpapi-key-value');
    expect(getApiKey('serpapi')).toBe('runtime-serpapi-key-value');
  });

  it('returns undefined for keys <= 5 chars (invalid)', () => {
    vi.stubEnv('SERPAPI_KEY', 'tiny'); // 4 chars — too short
    expect(getApiKey('serpapi')).toBeUndefined();
  });

  it('handles all 5 supported key types', () => {
    const keys: TrendApiKey[] = [
      'serpapi',
      'amazon-access-key',
      'amazon-secret-key',
      'amazon-partner-tag',
      'meta-access-token',
    ];
    for (const key of keys) {
      expect(getApiKey(key)).toBeUndefined(); // none set
    }
  });
});

// ─── setApiKey ────────────────────────────────────────────────────────────────

describe('setApiKey', () => {
  it('persists the key so getApiKey returns it', () => {
    setApiKey('amazon-access-key', 'AKIAIOSFODNN7EXAMPLE');
    expect(getApiKey('amazon-access-key')).toBe('AKIAIOSFODNN7EXAMPLE');
  });

  it('overwrites an existing key', () => {
    setApiKey('serpapi', 'old-key-value-here');
    setApiKey('serpapi', 'new-key-value-here');
    expect(getApiKey('serpapi')).toBe('new-key-value-here');
  });

  it('clears the runtime key when given empty string', () => {
    setApiKey('serpapi', 'valid-serpapi-key-value');
    setApiKey('serpapi', '');
    // No runtime key → should fall through to env (also empty) → undefined
    expect(getApiKey('serpapi')).toBeUndefined();
  });

  it('trims whitespace from the key value', () => {
    setApiKey('meta-access-token', '  EAA-long-meta-token  ');
    expect(getApiKey('meta-access-token')).toBe('EAA-long-meta-token');
  });
});

// ─── deleteApiKey ─────────────────────────────────────────────────────────────

describe('deleteApiKey', () => {
  it('removes a previously set key', () => {
    setApiKey('serpapi', 'key-to-be-deleted-value');
    deleteApiKey('serpapi');
    expect(getApiKey('serpapi')).toBeUndefined();
  });

  it('does not throw when deleting a key that was never set', () => {
    expect(() => deleteApiKey('amazon-secret-key')).not.toThrow();
  });

  it('does not affect other keys', () => {
    setApiKey('serpapi', 'serpapi-key-value-here');
    setApiKey('meta-access-token', 'meta-token-value-here');
    deleteApiKey('serpapi');

    expect(getApiKey('serpapi')).toBeUndefined();
    expect(getApiKey('meta-access-token')).toBe('meta-token-value-here');
  });
});

// ─── getProviderKeyStatus ─────────────────────────────────────────────────────

describe('getProviderKeyStatus', () => {
  it('returns not-configured for all keys when nothing is set', () => {
    const status = getProviderKeyStatus();
    for (const val of Object.values(status)) {
      expect(val.configured).toBe(false);
      expect(val.source).toBeNull();
      expect(val.masked).toBe('');
    }
  });

  it('shows runtime source for a key set via setApiKey', () => {
    setApiKey('serpapi', 'SERPAPI_RUNTIME_KEY_LONG');
    const status = getProviderKeyStatus();
    expect(status.serpapi.configured).toBe(true);
    expect(status.serpapi.source).toBe('runtime');
    expect(status.serpapi.masked).toContain('...');
  });

  it('shows env source for a key set via env var', () => {
    vi.stubEnv('META_ACCESS_TOKEN', 'EAA-long-enough-meta-env-token');
    const status = getProviderKeyStatus();
    expect(status['meta-access-token'].configured).toBe(true);
    expect(status['meta-access-token'].source).toBe('env');
  });

  it('runtime key takes priority over env in status', () => {
    vi.stubEnv('SERPAPI_KEY', 'env-serpapi-key-long-value');
    setApiKey('serpapi', 'runtime-serpapi-key-long');
    const status = getProviderKeyStatus();
    expect(status.serpapi.source).toBe('runtime');
  });

  it('returns all 5 key statuses', () => {
    const status = getProviderKeyStatus();
    const keys: TrendApiKey[] = [
      'serpapi',
      'amazon-access-key',
      'amazon-secret-key',
      'amazon-partner-tag',
      'meta-access-token',
    ];
    for (const key of keys) {
      expect(status[key]).toBeDefined();
      expect(typeof status[key].configured).toBe('boolean');
    }
  });

  it('never exposes the full key value', () => {
    const secret = 'FULL_SECRET_KEY_THAT_SHOULD_NEVER_APPEAR';
    setApiKey('serpapi', secret);
    const status = getProviderKeyStatus();
    expect(status.serpapi.masked).not.toBe(secret);
  });
});
