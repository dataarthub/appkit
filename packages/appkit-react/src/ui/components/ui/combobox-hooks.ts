import * as React from 'react';

/**
 * コンボボックスのポップアップ位置の基準（アンカー）となる要素を保持するためのRefを生成するカスタムフック。
 */
export function useComboboxAnchor() {
  return React.useRef<HTMLDivElement | null>(null);
}
