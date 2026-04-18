'use client';

/**
 * ActionLog — Timeline of tool executions extracted from chat messages
 *
 * Extracts tool-invocation parts from useChat UIMessage objects
 * and renders a timeline with timestamp, agent, tool name, args, result.
 */

import { useState } from 'react';
import type { UIMessage } from 'ai';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface AgentInfo {
  name: string;
  icon: string;
  color: string;
}

interface ActionEntry {
  id: string;
  timestamp: Date;
  agentKey: string | null;
  toolName: string;
  args: Record<string, unknown>;
  output: unknown;
  state: string; // 'output-available' | 'result' | 'call' | etc.
}

interface ActionLogProps {
  messages: UIMessage[];
  agentInfo: Record<string, AgentInfo>;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(date: Date): string {
  return date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

/**
 * Summarises the output into a short human-readable string.
 * Falls back to JSON snippet if necessary.
 */
function summarizeOutput(output: unknown): string {
  if (output === null || output === undefined) return '—';
  if (typeof output === 'string') return output.slice(0, 80);
  if (typeof output === 'boolean') return output ? 'Success' : 'Failed';
  if (typeof output === 'number') return String(output);

  if (typeof output === 'object') {
    const obj = output as Record<string, unknown>;
    // Common patterns: { success, count, total, message, error }
    if ('error' in obj) return `Error: ${String(obj.error).slice(0, 60)}`;
    if ('message' in obj) return String(obj.message).slice(0, 80);
    if ('count' in obj) return `${obj.count} result${Number(obj.count) !== 1 ? 's' : ''}`;
    if ('total' in obj) return `${obj.total} total`;
    if ('success' in obj) return obj.success ? 'Success' : 'Failed';
    if (Array.isArray(output))
      return `${(output as unknown[]).length} item${(output as unknown[]).length !== 1 ? 's' : ''}`;
  }

  try {
    const json = JSON.stringify(output);
    return json.slice(0, 80) + (json.length > 80 ? '…' : '');
  } catch {
    return 'Result';
  }
}

/**
 * Format a single arg value to string, truncating long values.
 */
function formatArgValue(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'string') return `"${value.slice(0, 40)}${value.length > 40 ? '…' : ''}"`;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return `[${value.length} items]`;
  if (typeof value === 'object') return '{…}';
  return String(value);
}

/**
 * Format args object as a compact function call: name(arg1, arg2)
 * Shows up to 2 args inline; rest hidden.
 */
function formatCallSignature(toolName: string, args: Record<string, unknown>): string {
  const entries = Object.entries(args);
  if (entries.length === 0) return `${toolName}()`;
  const shown = entries.slice(0, 2).map(([, v]) => formatArgValue(v));
  const extra = entries.length > 2 ? `, +${entries.length - 2}` : '';
  return `${toolName}(${shown.join(', ')}${extra})`;
}

/**
 * Extract ActionEntry[] from UIMessage[].
 * Tool calls are embedded in message.parts as 'tool-invocation' parts.
 */
function extractActions(messages: UIMessage[]): ActionEntry[] {
  const entries: ActionEntry[] = [];

  for (const msg of messages) {
    if (msg.role !== 'assistant') continue;
    // UIMessage doesn't expose createdAt — use current time as best-effort timestamp
    const msgTime = new Date();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const part of (msg.parts as any[]) ?? []) {
      const partType = part.type as string;
      if (!partType?.startsWith('tool-') && partType !== 'tool-invocation') continue;

      const toolName: string = part.toolName ?? part.type?.replace('tool-', '') ?? 'unknown';
      const toolCallId: string = part.toolCallId ?? `${toolName}-${entries.length}`;
      const state: string = part.state ?? 'unknown';
      const args: Record<string, unknown> = part.input ?? part.args ?? {};
      const output: unknown = part.output ?? part.result ?? null;

      entries.push({
        id: toolCallId,
        timestamp: msgTime,
        agentKey: null, // Could be parsed from toolName prefix in future
        toolName,
        args,
        output,
        state,
      });
    }
  }

  // Most recent first
  return entries.reverse();
}

// ─── Action Entry Card ──────────────────────────────────────────────────────────

