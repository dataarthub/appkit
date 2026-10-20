/**
 * Gantt Task Bar Component
 *
 * Renders an individual task bar with progress, status color, and interactions.
 */

import { cn } from "../../../lib/utils";
import type {
  ComputedTask,
  GanttProgressConfig,
  GanttBaselineConfig,
  TaskBarDisplay,
  GanttDateEditingConfig,
} from '../types';
import { differenceInDays, format } from 'date-fns';
import { boundedProgress } from '../hooks/gantt-hierarchy';
import { useGanttDateEditing } from '../hooks/use-gantt-date-editing';

export interface GanttTaskBarProps {
  task: ComputedTask;
  left: number;
  width: number;
  rowHeight: number;
  taskBarDisplay?: TaskBarDisplay;
  progressConfig?: GanttProgressConfig;
  baselineConfig?: GanttBaselineConfig;
  baselineLeft?: number;
  baselineWidth?: number;
  onClick?: (task: ComputedTask) => void;
  onProgressChange?: (taskId: string, progress: number) => void;
  /** Opt-in pointer/keyboard date editing. */
  dateEditing?: GanttDateEditingConfig;
  /** Pixels per calendar day; required for pointer date editing. */
  cellWidth?: number;
  /** Committed date edit, excluding pointer previews. */
  onDateChange?: (taskId: string, start: Date, end: Date) => void;
  /** Temporarily disable controls during persistence without unmounting them. */
  editingDisabled?: boolean;
  /** Dependency-only critical-path emphasis. */
  critical?: boolean;
  /** Total float in working days, displayed in the tooltip. */
  totalFloatDays?: number;
}

/**
 * 個々のタスクの期間、進捗率、ステータスに応じた色、基準計画（ベースライン）をタイムライン上にバーとして描画するコンポーネント。
 */
