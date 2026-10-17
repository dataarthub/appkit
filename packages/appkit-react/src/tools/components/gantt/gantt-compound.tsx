/**
 * @fileoverview Gantt Compound Components (Gantt)
 *
 * 合成可能なガントチャートUIコンポーネント群。
 * プリセットの `<GanttChart>` では対応しきれない左側タスクツリーのカスタム列追加や
 * ツールバーへの独自ボタン挿入を可能にします。
 *
 * @module gantt/gantt-compound
 */

/* eslint-disable react-refresh/only-export-components */

import * as React from 'react';
import { cn } from "../../lib/utils";
import { useGanttState } from './hooks/useGanttState';
import { GanttToolbar } from './components/GanttToolbar';
import { TaskEditDialog } from './dialogs/TaskEditDialog';
import { FilterDialog } from './dialogs/FilterDialog';
import type {
  GanttTask,
  GanttMilestone,
  GanttMarker,
  GanttViewMode,
  GanttDisplayConfig,
  GanttGridConfig,
  GanttBaselineConfig,
  GanttProgressConfig,
  GanttHierarchyConfig,
  GanttState,
  ComputedTask,
} from './types';

// =============================================================================
// Context
// =============================================================================

export interface GanttCompoundContextValue {
  state: GanttState;
  onTaskClick?: (task: GanttTask) => void;
  onTaskUpdate?: (task: GanttTask) => void;
  onTaskDelete?: (taskId: string) => void;
  onTaskAdd?: (task: Partial<GanttTask>) => void;
  onMilestoneClick?: (milestone: GanttMilestone) => void;
  onMarkerClick?: (marker: GanttMarker) => void;
  computedTasks: ComputedTask[];
  visibleTasks: ComputedTask[];
  tasks: GanttTask[];
  milestones: GanttMilestone[];
  markers: GanttMarker[];
  viewMode: GanttViewMode;
  setViewMode: (mode: GanttViewMode) => void;
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
}

const GanttCompoundContext = React.createContext<GanttCompoundContextValue | null>(null);

/**
 * GanttCompound のコンテキストを取得するフック
 */
export function useGanttCompoundContext() {
  const context = React.useContext(GanttCompoundContext);
  if (!context) {
    throw new Error('Gantt compound components must be used within <Gantt.Root>');
  }
  return context;
}

// =============================================================================
// Gantt Root
// =============================================================================

export interface GanttRootProps extends React.HTMLAttributes<HTMLDivElement> {
  tasks: GanttTask[];
  milestones?: GanttMilestone[];
  markers?: GanttMarker[];
  initialViewMode?: GanttViewMode;
  initialDate?: Date;
  displayConfig?: GanttDisplayConfig;
  gridConfig?: GanttGridConfig;
  baselineConfig?: GanttBaselineConfig;
  progressConfig?: GanttProgressConfig;
  hierarchyConfig?: GanttHierarchyConfig;
  onTaskClick?: (task: GanttTask) => void;
  onTaskUpdate?: (task: GanttTask) => void;
  onTaskDelete?: (taskId: string) => void;
  onTaskAdd?: (task: Partial<GanttTask>) => void;
  onMilestoneClick?: (milestone: GanttMilestone) => void;
  onMarkerClick?: (marker: GanttMarker) => void;
  children: React.ReactNode;
}

/**
 * ガントチャートのルートコンポーネント
 */
export function GanttRoot({
  tasks,
  milestones = [],
  markers = [],
  initialViewMode = 'Week',
  initialDate = new Date(),
  displayConfig: _displayConfig,
  gridConfig: _gridConfig,
  baselineConfig: _baselineConfig,
  progressConfig: _progressConfig,
  hierarchyConfig,
  onTaskClick,
  onTaskUpdate,
  onTaskDelete,
  onTaskAdd,
  onMilestoneClick,
  onMarkerClick,
  children,
  className,
  ...props
}: GanttRootProps) {
  const ganttState = useGanttState({
    tasks,
    initialViewMode,
    hierarchyConfig,
  });

  const [viewMode, setViewMode] = React.useState<GanttViewMode>(initialViewMode);
  const [currentDate, setCurrentDate] = React.useState<Date>(initialDate);

  const contextValue = React.useMemo<GanttCompoundContextValue>(
    () => ({
      state: ganttState.state,
      onTaskClick,
      onTaskUpdate,
      onTaskDelete,
      onTaskAdd,
      onMilestoneClick,
      onMarkerClick,
      computedTasks: ganttState.computedTasks,
      visibleTasks: ganttState.visibleTasks,
      tasks,
      milestones,
      markers,
      viewMode,
      setViewMode,
      currentDate,
      setCurrentDate,
    }),
    [
      ganttState,
      onTaskClick,
      onTaskUpdate,
      onTaskDelete,
      onTaskAdd,
      onMilestoneClick,
      onMarkerClick,
      tasks,
      milestones,
      markers,
      viewMode,
      currentDate,
    ],
  );

  return (
    <GanttCompoundContext.Provider value={contextValue}>
      <div
        className={cn(
          'flex flex-col h-full w-full rounded-lg border border-border bg-card overflow-hidden',
          className,
        )}
        {...props}
      >
        {children}
      </div>
    </GanttCompoundContext.Provider>
  );
}

// =============================================================================
// Gantt Toolbar
// =============================================================================

export interface GanttToolbarProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

/**
 * ガントチャートのツールバー領域
 */
export function GanttToolbarSlot({
  className,
  children,
  ...props
}: GanttToolbarProps) {
  const {
    viewMode,
    setViewMode,
    currentDate,
    setCurrentDate,
  } = useGanttCompoundContext();

  const handlePrevious = () => {
    const prev = new Date(currentDate);
    if (viewMode === 'Day') prev.setDate(prev.getDate() - 7);
    else if (viewMode === 'Week') prev.setDate(prev.getDate() - 30);
    else prev.setMonth(prev.getMonth() - 3);
    setCurrentDate(prev);
  };

  const handleNext = () => {
    const next = new Date(currentDate);
    if (viewMode === 'Day') next.setDate(next.getDate() + 7);
    else if (viewMode === 'Week') next.setDate(next.getDate() + 30);
    else next.setMonth(next.getMonth() + 3);
    setCurrentDate(next);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  return (
    <div
      className={cn('flex flex-wrap items-center justify-between gap-3 p-3 border-b border-border bg-muted/20', className)}
      {...props}
    >
      {children ? (
        children
      ) : (
        <GanttToolbar
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          currentDate={currentDate}
          onPrevious={handlePrevious}
          onNext={handleNext}
          onToday={handleToday}
        />
      )}
    </div>
  );
}

// =============================================================================
// Gantt Layout (Split View Container)
// =============================================================================

export interface GanttLayoutProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

/**
 * ガントチャートのメインレイアウトコンテナ
 */
export function GanttLayoutSlot({
  className,
  children,
  ...props
}: GanttLayoutProps) {
  return (
    <div className={cn('flex flex-1 overflow-hidden relative', className)} {...props}>
      {children}
    </div>
  );
}

// =============================================================================
// Export Object
// =============================================================================

export const Gantt = {
  Root: GanttRoot,
  Toolbar: GanttToolbarSlot,
  Layout: GanttLayoutSlot,
  TaskEditDialog: TaskEditDialog,
  FilterDialog: FilterDialog,
};
