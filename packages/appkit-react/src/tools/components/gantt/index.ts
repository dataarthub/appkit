/**
 * Gantt Chart Component
 *
 * A powerful Gantt chart for project management with:
 * - Hierarchical tasks (subtasks)
 * - Progress tracking
 * - Baseline comparison
 * - Task editing via dialog
 * - Filtering
 * - Custom markers
 * - Multiple view modes (Day/Week/Month)
 *
 * @example
 * ```tsx
 * import { GanttChart } from '@alneas/appkit-react/tools/gantt';
 *
 * <GanttChart
 *   tasks={tasks}
 *   milestones={milestones}
 *   onTaskClick={(task) => console.log(task)}
 *   onTaskUpdate={(task) => updateTask(task)}
 *   editMode="dialog"
 *   progressConfig={{ showProgress: true }}
 * />
 * ```
 */

export { GanttChart } from './GanttChart';
export { Gantt, useGanttCompoundContext } from './gantt-compound';
export type {
  GanttCompoundContextValue,
  GanttRootProps,
  GanttToolbarProps,
  GanttLayoutProps,
} from './gantt-compound';

// Types
export type {
  GanttTask,
  GanttDependency,
  GanttWorkingCalendar,
  GanttResource,
  GanttResourceAssignment,
  GanttResourceLeveling,
  GanttSchedulingOptions,
  GanttCriticalTask,
  GanttCriticalPath,
  GanttScheduleResult,
  GanttDateEditingConfig,
  GanttMilestone,
  GanttMarker,
  GanttChartProps,
  TaskStatus,
  TaskPriority,
  GanttViewMode,
  TaskBarDisplay,
  EditMode,
  GanttDisplayConfig,
  GanttScaleConfig,
  GanttGridConfig,
  GanttBaselineConfig,
  GanttProgressConfig,
  GanttHierarchyConfig,
  GanttFilterConfig,
  GanttFilterField,
  GanttIntegrationConfig,
  GanttState,
  ComputedTask,
} from './types';

// Hooks
export { useGanttState } from './hooks';
export { scheduleGanttTasks } from './hooks/gantt-scheduling';
export { planGanttTasks, analyzeGanttCriticalPath } from './hooks/gantt-planning';
export { isGanttWorkingDay, getGanttWorkingDuration } from './hooks/gantt-working-calendar';
export type { UseGanttStateOptions, UseGanttStateResult } from './hooks';

// Components
export { GanttToolbar, GanttTaskBar, GanttTaskList, GanttGrid } from './components';

// Dialogs
export { TaskEditDialog, FilterDialog } from './dialogs';
export type { TaskEditDialogProps, FilterDialogProps } from './dialogs';
export * from './components/GanttDependencyLayer';
export * from './components/GanttGrid';
export * from './components/GanttTaskBar';
export * from './hooks/gantt-hierarchy';
export * from './hooks/use-gantt-date-editing';
export * from './hooks/use-gantt-row-window';
export * from './types';