function ActionCard({
  entry,
  agentInfo,
}: {
  entry: ActionEntry;
  agentInfo: Record<string, AgentInfo>;
}) {
  const [expanded, setExpanded] = useState(false);

  const isDone = entry.state === 'output-available' || entry.state === 'result';
  const isError =
    isDone &&
    entry.output !== null &&
    typeof entry.output === 'object' &&
    'error' in (entry.output as Record<string, unknown>);
  const isPending = !isDone;

  // Try to infer agent from toolName prefix (e.g. "catalog_search" → catalog)
  const agentKey =
    entry.agentKey ??
    Object.keys(agentInfo).find((k) => entry.toolName.toLowerCase().startsWith(k)) ??
    null;
  const agent = agentKey ? agentInfo[agentKey] : null;

  const statusIcon = isPending ? 'hourglass_empty' : isError ? 'error' : 'check_circle';
  const statusColor = isPending
    ? '#9ca3af'
    : isError
      ? 'var(--admin-error)'
      : 'var(--admin-success)';

  return (
    <div className="relative pl-6">
      {/* Timeline dot */}
      <span
        className="absolute left-0 top-2.5 w-2.5 h-2.5 rounded-full border-2 border-[var(--admin-bg)]"
        style={{ backgroundColor: agent?.color ?? '#374151' }}
      />

      <div className="bg-[var(--admin-bg-card)] border border-[var(--admin-border)] rounded-lg overflow-hidden">
        {/* Header row */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center gap-2 px-2.5 py-2 text-left hover:bg-white/5 transition-colors"
        >
          {/* Status icon */}
          <span
            className={`material-symbols-outlined text-sm flex-none ${isPending ? 'animate-pulse' : ''}`}
            style={{ color: statusColor }}
          >
            {statusIcon}
          </span>

          {/* Tool call */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              {agent && (
                <span
                  className="flex items-center gap-0.5 text-[9px] font-medium px-1 py-0.5 rounded"
                  style={{ color: agent.color, backgroundColor: `${agent.color}18` }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '10px' }}>
                    {agent.icon}
                  </span>
                  {agent.name}
                </span>
              )}
              <code className="text-[11px] text-[var(--admin-brand)] font-mono truncate">
                {formatCallSignature(entry.toolName, entry.args)}
              </code>
            </div>
            {isDone && (
              <p className="text-[10px] text-[var(--admin-text-muted)] mt-0.5 truncate">
                → {summarizeOutput(entry.output)}
              </p>
            )}
          </div>

          {/* Timestamp + expand */}
          <div className="flex items-center gap-1 flex-none">
            <time className="text-[9px] text-[var(--admin-text-disabled)]">
              {formatTime(entry.timestamp)}
            </time>
            <span className="material-symbols-outlined text-[var(--admin-text-disabled)] text-xs">
              {expanded ? 'expand_less' : 'expand_more'}
            </span>
          </div>
        </button>

        {/* Expanded detail */}
        {expanded && (
          <div className="border-t border-[var(--admin-border)] px-2.5 py-2 space-y-2">
            {Object.keys(entry.args).length > 0 && (
              <div>
                <p className="text-[9px] text-[var(--admin-text-disabled)] uppercase tracking-wider mb-1">
                  Args
                </p>
                <pre className="text-[9px] text-[var(--admin-text-secondary)] font-mono whitespace-pre-wrap break-all leading-relaxed max-h-24 overflow-y-auto">
                  {JSON.stringify(entry.args, null, 2)}
                </pre>
              </div>
            )}
            {isDone && entry.output !== null && (
              <div>
                <p className="text-[9px] text-[var(--admin-text-disabled)] uppercase tracking-wider mb-1">
                  Output
                </p>
                <pre
                  className="text-[9px] font-mono whitespace-pre-wrap break-all leading-relaxed max-h-32 overflow-y-auto"
                  style={{ color: isError ? '#f87171' : '#9ca3af' }}
                >
                  {JSON.stringify(entry.output, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── ActionLog ──────────────────────────────────────────────────────────────────

export default function ActionLog({ messages, agentInfo }: ActionLogProps) {
  const actions = extractActions(messages);

  if (actions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-4 text-center gap-3">
        <span className="material-symbols-outlined text-[var(--admin-text-disabled)] text-3xl">
          terminal
        </span>
        <p className="text-[var(--admin-text-muted)] text-xs">No actions yet</p>
        <p className="text-[var(--admin-text-disabled)] text-[10px] leading-relaxed">
          Tool calls will appear here as the AI executes tasks.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--admin-border)] bg-[var(--admin-bg-sidebar)] flex-none">
        <span className="text-[var(--admin-text-secondary)] text-xs">
          {actions.length} action{actions.length !== 1 ? 's' : ''}
        </span>
        <span className="text-[var(--admin-text-disabled)] text-[10px]">Most recent first</span>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {/* Vertical line */}
        <div className="relative space-y-3 before:absolute before:left-1 before:top-3 before:bottom-3 before:w-px before:bg-[var(--admin-border)]">
          {actions.map((entry) => (
            <ActionCard key={entry.id} entry={entry} agentInfo={agentInfo} />
          ))}
        </div>
      </div>
    </div>
  );
}
