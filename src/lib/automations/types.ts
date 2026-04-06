/**
 * Automations Rules Engine — Types
 *
 * Defines the data shape for triggers, conditions, actions and rules.
 */

// ─── Trigger ─────────────────────────────────────────────────────────────────────

export type RuleTrigger =
  | { type: 'webhook'; topic: string } // On webhook event
  | { type: 'schedule'; cron: string } // On cron schedule
  | { type: 'threshold'; metric: string; operator: '<' | '>' | '==' | '<='; value: number }; // On metric threshold

// ─── Condition ───────────────────────────────────────────────────────────────────

export type RuleCondition = {
  field: string; // e.g. 'inventory_quantity', 'order_total', 'product_status'
  operator: '==' | '!=' | '<' | '>' | '<=' | '>=' | 'contains' | 'not_contains';
  value: string | number | boolean;
};

// ─── Action ──────────────────────────────────────────────────────────────────────

export type RuleAction =
  | { type: 'tag_product'; tag: string }
  | { type: 'update_status'; status: 'ACTIVE' | 'DRAFT' | 'ARCHIVED' }
  | { type: 'notify'; message: string }
  | { type: 'create_discount'; percentage: number; code: string; duration_hours: number }
  | { type: 'adjust_price'; percentage: number } // positive = increase, negative = decrease
  | { type: 'log'; message: string };

// ─── Rule ────────────────────────────────────────────────────────────────────────

export type AutomationRule = {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  trigger: RuleTrigger;
  conditions: RuleCondition[];
  actions: RuleAction[];
  lastRunAt: number | null;
  runCount: number;
  createdAt: number;
};
