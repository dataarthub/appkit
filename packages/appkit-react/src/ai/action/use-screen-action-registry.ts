import { useCallback, useSyncExternalStore } from 'react';
import type {
  ActionDescriptor,
  ExecutionContext,
  ActionResult,
  ContextDescriptor,
  ContextValueResult,
} from "@alneas/appkit-core/ai";
import { useScreenActionRegistry } from './context';

const SSR_ACTIONS_SNAPSHOT: readonly ActionDescriptor[] = Object.freeze([]);
const SSR_CONTEXTS_SNAPSHOT: readonly ContextDescriptor[] = Object.freeze([]);

/**
 * Returns a reactive list of currently registered actions on the current screen.
 * Safely integrated with useSyncExternalStore; retains snapshot reference equality
 * until registrations change.
 */
export function useScreenActionList(): readonly ActionDescriptor[] {
  const registry = useScreenActionRegistry();

  const subscribe = useCallback(
    (onStoreChange: () => void) => registry.subscribe(onStoreChange),
    [registry]
  );
  const getSnapshot = useCallback(() => registry.listActions(), [registry]);
  const getServerSnapshot = useCallback(() => SSR_ACTIONS_SNAPSHOT, []);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * Returns a reactive list of currently registered contexts on the current screen.
 * Safely integrated with useSyncExternalStore; retains snapshot reference equality
 * until registrations change.
 */
export function useScreenContextList(): readonly ContextDescriptor[] {
  const registry = useScreenActionRegistry();

  const subscribe = useCallback(
    (onStoreChange: () => void) => registry.subscribe(onStoreChange),
    [registry]
  );
  const getSnapshot = useCallback(() => registry.listContexts(), [registry]);
  const getServerSnapshot = useCallback(() => SSR_CONTEXTS_SNAPSHOT, []);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * Comprehensive hook providing the current screen's actions, contexts,
 * and execution/query helpers.
 */
export function useScreenActions(): {
  actions: readonly ActionDescriptor[];
  contexts: readonly ContextDescriptor[];
  executeAction: (id: string, input: unknown, context?: ExecutionContext) => Promise<ActionResult<unknown>>;
  getContext: (key: string) => Promise<ContextValueResult<unknown>>;
  getAllContext: () => Promise<Record<string, ContextValueResult<unknown>>>;
} {
  const registry = useScreenActionRegistry();
  const actions = useScreenActionList();
  const contexts = useScreenContextList();

  const executeAction = useCallback(
    (id: string, input: unknown, context?: ExecutionContext) => registry.executeAction(id, input, context),
    [registry]
  );

  const getContext = useCallback(
    (key: string) => registry.getContext(key),
    [registry]
  );

  const getAllContext = useCallback(
    () => registry.getAllContext(),
    [registry]
  );

  return {
    actions,
    contexts,
    executeAction,
    getContext,
    getAllContext,
  };
}
