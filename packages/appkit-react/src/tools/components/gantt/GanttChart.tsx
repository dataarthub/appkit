/**
 * Enhanced Gantt Chart Component
 *
 * タスクとマイルストーンをタイムライン形式で表示する高機能ガントチャート。
 *
 * ## Features
 * - 階層タスク（サブタスク）表示
 * - 進捗率の可視化
 * - ベースライン比較
 * - ダイアログによるタスク編集
 * - 日単位のバー移動・両端リサイズ（明示的に有効化、キーボード対応）
 * - FS/SS/FF/SF依存線、稼働日・クリティカルパス・容量制約付き前方自動調整
 * - 100件を超えるタスクの行仮想化（全行描画へ切替可能）
 * - フィルタリング機能
 * - カスタムマーカー
 * - 日次/週次/月次ビュー切替
 * - 楽観的UIアップデート
 *
 * ## AI/Automation Attributes
 * - `data-testid`: Container element
 * - `data-task-count`: Number of visible tasks
 *
 * @example
 * ```tsx
 * import { GanttChart } from '@alneas/appkit-react/tools/gantt';
 *
 * const tasks = [
 *   {
 *     id: '1',
 *     title: 'Phase 1',
 *     start_date: '2024-01-01',
 *     due_date: '2024-01-31',
 *     status: 'doing',
 *     progress: 50,
 *     created_at: '2024-01-01',
 *   },
 * ];
 *
 * <GanttChart
 *   tasks={tasks}
 *   initialViewMode="Week"
 *   onTaskClick={(task) => console.log(task)}
 *   onTaskUpdate={(task) => updateTask(task)}
 * />
 * ```
 *
 * @param props - {@link GanttChartProps}
 * @returns ガントチャートコンポーネント
 */

import { useState, useRef, useEffect, useMemo, useCallback, memo } from 'react';
import {
  format,
  isSameDay,
  isToday,
  isWeekend,
  differenceInCalendarDays,
  addDays,
  parseISO,
} from 'date-fns';
import { enUS } from 'date-fns/locale';
import { ChevronDown, ChevronRight, Plus } from 'lucide-react';

import { Avatar, AvatarFallback } from '../ui/avatar';
import { Button } from '../ui/button';
import { cn } from "../../lib/utils";

import type {
  GanttChartProps,
  GanttTask,
  ComputedTask,
  GanttMarker,
  GanttDependency,
} from './types';
import { useGanttState } from './hooks/useGanttState';
import { GanttToolbar } from './components/GanttToolbar';
import { GanttTaskBar } from './components/GanttTaskBar';
import { TaskEditDialog } from './dialogs/TaskEditDialog';
import { dependencyError, scheduleGanttTasks } from './hooks/gantt-scheduling';
import { GanttDependencyLayer } from './components/GanttDependencyLayer';
import { planGanttTasks } from './hooks/gantt-planning';
import { useGanttRowWindow } from './hooks/use-gantt-row-window';
import {
  getGanttWorkingDuration,
  planningDate,
  workingDayPredicate,
} from './hooks/gantt-working-calendar';

const MemoTaskBar = memo(GanttTaskBar);
const EMPTY_DEPENDENCIES: GanttDependency[] = [];

/**
 * タスクとマイルストーンを階層構造およびタイムライン形式で表示する、高機能なガントチャートコンポーネント。
 */
