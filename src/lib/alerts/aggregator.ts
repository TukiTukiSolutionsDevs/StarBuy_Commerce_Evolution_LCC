/**
 * Alerts Module — Aggregator
 *
 * Deduplicates candidates against existing alerts (one per type+source per week)
 * and persists new ones.
 */

import { loadAllMetrics } from '@/lib/monitor/store';
import { buildAlertId, generateFromMetrics, getISOWeekStart } from './generator';
import { loadPreferences } from './preferences';
import { addAlert, loadAlerts } from './store';
import type { AggregationResult, Alert, AlertPreferences, CreateAlertInput } from './types';

export function deduplicateAlerts(
  candidates: CreateAlertInput[],
  existing: Alert[],
): CreateAlertInput[] {
  const existingIds = new Set(existing.map((a) => a.id));
  const weekStart = getISOWeekStart();
  return candidates.filter((c) => {
    const id = buildAlertId(c.type, c.sourceId ?? '', weekStart);
    return !existingIds.has(id);
  });
}

export function aggregateAlerts(prefs?: AlertPreferences): AggregationResult {
  const resolvedPrefs = prefs ?? loadPreferences();
  const metrics = loadAllMetrics();
  const existing = loadAlerts();

  const candidates = generateFromMetrics(metrics, resolvedPrefs);
  const toCreate = deduplicateAlerts(candidates, existing);
  const skipped = candidates.length - toCreate.length;

  const created: Alert[] = toCreate.map((c) => addAlert(c));
  return { created: created.length, skipped, alerts: created };
}
