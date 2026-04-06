/**
 * Hourly Cron Endpoint
 *
 * GET /api/admin/cron/hourly
 *
 * Called by an external cron service (Vercel Cron, cron-job.org, etc.).
 * Protected by CRON_SECRET bearer token.
 *
 * Runs:
 *  1. Stock level checks — flags products approaching OOS (out-of-stock)
 *  2. Threshold-based automation rules — evaluates metric conditions
 */

import type { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

// ─── Types ─────────────────────────────────────────────────────────────────────

type ThresholdRule = {
  id: string;
  name: string;
  enabled: boolean;
  trigger: {
    type: 'threshold';
    metric: string;
    operator: '<' | '>' | '<=' | '>=' | '==' | '!=';
    value: number;
  };
  actions: { type: string; params: Record<string, unknown> }[];
};

type HourlySummary = {
  timestamp: string;
  stockFlagged: number;
  thresholdRulesEvaluated: number;
  thresholdRulesTriggered: number;
  errors: string[];
};

// ─── Operator evaluator ───────────────────────────────────────────────────────

function evaluateThreshold(
  actual: number,
  operator: ThresholdRule['trigger']['operator'],
  target: number,
): boolean {
  switch (operator) {
    case '<':
      return actual < target;
    case '>':
      return actual > target;
    case '<=':
      return actual <= target;
    case '>=':
      return actual >= target;
    case '==':
      return actual === target;
    case '!=':
      return actual !== target;
    default:
      return false;
  }
}

// ─── Stock level check ────────────────────────────────────────────────────────

const LOW_STOCK_THRESHOLD = 10; // units — configurable via env
const configuredThreshold = parseInt(
  process.env.LOW_STOCK_THRESHOLD ?? String(LOW_STOCK_THRESHOLD),
  10,
);

async function checkStockLevels(): Promise<{
  flaggedCount: number;
  flaggedProducts: { id: string; title: string; stock: number }[];
  errors: string[];
}> {
  const errors: string[] = [];
  const flaggedProducts: { id: string; title: string; stock: number }[] = [];

  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'}/api/admin/inventory?limit=250`,
      {
        headers: { Authorization: `Bearer ${process.env.CRON_SECRET ?? ''}` },
      },
    );

    if (!res.ok) {
      errors.push(`Inventory API returned ${res.status}`);
      return { flaggedCount: 0, flaggedProducts, errors };
    }

    type InventoryItem = {
      productId: string;
      productTitle: string;
      available: number;
    };

    const data = (await res.json()) as { items?: InventoryItem[] };
    const items = data.items ?? [];

    for (const item of items) {
      if (item.available <= configuredThreshold && item.available >= 0) {
        flaggedProducts.push({
          id: item.productId,
          title: item.productTitle,
          stock: item.available,
        });

        if (item.available === 0) {
          console.warn(`[cron/hourly] OOS: "${item.productTitle}" (id: ${item.productId})`);
        } else {
          console.info(
            `[cron/hourly] Low stock: "${item.productTitle}" — ${item.available} units remaining`,
          );
        }
      }
    }

    return { flaggedCount: flaggedProducts.length, flaggedProducts, errors };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`Stock level check error: ${msg}`);
    return { flaggedCount: 0, flaggedProducts, errors };
  }
}

// ─── Threshold rule processor ─────────────────────────────────────────────────

async function processThresholdRules(): Promise<{
  evaluated: number;
  triggered: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let evaluated = 0;
  let triggered = 0;

  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'}/api/admin/automations`,
      {
        headers: { Authorization: `Bearer ${process.env.CRON_SECRET ?? ''}` },
      },
    );

    if (!res.ok) {
      // Automations API may not be set up yet — skip silently
      return { evaluated, triggered, errors };
    }

    const data = (await res.json()) as { rules?: ThresholdRule[] };
    const rules = (data.rules ?? []).filter(
      (r): r is ThresholdRule => r.enabled && r.trigger?.type === 'threshold',
    );

    for (const rule of rules) {
      evaluated++;

      try {
        // Resolve the current metric value
        const metricValue = await resolveMetric(rule.trigger.metric);

        if (metricValue === null) {
          // Metric not resolvable — skip but don't error
          continue;
        }

        const fires = evaluateThreshold(metricValue, rule.trigger.operator, rule.trigger.value);

        if (fires) {
          triggered++;
          console.log(
            `[cron/hourly] Threshold rule "${rule.name}" triggered: ` +
              `${rule.trigger.metric} ${rule.trigger.operator} ${rule.trigger.value} ` +
              `(actual: ${metricValue})`,
          );
          // Action execution would go here in a full implementation
        }
      } catch (ruleErr) {
        const msg = ruleErr instanceof Error ? ruleErr.message : String(ruleErr);
        errors.push(`Rule "${rule.name}": ${msg}`);
      }
    }
  } catch (err) {
    // Non-fatal — automation rules may not exist yet
    console.warn('[cron/hourly] Could not process threshold rules:', err);
  }

  return { evaluated, triggered, errors };
}

/**
 * Resolves a metric name to its current numeric value.
 * Returns null if the metric is unknown or cannot be fetched.
 */
async function resolveMetric(metric: string): Promise<number | null> {
  try {
    switch (metric) {
      case 'total_inventory': {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'}/api/admin/inventory`,
          { headers: { Authorization: `Bearer ${process.env.CRON_SECRET ?? ''}` } },
        );
        if (!res.ok) return null;
        const data = (await res.json()) as { items?: { available: number }[] };
        return (data.items ?? []).reduce((sum, i) => sum + (i.available ?? 0), 0);
      }

      case 'active_orders': {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'}/api/admin/orders?limit=50`,
          { headers: { Authorization: `Bearer ${process.env.CRON_SECRET ?? ''}` } },
        );
        if (!res.ok) return null;
        const data = (await res.json()) as { orders?: { financialStatus: string }[] };
        return (data.orders ?? []).filter((o) => o.financialStatus === 'PENDING').length;
      }

      default:
        return null;
    }
  } catch {
    return null;
  }
}

// ─── GET handler ──────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  // ── Auth ─────────────────────────────────────────────────────────────────────
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startedAt = Date.now();
  const allErrors: string[] = [];

  // ── Run tasks in parallel ────────────────────────────────────────────────────
  const [stockResult, thresholdResult] = await Promise.allSettled([
    checkStockLevels(),
    processThresholdRules(),
  ]);

  const stock =
    stockResult.status === 'fulfilled'
      ? stockResult.value
      : {
          flaggedCount: 0,
          flaggedProducts: [],
          errors: [`Stock check failed: ${String(stockResult.reason)}`],
        };

  const threshold =
    thresholdResult.status === 'fulfilled'
      ? thresholdResult.value
      : {
          evaluated: 0,
          triggered: 0,
          errors: [`Threshold task failed: ${String(thresholdResult.reason)}`],
        };

  allErrors.push(...stock.errors, ...threshold.errors);

  const summary: HourlySummary = {
    timestamp: new Date().toISOString(),
    stockFlagged: stock.flaggedCount,
    thresholdRulesEvaluated: threshold.evaluated,
    thresholdRulesTriggered: threshold.triggered,
    errors: allErrors,
  };

  const elapsed = Date.now() - startedAt;
  console.log(`[cron/hourly] Completed in ${elapsed}ms`, summary);

  return Response.json({
    ok: true,
    elapsed: `${elapsed}ms`,
    summary,
    flaggedProducts: stock.flaggedProducts,
  });
}
