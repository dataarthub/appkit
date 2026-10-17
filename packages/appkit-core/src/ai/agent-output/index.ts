/**
 * Utilities for consuming line-delimited agent event output.
 *
 * The parser is deliberately tolerant of non-JSON lines and returns the
 * original output when no completed agent message can be recovered.
 */

export interface AgentMessageEvent {
  readonly type: 'item.completed';
  readonly item?: {
    readonly type?: string;
    readonly text?: unknown;
  };
}

/**
 * Extracts completed agent-message text from JSONL output.
 *
 * This matches the event shape emitted by the airevenue Codex runner while
 * remaining provider-neutral at the package boundary.
 */
export function extractAgentMessageText(output: string): string {
  const messages: string[] = [];
  for (const line of output.split('\n')) {
    try {
      const event: unknown = JSON.parse(line);
      if (!event || typeof event !== 'object' || Array.isArray(event)) continue;
      const item = (event as AgentMessageEvent).item;
      if (
        (event as AgentMessageEvent).type === 'item.completed' &&
        item?.type === 'agent_message' &&
        typeof item.text === 'string'
      ) {
        messages.push(item.text);
      }
    } catch {
      // Agent logs may contain progress text or partial lines. Ignore them.
    }
  }
  return messages.join('\n\n') || output;
}
