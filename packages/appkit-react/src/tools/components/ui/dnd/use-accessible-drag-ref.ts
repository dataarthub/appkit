import {useCallback, type RefCallback} from 'react';

/**
 * Keep native drag refs and modern button state while dnd-kit 0.5.1 also writes
 * the deprecated aria-grabbed attribute. Its Accessibility options cannot select
 * attributes; observing only this attribute preserves its instructions, live
 * announcements, aria-pressed state, keyboard sensor and pointer sensor.
 */
export function useAccessibleDragRef<T extends Element>(handleRef: RefCallback<T>, enabled = true): RefCallback<T> {
  return useCallback((element: T | null) => {
    if (!enabled) return handleRef(element);
    if (!element) {
      handleRef(null);
      return;
    }
    const removeDeprecatedState = () => {
      if (element.hasAttribute('aria-grabbed')) element.removeAttribute('aria-grabbed');
    };
    const Observer = element.ownerDocument.defaultView!.MutationObserver;
    const observer = new Observer(removeDeprecatedState);
    observer.observe(element, {attributes: true, attributeFilter: ['aria-grabbed']});
    const cleanup = handleRef(element);
    removeDeprecatedState();
    return () => {
      observer.disconnect();
      if (typeof cleanup === 'function') cleanup();
      else handleRef(null);
    };
  }, [handleRef, enabled]);
}
