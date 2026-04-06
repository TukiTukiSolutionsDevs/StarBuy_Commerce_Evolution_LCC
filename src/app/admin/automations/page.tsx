'use client';

/**
 * Admin Automations Page
 *
 * CRUD interface for the rules engine. List, toggle, create, edit, and delete
 * automation rules. Matches the Activity page design language.
 */

import { useCallback, useEffect, useState } from 'react';
import { useToast } from '@/components/ui/useToast';
import type {
  AutomationRule,
  RuleTrigger,
  RuleCondition,
  RuleAction,
} from '@/lib/automations/types';

// ─── Constants ─────────────────────────────────────────────────────────────────

const TRIGGER_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  webhook: { label: 'Webhook', icon: 'webhook', color: '#6b8cff' },
  schedule: { label: 'Schedule', icon: 'schedule', color: '#d4a843' },
  threshold: { label: 'Threshold', icon: 'monitoring', color: '#10b981' },
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function relativeDate(ts: number | null): string {
  if (!ts) return 'Never';
  const diff = Date.now() - ts;
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString();
}

function triggerSummary(trigger: RuleTrigger): string {
  switch (trigger.type) {
    case 'webhook':
      return `on ${trigger.topic.replace(/\//g, ' > ')}`;
    case 'schedule':
      return `cron: ${trigger.cron}`;
    case 'threshold':
      return `${trigger.metric} ${trigger.operator} ${trigger.value}`;
    default:
      return 'Unknown trigger';
  }
}

// ─── Empty State for New Rule ──────────────────────────────────────────────────

function emptyRule(): Partial<AutomationRule> {
  return {
    name: '',
    description: '',
    enabled: true,
    trigger: { type: 'webhook', topic: 'orders/create' },
    conditions: [],
    actions: [{ type: 'log', message: '' }],
  };
}

// ─── Rule Card ─────────────────────────────────────────────────────────────────

