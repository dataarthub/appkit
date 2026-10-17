import * as React from 'react';
import { KanbanCardView } from './KanbanCardView';
import { KanbanDraggableCard } from './kanban-primitives';
import type { KanbanCardProps } from './types';

/** ドラッグ可能なカード。Space/Enterで移動、左右矢印で列選択、Escapeで取消。 */
export const KanbanCard = React.forwardRef<HTMLDivElement, KanbanCardProps>(
  ({ task, onClick, testId, disableDrag }, ref) => {
    return (
      <KanbanDraggableCard
        task={task}
        disabled={disableDrag}
        data-slot='kanban-card-wrapper'
        onClick={onClick}
      >
        <KanbanCardView ref={ref} task={task} testId={testId} />
      </KanbanDraggableCard>
    );
  },
);
KanbanCard.displayName = 'KanbanCard';
