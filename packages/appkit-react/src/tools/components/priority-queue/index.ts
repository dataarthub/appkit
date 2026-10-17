/**
 * Priority Queue (Focus Mode) Components
 *
 * タスク優先度キューコンポーネント群
 *
 * @example
 * ```tsx
 * import { PriorityQueue, calculatePriorityScore, type PriorityTask } from '@alneas/appkit-react/tools/priority-queue';
 *
 * const tasks: PriorityTask[] = rawTasks.map(t => ({
 *   ...t,
 *   score: calculatePriorityScore(t),
 * }));
 *
 * <PriorityQueue
 *   tasks={tasks}
 *   onTaskClick={(task) => openDetail(task.id)}
 *   onTaskComplete={(taskId) => markDone(taskId)}
 *   onRecalculate={() => recalcAll()}
 *   testId="focus-queue"
 * />
 * ```
 */

export { PriorityQueue } from './PriorityQueue';
export { PriorityCard } from './PriorityCard';

export {
  calculatePriorityScore,
  DEFAULT_SNOOZE_OPTIONS,
  type PriorityTask,
  type PriorityQueueProps,
  type PriorityCardProps,
  type SnoozeOption,
} from './types';
