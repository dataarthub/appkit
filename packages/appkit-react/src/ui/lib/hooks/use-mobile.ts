import * as React from 'react';

const MOBILE_BREAKPOINT = 768;

/**
 * Subscribes to whether the browser viewport is narrower than 768 CSS pixels.
 *
 * @returns False on the server; on the client, window.innerWidth < 768.
 *
 * @remarks Uses a max-width:767px media-query listener and removes it on cleanup. Requires
 * window.matchMedia in the browser; no provider or CSS import is required.
 *
 * @example
 * ```tsx
 * import { useIsMobile } from '@alneas/appkit-react/ui/hooks';
 * export function LayoutHint() { return <span>{useIsMobile() ? 'Compact' : 'Wide'}</span>; }
 * ```
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
