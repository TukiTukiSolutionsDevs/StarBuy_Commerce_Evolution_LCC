/**
 * Unit tests — alerts/store.ts
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  loadAlerts,
  getAlertById,
  getAlertsByStatus,
  getAlertsByType,
  getAlertsByFilter,
  getUnreadCount,
  addAlert,
  updateAlert,
  markAlertRead,
  dismissAlert,
  snoozeAlert,
} from './store';
import type { CreateAlertInput } from './types';

let tmpDir: string;

function makeInput(overrides: Partial<CreateAlertInput> = {}): CreateAlertInput {
  return {
    type: 'zero_orders',
    severity: 'warning',
    title: 'No orders for product X',
    message: 'Product X has had no orders in 7 days',
    sourceId: 'gid://shopify/Product/1',
    sourceLabel: 'Product X',
    ...overrides,
  };
}

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'starbuy-alerts-test-'));
  vi.stubEnv('STARBUY_DATA_DIR', tmpDir);
});

afterEach(() => {
  vi.unstubAllEnvs();
  rmSync(tmpDir, { recursive: true, force: true });
});

// ─── loadAlerts ───────────────────────────────────────────────────────────────

describe('loadAlerts', () => {
  it('returns empty array when no alerts exist', () => {
    expect(loadAlerts()).toEqual([]);
  });

  it('returns all stored alerts', () => {
    addAlert(makeInput({ sourceId: 'gid://shopify/Product/1' }));
    addAlert(makeInput({ type: 'stock_low', sourceId: 'gid://shopify/Product/2' }));
    expect(loadAlerts()).toHaveLength(2);
  });
});

// ─── getAlertById ─────────────────────────────────────────────────────────────

describe('getAlertById', () => {
  it('returns alert for known id', () => {
    const alert = addAlert(makeInput());
    expect(getAlertById(alert.id)).toBeDefined();
    expect(getAlertById(alert.id)?.id).toBe(alert.id);
  });

  it('returns undefined for unknown id', () => {
    expect(getAlertById('nonexistent-id')).toBeUndefined();
  });
});

// ─── getAlertsByStatus ────────────────────────────────────────────────────────

describe('getAlertsByStatus', () => {
  it('returns only unread alerts', () => {
    const a1 = addAlert(makeInput());
    const a2 = addAlert(makeInput({ type: 'stock_low', sourceId: 'gid://shopify/Product/2' }));
    markAlertRead(a1.id);
    const unread = getAlertsByStatus('unread');
    expect(unread).toHaveLength(1);
    expect(unread[0].id).toBe(a2.id);
  });

  it('returns only read alerts', () => {
    const a1 = addAlert(makeInput());
    addAlert(makeInput({ type: 'stock_low', sourceId: 'gid://shopify/Product/2' }));
    markAlertRead(a1.id);
    expect(getAlertsByStatus('read')).toHaveLength(1);
  });

  it('returns empty array when no alerts match status', () => {
    addAlert(makeInput());
    expect(getAlertsByStatus('dismissed')).toHaveLength(0);
  });
});

// ─── getAlertsByType ──────────────────────────────────────────────────────────

describe('getAlertsByType', () => {
  it('returns only alerts of the given type', () => {
    addAlert(makeInput({ type: 'zero_orders' }));
    addAlert(makeInput({ type: 'stock_low', sourceId: 'gid://shopify/Product/2' }));
    expect(getAlertsByType('zero_orders')).toHaveLength(1);
    expect(getAlertsByType('stock_low')).toHaveLength(1);
  });

  it('returns empty array when no alerts match type', () => {
    addAlert(makeInput({ type: 'zero_orders' }));
    expect(getAlertsByType('pulse_shift')).toHaveLength(0);
  });
});

// ─── getAlertsByFilter ────────────────────────────────────────────────────────

describe('getAlertsByFilter', () => {
  it('filters by status', () => {
    addAlert(makeInput());
    const a2 = addAlert(makeInput({ type: 'stock_low', sourceId: 'gid://shopify/Product/2' }));
    markAlertRead(a2.id);
    expect(getAlertsByFilter({ status: 'unread' })).toHaveLength(1);
    expect(getAlertsByFilter({ status: 'read' })).toHaveLength(1);
  });

  it('filters by type', () => {
    addAlert(makeInput({ type: 'zero_orders' }));
    addAlert(makeInput({ type: 'stock_low', sourceId: 'gid://shopify/Product/2' }));
    expect(getAlertsByFilter({ type: 'stock_low' })).toHaveLength(1);
  });

  it('filters by severity', () => {
    addAlert(makeInput({ severity: 'warning' }));
    addAlert(
      makeInput({ type: 'stock_low', severity: 'critical', sourceId: 'gid://shopify/Product/2' }),
    );
    expect(getAlertsByFilter({ severity: 'critical' })).toHaveLength(1);
  });

  it('respects limit', () => {
    addAlert(makeInput({ sourceId: 'p1' }));
    addAlert(makeInput({ type: 'stock_low', sourceId: 'p2' }));
    addAlert(makeInput({ type: 'pulse_shift', sourceId: 'p3' }));
    expect(getAlertsByFilter({ limit: 2 })).toHaveLength(2);
  });

  it('combines multiple filters', () => {
    addAlert(makeInput({ type: 'zero_orders', severity: 'warning', sourceId: 'p1' }));
    addAlert(makeInput({ type: 'stock_low', severity: 'critical', sourceId: 'p2' }));
    addAlert(makeInput({ type: 'zero_orders', severity: 'critical', sourceId: 'p3' }));
    const results = getAlertsByFilter({ type: 'zero_orders', severity: 'critical' });
    expect(results).toHaveLength(1);
    expect(results[0].sourceId).toBe('p3');
  });

  it('returns all alerts when no filters given', () => {
    addAlert(makeInput({ sourceId: 'p1' }));
    addAlert(makeInput({ type: 'stock_low', sourceId: 'p2' }));
    expect(getAlertsByFilter({})).toHaveLength(2);
  });
});

// ─── getUnreadCount ───────────────────────────────────────────────────────────

describe('getUnreadCount', () => {
  it('returns 0 when no alerts', () => {
    expect(getUnreadCount()).toBe(0);
  });

  it('counts only unread alerts', () => {
    const a1 = addAlert(makeInput({ sourceId: 'p1' }));
    addAlert(makeInput({ type: 'stock_low', sourceId: 'p2' }));
    markAlertRead(a1.id);
    expect(getUnreadCount()).toBe(1);
  });
});

// ─── addAlert ─────────────────────────────────────────────────────────────────

describe('addAlert', () => {
  it('creates alert with status unread and timestamps', () => {
    const alert = addAlert(makeInput());
    expect(alert.status).toBe('unread');
    expect(alert.createdAt).toBeDefined();
    expect(typeof alert.id).toBe('string');
    expect(alert.id.length).toBeGreaterThan(0);
  });

  it('persists the alert', () => {
    addAlert(makeInput());
    expect(loadAlerts()).toHaveLength(1);
  });

  it('stores all input fields', () => {
    const alert = addAlert(makeInput({ title: 'My Alert', message: 'Details here' }));
    expect(alert.title).toBe('My Alert');
    expect(alert.message).toBe('Details here');
  });
});

// ─── updateAlert ──────────────────────────────────────────────────────────────

describe('updateAlert', () => {
  it('applies patch to existing alert', () => {
    const alert = addAlert(makeInput());
    const updated = updateAlert(alert.id, { status: 'read' });
    expect(updated.status).toBe('read');
  });

  it('throws when alert not found', () => {
    expect(() => updateAlert('nonexistent', { status: 'read' })).toThrow();
  });

  it('persists the patch', () => {
    const alert = addAlert(makeInput());
    updateAlert(alert.id, { status: 'dismissed' });
    expect(getAlertById(alert.id)?.status).toBe('dismissed');
  });
});

// ─── markAlertRead ────────────────────────────────────────────────────────────

describe('markAlertRead', () => {
  it('sets status to read and readAt timestamp', () => {
    const alert = addAlert(makeInput());
    const updated = markAlertRead(alert.id);
    expect(updated.status).toBe('read');
    expect(updated.readAt).toBeDefined();
  });

  it('throws when alert not found', () => {
    expect(() => markAlertRead('nonexistent')).toThrow();
  });
});

// ─── dismissAlert ─────────────────────────────────────────────────────────────

describe('dismissAlert', () => {
  it('sets status to dismissed and dismissedAt timestamp', () => {
    const alert = addAlert(makeInput());
    const updated = dismissAlert(alert.id);
    expect(updated.status).toBe('dismissed');
    expect(updated.dismissedAt).toBeDefined();
  });

  it('throws when alert not found', () => {
    expect(() => dismissAlert('nonexistent')).toThrow();
  });
});

// ─── snoozeAlert ──────────────────────────────────────────────────────────────

describe('snoozeAlert', () => {
  it('sets status to snoozed and snoozedUntil', () => {
    const before = Date.now();
    const alert = addAlert(makeInput());
    const updated = snoozeAlert(alert.id, 24);
    expect(updated.status).toBe('snoozed');
    expect(updated.snoozedUntil).toBeDefined();
    const snoozedUntilMs = new Date(updated.snoozedUntil!).getTime();
    expect(snoozedUntilMs).toBeGreaterThan(before + 23 * 3600 * 1000);
    expect(snoozedUntilMs).toBeLessThan(before + 25 * 3600 * 1000);
  });

  it('snoozes for 1 hour', () => {
    const before = Date.now();
    const alert = addAlert(makeInput());
    const updated = snoozeAlert(alert.id, 1);
    const snoozedUntilMs = new Date(updated.snoozedUntil!).getTime();
    expect(snoozedUntilMs).toBeGreaterThan(before + 0.9 * 3600 * 1000);
  });

  it('snoozes for 168 hours (7 days)', () => {
    const before = Date.now();
    const alert = addAlert(makeInput());
    const updated = snoozeAlert(alert.id, 168);
    const snoozedUntilMs = new Date(updated.snoozedUntil!).getTime();
    expect(snoozedUntilMs).toBeGreaterThan(before + 167 * 3600 * 1000);
  });

  it('throws when alert not found', () => {
    expect(() => snoozeAlert('nonexistent', 24)).toThrow();
  });
});
