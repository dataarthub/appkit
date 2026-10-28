import type {CSSProperties, ReactNode} from 'react';
import {useDraggable} from '@dnd-kit/react';
import {useAccessibleDragRef} from './use-accessible-drag-ref';

/** Native draggable options; render refs replace legacy attributes/listeners. */
export interface DraggableProps {
  /** Unique identifier within the provider. */
  id: string;
  /** Native source.data payload. */
  data?: Record<string, any>;
  /** Attach ref to the moving element and optional handleRef to its activator. */
  children: (props: {
    /** Attach to the element moved by native feedback; pass null on removal. */
    ref: (element: Element | null) => void;
    /** Optional separate activator; otherwise the element itself activates dragging. */
    handleRef: (element: Element | null) => void;
    /** Whether this registration is the current dragging source. */
    isDragging: boolean;
    /** Cursor/opacity presentation only; native feedback owns movement transforms. */
    style: CSSProperties;
  }) => ReactNode;
}

/**
 * Register an element and optional separate handle with the native provider.
 * @param props - Unique string id, optional source.data payload and render callback.
 * @returns The rendered child inside a fragment; input listeners are installed natively.
 * @remarks Place under DnDProvider. Keep nested interactive controls outside the
 * handle when they must remain independently clickable. See the migration guide
 * for native event and feedback semantics.
 * @example
 * ```tsx
 * import {DnDProvider, Draggable} from '@alneas/appkit-react/tools/ui';
 * import '@alneas/appkit-react/styles';
 * export function MovableItem() {
 *   return <DnDProvider><Draggable id="report" data={{name: 'Report'}}>
 *     {({ref, handleRef, style}) => <div ref={ref} style={style}>
 *       <button ref={handleRef}>Move report</button>
 *     </div>}
 *   </Draggable></DnDProvider>;
 * }
 * ```
 */
export function Draggable({id, data, children}: DraggableProps) {
  const {ref, handleRef, isDragging} = useDraggable({id, data});
  const accessibleRef = useAccessibleDragRef(ref);
  const accessibleHandleRef = useAccessibleDragRef(handleRef);
  return <>{children({ref: accessibleRef, handleRef: accessibleHandleRef, isDragging, style: {opacity: isDragging ? 0.5 : undefined, cursor: 'grab'}})}</>;
}