export function GanttChart({
  tasks,
  milestones = [],
  markers = [],
  onTaskClick,
  onTaskUpdate,
  onTasksChange,
  dependencies = EMPTY_DEPENDENCIES,
  autoSchedule = false,
  schedulingOptions,
  showCriticalPath = false,
  dateEditing,
  onTaskDelete,
  onAddTask,
  onMilestoneClick,
  className,
  initialViewMode = 'Week',
  taskBarDisplay = 'none',
  displayConfig,
  scaleConfig,
  gridConfig,
  baselineConfig,
  progressConfig,
  hierarchyConfig,
  filterConfig,
  editMode = 'dialog',
  editableFields,
  showAddButton,
  showRowAddButton,
  disableOptimisticUpdates = false,
}: GanttChartProps) {
  const locale = enUS;

  // -------------------------------------------------------------------------
  // State Management
  // -------------------------------------------------------------------------

  const [optimisticTasks, setOptimisticTasks] = useState<GanttTask[] | null>(null);

  // Reset optimistic state during render when original tasks prop changes
  const [prevTasks, setPrevTasks] = useState<GanttTask[]>(tasks);
  if (tasks !== prevTasks) {
    setPrevTasks(tasks);
    setOptimisticTasks(null);
  }

  const currentTasks = disableOptimisticUpdates || !optimisticTasks ? tasks : optimisticTasks;
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const saveLock = useRef(false);
  const sourceTasks = useRef(tasks);
  const requestId = useRef(0);
  useEffect(() => {
    sourceTasks.current = tasks;
  }, [tasks]);
  useEffect(
    () => () => {
      requestId.current++;
    },
    [],
  );
  const graphError = useMemo(
    () => (dependencies.length ? dependencyError(currentTasks, dependencies) : null),
    [currentTasks, dependencies],
  );
  const planningView = useMemo(() => {
    try {
      const isWorking = schedulingOptions?.calendar
        ? workingDayPredicate(schedulingOptions.calendar)
        : undefined;
      const plan =
        showCriticalPath || (autoSchedule && schedulingOptions)
          ? planGanttTasks(currentTasks, dependencies, {
              ...schedulingOptions,
              resourceLeveling: autoSchedule ? schedulingOptions?.resourceLeveling : undefined,
            })
          : undefined;
      return { isWorking, plan, error: null };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Invalid schedule.' };
    }
  }, [currentTasks, dependencies, schedulingOptions, showCriticalPath, autoSchedule]);
  const criticalTasks = useMemo(
    () =>
      new Map(
        showCriticalPath
          ? planningView.plan?.criticalPath.tasks.map((task) => [task.taskId, task])
          : [],
      ),
    [showCriticalPath, planningView.plan],
  );
  const schedulingError =
    autoSchedule && !onTasksChange
      ? 'Automatic scheduling requires onTasksChange for atomic updates.'
      : (graphError ?? planningView.error);
  const displayTasks = useMemo(() => {
    if (!schedulingOptions && !showCriticalPath) return currentTasks;
    const localDate = (value: GanttTask['start_date']) =>
      typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? parseISO(value) : value;
    // Match day-planner date-only parsing without applying the computed schedule during render.
    return currentTasks.map((task) => ({
      ...task,
      start_date: localDate(task.start_date),
      due_date: localDate(task.due_date),
      created_at: localDate(task.created_at)!,
    }));
  }, [currentTasks, schedulingOptions, showCriticalPath]);

  const {
    state,
    visibleTasks,
    allDays,
    startDate,
    totalDays,
    setViewMode,
    selectTask,
    toggleTaskExpand,
    setCellWidth,
    goToToday,
    goToPrevious,
    goToNext,
    getXPosition,
    getWidth,
  } = useGanttState({
    tasks: displayTasks,
    initialViewMode,
    hierarchyConfig,
    scaleConfig,
  });

  const { viewMode, currentDate, cellWidth, rowHeight, selectedTaskId } = state;

  // Dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<GanttTask | null>(null);

  // -------------------------------------------------------------------------
  // Display Config Defaults
  // -------------------------------------------------------------------------

  const showTaskList = displayConfig?.showTaskList ?? true;
  const showChart = displayConfig?.showChart ?? true;
  const taskListWidth = displayConfig?.taskListWidth ?? 256;
  const showHorizontalBorders = gridConfig?.showHorizontalBorders ?? true;
  const showVerticalBorders = gridConfig?.showVerticalBorders ?? true;
  const showWeekendHighlight = gridConfig?.showWeekendHighlight ?? true;
  const showTodayHighlight = gridConfig?.showTodayHighlight ?? true;

  // -------------------------------------------------------------------------
  // Scroll Management
  // -------------------------------------------------------------------------

  const rowIds = useMemo(() => visibleTasks.map((task) => task.id), [visibleTasks]);
  const virtualized = displayConfig?.virtualizeRows !== false && visibleTasks.length > 100;
  const {
    chartRef: scrollContainerRef,
    listRef,
    start: windowStart,
    end: windowEnd,
    indices: rowIndices,
    bottomInset,
    onScroll,
    onFocusCapture,
    onBlurCapture,
    onKeyDownCapture,
    onPointerDownCapture,
    onPointerUpCapture,
    onPointerCancelCapture,
    onLostPointerCapture,
  } = useGanttRowWindow(
    rowIds,
    rowHeight,
    virtualized,
    editDialogOpen ? editingTask?.id : undefined,
    `${showTaskList}:${showChart}`,
  );
  const rowEvents = {
    onScroll,
    onFocusCapture,
    onBlurCapture,
    onKeyDownCapture,
    onPointerDownCapture,
    onPointerUpCapture,
    onPointerCancelCapture,
    onLostPointerCapture,
  };
  const mountedTasks = rowIndices.map((index) => ({ task: visibleTasks[index], index }));

  useEffect(() => {
    if (scrollContainerRef.current) {
      const todayX = getXPosition(new Date());
      const containerWidth = scrollContainerRef.current.clientWidth;
      scrollContainerRef.current.scrollLeft = todayX - containerWidth / 2;
    }
  }, [viewMode, getXPosition, scrollContainerRef]);

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  const handleTaskClick = useCallback(
    (task: ComputedTask) => {
      if (saveLock.current) return;
      selectTask(task.id);
      onTaskClick?.(task);

      if (editMode === 'dialog') {
        setEditingTask(currentTasks.find((item) => item.id === task.id) ?? task);
        setEditDialogOpen(true);
      }
    },
    [selectTask, onTaskClick, editMode, currentTasks],
  );

  const publishTask = useCallback(
    async (updatedTask: GanttTask, schedule: boolean) => {
      if (saveLock.current) return false;
      const token = ++requestId.current;
      const source = tasks;
      const previousOptimistic = optimisticTasks;
      saveLock.current = true;
      setSaving(true);
      setSaveError(null);
      try {
        // Validate the proposed schedule, so a dialog can repair invalid input dates.
        if (schedule && autoSchedule && !onTasksChange)
          throw new Error('Automatic scheduling requires onTasksChange for atomic updates.');
        let next = currentTasks.map((task) => (task.id === updatedTask.id ? updatedTask : task));
        if (schedule && autoSchedule)
          next = scheduleGanttTasks(next, dependencies, schedulingOptions);
        if (!disableOptimisticUpdates) setOptimisticTasks(next);
        if (onTasksChange) await onTasksChange(next);
        else await onTaskUpdate?.(updatedTask);
        return token === requestId.current;
      } catch (error) {
        if (token === requestId.current) {
          if (sourceTasks.current === source) setOptimisticTasks(previousOptimistic);
          setSaveError(error instanceof Error ? error.message : 'Unable to save task changes.');
        }
        return false;
      } finally {
        if (token === requestId.current) {
          saveLock.current = false;
          setSaving(false);
        }
      }
    },
    [
      tasks,
      optimisticTasks,
      autoSchedule,
      onTasksChange,
      currentTasks,
      dependencies,
      schedulingOptions,
      disableOptimisticUpdates,
      onTaskUpdate,
    ],
  );
  const handleTaskSave = async (updatedTask: GanttTask) => {
    // The date fields in the dialog edit duration; do not retain an earlier drag's override.
    const datesChanged =
      editingTask &&
      (String(updatedTask.start_date) !== String(editingTask.start_date) ||
        String(updatedTask.due_date) !== String(editingTask.due_date));
    const saved = await publishTask(
      autoSchedule && schedulingOptions && datesChanged
        ? { ...updatedTask, durationDays: undefined }
        : updatedTask,
      true,
    );
    if (saved) {
      setEditDialogOpen(false);
      setEditingTask(null);
    }
    return saved;
  };
  const handleDateChange = useCallback(
    (taskId: string, start: Date, end: Date) => {
      const original = currentTasks.find((task) => task.id === taskId);
      if (!original) return;
      let updated = { ...original, start_date: start, due_date: end };
      if (autoSchedule && schedulingOptions) {
        try {
          const oldStart = planningDate(original.start_date ?? original.created_at);
          const oldEnd =
            original.due_date == null ? addDays(oldStart, 1) : planningDate(original.due_date);
          const moving =
            differenceInCalendarDays(start, oldStart) === differenceInCalendarDays(end, oldEnd);
          // Moving preserves effort across weekends; resizing deliberately recalculates effort.
          updated = {
            ...updated,
            durationDays: getGanttWorkingDuration(
              moving ? original : { ...updated, durationDays: undefined },
              schedulingOptions.calendar,
            ),
          };
        } catch (error) {
          setSaveError(error instanceof Error ? error.message : 'Invalid task dates.');
          return;
        }
      }
      void publishTask(updated, true);
    },
    [currentTasks, autoSchedule, schedulingOptions, publishTask],
  );
  const handleProgressChange = useCallback(
    (taskId: string, progress: number) => {
      const original = currentTasks.find((item) => item.id === taskId);
      if (original) void publishTask({ ...original, progress }, false);
    },
    [currentTasks, publishTask],
  );

  const handleTaskDelete = (taskId: string) => {
    if (saveLock.current) return;
    if (!disableOptimisticUpdates) {
      const nextOptimistic = currentTasks.filter((t) => t.id !== taskId);
      setOptimisticTasks(nextOptimistic);
    }

    onTaskDelete?.(taskId);
    setEditDialogOpen(false);
    setEditingTask(null);
  };

  const handleAddTask = (parentId?: string) => {
    onAddTask?.(parentId);
  };

  const handleZoomIn = () => {
    const maxWidth = scaleConfig?.maxCellWidth ?? 100;
    setCellWidth(Math.min(cellWidth * 1.5, maxWidth));
  };

  const handleZoomOut = () => {
    const minWidth = scaleConfig?.minCellWidth ?? 5;
    setCellWidth(Math.max(cellWidth / 1.5, minWidth));
  };

  // -------------------------------------------------------------------------
  // Helper for translation
  // -------------------------------------------------------------------------

  const t = (key: string) => {
    const map: Record<string, string> = {
      today: 'Today',
      day: 'Day',
      week: 'Week',
      month: 'Month',
      tasks: 'Tasks',
      milestones: 'Milestones',
    };
    return map[key.toLowerCase()] || key;
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div
      aria-busy={saving}
      data-task-count={visibleTasks.length}
      data-virtualized={virtualized || undefined}
      className={cn(
        'flex flex-col h-full bg-background border overflow-hidden [border-radius:var(--radius-lg)] [box-shadow:var(--shadow-sm)]',
        className,
      )}
    >
      {/* Toolbar */}
      {showCriticalPath && planningView.plan && (
        <div className='px-2 py-1 text-xs text-muted-foreground' role='status'>
          Critical path (dependencies only): {planningView.plan.criticalPath.taskIds.length} tasks;
          resource contention is excluded from float.
        </div>
      )}
      {autoSchedule && schedulingOptions?.resourceLeveling?.enabled && planningView.plan && (
        <details className='px-2 py-1 text-xs text-muted-foreground' data-resource-leveling>
          <summary>
            Resource leveling preview: {planningView.plan.resourceDelays.length} delayed tasks (not
            applied until save)
          </summary>
          <ul>
            {planningView.plan.resourceDelays.map((delay) => (
              <li key={delay.taskId}>
                {currentTasks.find((task) => task.id === delay.taskId)?.title ?? delay.taskId}:
                capacity +{delay.directDays}d, predecessors +{delay.propagatedDays}d
              </li>
            ))}
          </ul>
        </details>
      )}
      {(saveError || schedulingError) && (
        <div role='alert' className='p-2 text-sm text-destructive'>
          {saveError || schedulingError}
        </div>
      )}
      <GanttToolbar
        currentDate={currentDate}
        viewMode={viewMode}
        scaleConfig={scaleConfig}
        filterConfig={filterConfig}
        onViewModeChange={setViewMode}
        onPrevious={goToPrevious}
        onNext={goToNext}
        onToday={goToToday}
        onZoomIn={scaleConfig?.zoomControls ? handleZoomIn : undefined}
        onZoomOut={scaleConfig?.zoomControls ? handleZoomOut : undefined}
      />

      <div className='flex flex-1 min-h-0 overflow-hidden'>
        {/* Sidebar (Task Names) */}
        {showTaskList && (
          <div
            className='flex-shrink-0 border-r bg-background flex flex-col z-20 [box-shadow:var(--shadow-sm)]'
            style={{ width: taskListWidth }}
          >
            <div
              className='border-b bg-muted/10 flex items-center justify-between text-muted-foreground [padding-left:var(--spacing-4)] [padding-right:var(--spacing-4)] [font-weight:var(--font-weight-semibold)] [font-size:var(--text-sm)]'
              style={{ height: rowHeight, flexShrink: 0 }}
            >
              <span>{t('tasks')}</span>
              {showAddButton && onAddTask && (
                <Button
                  variant='ghost'
                  size='icon'
                  className='h-6 w-6'
                  onClick={() => handleAddTask()}
                >
                  <Plus className='h-4 w-4' />
                </Button>
              )}
            </div>
            <div
              ref={listRef}
              {...rowEvents}
              data-gantt-list-viewport
              className='flex-1 min-h-0 overflow-auto'
            >
              <div style={{ paddingBottom: bottomInset }}>
                <div style={{ height: visibleTasks.length * rowHeight, position: 'relative' }}>
                  {mountedTasks.map(({ task, index }) => (
                    <div
                      key={task.id}
                      data-gantt-row-id={task.id}
                      className={cn(
                        'border-b flex items-center px-2 text-sm font-medium hover:bg-muted/50 cursor-pointer transition-colors group',
                        selectedTaskId === task.id && 'bg-muted',
                      )}
                      style={{
                        height: rowHeight,
                        position: 'absolute',
                        top: index * rowHeight,
                        left: 0,
                        right: 0,
                        paddingLeft: task.computedLevel * (hierarchyConfig?.indentWidth ?? 16) + 8,
                      }}
                      onClick={() => handleTaskClick(task)}
                    >
                      {/* Expand/Collapse */}
                      {task.hasChildren ? (
                        <Button
                          aria-label={`${task.title}: expand/collapse`}
                          aria-expanded={state.expandedTaskIds.has(task.id)}
                          variant='ghost'
                          size='icon'
                          className='h-4 w-4 p-0 mr-1 hover:bg-muted rounded-sm'
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleTaskExpand(task.id);
                          }}
                        >
                          {state.expandedTaskIds.has(task.id) ? (
                            <ChevronDown className='h-3 w-3' />
                          ) : (
                            <ChevronRight className='h-3 w-3' />
                          )}
                        </Button>
                      ) : (
                        <div className='w-4' />
                      )}

                      {/* Status dot */}
                      <div
                        className={cn(
                          'w-2 h-2 rounded-full mr-2 flex-shrink-0',
                          task.status === 'done'
                            ? 'bg-green-500'
                            : task.status === 'review'
                              ? 'bg-primary'
                              : task.status === 'doing'
                                ? 'bg-blue-500'
                                : task.status === 'blocked'
                                  ? 'bg-red-500'
                                  : 'bg-muted',
                        )}
                      />

                      {/* Title */}
                      <button
                        type='button'
                        className='truncate flex-1 text-left'
                        onClick={(event) => {
                          event.stopPropagation();
                          handleTaskClick(task);
                        }}
                      >
                        {task.title}
                      </button>

                      {/* Progress */}
                      {progressConfig?.showProgress && task.computedProgress > 0 && (
                        <span className='text-xs text-muted-foreground mr-2'>
                          {Math.round(task.computedProgress)}%
                        </span>
                      )}

                      {/* Assignee */}
                      {task.assignee_id && (
                        <Avatar className='h-5 w-5 ml-1 border opacity-70 group-hover:opacity-100'>
                          <AvatarFallback className='text-[9px]'>
                            {task.assignee_name?.[0]?.toUpperCase() ??
                              task.priority?.[0]?.toUpperCase() ??
                              '?'}
                          </AvatarFallback>
                        </Avatar>
                      )}

                      {/* Add child button */}
                      {showRowAddButton && onAddTask && (
                        <Button
                          variant='ghost'
                          size='icon'
                          className='h-5 w-5 opacity-0 group-hover:opacity-100'
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddTask(task.id);
                          }}
                        >
                          <Plus className='h-3 w-3' />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Milestones header */}
                {milestones.length > 0 && (
                  <div
                    className='border-b bg-muted/5 flex items-center px-4 text-xs font-semibold text-muted-foreground uppercase'
                    style={{ height: rowHeight }}
                  >
                    {t('milestones')}
                  </div>
                )}

                {/* Milestones */}
                {milestones.map((ms) => (
                  <div
                    key={ms.id}
                    className='border-b flex items-center px-4 text-sm hover:bg-muted/50 cursor-pointer'
                    style={{ height: rowHeight }}
                    onClick={() => onMilestoneClick?.(ms)}
                  >
                    <div className='w-2 h-2 rotate-45 bg-amber-500 mr-2 flex-shrink-0' />
                    <span className='truncate'>{ms.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Main Chart Area */}
        {showChart && (
          <div
            ref={scrollContainerRef}
            {...rowEvents}
            data-gantt-chart-viewport
            className='flex-1 min-w-0 overflow-auto bg-muted/5 relative'
          >
            <div style={{ width: `${totalDays * cellWidth}px`, minWidth: '100%' }}>
              {/* Timeline Header */}
              <div
                className='sticky top-0 z-10 bg-background border-b flex relative'
                style={{ height: rowHeight }}
              >
                {allDays.map((day) => {
                  const isMonthStart = day.getDate() === 1;
                  const isFirstMonday = day.getDate() <= 7 && day.getDay() === 1;
                  const isYearStart = day.getMonth() === 0 && day.getDate() === 1;
                  const isMonday = day.getDay() === 1;

                  let showUpperLabel = false;
                  let upperLabelText = '';
                  let showLowerLabel = false;
                  let lowerLabelText = '';
                  let borderClass = showVerticalBorders ? 'border-r' : '';

                  if (viewMode === 'Day') {
                    showUpperLabel = isMonthStart;
                    upperLabelText = format(day, 'yyyy MMMM', { locale });
                    showLowerLabel = true;
                    lowerLabelText = format(day, 'd', { locale });
                  } else if (viewMode === 'Week') {
                    showUpperLabel = isFirstMonday || (isMonthStart && day.getDay() === 1);
                    upperLabelText = format(day, 'yyyy MMM', { locale });
                    showLowerLabel = isMonday;
                    lowerLabelText = format(day, 'd', { locale });
                    borderClass = isMonday && showVerticalBorders ? 'border-l border-border' : '';
                  } else if (viewMode === 'Month') {
                    showUpperLabel = isYearStart;
                    upperLabelText = format(day, 'yyyy', { locale });
                    showLowerLabel = isMonthStart;
                    borderClass =
                      isMonthStart && showVerticalBorders ? 'border-l border-border' : '';
                    if (showLowerLabel) lowerLabelText = format(day, 'MMM', { locale });
                  }

                  return (
                    <div
                      key={day.toISOString()}
                      className={cn(
                        'flex-shrink-0 flex flex-col justify-end pb-1 text-[10px] text-muted-foreground select-none text-center relative',
                        borderClass,
                        (planningView.isWorking
                          ? !planningView.isWorking(day)
                          : showWeekendHighlight && isWeekend(day)) &&
                          viewMode === 'Day' &&
                          'bg-muted/10',
                        showTodayHighlight &&
                          isToday(day) &&
                          'bg-primary/10 font-semibold text-primary',
                      )}
                      style={{ width: cellWidth }}
                    >
                      {showUpperLabel && (
                        <span className='absolute top-1 left-1 text-xs font-bold text-foreground pl-1 whitespace-nowrap z-10'>
                          {upperLabelText}
                        </span>
                      )}
                      {showLowerLabel && (
                        <span
                          className={cn(
                            viewMode !== 'Day' && 'absolute bottom-1 left-1',
                            'whitespace-nowrap tracking-tighter',
                          )}
                        >
                          {lowerLabelText}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Grid & Task Bars */}
              <div className='relative'>
                {/* Background Grid */}
                <div className='absolute inset-0 flex pointer-events-none'>
                  {allDays.map((day) => {
                    let borderClass = '';
                    if (showVerticalBorders) {
                      if (viewMode === 'Day') {
                        borderClass = 'border-r';
                      } else if (viewMode === 'Week' && day.getDay() === 1) {
                        borderClass = 'border-l';
                      } else if (viewMode === 'Month' && day.getDate() === 1) {
                        borderClass = 'border-l';
                      }
                    }

                    return (
                      <div
                        key={`grid-${day.toISOString()}`}
                        className={cn(
                          'flex-shrink-0 h-full',
                          borderClass,
                          (planningView.isWorking
                            ? !planningView.isWorking(day)
                            : showWeekendHighlight && isWeekend(day)) && viewMode === 'Day'
                            ? 'bg-muted/20'
                            : 'bg-transparent',
                          showTodayHighlight && isToday(day) && 'bg-primary/5',
                        )}
                        style={{ width: cellWidth }}
                      />
                    );
                  })}

                  {/* Current Time Indicator */}
                  {(isSameDay(new Date(), startDate) || new Date() > startDate) &&
                    viewMode !== 'Month' && (
                      <div
                        className='absolute top-0 bottom-0 border-l-2 border-red-500/50 z-30 pointer-events-none'
                        style={{ left: getXPosition(new Date()) + cellWidth / 2 }}
                      >
                        <div className='w-2 h-2 bg-red-500 rounded-full -ml-[5px] mt-[-4px]' />
                      </div>
                    )}

                  {/* Custom Markers */}
                  {markers.map((marker) => renderMarker(marker, getXPosition))}
                </div>

                {/* Task Rows */}
                {!graphError && dependencies.length > 0 && (
                  <GanttDependencyLayer
                    tasks={visibleTasks}
                    dependencies={dependencies}
                    criticalDependencyIds={
                      showCriticalPath
                        ? new Set(planningView.plan?.criticalPath.dependencyIds)
                        : undefined
                    }
                    rowHeight={rowHeight}
                    width={totalDays * cellWidth}
                    getXPosition={getXPosition}
                    getWidth={getWidth}
                    rowWindow={virtualized ? { start: windowStart, end: windowEnd } : undefined}
                  />
                )}
                <div>
                  <div style={{ height: visibleTasks.length * rowHeight, position: 'relative' }}>
                    {mountedTasks.map(({ task, index }) => {
                      const left = getXPosition(task.computedStart);
                      const width = getWidth(task.computedStart, task.computedEnd);

                      // Baseline positions
                      let baselineLeft: number | undefined;
                      let baselineWidth: number | undefined;
                      if (
                        baselineConfig?.showBaseline &&
                        task.baseline_start &&
                        task.baseline_end
                      ) {
                        baselineLeft = getXPosition(new Date(task.baseline_start));
                        baselineWidth = getWidth(
                          new Date(task.baseline_start),
                          new Date(task.baseline_end),
                        );
                      }

                      return (
                        <div
                          key={task.id}
                          data-gantt-row-id={task.id}
                          className={cn('relative', showHorizontalBorders && 'border-b')}
                          style={{
                            height: rowHeight,
                            position: 'absolute',
                            top: index * rowHeight,
                            left: 0,
                            right: 0,
                          }}
                        >
                          <MemoTaskBar
                            task={task}
                            critical={criticalTasks.get(task.id)?.critical}
                            totalFloatDays={criticalTasks.get(task.id)?.totalFloatDays}
                            left={left}
                            width={width}
                            rowHeight={rowHeight}
                            taskBarDisplay={taskBarDisplay}
                            progressConfig={progressConfig}
                            baselineConfig={baselineConfig}
                            baselineLeft={baselineLeft}
                            baselineWidth={baselineWidth}
                            onClick={handleTaskClick}
                            dateEditing={dateEditing}
                            cellWidth={cellWidth}
                            editingDisabled={saving}
                            onDateChange={
                              editMode !== 'none' &&
                              (onTasksChange || onTaskUpdate) &&
                              !task.hasChildren &&
                              !(autoSchedule && schedulingError)
                                ? handleDateChange
                                : undefined
                            }
                            onProgressChange={
                              editMode !== 'none' &&
                              (onTasksChange || onTaskUpdate) &&
                              !(task.hasChildren && hierarchyConfig?.autoRollupProgress)
                                ? handleProgressChange
                                : undefined
                            }
                          />
                        </div>
                      );
                    })}
                  </div>
                  {milestones.length > 0 && <div aria-hidden style={{ height: rowHeight }} />}

                  {/* Milestone Rows */}
                  {milestones.map((ms) => {
                    const date = ms.due_date ? new Date(ms.due_date) : new Date();
                    const left = getXPosition(date);

                    return (
                      <div
                        key={ms.id}
                        className={cn('relative', showHorizontalBorders && 'border-b')}
                        style={{ height: rowHeight }}
                      >
                        <div
                          className='absolute top-3 w-6 h-6 rotate-45 bg-amber-400 border-2 border-background shadow-md hover:scale-110 transition-transform cursor-help z-10'
                          style={{ left: left - 10 }}
                          title={`${ms.name} - ${format(date, 'MMM d')}`}
                        />
                        <span
                          className='absolute top-3 text-xs text-muted-foreground whitespace-nowrap ml-2 pointer-events-none font-medium'
                          style={{ left: left + 14 }}
                        >
                          {ms.name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      {editMode === 'dialog' && (
        <TaskEditDialog
          task={editingTask}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onSave={handleTaskSave}
          error={saveError}
          onDelete={onTaskDelete ? handleTaskDelete : undefined}
          editableFields={editableFields}
        />
      )}
    </div>
  );
}

// ============================================================================
// Helper: Render Marker
// ============================================================================

function renderMarker(marker: GanttMarker, getXPosition: (date: Date) => number) {
  const date = new Date(marker.date);
  const left = getXPosition(date);
  const color = marker.color || 'var(--primary)';

  if (marker.type === 'range' && marker.endDate) {
    const endDate = new Date(marker.endDate);
    const endLeft = getXPosition(endDate);
    const width = endLeft - left;

    return (
      <div
        key={marker.id}
        className='absolute top-0 bottom-0 opacity-20 pointer-events-none z-5'
        style={{
          left,
          width,
          backgroundColor: color,
        }}
        title={marker.label}
      />
    );
  }

  return (
    <div
      key={marker.id}
      className='absolute top-0 bottom-0 border-l-2 border-dashed z-20 pointer-events-none'
      style={{
        left,
        borderColor: color,
      }}
      title={marker.label}
    >
      {marker.label && (
        <span
          className='absolute top-0 left-1 text-[10px] font-semibold whitespace-nowrap px-1 rounded'
          style={{ color, backgroundColor: `color-mix(in srgb, ${color} 20%, transparent)` }}
        >
          {marker.label}
        </span>
      )}
    </div>
  );
}
