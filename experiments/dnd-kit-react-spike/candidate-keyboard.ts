import { KeyboardSensor, type Draggable, type KeyboardSensorOptions } from '@dnd-kit/dom';
/** Port of Appkit's visual-column keyboard policy, using supported protected sensor extension. */
export class ColumnKeyboardSensor extends KeyboardSensor {
    protected override handleStart(event: KeyboardEvent, source: Draggable, options: KeyboardSensorOptions | undefined) {
        super.handleStart(event, source, options);
        // Keyboard chooses a registered column, so scrolling must not replace it with a geometric target.
        this.manager.collisionObserver.disable();
    }
    protected override cleanup() {
        super.cleanup();
        this.manager.collisionObserver.enable();
    }
    protected override handleMove(direction: 'up' | 'down' | 'left' | 'right', event: KeyboardEvent) {
        if (direction !== 'left' && direction !== 'right')
            return;
        event.preventDefault();
        const { source, target } = this.manager.dragOperation;
        if (!source)
            return;
        const columns = [...this.manager.registry.droppables].filter(d => !d.disabled && d.data.type === 'Column' && d.element).sort((a, b) => a.element!.getBoundingClientRect().left - b.element!.getBoundingClientRect().left);
        const status = target?.data.type === 'Column' ? target.id : source.data.task?.status;
        const index = columns.findIndex(c => c.id === status);
        const next = columns[index + (direction === 'right' ? 1 : -1)];
        if (index < 0 || !next?.element)
            return;
        next.element.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
        const rect = next.element.getBoundingClientRect();
        this.manager.actions.move({ event, to: { x: rect.left + rect.width / 2, y: rect.top + Math.min(rect.height / 2, 80) } });
        void this.manager.actions.setDropTarget(next.id);
    }
}
