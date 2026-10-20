/**
 * JSONL completion event shape inspected for agent_message text.
 *
 * @see {@link extractAgentMessageText} for canonical public-import usage and setup.
 */

export interface AgentMessageEvent {

  /** Discriminant selecting the item.completed variant. */
  readonly type: 'item.completed';

  /** Optional completed event payload; only agent_message items with string text are extracted. */
  readonly item?: {

    /** Discriminant selecting the named component/record variant. */
    readonly type?: string;

    /** Text payload preserved without interpreting it as executable code. */
    readonly text?: unknown;
  };
}

/**
 * Extracts completed agent-message strings from tolerant JSONL output.
 *
 * @param output - Full line-delimited event/log text; non-JSON and irrelevant lines are ignored.
 * @returns Completed agent messages joined with blank lines, or the original output if none has nonempty text.
 *
 * @example
 * ```typescript
 * import { extractAgentMessageText } from '@alneas/appkit-core/ai';
 *
 * console.log(extractAgentMessageText(JSON.stringify({ type: 'item.completed', item: { type: 'agent_message', text: 'hello' } })));
 * ```
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
