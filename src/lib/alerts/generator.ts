/**
 * Alerts Module — Generator
 *
 * Builds CreateAlertInput[] from ProductMetrics and pulse events.
 */

import { createHash } from 'crypto';
import type { AlertPreferences, AlertType, CreateAlertInput } from './types';
import type { ProductMetrics } from '@/lib/monitor/types';

// ─── Week helpers ─────────────────────────────────────────────────────────────

export function getISOWeekStart(date = new Date()): string {
  const d = new Date(date);
  const day = d.getUTCDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day; // shift to Monday
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

// ─── buildAlertId ─────────────────────────────────────────────────────────────

export function buildAlertId(type: AlertType, sourceId: string, weekStart?: string): string {
  const week = weekStart ?? getISOWeekStart();
  return createHash('sha256').update(`${type}:${sourceId}:${week}`).digest('hex').slice(0, 16);
}

// ─── generateFromMetrics ──────────────────────────────────────────────────────

export function generateFromMetrics(
  metrics: ProductMetrics[],
  prefs: AlertPreferences,
): CreateAlertInput[] {
  const { thresholds, enabledTypes } = prefs;
  const alerts: CreateAlertInput[] = [];

  for (const m of metrics) {
    // low_conversion
    if (
      enabledTypes.includes('low_conversion') &&
      m.conversionRate > 0 &&
      m.conversionRate < thresholds.lowConversionRate
    ) {
      alerts.push({
        type: 'low_conversion',
        severity: m.conversionRate < thresholds.lowConversionRate / 2 ? 'critical' : 'warning',
        title: `Low conversion rate: ${m.title}`,
        message: `Conversion rate ${(m.conversionRate * 100).toFixed(2)}% is below threshold ${(thresholds.lowConversionRate * 100).toFixed(2)}%`,
        sourceId: m.shopifyProductId,
        sourceLabel: m.title,
        metadata: { conversionRate: m.conversionRate, threshold: thresholds.lowConversionRate },
      });
    }

    // zero_orders
    if (enabledTypes.includes('zero_orders') && m.orders === 0 && m.views > 0) {
      alerts.push({
        type: 'zero_orders',
        severity: 'warning',
        title: `Zero orders: ${m.title}`,
        message: `Product has ${m.views} views but no orders in the tracked period`,
        sourceId: m.shopifyProductId,
        sourceLabel: m.title,
        metadata: { views: m.views, orders: m.orders },
      });
    }

    // stock_low
    if (enabledTypes.includes('stock_low') && m.inventory < thresholds.stockLowUnits) {
      alerts.push({
        type: 'stock_low',
        severity: m.inventory < thresholds.stockLowUnits / 2 ? 'critical' : 'warning',
        title: `Low stock: ${m.title}`,
        message: `Inventory at ${m.inventory} units — below threshold of ${thresholds.stockLowUnits}`,
        sourceId: m.shopifyProductId,
        sourceLabel: m.title,
        metadata: { inventory: m.inventory, threshold: thresholds.stockLowUnits },
      });
    }
  }

  return alerts;
}

// ─── generateFromPulseEvents ──────────────────────────────────────────────────

export function generateFromPulseEvents(
  events: any[],
  prefs: AlertPreferences,
): CreateAlertInput[] {
  if (!prefs.enabledTypes.includes('pulse_shift')) return [];
  const { pulseShiftMinScore } = prefs.thresholds;
  const alerts: CreateAlertInput[] = [];

  for (const event of events) {
    const delta: number = typeof event.deltaPercent === 'number' ? event.deltaPercent : 0;
    if (Math.abs(delta) < pulseShiftMinScore) continue;

    const sourceId: string = event.sourceId ?? event.id ?? 'unknown';
    const sourceLabel: string = event.title ?? sourceId;

    alerts.push({
      type: 'pulse_shift',
      severity: Math.abs(delta) >= pulseShiftMinScore * 2 ? 'critical' : 'warning',
      title: `Pulse shift detected: ${sourceLabel}`,
      message: `Score changed by ${delta > 0 ? '+' : ''}${delta.toFixed(1)}% this week`,
      sourceId,
      sourceLabel,
      metadata: { deltaPercent: delta },
    });
  }

  return alerts;
}
