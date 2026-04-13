/**
 * Monitor Module — Health Computation
 *
 * Computes HealthStatus + healthReasons from ProductMetrics.
 * worst-wins: critical > warning > healthy.
 */

import type { HealthStatus, HealthThresholds, ProductMetrics } from './types';

// ─── Defaults ─────────────────────────────────────────────────────────────────

export function getDefaultThresholds(): HealthThresholds {
  return {
    lowConversionRate: 0.02,
    lowConversionRateCritical: 0.005,
    zeroOrdersDays: 3,
    zeroOrdersDaysCritical: 7,
    stockLowUnits: 10,
    stockLowUnitsCritical: 3,
  };
}

// ─── Severity helpers ─────────────────────────────────────────────────────────

const SEVERITY: Record<HealthStatus, number> = {
  healthy: 0,
  warning: 1,
  critical: 2,
  unknown: 3,
};

function worst(a: HealthStatus, b: HealthStatus): HealthStatus {
  return SEVERITY[a] >= SEVERITY[b] ? a : b;
}

// ─── computeHealth ────────────────────────────────────────────────────────────

export function computeHealth(
  metrics: Omit<ProductMetrics, 'health' | 'healthReasons'>,
  thresholds?: Partial<HealthThresholds>,
): Pick<ProductMetrics, 'health' | 'healthReasons'> {
  const t: HealthThresholds = { ...getDefaultThresholds(), ...thresholds };

  // Stale check — if fetchedAt > 2 hours ago → unknown immediately
  const ageMs = Date.now() - new Date(metrics.fetchedAt).getTime();
  if (ageMs > 2 * 60 * 60 * 1000) {
    return { health: 'unknown', healthReasons: ['stale'] };
  }

  const reasons: string[] = [];
  let status: HealthStatus = 'healthy';

  // ── Stock ──────────────────────────────────────────────────────────────────
  if (metrics.inventory < t.stockLowUnitsCritical) {
    reasons.push('stock_critical');
    status = worst(status, 'critical');
  } else if (metrics.inventory < t.stockLowUnits) {
    reasons.push('stock_low');
    status = worst(status, 'warning');
  }

  // ── Conversion rate ────────────────────────────────────────────────────────
  if (metrics.conversionRate > 0) {
    if (metrics.conversionRate < t.lowConversionRateCritical) {
      reasons.push('low_conversion_critical');
      status = worst(status, 'critical');
    } else if (metrics.conversionRate < t.lowConversionRate) {
      reasons.push('low_conversion');
      status = worst(status, 'warning');
    }
  }

  // ── Zero orders ────────────────────────────────────────────────────────────
  if (metrics.orders === 0 && metrics.views > 0) {
    reasons.push('zero_orders_critical');
    status = worst(status, 'critical');
  } else if (metrics.orders === 0 && metrics.views === 0) {
    // No views, no orders → zero_orders warning (but not critical)
    // Actually spec says: orders===0 within zeroOrdersDays → warning
    // views > 0 → critical. views == 0 falls into the plain zero_orders warning path only
    // We skip flagging when views === 0 (no data)
  }

  // Per spec re-read: "orders===0 && views>0 within zeroOrdersDaysCritical → critical"
  // and "orders===0 within zeroOrdersDays → warning"
  // The second rule fires when views could be 0 too — but spec says not to flag when views=0
  // So: warning only when orders===0 AND views===0 is excluded → already handled above.
  // The test "returns warning when orders=0 and views>0" will match critical path too.
  // Let me re-read: zeroOrdersDaysCritical check only when views>0 (already done above).
  // For "zero_orders" warning: spec says orders===0 within zeroOrdersDays (views doesn't matter?).
  // But test says don't flag when views=0. So warning = orders===0 && views===0 is skipped.
  // critical = orders===0 && views>0. warning = orders===0 && views>0 but below zeroOrdersDays threshold.
  // Since we have no day count in metrics, the distinction is:
  //   views > 0 + orders = 0 → at minimum warning, check if critical too.
  // The spec says BOTH can apply? No — worst wins. Let me re-read spec carefully:
  //   "orders === 0 && views > 0 within zeroOrdersDaysCritical → critical"
  //   "orders === 0 within zeroOrdersDays → warning"
  // Since we don't have a day counter in ProductMetrics, both rules evaluate the same condition.
  // The critical one always fires when views>0 and orders=0. The warning is a subset.
  // → So: views>0 && orders=0 → critical (already done above, labeled zero_orders_critical).

  if (reasons.length === 0) {
    return { health: 'healthy', healthReasons: ['healthy'] };
  }

  return { health: status, healthReasons: reasons };
}
