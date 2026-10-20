import type { RequestHandler } from 'msw';

export type HandlerCollection = RequestHandler[] | Record<string, RequestHandler | RequestHandler[]>;
export type HandlerConfiguration = HandlerCollection | (() => HandlerCollection) | undefined;

/** Resolve per-selection factories before installing handlers, to isolate scenario state. */
export function resolveHandlers(configuration: HandlerConfiguration): RequestHandler[] {
  const configured = typeof configuration === 'function' ? configuration() : configuration;
  return !configured ? [] : Array.isArray(configured) ? configured : Object.values(configured).flat();
}
