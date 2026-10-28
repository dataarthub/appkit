import * as React from 'react';
import { createPortal } from 'react-dom';
import { DragDropProvider, DragOverlay, useDraggable, useDroppable } from '@dnd-kit/react';
import { pointerIntersection } from '@dnd-kit/collision';
import { cn } from '../../lib/utils';
import {useAccessibleDragRef} from '../ui/dnd/use-accessible-drag-ref';
import { KanbanCardView } from './KanbanCardView';
import type { KanbanColumn, KanbanTask } from './types';
import type { useKanbanDrag } from './use-kanban-drag';

/**
 * Render the native Kanban provider and one body-portal overlay.
 * @param props - Native controller, optional overlay class and registered children.
 * @returns The provider and overlay; no portal is created during server rendering.
 * @remarks Uses immediate drop completion with native focus restoration. The
 * overlay is presentation only and never registers a second draggable.
 * @example
 * ```tsx
 * import {KanbanDragSurface, KanbanColumnFrame, KanbanDraggableCard, useKanbanDrag}
 *   from '@alneas/appkit-react/tools/kanban';
 * import '@alneas/appkit-react/styles';
 * export function CustomCards() {
 *   const tasks = [{id: 'one', title: 'Review', status: 'todo'}];
 *   const controller = useKanbanDrag({tasks});
 *   return <KanbanDragSurface controller={controller}>
 *     <KanbanColumnFrame column={{id: 'todo', title: 'Todo'}}>
 *       <KanbanDraggableCard task={tasks[0]}>Review</KanbanDraggableCard>
 *     </KanbanColumnFrame>
 *   </KanbanDragSurface>;
 * }
 * ```
 */
export function KanbanDragSurface({
  controller,
  overlayClassName,
  children,
}: {
  controller: ReturnType<typeof useKanbanDrag>;
  overlayClassName?: string;
  children: React.ReactNode;
}) {
  const card = controller.activeTask && <KanbanCardView task={controller.activeTask} />;
  return (
    <DragDropProvider {...controller.contextProps}>
      {children}
      {typeof document !== 'undefined' &&
        createPortal(
          <DragOverlay dropAnimation={{duration: 0}}>
            {card && (overlayClassName ? <div className={overlayClassName}>{card}</div> : card)}
          </DragOverlay>,
          document.body,
        )}
    </DragDropProvider>
  );
}

/**
 * Register a native status-only Kanban card with custom content.
 * @param props - Task, optional disabled flag (default false), HTML attributes,
 * custom style and children. Caller-supplied accessibility attributes are retained.
 * @returns A div registered under the native Kanban surface.
 * @remarks Requires the same native provider as KanbanColumnFrame. Disabled cards
 * have no automatic drag tab stop; this component does not persist order or status.
 * @example
 * ```tsx
 * import {KanbanDragSurface, KanbanColumnFrame, KanbanDraggableCard, useKanbanDrag}
 *   from '@alneas/appkit-react/tools/kanban';
 * import '@alneas/appkit-react/styles';
 * export function CustomCards() {
 *   const tasks = [{id: 'one', title: 'Review', status: 'todo'}];
 *   const controller = useKanbanDrag({tasks});
 *   return <KanbanDragSurface controller={controller}>
 *     <KanbanColumnFrame column={{id: 'todo', title: 'Todo'}}>
 *       <KanbanDraggableCard task={tasks[0]}>Review</KanbanDraggableCard>
 *     </KanbanColumnFrame>
 *   </KanbanDragSurface>;
 * }
 * ```
 */
