import { useLayoutEffect, useRef } from 'react';
import type { ContextGetter } from "@alneas/appkit-core/ai";
import { useScreenActionRegistry } from './context';
import type { UseScreenContextOptions } from './types';

/**
 * Registers an on-demand context getter on the current screen's ActionRegistry.
 *
 * The getter function automatically captures the latest committed props and state
 * via refs without requiring dependency arrays.
 * The context is automatically unregistered when the component unmounts
 * or when the context key changes.
 */
export function useScreenContext<T = unknown>(
  key: string,
  getter: ContextGetter<T>,
  description?: string
): void;
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
