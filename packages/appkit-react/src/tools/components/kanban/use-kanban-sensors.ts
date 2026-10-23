import {useMemo} from 'react';
import {
  KeyboardSensor, PointerSensor, PointerActivationConstraints,
  type Draggable, type KeyboardSensorOptions, type Sensors,
} from '@dnd-kit/dom';

/**
 * Build native pointer sensors and visual-column Left/Right keyboard traversal.
 * @param statusField - Task property holding its current column id.
 * @returns Native sensor descriptors, memoized by statusField; these are not
 * legacy DndContext sensors.
 * @remarks Mouse/pen movement requires 10px; touch requires a 250ms hold with
 * 5px tolerance. Columns must register Column metadata under the same native
 * provider. Prefer useKanbanDrag for the complete status-change lifecycle.
 * @example
 * ```tsx
 * import {DragDropProvider} from '@dnd-kit/react';
 * import {useKanbanSensors} from '@alneas/appkit-react/tools/kanban';
 * export function SensorBoundary() {
 *   const sensors = useKanbanSensors('status');
 *   return <DragDropProvider sensors={sensors}><div>Host registrations</div></DragDropProvider>;
 * }
 * ```
 */
export function useKanbanSensors(statusField: string): Sensors {
  return useMemo(() => {
    class ColumnKeyboardSensor extends KeyboardSensor {
      private restoreCollision = false;
      protected override handleStart(event: KeyboardEvent, source: Draggable, options: KeyboardSensorOptions | undefined) {
        super.handleStart(event, source, options);
        if (this.manager.dragOperation.source !== source) return;
        this.restoreCollision = !this.manager.collisionObserver.disabled;
        this.manager.collisionObserver.disable();
      }
      protected override cleanup() {
        super.cleanup();
        if (this.restoreCollision) this.manager.collisionObserver.enable();
        this.restoreCollision = false;
      }
      protected override handleMove(direction: 'up' | 'down' | 'left' | 'right', event: KeyboardEvent) {
        if (direction !== 'left' && direction !== 'right') return;
        event.preventDefault();
        const {source, target} = this.manager.dragOperation;
        if (!source) return;
        const columns = [...this.manager.registry.droppables]
          .filter(column => !column.disabled && column.data.type === 'Column' && column.element)
          .sort((a, b) => a.element!.getBoundingClientRect().left - b.element!.getBoundingClientRect().left);
        const status = target?.data.type === 'Column' ? target.id : source.data.task?.[statusField];
        const index = columns.findIndex(column => column.id === status);
        const next = columns[index + (direction === 'right' ? 1 : -1)];
        if (index < 0 || !next?.element) return;
        next.element.scrollIntoView({block: 'nearest', inline: 'nearest', behavior: 'instant'});
        const rect = next.element.getBoundingClientRect();
        this.manager.actions.move({event, to: {x: rect.left + rect.width / 2, y: rect.top + Math.min(rect.height / 2, 80)}});
        void this.manager.actions.setDropTarget(next.id);
      }
    }
    return [
      PointerSensor.configure({activationConstraints: event => event.pointerType === 'touch'
        ? [new PointerActivationConstraints.Delay({value: 250, tolerance: 5})]
        : [new PointerActivationConstraints.Distance({value: 10})]}),
      ColumnKeyboardSensor,
    ];
  }, [statusField]);
}

/** Japanese native accessibility instructions for status-only column movement. */
export const kanbanAccessibility = {
  screenReaderInstructions: {
    draggable: 'SpaceまたはEnterで移動開始。左右矢印で列を選択し、SpaceまたはEnterで確定。Escapeで取り消します。',
  },
};
