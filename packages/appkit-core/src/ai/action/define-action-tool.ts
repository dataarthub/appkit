import { prepareActionToolInput } from './schema-input';
import type { ActionDefinition, ActionValidationResult } from './types';
import type { ActionToolBinding, ActionToolDescriptor, ActionToolObject } from './tool-types';

/** One explicit source for a typed action and its opt-in tool binding. */
export interface ActionToolDefinition<TInput, TOutput> extends ActionToolDescriptor {
  readonly id: string;
  /** Runs after schema validation; establish TInput using runtime checks or a synchronous parser. */
  readonly parseInput: (input: ActionToolObject) => ActionValidationResult<TInput>;
  readonly handler: ActionDefinition<TInput, TOutput>['handler'];
  /** Output remains unknown: a registry can replace the action under the same ID. Validate and project it. */
  readonly mapOutput: (value: unknown) => unknown;
}
/** Register action explicitly and pass tool explicitly to a bridge or ScreenActionPanel. */
export interface DefinedActionTool<TInput, TOutput> {
  readonly action: ActionDefinition<TInput, TOutput>;
  readonly tool: Extract<ActionToolBinding, { kind: 'action' }>;
}

/**
 * Defines a typed Action and Tool using one input schema and parser.
 *
 * @remarks
 * This does not register or expose anything. Schema validation also runs for direct
 * registry.executeAction calls, before the mandatory typed parser. No TypeScript type
 * is asserted from JSON Schema alone. Schemas use the bridge's synchronous draft-07 /
 * 2020-12 support and bounded immutable JSON snapshots; no coercion/default insertion.
 * Parser failures and exceptions become a fixed input error. A parser may refine or
 * transform validated data; it must be synchronous. mapOutput still validates unknown
 * output because registry IDs are replaceable. Provider schemas/transport remain host-owned.
 *
 * @example
 * ```ts
 * import { defineActionTool } from "./";
 * const search = defineActionTool<{ query: string }, { query: string }>({
 *   id: 'table.search', name: 'search_table', description: 'Search rows',
 *   inputSchema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'], additionalProperties: false },
 *   parseInput: input => typeof input.query === 'string'
 *     ? { ok: true, data: { query: input.query.trim() } } : { ok: false, error: 'Invalid query' },
 *   handler: input => ({ query: input.query }),
 *   mapOutput: value => value,
 * });
 * registry.registerAction(search.action);
 * // createActionToolBridge(registry, { tools: [search.tool] })
 * ```
 */
export function defineActionTool<TInput, TOutput>(definition: ActionToolDefinition<TInput, TOutput>): DefinedActionTool<TInput, TOutput> {
  const { id, name, description, parseInput, handler, mapOutput } = definition;
  if (!id?.trim() || !/^[A-Za-z0-9_-]{1,64}$/.test(name) || !description?.trim() || typeof parseInput !== 'function' || typeof handler !== 'function' || typeof mapOutput !== 'function') throw new Error('An action tool requires valid identifiers, description, parser, handler and projection');
  const { inputSchema, parse } = prepareActionToolInput(definition.inputSchema);
  const action: ActionDefinition<TInput, TOutput> = Object.freeze({
    id, description, handler,
    validate(input: unknown): ActionValidationResult<TInput> {
      const checked = parse(input);
      if (checked.ok) {
        try { const parsed = parseInput(checked.data); if (parsed?.ok === true) return { ok: true, data: parsed.data }; } catch { /* Never disclose parser errors through the action. */ }
      }
      return { ok: false, error: 'Input did not pass action validation.' };
    },
  });
  return Object.freeze({ action, tool: Object.freeze({ kind: 'action' as const, actionId: id, name, description, inputSchema, mapOutput }) });
}
