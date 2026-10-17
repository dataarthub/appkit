import { CancelledError, type QueryClient } from '@tanstack/react-query';
import type { AuthAdapter, User } from './types';

/** Internal session coordinator. Only verified adapter results determine principal changes. */
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

  const publish = (user: User | null) => {
    if (!active) return;
    revision += 1;
    void queryClient.cancelQueries(sessionFilter);
    accept(user);
  };

  return {
    queryKey,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot: () => epoch,
    getServerSnapshot: () => 0,
    activate() {
      active = true;
    },
    deactivate() {
      active = false;
      revision += 1;
      void queryClient.cancelQueries(sessionFilter);
    },
    publish,
    async read(signal: AbortSignal) {
      const started = revision;
      const user = await adapter.getCurrentUser();
      if (!active || signal.aborted || revision !== started) {
        throw new CancelledError({ revert: true });
      }
      return accept(user);
    },
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
