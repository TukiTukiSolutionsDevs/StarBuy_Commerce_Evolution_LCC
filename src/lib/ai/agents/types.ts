/**
 * Agent Types — Multi-Agent System
 *
 * Defines the contracts for the agent registry and orchestrator.
 */

export type AgentId =
  | 'orchestrator'
  | 'catalog'
  | 'orders'
  | 'customers'
  | 'pricing'
  | 'analytics'
  | 'operations'
  | 'shopify'
  | 'autods';

export type AgentDefinition = {
  id: AgentId;
  name: string;
  description: string;
  systemPrompt: string;
  toolNames: string[];
  examples: string[];
  icon: string;
  color: string;
};
