'use client';

import { Collapsible as CollapsiblePrimitive } from '@base-ui/react/collapsible';

/**
 * Coordinates the open state of one disclosure region.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered Collapsible composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Keep trigger and panel under Collapsible. These thin Base UI wrappers add data-slot identifiers and do not add local open-state defaults or animation classes.
 * @example
 * ```tsx
 * import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Collapsible><CollapsibleTrigger>Advanced settings</CollapsibleTrigger><CollapsibleContent>Additional settings</CollapsibleContent></Collapsible>);
 * }
 * ```
 */
function Collapsible({ ...props }: CollapsiblePrimitive.Root.Props) {
  return <CollapsiblePrimitive.Root data-slot='collapsible' {...props} />;
}

/**
 * Renders the button that toggles its disclosure region.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered CollapsibleTrigger composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Keep trigger and panel under Collapsible. These thin Base UI wrappers add data-slot identifiers and do not add local open-state defaults or animation classes.
 * @example
 * ```tsx
 * import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Collapsible><CollapsibleTrigger>Advanced settings</CollapsibleTrigger><CollapsibleContent>Additional settings</CollapsibleContent></Collapsible>);
 * }
 * ```
 */
function CollapsibleTrigger({ ...props }: CollapsiblePrimitive.Trigger.Props) {
  return <CollapsiblePrimitive.Trigger data-slot='collapsible-trigger' {...props} />;
}

/**
 * Renders the panel associated with a disclosure trigger.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered CollapsibleContent composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Keep trigger and panel under Collapsible. These thin Base UI wrappers add data-slot identifiers and do not add local open-state defaults or animation classes.
 * @example
 * ```tsx
 * import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Collapsible><CollapsibleTrigger>Advanced settings</CollapsibleTrigger><CollapsibleContent>Additional settings</CollapsibleContent></Collapsible>);
 * }
 * ```
 */
function CollapsibleContent({ ...props }: CollapsiblePrimitive.Panel.Props) {
  return <CollapsiblePrimitive.Panel data-slot='collapsible-content' {...props} />;
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent };
