'use client';

import { Collapsible as CollapsiblePrimitive } from '@base-ui/react/collapsible';

/**
 * 折りたたみ可能なコンテンツ領域を制御するルートコンポーネント。
 */
function Collapsible({ ...props }: CollapsiblePrimitive.Root.Props) {
  return <CollapsiblePrimitive.Root data-slot='collapsible' {...props} />;
}

/**
 * コンテンツの展開と折りたたみを切り替えるためのトリガーボタン。
 */
function CollapsibleTrigger({ ...props }: CollapsiblePrimitive.Trigger.Props) {
  return <CollapsiblePrimitive.Trigger data-slot='collapsible-trigger' {...props} />;
}

/**
 * 開閉可能なコンテンツが表示される領域。
 */
function CollapsibleContent({ ...props }: CollapsiblePrimitive.Panel.Props) {
  return <CollapsiblePrimitive.Panel data-slot='collapsible-content' {...props} />;
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent };
