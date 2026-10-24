import type {ReactNode} from 'react';
import {useDroppable} from '@dnd-kit/react';
import {pointerIntersection} from '@dnd-kit/collision';

/** Native target options; ids must be unique within the provider. */
export interface DroppableProps {
  /** Unique target identifier within the provider. */
  id: string;
  /** Native target.data payload. */
  data?: Record<string, any>;
  /**
   * Exclude the target from collisions.
   * @defaultValue false
   */
  disabled?: boolean;
  /** Render the target and attach the native registration ref. */
  children: (props: {
    /** Attach to the target element; pass null on removal. */
    ref: (element: Element | null) => void;
    /** Whether the native operation currently targets this registration. */
    isDropTarget: boolean;
  }) => ReactNode;
}

/**
 * Register a native drop target using pointer intersection, including keyboard coordinates.
 * @param props - Target id, optional target.data payload, disabled flag and renderer.
 * @returns The rendered target inside a fragment.
 * @remarks Requires the same native DnDProvider as its source. Outside drops do
 * not choose the nearest target. This registration does not persist host data.
 * @example
 * ```tsx
 * import {DnDProvider, Droppable} from '@alneas/appkit-react/tools/ui';
 * import '@alneas/appkit-react/styles';
 * export function TargetArea() {
 *   return <DnDProvider><Droppable id="archive" data={{kind: 'folder'}}>
 *     {({ref, isDropTarget}) => <div ref={ref} data-over={isDropTarget}>Archive</div>}
 *   </Droppable></DnDProvider>;
 * }
 * ```
 */
export function Droppable({id, data, disabled, children}: DroppableProps) {
  const {ref, isDropTarget} = useDroppable({id, data, disabled, collisionDetector: pointerIntersection});
  return <>{children({ref, isDropTarget})}</>;
}
