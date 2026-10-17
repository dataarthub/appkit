import type {
  GanttDependency,
  GanttResourceAssignment,
  GanttSchedulingOptions,
  GanttScheduleResult as PlanningResult,
} from '@alneas/appkit-core/graph/planning';
export type {
  GanttDependency,
  GanttWorkingCalendar,
  GanttResource,
  GanttResourceAssignment,
  GanttResourceLeveling,
  GanttSchedulingOptions,
  GanttCriticalTask,
  GanttCriticalPath,
} from '@alneas/appkit-core/graph/planning';
/**
 * Gantt Chart Types
 *
 * Comprehensive type definitions for the enhanced Gantt chart component.
 */

// ============================================================================
// Core Task Types
// ============================================================================

/**
 * Task status values
 */
export type TaskStatus = 'todo' | 'doing' | 'review' | 'done' | 'blocked';

/**
 * Task priority levels
 */
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

/**
 * Gantt chart task interface
 */
export interface GanttTask {
  /** Unique task ID */
  id: string;
  /** Task title/name */
  title: string;
  /** Optional description */
  description?: string;

  // -------------------------------------------------------------------------
  // Dates
  // -------------------------------------------------------------------------
  /** Task start date */
  start_date?: string | Date | null;
  /** Task due/end date */
  due_date?: string | Date | null;
  /** Creation timestamp */
  created_at: string | Date;
  /** Last update timestamp */
  updated_at?: string | Date;

  // -------------------------------------------------------------------------
  // Hierarchy (Subtasks)
  // -------------------------------------------------------------------------
  /** Parent task ID (for subtasks) */
  parent_id?: string | null;
  /** Nesting level (0 = root, 1 = child, etc.) */
  level?: number;
  /** Whether children are collapsed */
  collapsed?: boolean;
  /** Child task IDs (computed) */
  children?: string[];

  // -------------------------------------------------------------------------
  // Progress
  // -------------------------------------------------------------------------
  /** Progress percentage (0-100) */
  progress?: number;

  // -------------------------------------------------------------------------
  // Baseline (Original Plan)
  // -------------------------------------------------------------------------
  /** Original planned start date */
  baseline_start?: string | Date | null;
  /** Original planned end date */
  baseline_end?: string | Date | null;

  // -------------------------------------------------------------------------
  // Status & Display
  // -------------------------------------------------------------------------
  /** Current status */
  status: TaskStatus | string;
  /** Priority level */
  priority?: TaskPriority | string | null;
  /** Custom color override */
  color?: string | null;

  // -------------------------------------------------------------------------
  // Resources
  // -------------------------------------------------------------------------
  /** Assigned user ID */
  assignee_id?: string | null;
  /** Assigned user name (for display) */
  assignee_name?: string | null;
  /** Assigned user avatar URL */
  assignee_avatar?: string | null;
  /** Day-planner duration override, in working days (0 = milestone). Ignored by legacy scheduling. */
  durationDays?: number;
  /** Simultaneous resource demand; an explicit empty array means no resources. Defaults to assignee_id at one unit. */
  resourceAssignments?: GanttResourceAssignment[];

  // -------------------------------------------------------------------------
  // Integration Links
  // -------------------------------------------------------------------------
  /** Linked Google Calendar event ID */
  calendar_event_id?: string | null;
  /** Linked attendance record ID */
  attendance_id?: string | null;

  // -------------------------------------------------------------------------
  // Extensibility
  // -------------------------------------------------------------------------
  /** Allow additional fields */
  [key: string]: unknown;
}

// ============================================================================
// Milestone Types
// ============================================================================

/**
 * Gantt chart milestone
 */
export interface GanttMilestone {
  id: string;
  name: string;
  due_date?: string | Date | null;
  color?: string | null;
  description?: string;
  completed?: boolean;
  [key: string]: unknown;
}

// ============================================================================
// Marker Types
// ============================================================================

/**
 * Custom date marker for highlighting specific dates
 */
export interface GanttMarker {
  id: string;
  /** Marker date */
  date: string | Date;
  /** Display label */
  label?: string;
  /** Marker color */
  color?: string;
  /** Marker type: line or range */
  type?: 'line' | 'range';
  /** End date (for range markers) */
  endDate?: string | Date;
}

// ============================================================================
// View & Display Types
// ============================================================================

/** View mode: Day, Week, Month */
export type GanttViewMode = 'Day' | 'Week' | 'Month';

