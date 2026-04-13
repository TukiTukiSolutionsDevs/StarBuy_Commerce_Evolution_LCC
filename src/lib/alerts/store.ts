/**
 * Alerts Module — File-based Store
 *
 * Persists Alert[] as .starbuy-alerts/alerts.json
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { getDataDir } from '@/lib/data-dir';
import { buildAlertId, getISOWeekStart } from './generator';
import type {
  Alert,
  AlertFilters,
  AlertStatus,
  AlertType,
  CreateAlertInput,
  SnoozeDuration,
  UpdateAlertInput,
} from './types';

function getAlertsDir(): string {
  return getDataDir('.starbuy-alerts');
}

function getAlertsFile(): string {
  return join(getAlertsDir(), 'alerts.json');
}

function ensureDir(): void {
  const dir = getAlertsDir();
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  if (!existsSync(getAlertsFile())) writeFileSync(getAlertsFile(), '[]', 'utf-8');
}

function readJson(): Alert[] {
  ensureDir();
  try {
    return JSON.parse(readFileSync(getAlertsFile(), 'utf-8')) as Alert[];
  } catch {
    return [];
  }
}

function writeJson(data: Alert[]): void {
  ensureDir();
  writeFileSync(getAlertsFile(), JSON.stringify(data, null, 2), 'utf-8');
}

// ─── Read ─────────────────────────────────────────────────────────────────────

export function loadAlerts(): Alert[] {
  return readJson();
}

export function getAlertById(id: string): Alert | undefined {
  return readJson().find((a) => a.id === id);
}

export function getAlertsByStatus(status: AlertStatus): Alert[] {
  return readJson().filter((a) => a.status === status);
}

export function getAlertsByType(type: AlertType): Alert[] {
  return readJson().filter((a) => a.type === type);
}

export function getAlertsByFilter(filters: AlertFilters): Alert[] {
  let results = readJson();
  if (filters.status) results = results.filter((a) => a.status === filters.status);
  if (filters.type) results = results.filter((a) => a.type === filters.type);
  if (filters.severity) results = results.filter((a) => a.severity === filters.severity);
  if (filters.limit != null) results = results.slice(0, filters.limit);
  return results;
}

export function getUnreadCount(): number {
  return readJson().filter((a) => a.status === 'unread').length;
}

// ─── Write ────────────────────────────────────────────────────────────────────

export function addAlert(input: CreateAlertInput): Alert {
  const all = readJson();
  const id = buildAlertId(input.type, input.sourceId ?? '', getISOWeekStart());
  const alert: Alert = { ...input, id, status: 'unread', createdAt: new Date().toISOString() };
  all.push(alert);
  writeJson(all);
  return alert;
}

export function updateAlert(id: string, patch: UpdateAlertInput): Alert {
  const all = readJson();
  const idx = all.findIndex((a) => a.id === id);
  if (idx === -1) throw new Error(`Alert not found: ${id}`);
  all[idx] = { ...all[idx], ...patch };
  writeJson(all);
  return all[idx];
}

export function markAlertRead(id: string): Alert {
  return updateAlert(id, { status: 'read', readAt: new Date().toISOString() });
}

export function dismissAlert(id: string): Alert {
  return updateAlert(id, { status: 'dismissed', dismissedAt: new Date().toISOString() });
}

export function snoozeAlert(id: string, hours: SnoozeDuration): Alert {
  const snoozedUntil = new Date(Date.now() + hours * 3600 * 1000).toISOString();
  return updateAlert(id, { status: 'snoozed', snoozedUntil });
}
