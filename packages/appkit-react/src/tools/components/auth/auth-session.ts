import { CancelledError, type QueryClient } from '@tanstack/react-query';
import type { AuthAdapter, User } from './types';

/**
 * Creates a principal-transition coordinator for one AuthProvider session query.
 *
 * @param queryClient - Auth-domain query cache; application queries are removed on initial/principal verification.
 *
 * @param adapter - Host authentication adapter supplying the verified user.
 *
 * @param queryKey - Exact session query key owned by this coordinator.
 *
 * @returns Coordinator with subscription, epoch snapshots, lifecycle, verified reads and tracked actions.
 *
 * @remarks Although exported, this is a low-level provider helper. Principal changes cancel
 * and remove non-session queries, then publish the user and increment epoch. Same-user
 * refreshes preserve application state. Revisions discard stale reads/actions but cannot
 * undo backend work. Backend authorization is host-owned. No styles are required.
 *
 * @example
 * ```ts
 * import { QueryClient } from '@tanstack/react-query';
 * import { createAuthSession, type AuthAdapter } from '@alneas/appkit-react/tools/auth';
 * export async function verify(adapter: AuthAdapter) {
 *   const session = createAuthSession(new QueryClient(), adapter, ['session', 'react-tools.auth', 'example']);
 *   try { return await session.read(new AbortController().signal); }
 *   finally { session.deactivate(); }
 * }
 * ```
 */
