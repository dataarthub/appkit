import { create, StateCreator } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

type StoreFactoryOptions = {
  name: string;
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
 * ローカルストレージ（localStorage）への永続化機能を持つ SSR 安全な Zustand ストアを生成します。
 * @param initializer ストアの初期ステートとアクションを定義する StateCreator
 * @param options ストア名やバージョンを設定するオプション
 * @returns Zustand の useStore フック
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
