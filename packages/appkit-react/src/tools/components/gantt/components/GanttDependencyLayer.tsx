import { useId, useMemo } from 'react';
import type { ComputedTask, GanttDependency } from '../types';

/** SVG overlay for visible leaf-task dependencies. Hidden descendants have no misleading proxy arrows. */
export function GanttDependencyLayer({
  tasks,
  dependencies,
  rowHeight,
  width,
  getXPosition,
  getWidth,
  criticalDependencyIds,
  rowWindow,
}: {
  tasks: ComputedTask[];
  dependencies: GanttDependency[];
  rowHeight: number;
  width: number;
  getXPosition: (date: Date) => number;
  getWidth: (start: Date, end: Date) => number;
  criticalDependencyIds?: Set<string>;
  rowWindow?: { start: number; end: number };
}) {
  const markerId = `gantt-arrow-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const rows = useMemo(() => new Map(tasks.map((task, row) => [task.id, { task, row }])), [tasks]);
  return (
    <svg
      className='absolute inset-0 pointer-events-none z-20 overflow-visible'
      width={width}
      height={tasks.length * rowHeight}
      aria-label='Task dependencies'
    >
      <defs>
        <marker id={markerId} markerWidth='6' markerHeight='6' refX='5' refY='3' orient='auto'>
          <path d='M0,0 L6,3 L0,6 Z' fill='currentColor' />
        </marker>
      </defs>
      {dependencies.map((link) => {
        const source = rows.get(link.sourceId);
        const target = rows.get(link.targetId);
        if (!source || !target) return null;
        // Keep crossing links even when both endpoints are outside the rendered window.
        // Global row ordinals preserve geometry; hierarchy-hidden endpoints still produce no link.
        if (
          rowWindow &&
          (Math.max(source.row, target.row) < rowWindow.start ||
            Math.min(source.row, target.row) >= rowWindow.end)
        )
          return null;
        const x = (task: ComputedTask, endpoint: string) =>
          getXPosition(task.computedStart) +
          (endpoint === 'F' ? getWidth(task.computedStart, task.computedEnd) : 0);
        const sx = x(source.task, link.type[0]);
        const tx = x(target.task, link.type[1]);
        const sy = (source.row + 0.5) * rowHeight;
        const ty = (target.row + 0.5) * rowHeight;
        const exit = sx + (link.type[0] === 'F' ? 12 : -12);
        const enter = tx + (link.type[1] === 'F' ? 12 : -12);
        const mid = (source.row + (target.row > source.row ? 1 : 0)) * rowHeight;
        return (
          <path
            key={link.id}
            data-dependency-id={link.id}
            data-critical={criticalDependencyIds?.has(link.id) || undefined}
            className={criticalDependencyIds?.has(link.id) ? 'text-fuchsia-600' : undefined}
            d={`M${sx},${sy} H${exit} V${mid} H${enter} V${ty} H${tx}`}
            fill='none'
            stroke='currentColor'
            strokeWidth={1.5}
            markerEnd={`url(#${markerId})`}
          >
            <title>{`${source.task.title} → ${target.task.title} (${link.type}, ${link.lagDays ?? 0}d)`}</title>
          </path>
        );
      })}
    </svg>
  );
}
