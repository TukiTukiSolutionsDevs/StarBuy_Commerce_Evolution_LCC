/**
 * Tool Filter — Multi-Agent System
 *
 * Returns the filtered tool subset for a specific agent.
 * Uses the named tool map from tools.ts.
 */

import type { AgentId } from './types';
import { getAgent } from './registry';
import { adminToolsMap } from '@/lib/ai/tools';

/**
 * Returns a filtered Record of tools for the given agent.
 * If the agentId is unknown or has no tools, returns the full tool set.
 */
export function getAgentTools(agentId: AgentId): Record<string, unknown> {
  const agent = getAgent(agentId);

  if (!agent || agent.toolNames.length === 0) {
    console.warn(`[tool-filter] Unknown agent "${agentId}" — returning full tool set.`);
    return adminToolsMap as Record<string, unknown>;
  }

  const filtered: Record<string, unknown> = {};

  for (const toolName of agent.toolNames) {
    const t = adminToolsMap[toolName];
    if (t) {
      filtered[toolName] = t;
    } else {
      console.warn(
        `[tool-filter] Tool "${toolName}" not found in adminToolsMap for agent "${agentId}".`,
      );
    }
  }

  return filtered;
}
