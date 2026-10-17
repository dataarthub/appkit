/**
 * Priority Queue Component
 *
 * Focus Mode 用の優先度キューリスト
 *
 * @example
 * ```tsx
 * import { PriorityQueue, calculatePriorityScore } from '@alneas/appkit-react/tools/priority-queue';
 *
 * const tasks = rawTasks.map(t => ({
 *   ...t,
 *   score: calculatePriorityScore(t),
 * }));
 *
 * <PriorityQueue
 *   tasks={tasks}
 *   onTaskClick={(task) => openDetail(task.id)}
 *   onTaskComplete={(taskId) => markDone(taskId)}
 *   onFactorsUpdate={(taskId, factors) => updateFactors(taskId, factors)}
 *   onRecalculate={() => recalcAll()}
 *   testId="focus-queue"
 * />
 * ```
 */

import * as React from 'react';
import { RefreshCw, Target } from 'lucide-react';

import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { PriorityCard } from './PriorityCard';
import type { PriorityQueueProps } from './types';
import { calculatePriorityScore, DEFAULT_SNOOZE_OPTIONS } from './types';

/**
 * 優先度キュー
 */
export const PriorityQueue = React.forwardRef<HTMLDivElement, PriorityQueueProps>(
  (
    {
      tasks: rawTasks,
      maxItems,
      onTaskClick,
      onTaskComplete,
      onTaskSnooze,
      onFactorsUpdate,
      onRecalculate,
      snoozeOptions = DEFAULT_SNOOZE_OPTIONS,
      className,
      testId,
      readOnly = false,
      compact = false,
    },
    ref,
  ) => {
    const [isRecalculating, setIsRecalculating] = React.useState(false);

    // スコアでソート
    const sortedTasks = React.useMemo(() => {
      const withScore = rawTasks.map((t) => ({
        ...t,
        score: t.score ?? calculatePriorityScore(t),
      }));
      withScore.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
      return maxItems ? withScore.slice(0, maxItems) : withScore;
    }, [rawTasks, maxItems]);

    const handleRecalculate = async () => {
      if (!onRecalculate) return;
      setIsRecalculating(true);
      try {
        await onRecalculate();
      } finally {
        setIsRecalculating(false);
      }
    };

    return (
      <div
        ref={ref}
        data-slot='priority-queue'
        data-testid={testId}
        className={cn('flex flex-col h-full', className)}
      >
        {/* ヘッダー */}
        <div
          data-slot='priority-queue-header'
          className='flex items-center justify-between px-4 py-3 border-b'
        >
          <div className='flex items-center gap-2'>
            <Target className='w-5 h-5 text-primary' />
            <h2 className='text-lg font-semibold'>Focus Mode</h2>
            <span className='text-sm text-muted-foreground'>{sortedTasks.length} tasks</span>
          </div>

          {onRecalculate && (
            <Button
              variant='outline'
              size='sm'
              onClick={handleRecalculate}
              disabled={isRecalculating}
              testId={testId ? `${testId}-recalc` : undefined}
            >
              <RefreshCw className={cn('w-4 h-4 mr-2', isRecalculating && 'animate-spin')} />
              Recalculate
            </Button>
          )}
        </div>

        {/* タスクリスト */}
        <ScrollArea className='flex-1'>
          <div
            data-slot='priority-queue-list'
            className={cn('p-4 space-y-3', compact && 'p-2 space-y-2')}
          >
            {sortedTasks.length === 0 ? (
              <div
                data-slot='priority-queue-empty'
                className='flex flex-col items-center justify-center py-12 text-muted-foreground'
              >
                <Target className='w-12 h-12 mb-4 opacity-30' />
                <p className='text-sm'>No tasks to focus on</p>
                <p className='text-xs'>Great job! 🎉</p>
              </div>
            ) : (
              sortedTasks.map((task, index) => (
                <PriorityCard
                  key={task.id}
                  task={task}
                  rank={index + 1}
                  testId={testId ? `${testId}-task-${task.id}` : undefined}
                  onClick={() => onTaskClick?.(task)}
                  onComplete={() => onTaskComplete?.(task.id)}
                  onSnooze={(minutes) => onTaskSnooze?.(task.id, minutes)}
                  onFactorsUpdate={
                    onFactorsUpdate ? (factors) => onFactorsUpdate(task.id, factors) : undefined
                  }
                  snoozeOptions={snoozeOptions}
                  readOnly={readOnly}
                />
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    );
  },
);

PriorityQueue.displayName = 'PriorityQueue';
