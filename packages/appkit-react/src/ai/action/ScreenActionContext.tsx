import { useState, type ReactNode } from 'react';
import { ScreenActionContext } from './context';
import { ActionRegistry } from "@alneas/appkit-core/ai";
import type { ScreenActionProviderProps } from './types';

/**
 * Provides a screen-scoped action registry to descendants.
 *
 * @param props - Children and optional host registry; omission creates one stable local registry.
 *
 * @returns Registry context surrounding children.
 *
 * @remarks Requires React; no query/auth provider or styles. Replacing the registry prop
 * changes context, but does not dispose the previous host registry or execute actions.
 * Registration hooks unregister their own entries when unmounted.
 *
 * @example
 * ```tsx
 * import { ScreenActionProvider } from '@alneas/appkit-react/ai/action';
 * export function Screen() { return <ScreenActionProvider><main>Actions are scoped here</main></ScreenActionProvider>; }
 * ```
 */
export function ScreenActionProvider({
  children,
  registry,
}: ScreenActionProviderProps): ReactNode {
  const [localRegistry] = useState(() => new ActionRegistry());
  const activeRegistry = registry ?? localRegistry;

  return (
    <ScreenActionContext.Provider value={activeRegistry}>
      {children}
    </ScreenActionContext.Provider>
  );
}
