/**
 * Gantt Chart State Management Hook
 *
 * Manages view state, selection, and computed data for the Gantt chart.
 */

import { useState, useMemo, useCallback } from 'react';
import { computeGanttTasks } from './gantt-hierarchy';
import type {
  GanttTask,
  GanttState,
  ComputedTask,
  GanttViewMode,
  GanttHierarchyConfig,
  GanttScaleConfig,
} from '../types';
import {
  addDays,
  differenceInDays,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
} from 'date-fns';

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_SCALE: Record<GanttViewMode, { cellWidth: number; daysBuffer: number }> = {
  Day: { cellWidth: 50, daysBuffer: 30 },
  Week: { cellWidth: 15, daysBuffer: 90 },
  Month: { cellWidth: 5, daysBuffer: 365 * 2 },
};

// ============================================================================
// Hook
// ============================================================================

export interface UseGanttStateOptions {
  tasks: GanttTask[];
  initialViewMode?: GanttViewMode;
  hierarchyConfig?: GanttHierarchyConfig;
  scaleConfig?: GanttScaleConfig;
}

export interface UseGanttStateResult {
  // State
  state: GanttState;

  // Computed
  computedTasks: ComputedTask[];
  visibleTasks: ComputedTask[];
  allDays: Date[];
  startDate: Date;
  endDate: Date;
  totalDays: number;

  // Actions
  setViewMode: (mode: GanttViewMode) => void;
  setCurrentDate: (date: Date) => void;
  selectTask: (taskId: string | null) => void;
  toggleTaskExpand: (taskId: string) => void;
  setCellWidth: (width: number) => void;
  setRowHeight: (height: number) => void;
  goToToday: () => void;
  goToPrevious: () => void;
  goToNext: () => void;

  // Helpers
  getXPosition: (date: Date) => number;
  getWidth: (start: Date, end: Date) => number;
}

/**
 * ガントチャートの表示状態、日付範囲の算出、タスクの階層（親子関係）処理、ズーム率などを管理するカスタムフック。
 */
export function useGanttState(options: UseGanttStateOptions): UseGanttStateResult {
  const { tasks, initialViewMode = 'Week', hierarchyConfig, scaleConfig } = options;

  // -------------------------------------------------------------------------
  // State
  // -------------------------------------------------------------------------

  const [viewMode, setViewMode] = useState<GanttViewMode>(initialViewMode);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [expandedTaskIds, setExpandedTaskIds] = useState<Set<string>>(
    () => new Set(tasks.filter((task) => task.collapsed === false).map((task) => task.id)),
  );
  const [cellWidth, setCellWidth] = useState(
    scaleConfig?.cellWidth ?? DEFAULT_SCALE[initialViewMode].cellWidth,
  );
  const [rowHeight, setRowHeight] = useState(scaleConfig?.rowHeight ?? 48);

  // -------------------------------------------------------------------------
  // View Configuration
  // -------------------------------------------------------------------------

  const config = useMemo(() => {
    const baseConfig = DEFAULT_SCALE[viewMode];
    return {
      cellWidth: scaleConfig?.cellWidth ?? baseConfig.cellWidth,
      daysBuffer: baseConfig.daysBuffer,
    };
  }, [viewMode, scaleConfig?.cellWidth]);

  // -------------------------------------------------------------------------
  // Date Range
  // -------------------------------------------------------------------------

  const startDate = useMemo(() => {
    const d = addDays(currentDate, -config.daysBuffer);
    return viewMode === 'Month' ? startOfMonth(d) : startOfWeek(d, { weekStartsOn: 1 });
  }, [currentDate, config.daysBuffer, viewMode]);

  const endDate = useMemo(() => {
    const d = addDays(currentDate, config.daysBuffer);
    return viewMode === 'Month' ? endOfMonth(d) : endOfWeek(d, { weekStartsOn: 1 });
  }, [currentDate, config.daysBuffer, viewMode]);

  const totalDays = differenceInDays(endDate, startDate) + 1;

  const allDays = useMemo(
    () => eachDayOfInterval({ start: startDate, end: endDate }),
    [startDate, endDate],
  );

  // -------------------------------------------------------------------------
  // Computed Tasks with Hierarchy
  // -------------------------------------------------------------------------

  const computedTasks = useMemo(
    () => computeGanttTasks(tasks, expandedTaskIds, hierarchyConfig),
    [tasks, expandedTaskIds, hierarchyConfig],
  );
  const visibleTasks = useMemo(() => computedTasks.filter((t) => t.isVisible), [computedTasks]);

  // -------------------------------------------------------------------------
  // Position Helpers
  // -------------------------------------------------------------------------

  const getXPosition = useCallback(
    (date: Date): number => {
      const diff = differenceInDays(date, startDate);
      return diff * cellWidth;
    },
    [startDate, cellWidth],
  );

  const getWidth = useCallback(
    (start: Date, end: Date): number => {
      const days = differenceInDays(end, start);
      return Math.max(days * cellWidth, cellWidth);
    },
    [cellWidth],
  );

  // -------------------------------------------------------------------------
  // Navigation
  // -------------------------------------------------------------------------

  const goToToday = useCallback(() => setCurrentDate(new Date()), []);

  const goToPrevious = useCallback(() => {
    const months = viewMode === 'Month' ? 6 : 1;
    setCurrentDate((prev) => addDays(prev, -months * 30));
  }, [viewMode]);

  const goToNext = useCallback(() => {
    const months = viewMode === 'Month' ? 6 : 1;
    setCurrentDate((prev) => addDays(prev, months * 30));
  }, [viewMode]);

  // -------------------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------------------

  const selectTask = useCallback((taskId: string | null) => {
    setSelectedTaskId(taskId);
  }, []);

  const toggleTaskExpand = useCallback((taskId: string) => {
    setExpandedTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  }, []);

  const handleSetViewMode = useCallback((mode: GanttViewMode) => {
    setViewMode(mode);
    setCellWidth(DEFAULT_SCALE[mode].cellWidth);
  }, []);

  // -------------------------------------------------------------------------
  // Combined State
  // -------------------------------------------------------------------------

  const state: GanttState = {
    viewMode,
    currentDate,
    selectedTaskId,
    expandedTaskIds,
    filterValues: {},
    cellWidth,
    rowHeight,
  };

  return {
    state,
    computedTasks,
    visibleTasks,
    allDays,
    startDate,
    endDate,
    totalDays,
    setViewMode: handleSetViewMode,
    setCurrentDate,
    selectTask,
    toggleTaskExpand,
    setCellWidth,
    setRowHeight,
    goToToday,
    goToPrevious,
    goToNext,
    getXPosition,
    getWidth,
  };
}