/** What to display on task bars */
export type TaskBarDisplay = 'duration' | 'end-date' | 'both' | 'none';

/** Task editing mode */
export type EditMode = 'dialog' | 'pane' | 'inline' | 'none';

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Display configuration
 */
export interface GanttDisplayConfig {
  /**
   * Window task rows above 100 visible tasks (default true). Fixed row height; both panes
   * scroll together. Tab traverses rows and Ctrl+Home/End reaches first/last task.
   * Set false for full DOM output, browser find-in-page, or print/export workflows.
   */
  virtualizeRows?: boolean;
  /** Show left panel with task list */
  showTaskList?: boolean;
  /** Show Gantt chart bars */
  showChart?: boolean;
  /** Task list panel width (px) */
  taskListWidth?: number;
  /** Allow resizing task list */
  resizableTaskList?: boolean;
}

/**
 * Scale/zoom configuration
 */
export interface GanttScaleConfig {
  /** Pixels per day (column width) */
  cellWidth?: number;
  /** Row height in pixels */
  rowHeight?: number;
  /** Minimum cell width for zoom */
  minCellWidth?: number;
  /** Maximum cell width for zoom */
  maxCellWidth?: number;
  /** Show zoom +/- controls */
  zoomControls?: boolean;
}

/**
 * Grid lines configuration
 */
export interface GanttGridConfig {
  /** Show horizontal row borders */
  showHorizontalBorders?: boolean;
  /** Show vertical column borders */
  showVerticalBorders?: boolean;
  /** Highlight weekends */
  showWeekendHighlight?: boolean;
  /** Highlight today */
  showTodayHighlight?: boolean;
}

/**
 * Baseline comparison configuration
 */
export interface GanttBaselineConfig {
  /** Show baseline bars */
  showBaseline?: boolean;
  /** Baseline bar color */
  baselineColor?: string;
  /** Position relative to task bar */
  baselinePosition?: 'above' | 'below' | 'behind';
}

/**
 * Progress display configuration
 */
export interface GanttProgressConfig {
  /** Show progress on task bars */
  showProgress?: boolean;
  /** Progress fill color */
  progressColor?: string;
  /** Enable a 0–100 progress slider (pointer and keyboard). Requires an update callback; rolled-up summaries are read-only. */
  editableProgress?: boolean;
}

/**
 * Hierarchy/subtask configuration
 */
export interface GanttHierarchyConfig {
  /** Enable parent/child relationships */
  enabled?: boolean;
  /** Maximum visual indentation depth; descendants remain present in the hierarchy. */
  maxDepth?: number;
  /** Recursively expand parent bounds to contain descendants, preserving manual parent bounds. */
  autoRollupDates?: boolean;
  /** Recursively average immediate children's computed progress (not duration-weighted). */
  autoRollupProgress?: boolean;
  /** Indent per level (px) */
  indentWidth?: number;
}

/**
 * Filter field definition
 */
export interface GanttFilterField {
  /** Field key in task object */
  field: string;
  /** Display label */
  label: string;
  /** Filter control type */
  type: 'select' | 'multi-select' | 'date-range' | 'text' | 'number-range';
  /** Options for select types */
  options?: Array<{ value: string; label: string }>;
}

/**
 * Filter configuration
 */
export interface GanttFilterConfig {
  /** Enable filtering */
  enabled?: boolean;
  /** Available filter fields */
  fields?: GanttFilterField[];
  /** Current filter values */
  values?: Record<string, unknown>;
}

/**
 * Integration configuration
 */
export interface GanttIntegrationConfig {
  /** Linked calendar events */
  calendarEvents?: Array<{
    id: string;
    taskId: string;
    start: Date;
    end: Date;
    title: string;
  }>;
  /** Linked attendance records */
  attendanceRecords?: Array<{
    id: string;
    taskId: string;
    actualStart: Date;
    actualEnd: Date;
    duration: number;
  }>;
  /** Auto-sync with calendar changes */
  autoUpdateFromCalendar?: boolean;
  /** Auto-sync with attendance changes */
  autoUpdateFromAttendance?: boolean;
}

// ============================================================================
// Props Types
// ============================================================================

/** Scheduling result retaining the React task's display fields. */
export type GanttScheduleResult = PlanningResult<GanttTask>;