export function createAuthSession(
  queryClient: QueryClient,
  adapter: AuthAdapter,
  queryKey: readonly string[],
) {
  let principal: string | null | undefined;
  let revision = 0;
  let epoch = 0;
  let active = true;
  const listeners = new Set<() => void>();
  const sessionFilter = { queryKey, exact: true };

  const accept = (user: User | null) => {
    const nextPrincipal = user?.id ?? null;
    if (principal !== nextPrincipal) {
      // A QueryClient is an auth boundary: arbitrary application query keys can contain private data.
      // Preserve other isolated session queries, but cancel/remove all application queries before
      // exposing the new principal. Cancellation prevents even signal-ignoring promises writing back.
      const filter = {
        predicate: (query: { queryKey: readonly unknown[] }) =>
          !(query.queryKey[0] === 'session' && query.queryKey[1] === 'react-tools.auth'),
      };
      void queryClient.cancelQueries(filter);
      queryClient.removeQueries(filter);
      principal = nextPrincipal;
      epoch += 1;
      queryClient.setQueryData(queryKey, user);
      listeners.forEach((listener) => listener());
    } else {
      queryClient.setQueryData(queryKey, user);
    }
    return user;
  };

/**
 * Accepts a verified adapter event when active, superseding any pending session read.
 *
 * @param user - Adapter-confirmed user or null.
 *
 * @returns No value; inactive coordinators ignore the event.
 *
 * @remarks Current-user changes reset application query state; backend validity is host-owned.
 *
 * @example
 * ```ts
 * import { QueryClient } from '@tanstack/react-query';
 * import { createAuthSession, type AuthAdapter, type User } from '@alneas/appkit-react/tools/auth';
 * export function publishVerified(adapter: AuthAdapter, user: User | null) {
 *   const session = createAuthSession(new QueryClient(), adapter, ['session', 'react-tools.auth', 'events']);
 *   session.publish(user);
 *   session.deactivate();
 * }
 * ```
 */
  const publish = (user: User | null) => {
    if (!active) return;
    revision += 1;
    void queryClient.cancelQueries(sessionFilter);
    accept(user);
  };

  return {
    /**
     * Exact session query key supplied by the caller.
     */
    queryKey,
    /**
     * Observe principal epoch changes.
     *
     * @param listener - Synchronous callback after a changed principal is accepted.
     *
     * @returns Cleanup removing this listener.
     *
     * @example
     * ```ts
     * import { QueryClient } from '@tanstack/react-query';
     * import { createAuthSession, type AuthAdapter } from '@alneas/appkit-react/tools/auth';
     * export async function coordinate(adapter: AuthAdapter) {
     *   const session = createAuthSession(new QueryClient(), adapter, ['session', 'react-tools.auth', 'example']);
     *   try {
     *     const stop = session.subscribe(() => console.log(session.getSnapshot()));
     *   stop();
     *   } finally { session.deactivate(); }
     * }
     * ```
     */
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    /**
     * Read the current principal-transition epoch.
     *
     * @returns Monotonic epoch starting at zero.
     */
    getSnapshot: () => epoch,
    /**
     * Supply the stable server epoch.
     *
     * @returns Zero for SSR.
     */
    getServerSnapshot: () => 0,
    /**
     * Enable publication of adapter results.
     *
     * @returns No value; future verified reads/events may publish.
     *
     * @example
     * ```ts
     * import { QueryClient } from '@tanstack/react-query';
     * import { createAuthSession, type AuthAdapter } from '@alneas/appkit-react/tools/auth';
     * export async function coordinate(adapter: AuthAdapter) {
     *   const session = createAuthSession(new QueryClient(), adapter, ['session', 'react-tools.auth', 'example']);
     *   try {
     *     session.activate();
     *   } finally { session.deactivate(); }
     * }
     * ```
     */
    activate() {
      active = true;
    },
    /**
     * Disable publication and cancel this session query.
     *
     * @returns No value; in-flight backend work is not rolled back.
     *
     * @example
     * ```ts
     * import { QueryClient } from '@tanstack/react-query';
     * import { createAuthSession, type AuthAdapter } from '@alneas/appkit-react/tools/auth';
     * export async function coordinate(adapter: AuthAdapter) {
     *   const session = createAuthSession(new QueryClient(), adapter, ['session', 'react-tools.auth', 'example']);
     *   try {
     *     session.deactivate();
     *   } finally { session.deactivate(); }
     * }
     * ```
     */
    deactivate() {
      active = false;
      revision += 1;
      void queryClient.cancelQueries(sessionFilter);
    },
    /**
     * Publish an adapter auth event when active, cancelling any older session read.
     *
     * @param user - Verified user or null supplied by the adapter.
     *
     * @returns No value.
     */
    publish,
    /**
     * Read and accept the latest adapter user.
     *
     * @param signal - Query abort signal checked after the adapter request completes.
     *
     * @returns Verified user or null.
     *
     * @throws Rejects on adapter errors or cancellation/stale revision via CancelledError.
     *
     * @example
     * ```ts
     * import { QueryClient } from '@tanstack/react-query';
     * import { createAuthSession, type AuthAdapter } from '@alneas/appkit-react/tools/auth';
     * export async function coordinate(adapter: AuthAdapter) {
     *   const session = createAuthSession(new QueryClient(), adapter, ['session', 'react-tools.auth', 'example']);
     *   try {
     *     await session.read(new AbortController().signal);
     *   } finally { session.deactivate(); }
     * }
     * ```
     */
    async read(signal: AbortSignal) {
      const started = revision;
      const user = await adapter.getCurrentUser();
      if (!active || signal.aborted || revision !== started) {
        throw new CancelledError({ revert: true });
      }
      return accept(user);
    },
    /**
     * Run a host auth action and publish its result if still current.
     *
     * @typeParam T - User, null or void result of the host auth action.
     *
     * @param action - Asynchronous adapter operation, invoked once.
     *
     * @param loggedOut - Publish null on success instead of a user result; defaults to false.
     *
     * @returns Original host operation result, even if a newer revision prevents publication.
     *
     * @throws Rejects with the host action error; pending verification is invalidated afterward.
     *
     * @example
     * ```ts
     * import { QueryClient } from '@tanstack/react-query';
     * import { createAuthSession, type AuthAdapter } from '@alneas/appkit-react/tools/auth';
     * export async function coordinate(adapter: AuthAdapter) {
     *   const session = createAuthSession(new QueryClient(), adapter, ['session', 'react-tools.auth', 'example']);
     *   try {
     *     await session.run(() => adapter.getCurrentUser());
     *   } finally { session.deactivate(); }
     * }
     * ```
     */
    async run<T extends User | null | void>(
      action: () => Promise<T>,
      loggedOut = false,
    ): Promise<T> {
      const started = ++revision;
      void queryClient.cancelQueries(sessionFilter);
      try {
        const result = await action();
        // An intervening auth event/action is newer than this operation's result.
        if (active && revision === started) {
          if (loggedOut) publish(null);
          else if (result) publish(result);
        }
        return result;
      } finally {
        // Failed actions or redirect-only OAuth results must not strand the cancelled initial read.
        if (active && revision === started) {
          void queryClient.invalidateQueries(sessionFilter);
        }
      }
    },
  };
}
