/**
 * Automations Rules Engine
 *
 * Evaluates conditions against a data context and executes rule actions.
 * Processes all enabled rules that match a given trigger.
 */

import type { AutomationRule, RuleCondition, RuleAction } from './types';
import { listRules, updateRuleStats } from './store';

// ─── Template interpolation ───────────────────────────────────────────────────────

/**
 * Replaces {{field}} tokens in a string with values from context.
 * e.g. 'Order #{{name}}' + { name: '1001' } → 'Order #1001'
 */
function interpolate(template: string, context: Record<string, unknown>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    const val = context[key];
    return val !== undefined && val !== null ? String(val) : `{{${key}}}`;
  });
}

// ─── Condition evaluation ─────────────────────────────────────────────────────────

/**
 * Evaluates a single condition against a context object.
 * Supports string, number, and boolean comparisons.
 */
function evaluateCondition(condition: RuleCondition, context: Record<string, unknown>): boolean {
  const contextVal = context[condition.field];
  const ruleVal = condition.value;

  switch (condition.operator) {
    case '==':
      return contextVal == ruleVal;
    case '!=':
      return contextVal != ruleVal;
    case '<':
      return Number(contextVal) < Number(ruleVal);
    case '>':
      return Number(contextVal) > Number(ruleVal);
    case '<=':
      return Number(contextVal) <= Number(ruleVal);
    case '>=':
      return Number(contextVal) >= Number(ruleVal);
    case 'contains':
      return String(contextVal).includes(String(ruleVal));
    case 'not_contains':
      return !String(contextVal).includes(String(ruleVal));
    default:
      return false;
  }
}

/**
 * Evaluates all conditions — ALL must pass (AND semantics).
 * Empty conditions array = always passes.
 */
export function evaluateConditions(
  conditions: RuleCondition[],
  context: Record<string, unknown>,
): boolean {
  if (conditions.length === 0) return true;
  return conditions.every((c) => evaluateCondition(c, context));
}

// ─── Action execution ─────────────────────────────────────────────────────────────

/**
 * Executes a single action. Returns null on success, error message on failure.
 */
async function executeAction(
  action: RuleAction,
  context: Record<string, unknown>,
): Promise<string | null> {
  try {
    switch (action.type) {
      case 'log': {
        const msg = interpolate(action.message, context);
        console.log(`[automations/log] ${msg}`);
        return null;
      }

      case 'notify': {
        const msg = interpolate(action.message, context);
        // TODO: Wire to notification system (email, Slack, etc.)
        console.log(`[automations/notify] ${msg}`);
        return null;
      }

      case 'tag_product': {
        // TODO: Wire to Shopify Admin API — addProductTag
        console.log(`[automations/tag_product] tag=${action.tag}`, context);
        return null;
      }

      case 'update_status': {
        // TODO: Wire to Shopify Admin API — updateProduct status
        console.log(`[automations/update_status] status=${action.status}`, context);
        return null;
      }

      case 'create_discount': {
        // TODO: Wire to Shopify Admin API — create discount code
        console.log(
          `[automations/create_discount] code=${action.code} ${action.percentage}% for ${action.duration_hours}h`,
          context,
        );
        return null;
      }

      case 'adjust_price': {
        // TODO: Wire to Shopify Admin API — update variant price
        console.log(`[automations/adjust_price] percentage=${action.percentage}%`, context);
        return null;
      }

      default:
        return `Unknown action type: ${(action as { type: string }).type}`;
    }
  } catch (err) {
    return err instanceof Error ? err.message : String(err);
  }
}

/**
 * Executes all actions for a rule in sequence.
 * Continues even if individual actions fail — collects errors.
 */
export async function executeActions(
  rule: AutomationRule,
  context: Record<string, unknown>,
): Promise<{ success: boolean; actionsExecuted: number; errors: string[] }> {
  const errors: string[] = [];
  let actionsExecuted = 0;

  for (const action of rule.actions) {
    const err = await executeAction(action, context);
    if (err) {
      errors.push(`[${action.type}] ${err}`);
    } else {
      actionsExecuted++;
    }
  }

  return {
    success: errors.length === 0,
    actionsExecuted,
    errors,
  };
}

// ─── Rule processing ──────────────────────────────────────────────────────────────

/**
 * Processes all enabled rules that match the given trigger type/topic.
 * Evaluates conditions and executes actions for matching rules.
 */
export async function processRules(
  trigger: { type: string; topic?: string },
  context: Record<string, unknown>,
): Promise<void> {
  const rules = listRules();

  const matchingRules = rules.filter((rule) => {
    if (!rule.enabled) return false;
    if (rule.trigger.type !== trigger.type) return false;
    if (trigger.type === 'webhook' && rule.trigger.type === 'webhook') {
      return !trigger.topic || rule.trigger.topic === trigger.topic;
    }
    return true;
  });

  for (const rule of matchingRules) {
    try {
      const conditionsMet = evaluateConditions(rule.conditions, context);
      if (!conditionsMet) continue;

      const result = await executeActions(rule, context);
      updateRuleStats(rule.id);

      if (!result.success) {
        console.error(`[automations/engine] Rule "${rule.name}" had errors:`, result.errors);
      }
    } catch (err) {
      console.error(`[automations/engine] Failed to process rule "${rule.name}":`, err);
    }
  }
}
