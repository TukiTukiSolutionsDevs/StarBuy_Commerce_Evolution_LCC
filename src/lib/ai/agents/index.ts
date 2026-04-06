/**
 * Multi-Agent System — Barrel Export
 */

export type { AgentId, AgentDefinition } from './types';
export type { RoutingDecision } from './orchestrator';

export { agentRegistry, agentList, getAgent } from './registry';
export { routeByKeywords, routeMessage } from './orchestrator';
export { getAgentTools } from './tool-filter';
