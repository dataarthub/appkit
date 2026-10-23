import {
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type KeyboardCoordinateGetter,
} from '@dnd-kit/core';

/** Shared sensors: Space/Enter picks up or drops, Left/Right selects a status column, Escape cancels. */
export function useKanbanSensors(statusField: string) {
  const coordinates: KeyboardCoordinateGetter = (event, { context, currentCoordinates }) => {
    if (event.code !== 'ArrowLeft' && event.code !== 'ArrowRight') return;
    event.preventDefault();
    const { active, over, droppableContainers, droppableRects, collisionRect } = context;
    if (!active || !collisionRect) return;
    const columns = droppableContainers
      .getEnabled()
      .filter((c) => c.data.current?.type === 'Column')
      .map((c) => ({ id: c.id, rect: droppableRects.get(c.id) }))
      .filter((c) => c.rect !== undefined)
      .sort((a, b) => a.rect!.left - b.rect!.left);
    const data = over?.data.current ?? active.data.current;
    const status = data?.type === 'Column' ? over?.id : data?.task?.[statusField];
    const index = columns.findIndex((c) => c.id === status);
    if (index < 0) return;
    const target = columns[index + (event.code === 'ArrowRight' ? 1 : -1)]?.rect;
    if (!target) return;
    return {
      x:
        currentCoordinates.x +
        target.left +
        target.width / 2 -
        collisionRect.left -
        collisionRect.width / 2,
      y:
        currentCoordinates.y +
        target.top +
        Math.min(target.height / 2, 80) -
        collisionRect.top -
        collisionRect.height / 2,
    };
  };
  return useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 10 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: coordinates, scrollBehavior: 'auto' }),
  );
}

export const kanbanAccessibility = {
  screenReaderInstructions: {
    draggable:
      'SpaceまたはEnterで移動開始。左右矢印で列を選択し、SpaceまたはEnterで確定。Escapeで取り消します。',
  },
};
