import { AIChatError } from '../errors/index';
import { jsonSnapshot } from '../internal/json-snapshot';
import type { AIChatEvent, AIChatMessage, AIChatPart } from './types';

type ObjectValue = Record<string, unknown>;
function object(value: unknown): value is ObjectValue { return value !== null && typeof value === 'object' && !Array.isArray(value); }
function string(value: unknown, nonempty = false): value is string { return typeof value === 'string' && (!nonempty || value.length > 0); }
function part(value: unknown): value is AIChatPart {
  if (!object(value)) return false;
  switch (value.type) {
    case 'text': return string(value.text);
    case 'file': return string(value.url, true) && string(value.mediaType, true) && (value.filename === undefined || string(value.filename));
    case 'tool-call': return string(value.callId, true) && string(value.name, true) && object(value.input);
    case 'tool-result': return string(value.callId, true) && string(value.name, true) && Object.hasOwn(value, 'output') && (value.isError === undefined || typeof value.isError === 'boolean');
    case 'data': return string(value.name, true) && Object.hasOwn(value, 'data') && (value.id === undefined || string(value.id));
    default: return false;
  }
}
/**
 * Validate and detach provider-neutral history, without an SDK or browser state.
 * Preserves order, IDs, roles, parts and metadata; never invents a role or executes tools.
 * Nested values are recursively frozen JSON, bounded at depth 64, 10,000 values and
 * 1,000,000 serialized UTF-16 code units for the entire history. No trimming/truncation.
 * The returned outer array is new; message/part snapshots remain immutable.
 *
 * @param messages - Already-parsed provider-neutral history with explicit roles/parts/IDs.
 * @returns A new outer array containing detached recursively frozen message/part JSON snapshots.
 * @throws Throws malformed message/part shapes, non-JSON values or snapshot size/depth/node limits.
 *
 * @example
 * ```typescript
 * import { normalizeAIChatMessages } from '@alneas/appkit-core/ai';
 *
 * console.log(normalizeAIChatMessages([{ id: 'message-1', role: 'user', parts: [{ type: 'text', text: 'hello' }] }]));
 * ```
 */
export function normalizeAIChatMessages(messages: readonly AIChatMessage[]): AIChatMessage[] {
  const snapshot = jsonSnapshot(messages);
  if (!Array.isArray(snapshot)) throw new AIChatError('AI_INVALID_STREAM', 'AI history must be an array');
  return snapshot.map(value => {
    if (!object(value) || !string(value.id, true) || (typeof value.role !== 'string' || !['system', 'user', 'assistant', 'tool'].includes(value.role)) || !Array.isArray(value.parts) || !value.parts.every(part)) throw new AIChatError('AI_INVALID_STREAM', 'Invalid AI conversation message');
    if (value.role === 'tool' && value.parts.some(item => item.type !== 'tool-result')) throw new AIChatError('AI_INVALID_STREAM', 'Tool messages may only contain tool results');
    return value as unknown as AIChatMessage;
  });
}
/**
 * Validates and snapshots an adapter event; it performs no tool authorization or execution.
 *
 * @param event - Already-assembled provider-neutral event to validate and detach.
 * @returns A recursively frozen JSON event snapshot without executing any tool.
 * @throws Throws unsupported event shapes, non-JSON values or snapshot size/depth/node limits.
 *
 * @example
 * ```typescript
 * import { normalizeAIChatEvent } from '@alneas/appkit-core/ai';
 *
 * console.log(normalizeAIChatEvent({ type: 'text-delta', text: 'hello' }));
 * ```
 */
export function normalizeAIChatEvent(event: AIChatEvent): AIChatEvent {
  const value = jsonSnapshot(event);
  if (!object(value)) throw new AIChatError('AI_INVALID_STREAM', 'Invalid AI stream event');
  if (value.type === 'text-delta' && string(value.text)) return value as unknown as AIChatEvent;
  if (value.type === 'metadata' && Object.hasOwn(value, 'metadata')) return value as unknown as AIChatEvent;
  if (value.type === 'finish' && typeof value.reason === 'string' && ['stop', 'tool-calls', 'length', 'content-filter', 'other'].includes(value.reason)) return value as unknown as AIChatEvent;
  if (['tool-call', 'tool-result', 'data'].includes(String(value.type)) && part(value)) return value as unknown as AIChatEvent;
  throw new AIChatError('AI_INVALID_STREAM', 'Invalid AI stream event');
}
