import { useEffect } from 'react';

/**
 * キーボードショートカットの定義
 * Keyboard shortcut configuration
 */
export interface KeyboardShortcut {
  /** キー名（e.g. 's', 'Enter', 'Escape'） */
  key: string;
  /** Ctrl/Cmd キーが必要か（Mac では Cmd も許容） */
  ctrlKey?: boolean;
  /** Meta (Cmd) キーが必要か */
  metaKey?: boolean;
  /** Shift キーが必要か */
  shiftKey?: boolean;
  /** Alt キーが必要か */
  altKey?: boolean;
  /** ショートカットが押された時のハンドラ */
  handler: (e: KeyboardEvent) => void;
  /** 説明（ヘルプ表示用） */
  description?: string;
  /** preventDefault を呼ぶか（デフォルト: true） */
  preventDefault?: boolean;
}

/**
 * キーボードショートカットを登録するフック。
 *
 * `ctrlKey: true` の場合、Windows/Linux では Ctrl、Mac では Cmd (metaKey) の両方にマッチします。
 *
 * @param shortcuts - ショートカット定義の配列
 * @param enabled - ショートカットの有効/無効（デフォルト: true）
 *
 * @example
 * ```tsx
 * useKeyboardShortcuts([
 *   { key: 's', ctrlKey: true, handler: () => save(), description: '保存' },
 *   { key: 'Escape', handler: () => close(), description: '閉じる' },
 * ]);
 * ```
 */
export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[], enabled: boolean = true) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
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

        const shiftMatch =
          shortcut.shiftKey === undefined ? true : shortcut.shiftKey === e.shiftKey;

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
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts, enabled]);
}
