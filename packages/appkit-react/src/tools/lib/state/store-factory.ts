import { create, StateCreator } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * Persistence namespace and version passed to Zustand middleware.
 * @see createPersistedStore for usage.
 */
type StoreFactoryOptions = {
  /**
   * Required localStorage key; use a unique non-secret host namespace.
   */
  name: string;
  /**
   * Persisted state version; defaults to 1, including when supplied as 0. No migration callback is configured.
   */
  version?: number;
};

/**
 * SSR-safe storage getter
 * Returns a no-op storage on server, localStorage on client
 * The check happens at runtime when storage is accessed, not at module load
 */
const getStorage = () => {
  // This is safe because zustand's persist middleware handles hydration
  // The storage getter is called lazily, not during SSR render
  if (typeof window === 'undefined') {
    // Return a no-op storage for SSR
    return {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    };
  }
  return localStorage;
};

/**
 * Creates a Zustand store with JSON localStorage persistence and server no-op storage.
 * @typeParam T - Store state and action shape.
 * @param initializer - Zustand state creator defining initial values and actions.
 * @param options - Storage key and optional version; falsy version uses 1.
 * @returns Zustand bound store hook with persistence controls supplied by the middleware.
 * @remarks The server skips hydration and uses inert storage; the browser reads localStorage.
 * Persisted values can differ from server-rendered defaults. No migration or partialize
 * is configured; JSON serializable state is persisted under the supplied key. Storage,
 * serialization and hydration behavior follow Zustand middleware; do not persist secrets.
 * No React context or CSS is required.
 * @example
 * ```ts
 * import { createPersistedStore } from '@alneas/appkit-react/tools/core';
 * const usePreferences = createPersistedStore<{ compact: boolean }>(() => ({ compact: false }), { name: 'example-preferences' });
 * ```
 */
export function createPersistedStore<T>(
  initializer: StateCreator<T>,
  options: StoreFactoryOptions,
) {
  return create<T>()(
    persist(initializer, {
      name: options.name,
      version: options.version || 1,
      storage: createJSONStorage(getStorage),
      // Skip hydration on server - hydrate only on client
      skipHydration: typeof window === 'undefined',
    }),
  );
}

// Example:
// interface BearState {
//   bears: number
//   increase: (by: number) => void
// }
// const useBearStore = createPersistedStore<BearState>(
//   (set) => ({
//     bears: 0,
//     increase: (by) => set((state) => ({ bears: state.bears + by })),
//   }),
//   { name: 'bear-storage' }
// )
