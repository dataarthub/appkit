import * as React from 'react';

const MOBILE_BREAKPOINT = 768;

/**
 * 現在の画面幅がモバイルサイズ（768px 未満）であるかどうかを判定し、動的に変更を追従するカスタムフック。
 * `useSyncExternalStore` を使用して、再レンダリングの最適化とハイドレーションの整合性を確保します。
 *
 * @returns モバイルサイズであれば true、それ以外は false
 */
export function useIsMobile() {
  return React.useSyncExternalStore(
    React.useCallback((callback) => {
      const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
      mql.addEventListener('change', callback);
      return () => mql.removeEventListener('change', callback);
    }, []),
    () => window.innerWidth < MOBILE_BREAKPOINT,
    () => false, // サーバーサイドでは false をデフォルトとする
  );
}