/** Opt-in date editing in the preset chart and standalone task bars. */
export interface GanttDateEditingConfig {
  /** Enable pointer/keyboard date editing. Default false. */
  enabled?: boolean;
  /** Allow moving the whole bar. Default true. */
  movable?: boolean;
  /** Allow resizing either endpoint. Default true. */
  resizable?: boolean;
  /** Positive integer calendar-day snap step. Default 1. */
  snapDays?: number;
}

/**
 * Gantt Chart component props
 */
export interface GanttChartProps {
  // -------------------------------------------------------------------------
  // Data
  // -------------------------------------------------------------------------
  /** Tasks to display */
  tasks: GanttTask[];
  /** Milestones to display */
  milestones?: GanttMilestone[];
  /** Custom date markers */
  markers?: GanttMarker[];
  /** Controlled dependency graph; hidden endpoints are not drawn. */
  dependencies?: GanttDependency[];
  /** Forward-only scheduling on date edits/saves. Requires onTasksChange. */
  autoSchedule?: boolean;
  /** Opt into the day planner for autoSchedule; omitted retains legacy calendar-day behavior. */
  schedulingOptions?: GanttSchedulingOptions;
  /** Highlight dependency-only critical tasks and show float in bar tooltips. Does not save or level tasks. */
  showCriticalPath?: boolean;
  /** Opt-in date movement and resizing; read-only when editMode is none or no update callback exists. */
  dateEditing?: GanttDateEditingConfig;

  // -------------------------------------------------------------------------
  // View
  // -------------------------------------------------------------------------
  /** Initial view mode */
  initialViewMode?: GanttViewMode;
  /** What to show on task bars */
  taskBarDisplay?: TaskBarDisplay;

  // -------------------------------------------------------------------------
  // Configuration
  // -------------------------------------------------------------------------
  /** Display options */
  displayConfig?: GanttDisplayConfig;
  /** Scale/zoom options */
  scaleConfig?: GanttScaleConfig;
  /** Grid options */
  gridConfig?: GanttGridConfig;
  /** Baseline options */
  baselineConfig?: GanttBaselineConfig;
  /** Progress options */
  progressConfig?: GanttProgressConfig;
  /** Hierarchy options */
  hierarchyConfig?: GanttHierarchyConfig;
  /** Filter options */
  filterConfig?: GanttFilterConfig;
  /** Integration options */
  integrationConfig?: GanttIntegrationConfig;

  // -------------------------------------------------------------------------
  // Editing
  // -------------------------------------------------------------------------
  /** Task editing mode */
  editMode?: EditMode;
  /** Fields editable in edit mode */
  editableFields?: string[];
  /** Show add task button globally */
  showAddButton?: boolean;
  /** Show add button on each row */
  showRowAddButton?: boolean;
  /** 楽観的アップデートを無効化 */
  disableOptimisticUpdates?: boolean;

  // -------------------------------------------------------------------------
  // Callbacks
  // -------------------------------------------------------------------------
  /** Called when task is clicked */
  onTaskClick?: (task: GanttTask) => void;
  /** Called when task is updated */
  onTaskUpdate?: (task: GanttTask) => void;
  /** Atomic task-array update, required for cascading schedules. Reject to roll back optimistic changes. */
  onTasksChange?: (tasks: GanttTask[]) => void | Promise<void>;
  /** Called when task is deleted */
  onTaskDelete?: (taskId: string) => void;
  /** Called when adding new task */
  onAddTask?: (parentId?: string, siblingId?: string) => void;
  /** Called when milestone is clicked */
  onMilestoneClick?: (milestone: GanttMilestone) => void;

  // -------------------------------------------------------------------------
  // Styling
  // -------------------------------------------------------------------------
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// State Types
// ============================================================================

/**
 * Gantt chart internal state
 */
export interface GanttState {
  viewMode: GanttViewMode;
  currentDate: Date;
  selectedTaskId: string | null;
  expandedTaskIds: Set<string>;
  filterValues: Record<string, unknown>;
  cellWidth: number;
  rowHeight: number;
}

/**
 * Computed task with hierarchy info
 */
export interface ComputedTask extends GanttTask {
  /** Computed nesting level */
  computedLevel: number;
  /** Whether this task has children */
  hasChildren: boolean;
  /** Whether this task is visible (based on parent collapse) */
  isVisible: boolean;
  /** Computed start date */
  computedStart: Date;
  /** Computed end date */
  computedEnd: Date;
  /** Computed progress (from children if has any) */
  computedProgress: number;
}
