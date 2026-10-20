import { prepareActionToolInput } from './schema-input';
import type { ActionDefinition, ActionValidationResult } from './types';
import type { ActionToolBinding, ActionToolDescriptor, ActionToolObject } from './tool-types';

/**
 * One explicit source for a typed action and its opt-in tool binding.
 *
 * @typeParam TInput - Validated action input shape; unknown where a default is provided.
 * @typeParam TOutput - Action handler result shape; unknown where a default is provided.
 * @see {@link defineActionTool} for canonical public-import usage and setup.
 */
export interface ActionToolDefinition<TInput, TOutput> extends ActionToolDescriptor {

  /** Nonempty identifier used to correlate this object with its owning application/session. */
  readonly id: string;

  /**
   * Runs after schema validation; establish TInput using runtime checks or a synchronous parser.
   *
   * @param input - Schema-validated immutable JSON object.
   * @returns A synchronous typed input result; parser failure or exception becomes a fixed input error.
   *
   * @example
   * ```typescript
   * import type { ActionToolDefinition } from '@alneas/appkit-core/ai/action';
   *
   * export function parse(definition: ActionToolDefinition<string, string>) {
   *   return definition.parseInput({ text: 'hello' });
   * }
   * ```
   */
  readonly parseInput: (input: ActionToolObject) => ActionValidationResult<TInput>;

  /**
   * Runs the explicitly supplied typed action implementation.
   *
   * @param input - Typed input established by the schema and parser.
   * @param context - Optional cooperative cancellation/progress context.
   * @returns The local action output directly or by promise.
   *
   * @example
   * ```typescript
   * import type { ActionToolDefinition } from '@alneas/appkit-core/ai/action';
   *
   * export async function run(definition: ActionToolDefinition<string, string>) {
   *   return definition.handler('hello');
   * }
   * ```
   */
  readonly handler: ActionDefinition<TInput, TOutput>['handler'];

  /**
   * Output remains unknown: a registry can replace the action under the same ID. Validate and project it.
   *
   * @param value - Unknown current action result; the registry ID may have been replaced, so validate before disclosure.
   * @returns Explicitly selected data; bridge JSON snapshot validation rejects invalid outputs.
   *
   * @example
   * ```typescript
   * import type { ActionToolDefinition } from '@alneas/appkit-core/ai/action';
   *
   * export function project(definition: ActionToolDefinition<string, string>, value: unknown) {
   *   return definition.mapOutput(value);
   * }
   * ```
   */
  readonly mapOutput: (value: unknown) => unknown;
}
/**
 * Register action explicitly and pass tool explicitly to a bridge or ScreenActionPanel.
 *
 * @typeParam TInput - Validated action input shape; unknown where a default is provided.
 * @typeParam TOutput - Action handler result shape; unknown where a default is provided.
 * @see {@link defineActionTool} for canonical public-import usage and setup.
 */
export interface DefinedActionTool<TInput, TOutput> {

  /** Typed action definition to register explicitly before local execution. */
  readonly action: ActionDefinition<TInput, TOutput>;

  /** Explicit tool binding to pass to a bridge; creating it does not expose or register the action. */
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
 * @typeParam TInput - Shape produced by the synchronous typed parser after JSON Schema validation.
 * @typeParam TOutput - Shape returned by the action handler; mapOutput still receives unknown.
 * @param definition - Explicit identifiers/schema/parser/handler and disclosure projection.
 * @returns Frozen action definition and explicit action binding; neither is registered automatically.
 * @throws Throws invalid identifiers, missing parser/handler/projection or schema/snapshot compilation failures.
 *
 * @example
 * ```typescript
 * import { ActionRegistry, defineActionTool, createActionToolBridge } from '@alneas/appkit-core/ai/action';
 *
 * const registry = new ActionRegistry();
 * const echo = defineActionTool<{ text: string }, { text: string }>({
 *   id: 'echo', name: 'echo_text', description: 'Return the supplied text',
 *   inputSchema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'], additionalProperties: false },
 *   parseInput: input => typeof input.text === 'string'
 *     ? { ok: true, data: { text: input.text } } : { ok: false, error: 'Text required' },
 *   handler: input => ({ text: input.text }),
 *   mapOutput: value => value,
 * });
 * const unregister = registry.registerAction(echo.action);
 * const bridge = createActionToolBridge(registry, { tools: [echo.tool] });
 * try {
 *   console.log(await bridge.execute({ callId: 'call-1', name: 'echo_text', arguments: { text: 'hello' } }));
 * } finally {
 *   bridge.close();
 *   unregister();
 * }
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
