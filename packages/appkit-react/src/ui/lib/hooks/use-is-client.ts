import { useSyncExternalStore } from 'react';

function subscribe() {
  return () => undefined;
}

/**
 * Returns `true` only after hydration on the client.
 * Useful for SSR-safe rendering branches without setState in effects.
 */
export function useIsClient(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
