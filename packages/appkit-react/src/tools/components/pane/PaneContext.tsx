import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

/**
 * ペインコンテキストの値の型定義
 * Type definition for the pane context value
 */
export type PaneContextValue = {
  /** ペインが開いているかどうか / Whether the pane is open */
  isOpen: boolean;
  /** ペインに表示するコンテンツ / Content to display in the pane */
  content: React.ReactNode | null;
  /** ペインを開いてコンテンツを設定する / Open the pane and set content */
  open: (node: React.ReactNode) => void;
  /** ペインを閉じてコンテンツをクリアする / Close the pane and clear content */
  close: () => void;
};

const PaneContext = createContext<PaneContextValue | undefined>(undefined);

/**
 * ペインの開閉状態とコンテンツを管理するプロバイダー。
 * `usePane` フックでコンテキスト値にアクセスできます。
 *
 * Provider that manages pane open/close state and content.
 * Access context values using the `usePane` hook.
 *
 * @example
 * ```tsx
 * <PaneProvider>
 *   <App />
 * </PaneProvider>
 * ```
 */
export function PaneProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [content, setContent] = useState<React.ReactNode | null>(null);

  const open = useCallback((node: React.ReactNode) => {
    setContent(node);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setContent(null);
  }, []);

  const value = useMemo(() => ({ isOpen, content, open, close }), [isOpen, content, open, close]);
  return <PaneContext.Provider value={value}>{children}</PaneContext.Provider>;
}

/**
 * ペインコンテキストにアクセスするフック。
 * `PaneProvider` の内部で使用する必要があります。
 *
 * Hook to access the pane context.
 * Must be used within a `PaneProvider`.
 *
 * @example
 * ```tsx
 * const { open, close, isOpen, content } = usePane();
 * open(<DetailView />);
 * ```
 */

/**
 * 右ペイン（ドロワーやサイドパネル）の開閉および表示コンテンツを操作するためのカスタムフック。
 */
export function usePane() {
  const ctx = useContext(PaneContext);
  if (!ctx) throw new Error('usePane must be used within PaneProvider');
  return ctx;
}
