/**
 * Automations — barrel export
 */

export type { AutomationRule, RuleTrigger, RuleCondition, RuleAction } from './types';
export { saveRule, getRule, listRules, deleteRule, toggleRule, updateRuleStats } from './store';
export { evaluateConditions, executeActions, processRules } from './engine';
export { getPrebuiltRules } from './prebuilt';