export function GanttTaskBar({
  task,
  left,
  width,
  rowHeight,
  taskBarDisplay = 'none',
  progressConfig,
  baselineConfig,
  baselineLeft,
  baselineWidth,
  onClick,
  onProgressChange,
  dateEditing,
  cellWidth = 0,
  onDateChange,
  editingDisabled = false,
  critical,
  totalFloatDays,
}: GanttTaskBarProps) {
  const editing = useGanttDateEditing(task, cellWidth, dateEditing, onDateChange, editingDisabled);
  const move = editing.bind('move');
  const displayLeft = left + editing.leftDelta;
  const displayWidth = width + editing.widthDelta;
  // Status colors
  const statusColors: Record<string, string> = {
    done: 'bg-green-500 hover:bg-green-600',
    review: 'bg-primary hover:bg-primary/90',
    doing: 'bg-blue-500 hover:bg-blue-600',
    todo: 'bg-muted-foreground/70 hover:bg-muted-foreground',
    blocked: 'bg-red-500 hover:bg-red-600',
  };

  const statusColor = statusColors[task.status] || statusColors.todo;
  const isLate = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done';
  const showProgress = progressConfig?.showProgress && task.computedProgress > 0;
  const showBaseline =
    baselineConfig?.showBaseline && baselineLeft !== undefined && baselineWidth !== undefined;

  // Calculate display text
  const getDisplayText = (): string => {
    if (taskBarDisplay === 'none') return '';

    const duration = differenceInDays(task.computedEnd, task.computedStart);
    const durationText = `${duration}d`;
    const endText = format(task.computedEnd, 'M/d');

    switch (taskBarDisplay) {
      case 'duration':
        return durationText;
      case 'end-date':
        return endText;
      case 'both':
        return `${durationText} (${endText})`;
      default:
        return '';
    }
  };

  const displayText = getDisplayText();
  const barHeight = rowHeight - 16; // 8px padding top/bottom
  const barTop = 8;

  return (
    <div className='h-full relative group'>
      {/* Baseline bar (if enabled) */}
      {showBaseline && (
        <div
          className={cn(
            'absolute rounded-sm opacity-40',
            baselineConfig.baselineColor || 'bg-muted-foreground',
          )}
          style={{
            left: baselineLeft,
            width: baselineWidth,
            height: barHeight - 8,
            top:
              baselineConfig?.baselinePosition === 'above'
                ? barTop - 4
                : baselineConfig?.baselinePosition === 'below'
                  ? barTop + barHeight - 8
                  : barTop + 4,
          }}
        />
      )}

      {/* Main task bar */}
      <div
        {...move}
        data-task-bar={task.id}
        data-critical={critical || undefined}
        title={
          totalFloatDays === undefined
            ? undefined
            : `${task.title}: total float ${totalFloatDays} working days (dependencies only)`
        }
        role={onClick || editing.available('move') ? 'button' : undefined}
        tabIndex={onClick || editing.available('move') ? 0 : undefined}
        aria-label={width <= 50 ? task.title : undefined}
        aria-disabled={editingDisabled || undefined}
        aria-description={editing.allowed('move') ? 'Move with Left/Right, Enter to edit, Escape to cancel drag' : undefined}
        onKeyDown={(event) => {
          move.onKeyDown(event);
          if (
            event.target === event.currentTarget &&
            (event.key === 'Enter' || event.key === ' ')
          ) {
            event.preventDefault();
            event.stopPropagation();
            onClick?.(task);
          }
        }}
        className={cn(
          'absolute rounded-md shadow-sm cursor-pointer transition-all border border-white/20 select-none flex items-center overflow-hidden',
          statusColor,
          isLate && 'ring-2 ring-destructive ring-offset-1',
          critical && 'outline outline-2 outline-offset-2 outline-fuchsia-600',
        )}
        style={{
          left: displayLeft,
          width: displayWidth,
          touchAction: editing.allowed('move') ? 'none' : undefined,
          height: barHeight,
          top: barTop,
        }}
        onClick={(e) => {
          e.stopPropagation();
          if (editing.consumeClick()) return;
          onClick?.(task);
        }}
      >
        {/* Progress fill */}
        {showProgress && (
          <div
            className={cn(
              'absolute inset-0 opacity-30',
              progressConfig.progressColor || 'bg-white',
            )}
            style={{
              width: `${task.computedProgress}%`,
              borderRadius: 'inherit',
            }}
          />
        )}

        {/* Content */}
        <div className='relative z-10 flex items-center justify-between w-full px-2'>
          {/* Title (only if wide enough) */}
          {width > 50 && (
            <span className='text-[10px] sm:text-xs font-semibold text-white truncate drop-shadow-md'>
              {task.title}
            </span>
          )}

          {/* Progress percentage */}
          {showProgress && width > 80 && (
            <span className='text-[9px] text-white/80 ml-1 flex-shrink-0'>
              {Math.round(task.computedProgress)}%
            </span>
          )}

          {/* Duration/End display */}
          {displayText && width > 100 && (
            <span className='text-[9px] text-white/70 ml-auto flex-shrink-0'>{displayText}</span>
          )}
        </div>
      </div>

      {editing.available('start') &&
        (['start', 'end'] as const).map((edge) => (
          <button
            key={edge}
            type='button'
            {...editing.bind(edge)}
            disabled={editingDisabled}
            data-resize-edge={edge}
            aria-label={`${task.title}: resize ${edge} with Left/Right`}
            className='absolute z-30 cursor-ew-resize rounded bg-foreground/30 focus-visible:ring-2 focus-visible:ring-primary'
            style={{
              left: edge === 'start' ? displayLeft : displayLeft + displayWidth - 8,
              top: barTop,
              width: 8,
              height: barHeight,
              touchAction: 'none',
            }}
            onClick={(event) => event.stopPropagation()}
          />
        ))}

      {progressConfig?.editableProgress && onProgressChange && (
        <input
          type='range'
          disabled={editingDisabled}
          min={0}
          max={100}
          step={1}
          value={boundedProgress(task.computedProgress)}
          aria-label={`${task.title}: progress`}
          aria-valuetext={`${Math.round(boundedProgress(task.computedProgress))}%`}
          className='absolute z-20 accent-primary'
          style={{ left, width: Math.max(width, 40), top: rowHeight - 14, height: 12 }}
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
          onChange={(event) => onProgressChange(task.id, Number(event.currentTarget.value))}
        />
      )}

      {/* External title (if bar too narrow) */}
      {width <= 50 && (
        <div
          className='absolute flex items-center text-xs text-foreground/70 whitespace-nowrap pl-2 pointer-events-none'
          style={{
            left: left + width,
            top: barTop,
            height: barHeight,
          }}
        >
          {task.title}
        </div>
      )}
    </div>
  );
}
