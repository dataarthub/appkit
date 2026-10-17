/**
 * Gantt Task List Component
 *
 * Left sidebar showing task names, hierarchy, and status.
 */

import { ChevronDown, ChevronRight, Plus } from 'lucide-react';
import { ScrollArea } from '../../ui/scroll-area';
import { Avatar, AvatarFallback } from '../../ui/avatar';
import { Button } from '../../ui/button';
import { cn } from "../../../lib/utils";
import type {
  ComputedTask,
  GanttMilestone,
  GanttProgressConfig,
  GanttHierarchyConfig,
} from '../types';

export interface GanttTaskListProps {
  tasks: ComputedTask[];
  milestones: GanttMilestone[];
  selectedTaskId: string | null;
  expandedTaskIds: Set<string>;
  progressConfig?: GanttProgressConfig;
  hierarchyConfig?: GanttHierarchyConfig;
  rowHeight: number;
  width: number;
  showAddButton?: boolean;
  showRowAddButton?: boolean;
  onTaskClick: (task: ComputedTask) => void;
  onToggleExpand: (taskId: string) => void;
  onAddTask?: (parentId?: string) => void;
  onMilestoneClick?: (milestone: GanttMilestone) => void;
}

/**
 * ガントチャートの左側に表示される、タスクの階層（ツリー構造）や担当者、マイルストーンなどを一覧表示するサイドバーリストコンポーネント。
 */
export function GanttTaskList({
  tasks,
  milestones,
  selectedTaskId,
  expandedTaskIds,
  progressConfig,
  hierarchyConfig,
  rowHeight,
  width,
  showAddButton,
  showRowAddButton,
  onTaskClick,
  onToggleExpand,
  onAddTask,
  onMilestoneClick,
}: GanttTaskListProps) {
  const t = (key: string) => {
    const map: Record<string, string> = {
      tasks: 'Tasks',
      milestones: 'Milestones',
    };
    return map[key.toLowerCase()] || key;
  };

  return (
    <div
      className='flex-shrink-0 border-r bg-background flex flex-col z-20 [box-shadow:var(--shadow-sm)]'
      style={{ width }}
    >
      {/* Header */}
      <div
        className='border-b bg-muted/10 flex items-center justify-between text-muted-foreground [padding-left:var(--spacing-4)] [padding-right:var(--spacing-4)] [font-weight:var(--font-weight-semibold)] [font-size:var(--text-sm)]'
        style={{ height: rowHeight }}
      >
        <span>{t('tasks')}</span>
        {showAddButton && onAddTask && (
          <Button variant='ghost' size='icon' className='h-6 w-6' onClick={() => onAddTask()}>
            <Plus className='h-4 w-4' />
          </Button>
        )}
      </div>

      {/* Task List */}
      <ScrollArea className='flex-1'>
        <div className='flex flex-col'>
          {tasks.map((task) => (
            <div
              key={task.id}
              className={cn(
                'border-b flex items-center px-2 text-sm font-medium hover:bg-muted/50 cursor-pointer transition-colors group',
                selectedTaskId === task.id && 'bg-muted',
              )}
              style={{
                height: rowHeight,
                paddingLeft: task.computedLevel * (hierarchyConfig?.indentWidth ?? 16) + 8,
              }}
              onClick={() => onTaskClick(task)}
            >
              {/* Expand/Collapse */}
              {task.hasChildren ? (
                <button
                  className='mr-1 p-0.5 hover:bg-muted rounded'
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleExpand(task.id);
                  }}
                >
                  {expandedTaskIds.has(task.id) ? (
                    <ChevronDown className='h-3 w-3' />
                  ) : (
                    <ChevronRight className='h-3 w-3' />
                  )}
                </button>
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
              <span className='truncate flex-1'>{task.title}</span>

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
                    onAddTask(task.id);
                  }}
                >
                  <Plus className='h-3 w-3' />
                </Button>
              )}
            </div>
          ))}

          {/* Milestones header */}
          {milestones.length > 0 && (
            <div
              className='border-b bg-muted/5 flex items-center px-4 text-xs font-semibold text-muted-foreground uppercase mt-2'
              style={{ height: rowHeight * 0.67 }}
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
      </ScrollArea>
    </div>
  );
}
