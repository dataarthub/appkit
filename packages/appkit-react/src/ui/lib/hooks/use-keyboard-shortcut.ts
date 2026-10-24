import { useEffect, useEffectEvent } from 'react';

/**
 * A case-insensitive key match and handler for useKeyboardShortcuts.
 *
 * @see useKeyboardShortcuts for registration and cleanup.
 */
export interface KeyboardShortcut {
  /**
   * KeyboardEvent.key value, compared case-insensitively.
   */
  key: string;
  /**
   * When true accept Ctrl or Meta; false excludes both; omission ignores this modifier.
   */
  ctrlKey?: boolean;
  /**
   * Require exact Meta state when provided; omission ignores Meta.
   */
  metaKey?: boolean;
  /**
   * Require exact Shift state when provided; omission ignores Shift.
   */
  shiftKey?: boolean;
  /**
   * Require exact Alt state when provided; omission ignores Alt.
   */
  altKey?: boolean;
  /**
   * Callback receiving the original keydown event after a match; only the first matching shortcut runs.
   *
   * @param e - Original matched keydown event.
   *
   * @returns No value after the handler completes.
   */
  handler: (e: KeyboardEvent) => void;
  /**
   * Optional application help text; not read by the hook.
   */
  description?: string;
  /**
   * Prevent the matched event default unless explicitly false; defaults to true.
   */
  preventDefault?: boolean;
}

/**
 * Registers ordered keyboard shortcuts on the browser window.
 *
 * @param shortcuts - Match definitions; the first matching definition receives the original event.
 *
 * @param enabled - Enable the listener; defaults to true.
 *
 * @returns No value; effect cleanup removes the listener on unmount or when disabled.
 *
 * @remarks Omitted modifiers are ignored. ctrlKey:true accepts Ctrl or Meta on every
 * platform. Events in inputs, composition and repeats are not filtered. Handlers run
 * synchronously and their exceptions propagate through the browser event dispatch.
 * No providers or styles are required. Definitions and handlers use their latest committed
 * values without resubscribing; only enabled controls the subscription.
 *
 * @example
 * ```tsx
 * import { useKeyboardShortcuts } from '@alneas/appkit-react/ui/hooks';
 * export function SaveShortcut({ save }: { save: () => void }) {
 *   useKeyboardShortcuts([{ key: 's', ctrlKey: true, handler: save }]);
 *   return null;
 * }
 * ```
 */
export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[], enabled: boolean = true) {
  const onKeyDown = useEffectEvent((e: KeyboardEvent) => {
    for (const shortcut of shortcuts) {
      // For ctrlKey, match either Ctrl (Windows/Linux) or Cmd (Mac)
      const ctrlMatch =
        shortcut.ctrlKey === undefined
          ? true
          : shortcut.ctrlKey
            ? e.ctrlKey || e.metaKey
            : !(e.ctrlKey || e.metaKey);

      // For metaKey, only match Cmd on Mac
      const metaMatch = shortcut.metaKey === undefined ? true : shortcut.metaKey === e.metaKey;

      const shiftMatch = shortcut.shiftKey === undefined ? true : shortcut.shiftKey === e.shiftKey;

      const altMatch = shortcut.altKey === undefined ? true : shortcut.altKey === e.altKey;

      const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();

      if (ctrlMatch && metaMatch && shiftMatch && altMatch && keyMatch) {
        if (shortcut.preventDefault !== false) {
          e.preventDefault();
        }
        shortcut.handler(e);
        break; // Only trigger one shortcut per keypress
      }
    }
  });

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => onKeyDown(event);
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled]);
}
