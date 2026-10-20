import {getAIErrorInfo} from '../errors/index';
import type { ExecutionContext } from './execution';
import { jsonSnapshot } from '../internal/json-snapshot';
import { prepareActionToolInput } from './schema-input';
import type { ActionRegistry } from './registry';
import type {
  ActionToolBinding, ActionToolBridge, ActionToolBridgeOptions, ActionToolCall,
  ActionToolDescriptor, ActionToolErrorCode, ActionToolObject, ActionToolResult,
} from './tool-types';


const MESSAGES: Record<ActionToolErrorCode, string> = {
  CANCELLED: 'Execution was cancelled.',
  INVALID_CALL: 'A call requires a non-empty callId, a tool name and JSON object arguments.',
  NOT_EXPOSED: 'This tool is not exposed by this session.',
  NOT_AVAILABLE: 'The registered action or context is no longer available.',
  INVALID_INPUT: 'Tool arguments did not pass validation.',
  EXECUTION_FAILED: 'The tool could not complete.',
  INVALID_OUTPUT: 'The tool result could not be prepared for disclosure.',
  DUPLICATE_CALL: 'This callId has already been used in this session.',
  CALL_LIMIT: 'This session has reached its call limit.',
  CLOSED: 'This tool session is closed.',
};

/**
 * Creates an explicitly scoped, provider-neutral bridge to a screen registry.
 *
 * @remarks
 * Tool schemas are application-owned, synchronous JSON Schema draft-07 or 2020-12.
 * Schemas are compiled on construction using the existing Ajv adapter with coercion,
 * defaults and property removal disabled. The registered action validator still runs.
 * No schema, handler, permission or output type is inferred from a TypeScript type.
 * Only mapOutput results are returned; registry metadata, errors and causes stay local.
 * The bridge reads the current registration at call time and rejects results if that
 * action was replaced during execution. Context lifetime checks are owned by the registry.
 * Duplicate call IDs (including failed calls) are rejected for this bridge's lifetime.
 * This is local retry protection, not durable idempotency or server authorization.
 * JSON schemas, arguments and projected outputs must be plain finite JSON data, at most
 * 64 levels deep, 10000 nodes and 1000000 serialized characters per value.
 * Creating a bridge does not expose data externally or contact an AI service.
 *
 * @param registry - Application registry whose current registrations are checked at each call.
 * @param options - Explicit tool bindings and optional positive safe-integer maxCalls (default 1000).
 * @returns An in-memory bridge with list/execute/close; close suppresses future/in-flight results without undoing effects.
 * @throws Throws invalid/duplicate names, invalid call limits/bindings or schema/snapshot compilation errors.
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
export function createActionToolBridge(
  registry: ActionRegistry,
  options: ActionToolBridgeOptions,
): ActionToolBridge {
  const maxCalls = options.maxCalls ?? 1000;
  if (!Number.isSafeInteger(maxCalls) || maxCalls < 1) throw new Error('maxCalls must be a positive safe integer');
  const tools = new Map<string, {
    binding: ActionToolBinding;
    descriptor: ActionToolDescriptor;
    validate: ReturnType<typeof prepareActionToolInput>['parse'];
  }>();
  for (const original of options.tools) {
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(original.name) || tools.has(original.name)) {
      throw new Error('Tool names must be unique and contain 1-64 ASCII letters, digits, underscores or hyphens');
    }
    if (typeof original.description !== 'string' || !original.description.trim() || typeof original.mapOutput !== 'function') {
      throw new Error('Each tool requires a description and mapOutput');
    }
    const key = original.kind === 'action' ? original.actionId : original.kind === 'context' ? original.contextKey : undefined;
    if (typeof key !== 'string' || !key.trim()) throw new Error('Each tool requires an actionId or contextKey');
    if (original.kind === 'action' && original.mapInput !== undefined && typeof original.mapInput !== 'function') {
      throw new Error('mapInput must be a function');
    }
    const { inputSchema, parse: validate } = prepareActionToolInput(original.inputSchema);
    const descriptor = Object.freeze({ name: original.name, description: original.description, inputSchema });
    tools.set(original.name, { binding: Object.freeze({ ...original, inputSchema }), descriptor, validate });
  }
  const seen = new Set<string>();
  let closed = false;
  return {
    listTools() {
      if (closed) return Object.freeze([]);
      return Object.freeze([...tools.values()].filter(({ binding }) => binding.kind === 'action'
        ? registry.hasAction(binding.actionId) : registry.hasContext(binding.contextKey)).map(t => t.descriptor));
    },
    async execute(call: ActionToolCall, context?: ExecutionContext): Promise<ActionToolResult> {
      // The public type aids application code; envelopes from transports still need runtime checks.
      const callId = typeof call?.callId === 'string' ? call.callId : '';
      const name = typeof call?.name === 'string' ? call.name : '';
      const fail = (code: ActionToolErrorCode): ActionToolResult => { const {docsUrl,recovery}=getAIErrorInfo('tool',code)!; return Object.freeze({ callId, name, ok: false, code, error: MESSAGES[code], docsUrl, recovery }); };
      if (closed) return fail('CLOSED');
      if (!callId.trim() || callId.length > 256 || !name || name.length > 64) return fail('INVALID_CALL');
      if (seen.has(callId)) return fail('DUPLICATE_CALL');
      if (seen.size >= maxCalls) return fail('CALL_LIMIT');
      seen.add(callId);
      const tool = tools.get(name);
      if (!tool) return fail('NOT_EXPOSED');
      let args: ActionToolObject;
      try {
        const parsed = tool.validate(call.arguments);
        if (!parsed.ok) return fail('INVALID_INPUT');
        args = parsed.data;
      } catch { return fail('INVALID_INPUT'); }
      if (context?.signal.aborted) return fail('CANCELLED');
      const { binding } = tool;
      let output: unknown;
      if (binding.kind === 'action') {
        const definition = registry.getAction(binding.actionId);
        if (!definition) return fail('NOT_AVAILABLE');
        let input: unknown;
        try { input = binding.mapInput ? binding.mapInput(args) : args; }
        catch { return fail('INVALID_INPUT'); }
        if (closed) return fail('CLOSED');
        if (registry.getAction(binding.actionId) !== definition) return fail('NOT_AVAILABLE');
        const result = await registry.executeAction(binding.actionId, input, context);
        if (closed) return fail('CLOSED');
        if (registry.getAction(binding.actionId) !== definition) return fail('NOT_AVAILABLE');
        if (!result.ok) return fail(result.code === 'CANCELLED' ? 'CANCELLED' : result.code === 'INVALID_INPUT' ? 'INVALID_INPUT' : result.code === 'NOT_FOUND' ? 'NOT_AVAILABLE' : 'EXECUTION_FAILED');
        output = result.data;
      } else {
        const result = await registry.getContext(binding.contextKey);
        if (closed) return fail('CLOSED');
        if (!result.ok) return fail(result.code === 'GETTER_FAILED' ? 'EXECUTION_FAILED' : 'NOT_AVAILABLE');
        output = result.value;
      }
      try {
        const data = jsonSnapshot(binding.mapOutput(output));
        if (closed) return fail('CLOSED');
        return Object.freeze({ callId, name, ok: true, data });
      } catch { return fail('INVALID_OUTPUT'); }
    },
    close() { closed = true; seen.clear(); },
  };
}
