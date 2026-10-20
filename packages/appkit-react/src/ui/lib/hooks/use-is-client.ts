import { useSyncExternalStore } from 'react';

function subscribe() {
  return () => undefined;
}

/**
 * Reports whether React is rendering on the client after hydration.
 *
 * @returns False for the server snapshot and initial hydration snapshot, then true on the client.
 *
 * @remarks Requires React; no context, styles, listener or disposal is required.
 *
 * @example
 * ```tsx
 * import { useIsClient } from '@alneas/appkit-react/ui/hooks';
 * export function ClientStatus() { return <span>{useIsClient() ? 'Client' : 'Server'}</span>; }
 * ```
 */
export function useIsClient(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
