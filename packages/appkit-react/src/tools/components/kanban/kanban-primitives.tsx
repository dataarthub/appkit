import * as React from 'react';
import { createPortal } from 'react-dom';
import { DndContext, DragOverlay, useDroppable } from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '../../lib/utils';
import { KanbanCardView } from './KanbanCardView';
import type { KanbanColumn, KanbanTask } from './types';
import type { useKanbanDrag } from './use-kanban-drag';

/** Internal shared D&D boundary; the overlay never registers a second draggable. */
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
    <DndContext {...controller.contextProps}>
      {children}
      {typeof document !== 'undefined' &&
        createPortal(
          <DragOverlay>
            {card && (overlayClassName ? <div className={overlayClassName}>{card}</div> : card)}
          </DragOverlay>,
          document.body,
        )}
    </DndContext>
  );
}

/** Single sortable registration shared by preset cards and Compound cards with custom children. */
export function KanbanDraggableCard({
  task,
  disabled,
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { task: KanbanTask; disabled?: boolean }) {
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: 'Task', task },
    disabled,
  });
  return (
    <div
      ref={setNodeRef}
      style={{ transition, transform: CSS.Transform.toString(transform) }}
      {...(!disabled ? attributes : {})}
      {...(!disabled ? listeners : {})}
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
 * Shared column registration and drag-over presentation; headers and contents remain composable.
 * @remarks Retained forwardRef during the React 19 migration because this component
 * composes the caller's object/callback ref with the DnD droppable registration and
 * forwards callback-ref cleanup. It is not a direct DOM-ref passthrough. A future
 * ref-as-prop migration should separately verify registration, ref replacement and
 * cleanup; forwardRef is not technically required by React 19 for this pattern.
 */
export const KanbanColumnFrame = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { column: KanbanColumn; isOverLimit?: boolean }
>(({ column, isOverLimit, className, children, ...props }, ref) => {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: { type: 'Column', column },
  });
  const composedRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      setNodeRef(node);
      if (typeof ref === 'function') {
        // Callback refs may return no value or a React 19 cleanup function.
        // Narrow the result before composing it with droppable-registration cleanup.
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
