import * as React from 'react';

/**
 * Creates a stable div reference for anchoring a combobox popup.
 * @returns A stable mutable div ref, initially null.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Call inside a React component. The ref starts at null, is assigned by React after mounting and cleared on unmount; pass it to the div and Content anchor.
 * @example
 * ```tsx
 * import { useComboboxAnchor, Combobox, ComboboxInput, ComboboxContent } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   const anchor = useComboboxAnchor();
 *   return (<Combobox><div ref={anchor}><ComboboxInput aria-label="Search" /></div><ComboboxContent anchor={anchor}>Options</ComboboxContent></Combobox>);
 * }
 * ```
 */
export function useComboboxAnchor() {
  return React.useRef<HTMLDivElement | null>(null);
}
