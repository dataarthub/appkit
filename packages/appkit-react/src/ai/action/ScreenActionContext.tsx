import { useState, type ReactNode } from 'react';
import { ScreenActionContext } from './context';
import { ActionRegistry } from "@alneas/appkit-core/ai";
import type { ScreenActionProviderProps } from './types';

/**
 * Provides a screen-scoped ActionRegistry to its subtree.
 * Isolates action and context registrations per screen or page component.
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
