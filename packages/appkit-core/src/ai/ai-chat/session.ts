import type { AIChatAdapter, AIChatEvent, AIChatRequest } from './types';
import { snapshotRequest } from './stream';
import { normalizeAIChatEvent } from './conversation';

export interface AIChatStreamOptions {
  /** Sum of serialized normalized event characters, not bytes. Default 1,000,000; maximum 10,000,000. */
  maxResponseChars?: number;
}
/**
 * Shared send lifecycle for HTTP, custom and SDK consumers. Snapshots the request
 * before returning, starts lazily on demand, requires finish followed by EOF,
 * rejects events after finish, and forwards abort to the adapter even during a read.
 * Cancellation settles promptly; an adapter must honor its signal to release I/O.
 * Iterator cleanup is requested, but never awaited behind an uncooperative next().
 * No storage, retry, resumption, tool execution or browser/SDK dependency.
 */
export function createAIChatStream(adapter: AIChatAdapter, request: AIChatRequest, options: AIChatStreamOptions = {}): ReadableStream<AIChatEvent> {
  const snapshot = snapshotRequest(request);
  const parentSignal = snapshot.signal;
  const max = options.maxResponseChars ?? 1_000_000;
  if (!Number.isInteger(max) || max < 1 || max > 10_000_000) throw new Error('Invalid AI stream limit');
  const abortController = new AbortController();
  let iterator: AsyncIterator<AIChatEvent> | undefined;
  let output: ReadableStreamDefaultController<AIChatEvent>;
  let closed = false, finished = false, total = 0, returned = false;
  const cleanup = () => parentSignal?.removeEventListener('abort', abort);
  const returnIterator = () => {
    if (returned || !iterator) return;
    returned = true;
    try { void Promise.resolve(iterator.return?.()).catch(() => {}); } catch { /* Preserve the triggering failure. */ }
  };
  const abort = () => {
    if (closed) return;
    closed = true;
    const reason = parentSignal?.reason ?? new DOMException('AI stream aborted', 'AbortError');
    abortController.abort(reason); cleanup(); returnIterator(); output.error(reason);
  };
  return new ReadableStream<AIChatEvent>({
    start(controller) {
      output = controller;
      parentSignal?.addEventListener('abort', abort, { once: true });
      if (parentSignal?.aborted) abort();
    },
    async pull(controller) {
      if (closed) return;
      try {
        iterator ??= adapter.stream({ ...snapshot, signal: abortController.signal })[Symbol.asyncIterator]();
        if (closed) { returnIterator(); return; }
        const next = await iterator.next();
        if (closed) return;
        if (next.done) {
          if (!finished) throw new Error('AI stream ended before finish');
          closed = true; cleanup(); controller.close(); return;
        }
        if (finished) throw new Error('AI event after finish');
        const event = normalizeAIChatEvent(next.value);
        total += JSON.stringify(event).length;
        if (total > max) throw new Error('AI response exceeds the configured limit');
        if (event.type === 'finish') finished = true;
        controller.enqueue(event);
      } catch (error) {
        if (closed) return;
        closed = true; abortController.abort(error); cleanup(); returnIterator(); controller.error(error);
      }
    },
    cancel(reason) {
      if (closed) return;
      closed = true; abortController.abort(reason); cleanup(); returnIterator();
    },
  }, { highWaterMark: 0 });
}
/** Async-iterable form; snapshots on first iteration and cleans its reader on early return. */
export async function* streamAIChat(adapter: AIChatAdapter, request: AIChatRequest, options?: AIChatStreamOptions): AsyncGenerator<AIChatEvent> {
  const reader = createAIChatStream(adapter, request, options).getReader();
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) return;
      yield next.value;
    }
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
}