function RuleCard({
  rule,
  onToggle,
  onDelete,
  onEdit,
}: {
  rule: AutomationRule;
  onToggle: (id: string, enabled: boolean) => void;
  onDelete: (id: string) => void;
  onEdit: (rule: AutomationRule) => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const trigger = TRIGGER_LABELS[rule.trigger.type] ?? TRIGGER_LABELS.webhook;

  return (
    <div
      className={`border rounded-2xl transition-all ${
        rule.enabled
          ? 'bg-[#111827] border-[#1f2d4e] hover:border-[#374151]'
          : 'bg-[#0d1526]/50 border-[#1f2d4e]/50 opacity-60'
      }`}
    >
      <div className="flex items-start gap-4 p-5">
        {/* Toggle */}
        <button
          onClick={() => onToggle(rule.id, !rule.enabled)}
          title={rule.enabled ? 'Disable' : 'Enable'}
          className="flex-none mt-0.5"
        >
          <div
            className={`relative w-10 h-5 rounded-full transition-colors ${
              rule.enabled ? 'bg-[#10b981]' : 'bg-[#374151]'
            }`}
          >
            <div
              className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${
                rule.enabled ? 'left-[22px]' : 'left-0.5'
              }`}
            />
          </div>
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="text-[#e5e7eb] text-sm font-semibold leading-snug">{rule.name}</h3>
          {rule.description && (
            <p className="text-[#6b7280] text-xs mt-1 leading-relaxed">{rule.description}</p>
          )}

          {/* Badges */}
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {/* Trigger badge */}
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium"
              style={{
                backgroundColor: `${trigger.color}15`,
                color: trigger.color,
              }}
            >
              <span className="material-symbols-outlined text-sm">{trigger.icon}</span>
              {triggerSummary(rule.trigger)}
            </span>

            {/* Conditions count */}
            {rule.conditions.length > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#1f2d4e]/50 text-[#9ca3af] text-[11px] font-medium">
                <span className="material-symbols-outlined text-sm">filter_alt</span>
                {rule.conditions.length} condition{rule.conditions.length !== 1 ? 's' : ''}
              </span>
            )}

            {/* Actions count */}
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#1f2d4e]/50 text-[#9ca3af] text-[11px] font-medium">
              <span className="material-symbols-outlined text-sm">bolt</span>
              {rule.actions.length} action{rule.actions.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 mt-3 text-[#374151] text-[10px] font-mono">
            <span>Runs: {rule.runCount}</span>
            <span>Last: {relativeDate(rule.lastRunAt)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex-none flex items-center gap-1">
          <button
            onClick={() => onEdit(rule)}
            title="Edit"
            className="p-2 rounded-lg text-[#6b7280] hover:text-[#d4a843] hover:bg-[#d4a843]/10 transition-all"
          >
            <span className="material-symbols-outlined text-lg">edit</span>
          </button>
          <button
            onClick={async () => {
              if (!confirm(`Delete rule "${rule.name}"?`)) return;
              setDeleting(true);
              onDelete(rule.id);
            }}
            disabled={deleting}
            title="Delete"
            className="p-2 rounded-lg text-[#6b7280] hover:text-[#ef4444] hover:bg-[#ef4444]/10 transition-all disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-lg">
              {deleting ? 'hourglass_empty' : 'delete'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonRule() {
  return (
    <div className="bg-[#111827] border border-[#1f2d4e] rounded-2xl p-5 space-y-3">
      <div className="flex items-start gap-4">
        <div className="w-10 h-5 rounded-full bg-[#1f2d4e] animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-[#1f2d4e] rounded animate-pulse w-1/3" />
          <div className="h-3 bg-[#1f2d4e] rounded animate-pulse w-2/3" />
          <div className="flex gap-2 mt-2">
            <div className="h-6 bg-[#1f2d4e] rounded-lg animate-pulse w-24" />
            <div className="h-6 bg-[#1f2d4e] rounded-lg animate-pulse w-20" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Create/Edit Modal ─────────────────────────────────────────────────────────

const WEBHOOK_TOPICS = [
  'orders/create',
  'orders/updated',
  'orders/paid',
  'orders/fulfilled',
  'products/create',
  'products/update',
  'products/delete',
  'customers/create',
  'customers/update',
  'inventory_levels/update',
  'inventory_levels/connect',
  'refunds/create',
  'fulfillments/create',
];

const ACTION_TYPES: { type: RuleAction['type']; label: string }[] = [
  { type: 'log', label: 'Log message' },
  { type: 'notify', label: 'Notification' },
  { type: 'tag_product', label: 'Tag product' },
  { type: 'update_status', label: 'Update status' },
  { type: 'create_discount', label: 'Create discount' },
  { type: 'adjust_price', label: 'Adjust price' },
];

function RuleModal({
  rule,
  onSave,
  onClose,
  saving,
}: {
  rule: Partial<AutomationRule>;
  onSave: (rule: Partial<AutomationRule>) => void;
  onClose: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<Partial<AutomationRule>>({ ...rule });

  const isEdit = !!rule.id;

  function updateTrigger(updates: Partial<RuleTrigger>) {
    setForm((f) => ({
      ...f,
      trigger: { ...f.trigger!, ...updates } as RuleTrigger,
    }));
  }

  function updateCondition(idx: number, updates: Partial<RuleCondition>) {
    setForm((f) => {
      const conditions = [...(f.conditions ?? [])];
      conditions[idx] = { ...conditions[idx], ...updates } as RuleCondition;
      return { ...f, conditions };
    });
  }

  function addCondition() {
    setForm((f) => ({
      ...f,
      conditions: [...(f.conditions ?? []), { field: '', operator: '==', value: '' }],
    }));
  }

  function removeCondition(idx: number) {
    setForm((f) => ({
      ...f,
      conditions: (f.conditions ?? []).filter((_, i) => i !== idx),
    }));
  }

  function updateAction(idx: number, updates: Record<string, unknown>) {
    setForm((f) => {
      const actions = [...(f.actions ?? [])];
      actions[idx] = { ...actions[idx], ...updates } as RuleAction;
      return { ...f, actions };
    });
  }

  function changeActionType(idx: number, type: RuleAction['type']) {
    setForm((f) => {
      const actions = [...(f.actions ?? [])];
      switch (type) {
        case 'log':
          actions[idx] = { type, message: '' };
          break;
        case 'notify':
          actions[idx] = { type, message: '' };
          break;
        case 'tag_product':
          actions[idx] = { type, tag: '' };
          break;
        case 'update_status':
          actions[idx] = { type, status: 'DRAFT' };
          break;
        case 'create_discount':
          actions[idx] = { type, percentage: 10, code: '', duration_hours: 24 };
          break;
        case 'adjust_price':
          actions[idx] = { type, percentage: 0 };
          break;
      }
      return { ...f, actions };
    });
  }

  function addAction() {
    setForm((f) => ({
      ...f,
      actions: [...(f.actions ?? []), { type: 'log', message: '' }],
    }));
  }

  function removeAction(idx: number) {
    setForm((f) => ({
      ...f,
      actions: (f.actions ?? []).filter((_, i) => i !== idx),
    }));
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#111827] border border-[#1f2d4e] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1f2d4e]">
          <h2
            className="text-white text-lg font-bold"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            {isEdit ? 'Edit Automation' : 'New Automation'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#6b7280] hover:text-white hover:bg-[#1f2d4e] transition-all"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Name + Description */}
          <div className="space-y-3">
            <div>
              <label className="block text-[#9ca3af] text-xs font-medium mb-1.5">Name *</label>
              <input
                type="text"
                value={form.name ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Auto-tag low stock products"
                className="w-full bg-[#0a0f1e] border border-[#1f2d4e] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-[#374151] focus:outline-none focus:border-[#d4a843]/50 transition-colors"
              />
            </div>
            <div>
              <label className="block text-[#9ca3af] text-xs font-medium mb-1.5">Description</label>
              <input
                type="text"
                value={form.description ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Short description of what this rule does"
                className="w-full bg-[#0a0f1e] border border-[#1f2d4e] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-[#374151] focus:outline-none focus:border-[#d4a843]/50 transition-colors"
              />
            </div>
          </div>

          {/* Trigger */}
          <div>
            <label className="block text-[#9ca3af] text-xs font-medium mb-2">Trigger</label>
            <div className="flex gap-2 mb-3">
              {(['webhook', 'schedule', 'threshold'] as const).map((type) => {
                const t = TRIGGER_LABELS[type];
                const isActive = form.trigger?.type === type;
                return (
                  <button
                    key={type}
                    onClick={() => {
                      if (type === 'webhook')
                        updateTrigger({ type, topic: 'orders/create' } as RuleTrigger);
                      else if (type === 'schedule')
                        updateTrigger({ type, cron: '0 0 * * *' } as RuleTrigger);
                      else
                        updateTrigger({ type, metric: '', operator: '>', value: 0 } as RuleTrigger);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                      isActive
                        ? 'border text-white'
                        : 'bg-[#0a0f1e] border border-[#1f2d4e] text-[#6b7280] hover:text-[#9ca3af]'
                    }`}
                    style={
                      isActive
                        ? {
                            backgroundColor: `${t.color}15`,
                            borderColor: `${t.color}50`,
                            color: t.color,
                          }
                        : {}
                    }
                  >
                    <span className="material-symbols-outlined text-sm">{t.icon}</span>
                    {t.label}
                  </button>
                );
              })}
            </div>

            {/* Trigger config */}
            {form.trigger?.type === 'webhook' && (
              <select
                value={(form.trigger as { type: 'webhook'; topic: string }).topic}
                onChange={(e) => updateTrigger({ topic: e.target.value } as Partial<RuleTrigger>)}
                className="w-full bg-[#0a0f1e] border border-[#1f2d4e] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#d4a843]/50 transition-colors"
              >
                {WEBHOOK_TOPICS.map((t) => (
                  <option key={t} value={t}>
                    {t.replace(/\//g, ' > ')}
                  </option>
                ))}
              </select>
            )}
            {form.trigger?.type === 'schedule' && (
              <input
                type="text"
                value={(form.trigger as { type: 'schedule'; cron: string }).cron}
                onChange={(e) => updateTrigger({ cron: e.target.value } as Partial<RuleTrigger>)}
                placeholder="0 0 * * * (every midnight)"
                className="w-full bg-[#0a0f1e] border border-[#1f2d4e] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-[#374151] focus:outline-none focus:border-[#d4a843]/50 transition-colors font-mono"
              />
            )}
            {form.trigger?.type === 'threshold' && (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={(form.trigger as { type: 'threshold'; metric: string }).metric}
                  onChange={(e) =>
                    updateTrigger({ metric: e.target.value } as Partial<RuleTrigger>)
                  }
                  placeholder="Metric name"
                  className="flex-1 bg-[#0a0f1e] border border-[#1f2d4e] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-[#374151] focus:outline-none focus:border-[#d4a843]/50 transition-colors"
                />
                <select
                  value={(form.trigger as { type: 'threshold'; operator: string }).operator}
                  onChange={(e) =>
                    updateTrigger({ operator: e.target.value } as Partial<RuleTrigger>)
                  }
                  className="w-20 bg-[#0a0f1e] border border-[#1f2d4e] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#d4a843]/50 transition-colors font-mono"
                >
                  <option value="<">&lt;</option>
                  <option value=">">&gt;</option>
                  <option value="==">=</option>
                  <option value="<=">&le;</option>
                </select>
                <input
                  type="number"
                  value={(form.trigger as { type: 'threshold'; value: number }).value}
                  onChange={(e) =>
                    updateTrigger({ value: Number(e.target.value) } as Partial<RuleTrigger>)
                  }
                  className="w-24 bg-[#0a0f1e] border border-[#1f2d4e] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#d4a843]/50 transition-colors font-mono"
                />
              </div>
            )}
          </div>

          {/* Conditions */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[#9ca3af] text-xs font-medium">
                Conditions (all must match)
              </label>
              <button onClick={addCondition} className="text-[#d4a843] text-xs hover:underline">
                + Add condition
              </button>
            </div>
            {(form.conditions ?? []).length === 0 ? (
              <p className="text-[#374151] text-xs italic">
                No conditions — rule will always fire when triggered
              </p>
            ) : (
              <div className="space-y-2">
                {(form.conditions ?? []).map((cond, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={cond.field}
                      onChange={(e) => updateCondition(idx, { field: e.target.value })}
                      placeholder="field"
                      className="flex-1 bg-[#0a0f1e] border border-[#1f2d4e] rounded-lg px-3 py-2 text-xs text-white placeholder:text-[#374151] focus:outline-none focus:border-[#d4a843]/50 font-mono"
                    />
                    <select
                      value={cond.operator}
                      onChange={(e) =>
                        updateCondition(idx, {
                          operator: e.target.value as RuleCondition['operator'],
                        })
                      }
                      className="w-20 bg-[#0a0f1e] border border-[#1f2d4e] rounded-lg px-2 py-2 text-xs text-white focus:outline-none focus:border-[#d4a843]/50 font-mono"
                    >
                      <option value="==">=</option>
                      <option value="!=">!=</option>
                      <option value="<">&lt;</option>
                      <option value=">">&gt;</option>
                      <option value="<=">&le;</option>
                      <option value=">=">&ge;</option>
                      <option value="contains">contains</option>
                      <option value="not_contains">!contains</option>
                    </select>
                    <input
                      type="text"
                      value={String(cond.value)}
                      onChange={(e) =>
                        updateCondition(idx, {
                          value: isNaN(Number(e.target.value))
                            ? e.target.value
                            : Number(e.target.value),
                        })
                      }
                      placeholder="value"
                      className="w-32 bg-[#0a0f1e] border border-[#1f2d4e] rounded-lg px-3 py-2 text-xs text-white placeholder:text-[#374151] focus:outline-none focus:border-[#d4a843]/50 font-mono"
                    />
                    <button
                      onClick={() => removeCondition(idx)}
                      className="p-1 rounded text-[#6b7280] hover:text-[#ef4444] transition-colors"
                    >
                      <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[#9ca3af] text-xs font-medium">Actions *</label>
              <button onClick={addAction} className="text-[#d4a843] text-xs hover:underline">
                + Add action
              </button>
            </div>
            <div className="space-y-2">
              {(form.actions ?? []).map((action, idx) => (
                <div
                  key={idx}
                  className="bg-[#0a0f1e] border border-[#1f2d4e] rounded-xl p-3 space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <select
                      value={action.type}
                      onChange={(e) => changeActionType(idx, e.target.value as RuleAction['type'])}
                      className="flex-1 bg-transparent border border-[#1f2d4e] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#d4a843]/50"
                    >
                      {ACTION_TYPES.map((at) => (
                        <option key={at.type} value={at.type}>
                          {at.label}
                        </option>
                      ))}
                    </select>
                    {(form.actions ?? []).length > 1 && (
                      <button
                        onClick={() => removeAction(idx)}
                        className="p-1 rounded text-[#6b7280] hover:text-[#ef4444] transition-colors"
                      >
                        <span className="material-symbols-outlined text-sm">close</span>
                      </button>
                    )}
                  </div>

                  {/* Action-specific fields */}
                  {(action.type === 'log' || action.type === 'notify') && (
                    <input
                      type="text"
                      value={(action as { message: string }).message}
                      onChange={(e) => updateAction(idx, { message: e.target.value })}
                      placeholder="Message (use {{field}} for interpolation)"
                      className="w-full bg-transparent border border-[#1f2d4e] rounded-lg px-3 py-2 text-xs text-white placeholder:text-[#374151] focus:outline-none focus:border-[#d4a843]/50 font-mono"
                    />
                  )}
                  {action.type === 'tag_product' && (
                    <input
                      type="text"
                      value={(action as { tag: string }).tag}
                      onChange={(e) => updateAction(idx, { tag: e.target.value })}
                      placeholder="Tag name"
                      className="w-full bg-transparent border border-[#1f2d4e] rounded-lg px-3 py-2 text-xs text-white placeholder:text-[#374151] focus:outline-none focus:border-[#d4a843]/50"
                    />
                  )}
                  {action.type === 'update_status' && (
                    <select
                      value={(action as { status: string }).status}
                      onChange={(e) => updateAction(idx, { status: e.target.value })}
                      className="w-full bg-transparent border border-[#1f2d4e] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#d4a843]/50"
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="DRAFT">Draft</option>
                      <option value="ARCHIVED">Archived</option>
                    </select>
                  )}
                  {action.type === 'create_discount' && (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={(action as { code: string }).code}
                        onChange={(e) => updateAction(idx, { code: e.target.value })}
                        placeholder="Code"
                        className="flex-1 bg-transparent border border-[#1f2d4e] rounded-lg px-3 py-2 text-xs text-white placeholder:text-[#374151] focus:outline-none focus:border-[#d4a843]/50"
                      />
                      <input
                        type="number"
                        value={(action as { percentage: number }).percentage}
                        onChange={(e) => updateAction(idx, { percentage: Number(e.target.value) })}
                        placeholder="%"
                        className="w-20 bg-transparent border border-[#1f2d4e] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#d4a843]/50 font-mono"
                      />
                      <input
                        type="number"
                        value={(action as { duration_hours: number }).duration_hours}
                        onChange={(e) =>
                          updateAction(idx, { duration_hours: Number(e.target.value) })
                        }
                        placeholder="Hours"
                        className="w-20 bg-transparent border border-[#1f2d4e] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#d4a843]/50 font-mono"
                      />
                    </div>
                  )}
                  {action.type === 'adjust_price' && (
                    <input
                      type="number"
                      value={(action as { percentage: number }).percentage}
                      onChange={(e) => updateAction(idx, { percentage: Number(e.target.value) })}
                      placeholder="% (positive = increase, negative = decrease)"
                      className="w-full bg-transparent border border-[#1f2d4e] rounded-lg px-3 py-2 text-xs text-white placeholder:text-[#374151] focus:outline-none focus:border-[#d4a843]/50 font-mono"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#1f2d4e]">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-sm font-medium text-[#9ca3af] hover:text-white hover:bg-[#1f2d4e] transition-all"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(form)}
            disabled={saving || !form.name?.trim() || !(form.actions ?? []).length}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#d4a843] hover:bg-[#b8922e] disabled:bg-[#d4a843]/40 text-[#0a0f1e] font-semibold text-sm rounded-xl transition-all disabled:opacity-50"
          >
            {saving && (
              <span className="material-symbols-outlined text-base animate-spin">
                hourglass_empty
              </span>
            )}
            {isEdit ? 'Save Changes' : 'Create Rule'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function AutomationsPage() {
  const { toast } = useToast();

  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Modal state
  const [modalRule, setModalRule] = useState<Partial<AutomationRule> | null>(null);

  // ── Fetch ─────────────────────────────────────────────────────────────────

  const fetchRules = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/automations');
      const data = (await res.json()) as { rules?: AutomationRule[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Failed to load rules');
      setRules(data.rules ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load rules');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void fetchRules();
  }, [fetchRules]);

  // ── Toggle ────────────────────────────────────────────────────────────────

  async function handleToggle(id: string, enabled: boolean) {
    // Optimistic update
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, enabled } : r)));

    try {
      const res = await fetch(`/api/admin/automations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });
      if (!res.ok) throw new Error('Failed to toggle');
      toast.success(`Rule ${enabled ? 'enabled' : 'disabled'}`);
    } catch (err) {
      // Revert
      setRules((prev) => prev.map((r) => (r.id === id ? { ...r, enabled: !enabled } : r)));
      toast.error(err instanceof Error ? err.message : 'Toggle failed');
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  async function handleDelete(id: string) {
    const backup = rules;
    setRules((prev) => prev.filter((r) => r.id !== id));

    try {
      const res = await fetch(`/api/admin/automations/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success('Rule deleted');
    } catch (err) {
      setRules(backup);
      toast.error(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  // ── Save (create or update) ───────────────────────────────────────────────

  async function handleSave(rule: Partial<AutomationRule>) {
    setSaving(true);

    try {
      const isEdit = !!rule.id;
      const url = isEdit ? `/api/admin/automations/${rule.id}` : '/api/admin/automations';
      const method = isEdit ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rule),
      });

      const data = (await res.json()) as { rule?: AutomationRule; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Failed to save');

      if (isEdit) {
        setRules((prev) => prev.map((r) => (r.id === rule.id ? data.rule! : r)));
      } else {
        setRules((prev) => [data.rule!, ...prev]);
      }

      setModalRule(null);
      toast.success(isEdit ? 'Rule updated' : 'Rule created');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────

  const enabledCount = rules.filter((r) => r.enabled).length;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1
            className="text-2xl font-bold text-white"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Automations
          </h1>
          <p className="text-[#6b7280] text-sm mt-1">
            {loading
              ? 'Loading...'
              : `${rules.length} rule${rules.length !== 1 ? 's' : ''} \u00b7 ${enabledCount} active`}
          </p>
        </div>

        <button
          onClick={() => setModalRule(emptyRule())}
          className="flex items-center gap-2 bg-[#d4a843] hover:bg-[#b8922e] text-[#0a0f1e] font-semibold rounded-xl px-5 py-2.5 text-sm transition-all"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          New Rule
        </button>
      </div>

      {/* ── Stats summary ────────────────────────────────────────────── */}
      {!loading && rules.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Rules', value: rules.length, icon: 'electric_bolt', color: '#6b8cff' },
            { label: 'Active', value: enabledCount, icon: 'check_circle', color: '#10b981' },
            {
              label: 'Disabled',
              value: rules.length - enabledCount,
              icon: 'pause_circle',
              color: '#6b7280',
            },
            {
              label: 'Total Runs',
              value: rules.reduce((s, r) => s + r.runCount, 0),
              icon: 'replay',
              color: '#d4a843',
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-[#111827] border border-[#1f2d4e] rounded-xl px-4 py-3 flex items-center gap-3"
            >
              <span className="material-symbols-outlined text-xl" style={{ color: stat.color }}>
                {stat.icon}
              </span>
              <div>
                <p className="text-white text-lg font-bold leading-none">{stat.value}</p>
                <p className="text-[#6b7280] text-[10px] font-medium mt-0.5">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Rules list ────────────────────────────────────────────────── */}
      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonRule key={i} />)
        ) : rules.length === 0 ? (
          <div className="bg-[#111827] border border-[#1f2d4e] rounded-2xl flex flex-col items-center justify-center py-20 text-center px-6">
            <span className="material-symbols-outlined text-[#1f2d4e] text-5xl mb-4">
              electric_bolt
            </span>
            <p className="text-[#6b7280] text-sm font-medium">No automations yet</p>
            <p className="text-[#374151] text-xs mt-1 max-w-sm">
              Create your first automation rule to automate product tagging, notifications, pricing,
              and more.
            </p>
            <button
              onClick={() => setModalRule(emptyRule())}
              className="mt-4 flex items-center gap-2 bg-[#d4a843] hover:bg-[#b8922e] text-[#0a0f1e] font-semibold rounded-xl px-5 py-2.5 text-sm transition-all"
            >
              <span className="material-symbols-outlined text-lg">add</span>
              Create First Rule
            </button>
          </div>
        ) : (
          rules.map((rule) => (
            <RuleCard
              key={rule.id}
              rule={rule}
              onToggle={handleToggle}
              onDelete={handleDelete}
              onEdit={(r) => setModalRule(r)}
            />
          ))
        )}
      </div>

      {/* ── Modal ─────────────────────────────────────────────────────── */}
      {modalRule && (
        <RuleModal
          rule={modalRule}
          onSave={handleSave}
          onClose={() => setModalRule(null)}
          saving={saving}
        />
      )}
    </div>
  );
}
