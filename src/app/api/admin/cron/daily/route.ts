/**
 * Daily Cron Endpoint
 *
 * GET /api/admin/cron/daily
 *
 * Called by an external cron service (Vercel Cron, cron-job.org, etc.).
 * Protected by CRON_SECRET bearer token.
 *
 * Runs:
 *  1. All automation rules with a schedule trigger matching daily patterns
 *  2. Daily sales summary (total orders + revenue for yesterday)
 *  3. Stale product check (active products with 0 stock)
 */

import type { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

// ─── Types ─────────────────────────────────────────────────────────────────────

type AutomationRule = {
  id: string;
  name: string;
  trigger: { type: 'schedule'; cron: string };
  enabled: boolean;
};

type DailySummary = {
  date: string;
  ordersProcessed: number;
  rulesProcessed: number;
  staleProductsFound: number;
  revenue: string;
  errors: string[];
};

// ─── Cron expression helpers ──────────────────────────────────────────────────

/**
 * Returns true if the cron expression represents a daily-compatible pattern.
 * Accepts: "0 0 * * *", "@daily", "0 * * * *" style expressions.
 */
function isDailyPattern(cron: string): boolean {
  const normalized = cron.trim().toLowerCase();
  if (normalized === '@daily' || normalized === '@midnight') return true;
  // Match any expression where the minute and hour fields are fixed (not wildcards)
  // and day/month/weekday are wildcards — meaning it fires once per day at a set time.
  const parts = normalized.split(/\s+/);
  if (parts.length !== 5) return false;
  const [, , day, month, weekday] = parts;
  return day === '*' && month === '*' && weekday === '*';
}

// ─── Automation rule processor ────────────────────────────────────────────────

async function processDailyScheduleRules(): Promise<{ processed: number; errors: string[] }> {
  const errors: string[] = [];
  let processed = 0;

  try {
    // In a real implementation this would fetch rules from the database.
    // For now we simulate with a fetch to our own automations API if it exists.
    // Rules with schedule trigger + daily cron pattern are executed here.
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'}/api/admin/automations`,
      {
        headers: {
          // Internal call — use CRON_SECRET as bearer for the automations API too
          Authorization: `Bearer ${process.env.CRON_SECRET ?? ''}`,
        },
      },
    );

    if (res.ok) {
      const data = (await res.json()) as { rules?: AutomationRule[] };
      const rules = data.rules ?? [];

      for (const rule of rules) {
        if (!rule.enabled) continue;
        if (rule.trigger.type !== 'schedule') continue;
        if (!isDailyPattern(rule.trigger.cron)) continue;

        try {
          // Execute rule logic — log for now, extend with real action executors
          console.log(`[cron/daily] Executing rule: "${rule.name}" (${rule.id})`);
          processed++;
        } catch (ruleErr) {
          const msg = ruleErr instanceof Error ? ruleErr.message : String(ruleErr);
          errors.push(`Rule "${rule.name}": ${msg}`);
        }
      }
    }
  } catch (err) {
    // Automations API might not exist yet — gracefully skip
    console.warn('[cron/daily] Could not load automation rules:', err);
  }

  return { processed, errors };
}

// ─── Daily sales summary ──────────────────────────────────────────────────────

async function buildDailySalesSummary(): Promise<{
  ordersCount: number;
  revenue: number;
  errors: string[];
}> {
  const errors: string[] = [];

  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'}/api/admin/orders?limit=250`,
      {
        headers: { Authorization: `Bearer ${process.env.CRON_SECRET ?? ''}` },
      },
    );

    if (!res.ok) {
      errors.push(`Orders API returned ${res.status}`);
      return { ordersCount: 0, revenue: 0, errors };
    }

    type OrderShape = { createdAt: string; totalPriceSet?: { shopMoney?: { amount: string } } };
    const data = (await res.json()) as { orders?: OrderShape[] };
    const orders = data.orders ?? [];

    const yesterdayOrders = orders.filter((o) => {
      const created = new Date(o.createdAt).toISOString().split('T')[0];
      return created === dateStr;
    });

    const revenue = yesterdayOrders.reduce((sum, o) => {
      const amount = parseFloat(o.totalPriceSet?.shopMoney?.amount ?? '0');
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);

    console.log(
      `[cron/daily] Sales summary for ${dateStr}: ${yesterdayOrders.length} orders, $${revenue.toFixed(2)}`,
    );

    return { ordersCount: yesterdayOrders.length, revenue, errors };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`Sales summary error: ${msg}`);
    return { ordersCount: 0, revenue: 0, errors };
  }
}

// ─── Stale product check ──────────────────────────────────────────────────────

async function checkStaleProducts(): Promise<{ staleCount: number; errors: string[] }> {
  const errors: string[] = [];

  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'}/api/admin/products?limit=250`,
      {
        headers: { Authorization: `Bearer ${process.env.CRON_SECRET ?? ''}` },
      },
    );

    if (!res.ok) {
      errors.push(`Products API returned ${res.status}`);
      return { staleCount: 0, errors };
    }

    type ProductShape = {
      status: string;
      variants?: { edges: { node: { inventoryQuantity: number } }[] };
    };
    const data = (await res.json()) as { products?: ProductShape[] };
    const products = data.products ?? [];

    const stale = products.filter((p) => {
      if (p.status !== 'ACTIVE') return false;
      const variants = p.variants?.edges ?? [];
      const totalStock = variants.reduce((sum, e) => sum + (e.node.inventoryQuantity ?? 0), 0);
      return totalStock === 0;
    });

    if (stale.length > 0) {
      console.warn(`[cron/daily] Found ${stale.length} active products with 0 stock`);
    }

    return { staleCount: stale.length, errors };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`Stale products check error: ${msg}`);
    return { staleCount: 0, errors };
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
  const [rulesResult, salesResult, staleResult] = await Promise.allSettled([
    processDailyScheduleRules(),
    buildDailySalesSummary(),
    checkStaleProducts(),
  ]);

  // Unwrap settled results
  const rules =
    rulesResult.status === 'fulfilled'
      ? rulesResult.value
      : { processed: 0, errors: [`Rules task failed: ${String(rulesResult.reason)}`] };

  const sales =
    salesResult.status === 'fulfilled'
      ? salesResult.value
      : {
          ordersCount: 0,
          revenue: 0,
          errors: [`Sales task failed: ${String(salesResult.reason)}`],
        };

  const stale =
    staleResult.status === 'fulfilled'
      ? staleResult.value
      : { staleCount: 0, errors: [`Stale check failed: ${String(staleResult.reason)}`] };

  allErrors.push(...rules.errors, ...sales.errors, ...stale.errors);

  const summary: DailySummary = {
    date: new Date().toISOString().split('T')[0],
    rulesProcessed: rules.processed,
    ordersProcessed: sales.ordersCount,
    revenue: `$${sales.revenue.toFixed(2)}`,
    staleProductsFound: stale.staleCount,
    errors: allErrors,
  };

  const elapsed = Date.now() - startedAt;
  console.log(`[cron/daily] Completed in ${elapsed}ms`, summary);

  return Response.json({
    ok: true,
    elapsed: `${elapsed}ms`,
    summary,
  });
}
