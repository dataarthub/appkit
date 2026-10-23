import type {ComponentProps} from 'react';
import {DragDropProvider} from '@dnd-kit/react';
import {Feedback, PointerSensor, PointerActivationConstraints} from '@dnd-kit/dom';

/**
 * Native DragDropProvider props, including custom sensors/plugins and children.
 * @remarks Cancellation is delivered through onDragEnd with event.canceled;
 * the legacy onDragCancel callback is not supported. Native provider members
 * retain their upstream contracts. See the development migration guide.
 */
export type DnDProviderProps = ComponentProps<typeof DragDropProvider>;
const sensors: DnDProviderProps['sensors'] = defaults => [
  ...defaults.filter(sensor => sensor !== PointerSensor),
  PointerSensor.configure({activationConstraints: event => event.pointerType === 'touch'
    ? [new PointerActivationConstraints.Delay({value: 250, tolerance: 5})]
    : [new PointerActivationConstraints.Distance({value: 5})]}),
];
const plugins: DnDProviderProps['plugins'] = defaults => [
  ...defaults, Feedback.configure({feedback: 'clone', dropAnimation: {duration: 0}}),
];

/**
 * Provide a native drag context for Appkit registrations and host-owned children.
 * @param props - Native provider options and content; omitted sensors use 5px
 * mouse/pen movement and a 250ms touch hold with 5px tolerance. Omitted plugins
 * retain native accessibility and clone feedback with immediate drop completion.
 * @returns A provider element; no storage operations are performed by this wrapper.
 * @remarks Import Appkit CSS once. Do not mix legacy core registrations into this
 * context. Check event.canceled and nullable operation entities before persisting.
 * @example
 * ```tsx
 * import {DnDProvider} from '@alneas/appkit-react/tools/ui';
 * import '@alneas/appkit-react/styles';
 * export function DragArea() {
 *   return <DnDProvider onDragEnd={event => {
 *     if (!event.canceled) console.log(event.operation.target?.id);
 *   }}><div>Host content</div></DnDProvider>;
 * }
 * ```
 */
export function DnDProvider({children, sensors: customSensors = sensors, plugins: customPlugins = plugins, ...props}: DnDProviderProps) {
  return <DragDropProvider sensors={customSensors} plugins={customPlugins} {...props}>{children}</DragDropProvider>;
}
