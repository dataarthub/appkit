import { createContext, useContext } from 'react';
import type { ActionRegistry } from "@alneas/appkit-core/ai";

/**
 * Nullable React context holding a screen-owned ActionRegistry.
 *
 * @see ScreenActionProvider for setup and useScreenActionRegistry for consumption.
 */
export const ScreenActionContext = createContext<ActionRegistry | null>(null);

/**
 * Reads the nearest screen-owned action registry.
 *
 * @returns Current ActionRegistry instance; the hook does not subscribe to changes.
 *
 * @throws Error when used outside ScreenActionProvider.
 *
 * @remarks No styles are required. Use reactive list hooks when registrations affect render.
 *
 * @example
 * ```tsx
 * import { ScreenActionProvider, useScreenActionRegistry } from '@alneas/appkit-react/ai/action';
 * function Content() { const registry = useScreenActionRegistry(); return <span>{registry.listActions().length}</span>; }
 * export function Screen() { return <ScreenActionProvider><Content /></ScreenActionProvider>; }
 * ```
 */
export function useScreenActionRegistry(): ActionRegistry {
  const context = useContext(ScreenActionContext);
  if (!context) {
    throw new Error('useScreenActionRegistry must be used within a <ScreenActionProvider>');
  }
  return context;
}