export function KanbanDraggableCard({
  task,
  disabled,
  className,
  children,
  style,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { task: KanbanTask; disabled?: boolean }) {
  const { ref, draggable, isDragging } = useDraggable({
    id: task.id,
    type: 'kanban-task',
    data: { type: 'Task', task },
    disabled,
  });
  const elementRef = React.useRef<HTMLDivElement | null>(null);
  const cardRef = React.useCallback((element: HTMLDivElement | null) => {
    elementRef.current = element;
    ref(disabled ? null : element);
  }, [ref, disabled]);
  const accessibleCardRef = useAccessibleDragRef(cardRef, !disabled);
  React.useLayoutEffect(() => {
    // Native ref cleanup retains an active source. Explicitly detach read-only
    // cards so Accessibility cannot restore drag attributes after React clears them.
    if (disabled) {
      const registered = draggable.manager?.registry.draggables.get(task.id);
      if (registered) registered.element = undefined;
      for (const attribute of ['tabindex', 'role', 'aria-roledescription', 'aria-describedby', 'aria-disabled', 'aria-pressed', 'aria-grabbed']) {
        const supplied = props[attribute === 'tabindex' ? 'tabIndex' : attribute as keyof typeof props];
        if (supplied == null) elementRef.current?.removeAttribute(attribute);
        else elementRef.current?.setAttribute(attribute, String(supplied));
      }
    }
  });
  return (
    <div
      ref={accessibleCardRef}
      tabIndex={disabled ? undefined : 0}
      role={disabled ? undefined : 'button'}
      aria-roledescription={disabled ? undefined : 'draggable'}
      style={style}
      data-task-id={task.id}
      {...props}
      className={cn(
        'cursor-grab active:cursor-grabbing',
        disabled && 'cursor-default',
        isDragging && 'opacity-30',
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * Register a native Kanban column while retaining host-composed content.
 * @remarks Retain forwardRef to compose native registration and caller refs, including
 * callback cleanup; this is not a direct DOM-ref passthrough.
 * Requires the native Kanban surface. Pointer intersection excludes outside
 * drops; WIP limits are presentational and do not reject a host status callback.
 * @param props - Column metadata, optional limit presentation, HTML attributes and children.
 * @param ref - Forwarded div ref, including React 19 callback cleanup support.
 * @returns A column div accepting Kanban task registrations.
 * @example
 * ```tsx
 * import {KanbanDragSurface, KanbanColumnFrame, KanbanDraggableCard, useKanbanDrag}
 *   from '@alneas/appkit-react/tools/kanban';
 * import '@alneas/appkit-react/styles';
 * export function CustomCards() {
 *   const tasks = [{id: 'one', title: 'Review', status: 'todo'}];
 *   const controller = useKanbanDrag({tasks});
 *   return <KanbanDragSurface controller={controller}>
 *     <KanbanColumnFrame column={{id: 'todo', title: 'Todo'}}>
 *       <KanbanDraggableCard task={tasks[0]}>Review</KanbanDraggableCard>
 *     </KanbanColumnFrame>
 *   </KanbanDragSurface>;
 * }
 * ```
 */
export const KanbanColumnFrame = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { column: KanbanColumn; isOverLimit?: boolean }
>(({ column, isOverLimit, className, children, ...props }, ref) => {
  const { ref: setNodeRef, isDropTarget: isOver } = useDroppable({
    id: column.id,
    accept: 'kanban-task',
    collisionDetector: pointerIntersection,
    data: { type: 'Column', column },
  });
  const composedRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      setNodeRef(node);
      if (typeof ref === 'function') {
        // ForwardedRef also supports React 18's void return type; React 19 may return cleanup.
        const cleanup: unknown = ref(node);
        if (typeof cleanup === 'function')
          return () => {
            setNodeRef(null);
            cleanup();
          };
      } else if (ref) ref.current = node;
    },
    [setNodeRef, ref],
  );
  return (
    <div
      ref={composedRef}
      data-slot='kanban-column'
      data-column-id={column.id}
      data-over={isOver || undefined}
      data-over-limit={isOverLimit || undefined}
      {...props}
      className={cn(
        'flex h-full w-[320px] min-w-[320px] flex-col rounded-lg bg-muted/30 dark:bg-muted/10 p-3 transition-colors duration-200',
        isOver && 'bg-primary/5 ring-2 ring-primary/20',
        isOverLimit && 'bg-destructive/5',
        className,
      )}
    >
      {children}
    </div>
  );
});
KanbanColumnFrame.displayName = 'KanbanColumnFrame';
