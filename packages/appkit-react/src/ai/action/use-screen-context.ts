import { useLayoutEffect, useRef } from 'react';
import type { ContextGetter } from "@alneas/appkit-core/ai";
import { useScreenActionRegistry } from './context';
import type { UseScreenContextOptions } from './types';

/**
 * Registers an on-demand context getter using positional arguments.
 *
 * @typeParam T - Context getter result shape; defaults to unknown.
 *
 * @param key - Stable registry key.
 *
 * @param getter - Pure host getter invoked by registry context reads, using its latest committed version.
 *
 * @param description - Optional human/model-facing description.
 *
 * @returns No value; cleanup unregisters the context.
 *
 * @throws Error without ScreenActionProvider; registry registration failures propagate from the layout effect.
 *
 * @remarks Requires ScreenActionProvider; no styles. Key/description/registry changes
 * re-register the context, while getter changes update a ref after commit.
 * Keep the ref/layout-effect bridge because external registry reads can invoke the
 * getter outside Effect-originated callbacks. useEffectEvent is restricted to Effect
 * logic and cannot replace this on-demand public callback. The bridge preserves the
 * latest committed getter without re-registering; it is not a React 18 compatibility shim.
 *
 * @example
 * ```tsx
 * import { ScreenActionProvider, useScreenContext } from '@alneas/appkit-react/ai/action';
 * function Context() { useScreenContext('selection', () => ({ ids: [] as string[] })); return null; }
 * export function Screen() { return <ScreenActionProvider><Context /></ScreenActionProvider>; }
 * ```
 */
export function useScreenContext<T = unknown>(
  key: string,
  getter: ContextGetter<T>,
  description?: string
): void;
/**
 * Registers an on-demand context getter using an options object.
 *
 * @typeParam T - Context getter result shape; defaults to unknown.
 *
 * @param options - Stable key, optional description and latest committed getter.
 *
 * @returns No value; cleanup unregisters the context.
 *
 * @throws Error without ScreenActionProvider; registry registration errors propagate from the layout effect.
 *
 * @remarks Requires ScreenActionProvider; no styles. Lifecycle matches the positional overload.
 * The getter remains externally callable through the registry, so its latest committed
 * version is held in a ref rather than an Effect-scoped useEffectEvent callback.
 *
 * @example
 * ```tsx
 * import { ScreenActionProvider, useScreenContext } from '@alneas/appkit-react/ai/action';
 * function Context() { useScreenContext({ key: 'selection', getter: () => ({ ids: [] as string[] }) }); return null; }
 * export function Screen() { return <ScreenActionProvider><Context /></ScreenActionProvider>; }
 * ```
 */
export function useScreenContext<T = unknown>(
  options: UseScreenContextOptions<T>
): void;
export function useScreenContext<T = unknown>(
  keyOrOptions: string | UseScreenContextOptions<T>,
  maybeGetter?: ContextGetter<T>,
  maybeDescription?: string
): void {
  const registry = useScreenActionRegistry();

  const key = typeof keyOrOptions === 'string' ? keyOrOptions : keyOrOptions.key;
  const getter =
    typeof keyOrOptions === 'string' ? maybeGetter! : keyOrOptions.getter;
  const description =
    typeof keyOrOptions === 'string'
      ? maybeDescription
      : keyOrOptions.description;

  const getterRef = useRef(getter);
  useLayoutEffect(() => {
    getterRef.current = getter;
  });

  useLayoutEffect(() => {
    const wrappedGetter: ContextGetter<T> = () => {
      return getterRef.current();
    };

    const unregister = registry.registerContext({
      key,
      description,
      getter: wrappedGetter,
    });

    return () => {
      unregister();
    };
  }, [registry, key, description]);
}
