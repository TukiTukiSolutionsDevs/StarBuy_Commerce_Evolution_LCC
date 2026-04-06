/**
 * Pre-built Automation Rules
 *
 * A set of opinionated rules for common e-commerce scenarios.
 * These are installed automatically when no rules exist yet.
 */

import type { AutomationRule } from './types';

export function getPrebuiltRules(): AutomationRule[] {
  const now = Date.now();

  return [
    {
      id: 'prebuilt-low-stock',
      name: 'Auto-tag low stock products',
      description: 'When inventory drops below 10, add "low-stock" tag and notify',
      enabled: true,
      trigger: { type: 'webhook', topic: 'inventory_levels/update' },
      conditions: [{ field: 'available', operator: '<=', value: 10 }],
      actions: [
        { type: 'tag_product', tag: 'low-stock' },
        {
          type: 'notify',
          message: 'Product {{title}} is low on stock ({{available}} units remaining)',
        },
      ],
      lastRunAt: null,
      runCount: 0,
      createdAt: now,
    },
    {
      id: 'prebuilt-large-order-alert',
      name: 'Alert on large orders',
      description: 'Notify when order total exceeds $500',
      enabled: true,
      trigger: { type: 'webhook', topic: 'orders/create' },
      conditions: [{ field: 'total_price', operator: '>', value: 500 }],
      actions: [
        {
          type: 'notify',
          message: 'Large order #{{name}}: ${{total_price}} from {{customer_name}}',
        },
      ],
      lastRunAt: null,
      runCount: 0,
      createdAt: now,
    },
    {
      id: 'prebuilt-archive-zero-stock',
      name: 'Archive zero-stock products',
      description:
        'Archive products with 0 inventory that are still active (runs daily at midnight)',
      enabled: true,
      trigger: { type: 'schedule', cron: '0 0 * * *' },
      conditions: [
        { field: 'inventory_quantity', operator: '==', value: 0 },
        { field: 'status', operator: '==', value: 'ACTIVE' },
      ],
      actions: [
        { type: 'update_status', status: 'ARCHIVED' },
        { type: 'log', message: 'Archived {{title}} — 0 stock' },
      ],
      lastRunAt: null,
      runCount: 0,
      createdAt: now,
    },
    {
      id: 'prebuilt-welcome-customer',
      name: 'Welcome new customers',
      description: 'Log when new customers are created',
      enabled: true,
      trigger: { type: 'webhook', topic: 'customers/create' },
      conditions: [],
      actions: [
        { type: 'notify', message: 'New customer: {{first_name}} {{last_name}} ({{email}})' },
      ],
      lastRunAt: null,
      runCount: 0,
      createdAt: now,
    },
  ];
}
