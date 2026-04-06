/**
 * Orchestrator — Multi-Agent Routing
 *
 * Fast keyword-based routing. No LLM call needed.
 * Scores each specialist agent against the user message and picks the highest.
 * Falls back to 'catalog' when tied or no match found.
 */

import type { AgentId } from './types';
import { agentList, getAgent } from './registry';

// ─── Types ──────────────────────────────────────────────────────────────────────

export type RoutingDecision = {
  agentId: AgentId;
  confidence: number; // 0–1
  reasoning: string;
};

// ─── Scoring ────────────────────────────────────────────────────────────────────

/**
 * Tokenize and normalize a message for matching.
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Score an agent against the user message.
 * Returns a raw score (not normalized — compare relative scores).
 */
function scoreAgent(
  messageTokens: string[],
  messageLower: string,
  agent: { description: string; examples: string[] },
): number {
  let score = 0;

  // 1. Direct phrase match in examples (highest weight)
  for (const example of agent.examples) {
    const exampleLower = example.toLowerCase();
    if (messageLower.includes(exampleLower)) {
      // Longer phrases are more specific — reward them more
      score += 3 + exampleLower.split(' ').length;
    }
  }

  // 2. Token-level match against example words (medium weight)
  const exampleWords = new Set(agent.examples.flatMap((ex) => tokenize(ex)));
  for (const token of messageTokens) {
    if (exampleWords.has(token)) {
      score += 1;
    }
  }

  // 3. Description keyword match (low weight — broad signal)
  const descWords = new Set(tokenize(agent.description));
  for (const token of messageTokens) {
    if (descWords.has(token)) {
      score += 0.5;
    }
  }

  return score;
}

// ─── Routing ────────────────────────────────────────────────────────────────────

/**
 * Fast keyword-based routing. Instant, no LLM call.
 * Returns null only if the message is completely empty.
 */
export function routeByKeywords(message: string): RoutingDecision | null {
  const trimmed = message.trim();
  if (!trimmed) return null;

  const messageLower = trimmed.toLowerCase();
  const messageTokens = tokenize(trimmed);

  // Score every specialist agent
  const scores: Array<{ agentId: AgentId; score: number }> = agentList
    .filter((a) => a.id !== 'orchestrator')
    .map((agent) => ({
      agentId: agent.id as AgentId,
      score: scoreAgent(messageTokens, messageLower, agent),
    }));

  // Sort descending
  scores.sort((a, b) => b.score - a.score);

  const best = scores[0];
  const second = scores[1];

  if (!best || best.score === 0) {
    // No match — default to catalog
    return {
      agentId: 'catalog',
      confidence: 0.3,
      reasoning: 'No keyword match found — defaulting to catalog agent.',
    };
  }

  // Confidence: ratio of top score vs total (normalized heuristic)
  const totalScore = scores.reduce((sum, s) => sum + s.score, 0);
  const rawConfidence = totalScore > 0 ? best.score / totalScore : 0;

  // If top two are very close (within 10% of each other), lower confidence
  const isTied = second && second.score > 0 && (best.score - second.score) / best.score < 0.1;

  const confidence = isTied
    ? Math.max(0.3, rawConfidence * 0.75)
    : Math.min(0.99, rawConfidence * 1.5); // boost clear winners

  const agentName = getAgent(best.agentId)?.name ?? best.agentId;

  return {
    agentId: best.agentId,
    confidence: Math.round(confidence * 100) / 100,
    reasoning: isTied
      ? `Tied between ${agentName} and ${getAgent(second.agentId)?.name ?? second.agentId} — picked ${agentName} by score (${best.score.toFixed(1)} vs ${second.score.toFixed(1)}).`
      : `Matched ${agentName} with score ${best.score.toFixed(1)} (confidence ${Math.round(confidence * 100)}%).`,
  };
}

/**
 * Main routing function. Always returns a decision.
 * Defaults to 'catalog' if routing fails for any reason.
 */
export function routeMessage(message: string): RoutingDecision {
  try {
    const decision = routeByKeywords(message);
    if (decision) return decision;
  } catch (err) {
    console.warn('[orchestrator] routing error, falling back to catalog:', err);
  }

  return {
    agentId: 'catalog',
    confidence: 0.3,
    reasoning: 'Fallback to catalog agent (routing failed or empty message).',
  };
}
