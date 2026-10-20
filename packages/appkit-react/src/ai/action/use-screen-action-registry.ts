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
 * Subscribes to action descriptors registered on the current screen.
 *
 * @returns Read-only action descriptors; the server snapshot is empty.
 *
 * @throws Error without ScreenActionProvider.
 *
 * @remarks Requires ScreenActionProvider; no styles. Subscriptions are removed on cleanup.
 * List snapshots remain stable until registrations change. Actions execute only on an
 * explicit executeAction call; backend authorization remains host-owned.
 *
 * @example
 * ```tsx
 * import { ScreenActionProvider, useScreenActionList } from '@alneas/appkit-react/ai/action';
 * function Content() { return <output>{useScreenActionList().length}</output>; }
 * export function Screen() { return <ScreenActionProvider><Content /></ScreenActionProvider>; }
 * ```
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
 * Subscribes to context descriptors registered on the current screen.
 *
 * @returns Read-only context descriptors; the server snapshot is empty.
 *
 * @throws Error without ScreenActionProvider.
 *
 * @remarks Requires ScreenActionProvider; no styles. Subscriptions are removed on cleanup.
 * List snapshots remain stable until registrations change. Actions execute only on an
 * explicit executeAction call; backend authorization remains host-owned.
 *
 * @example
 * ```tsx
 * import { ScreenActionProvider, useScreenContextList } from '@alneas/appkit-react/ai/action';
 * function Content() { return <output>{useScreenContextList().length}</output>; }
 * export function Screen() { return <ScreenActionProvider><Content /></ScreenActionProvider>; }
 * ```
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
 * Combines reactive action/context lists with bound execution and context-read helpers.
 *
 * @returns Descriptors plus executeAction, getContext and getAllContext bound to the current registry.
 *
 * @throws Error without ScreenActionProvider.
 *
 * @remarks Requires ScreenActionProvider; no styles. Subscriptions are removed on cleanup.
 * List snapshots remain stable until registrations change. Actions execute only on an
 * explicit executeAction call; backend authorization remains host-owned.
 *
 * @example
 * ```tsx
 * import { ScreenActionProvider, useScreenActions } from '@alneas/appkit-react/ai/action';
 * function Content() { const { actions } = useScreenActions(); return <output>{actions.length}</output>; }
 * export function Screen() { return <ScreenActionProvider><Content /></ScreenActionProvider>; }
 * ```
 */
export function useScreenActions(): {
  /**
   * Reactive action descriptors.
   */
  actions: readonly ActionDescriptor[];
  /**
   * Reactive lazy-context descriptors.
   */
  contexts: readonly ContextDescriptor[];
  /**
   * Execute a registered action explicitly.
   *
   * @param id - Registered action identifier.
   *
   * @param input - Untrusted input passed to its validator.
   *
   * @param context - Optional abort/progress context.
   *
   * @returns Core ActionResult containing output or a structured failure.
   */
  executeAction: (id: string, input: unknown, context?: ExecutionContext) => Promise<ActionResult<unknown>>;
  /**
   * Read one registered lazy context.
   *
   * @param key - Registered context key.
   *
   * @returns Core context result with a value or structured failure.
   */
  getContext: (key: string) => Promise<ContextValueResult<unknown>>;
  /**
   * Read all registered context getters.
   *
   * @returns Keyed context results, possibly empty.
   */
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
