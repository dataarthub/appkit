import { createContext, useContext } from 'react';
import type { ActionRegistry } from "@alneas/appkit-core/ai";

/** Context shared by screen-scoped action hooks. */
export const ScreenActionContext = createContext<ActionRegistry | null>(null);

/**
 * Accesses the current screen's ActionRegistry.
 * Throws an Error if used outside a ScreenActionProvider.
 */
export function useScreenActionRegistry(): ActionRegistry {
  const context = useContext(ScreenActionContext);
  if (!context) {
    throw new Error('useScreenActionRegistry must be used within a <ScreenActionProvider>');
  }
  return context;
}
