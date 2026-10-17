/**
 * Priority Queue (Focus Mode) Types
 *
 * 優先度キューコンポーネントの型定義
 */

/**
 * 優先度キュータスク
 */
export interface PriorityTask {
  /** タスクID */
  id: string;
  /** タスク名 */
  title: string;
  /** 説明 */
  description?: string;
  /** ステータス */
  status: string;
  /** 期限 */
  due_date?: string | Date | null;

  // Focus Mode スコアリング
  /** インパクト (1-10) */
  impact?: number;
  /** 労力 (1-10) */
  effort?: number;
  /** リスク (0-10) */
  risk?: number;
  /** 計算された優先度スコア */
  score?: number;

  /** 優先度（従来型） */
  priority?: 'low' | 'medium' | 'high' | 'urgent' | string;

  /** プロジェクト */
  project?: {
    id?: string;
    name?: string;
    color?: string;
  };

  /** 担当者 */
  assignee?: {
    id?: string;
    name?: string;
    avatar?: string;
  };

  /** 拡張 */
  [key: string]: unknown;
}

/**
 * スナーズオプション
 */
export interface SnoozeOption {
  /** 期間（分） */
  minutes: number;
  /** ラベル */
  label: string;
}

/**
 * 優先度キューProps
 */
export interface PriorityQueueProps {
  /** タスク一覧（スコア順にソートされる） */
  tasks: PriorityTask[];
  /** 表示最大件数 */
  maxItems?: number;
  /** タスククリック時 */
  onTaskClick?: (task: PriorityTask) => void;
  /** タスク完了時 */
  onTaskComplete?: (taskId: string) => void | Promise<void>;
  /** スヌーズ時 */
  onTaskSnooze?: (taskId: string, minutes: number) => void | Promise<void>;
  /** ファクター更新時 */
  onFactorsUpdate?: (
    taskId: string,
    factors: { impact?: number; effort?: number; risk?: number },
  ) => void | Promise<void>;
  /** 再計算ボタンクリック時 */
  onRecalculate?: () => void | Promise<void>;
  /** スナーズオプション */
  snoozeOptions?: SnoozeOption[];
  /** スタイルクラス */
  className?: string;
  /** テストID */
  testId?: string;
  /** 読み取り専用 */
  readOnly?: boolean;
  /** コンパクト表示 */
  compact?: boolean;
}

/**
 * 優先度カードProps
 */
export interface PriorityCardProps {
  /** タスク */
  task: PriorityTask;
  /** ランク (1-based) */
  rank: number;
  /** クリック時 */
  onClick?: () => void;
  /** 完了時 */
  onComplete?: () => void;
  /** スヌーズ時 */
  onSnooze?: (minutes: number) => void;
  /** ファクター更新時 */
  onFactorsUpdate?: (factors: { impact?: number; effort?: number; risk?: number }) => void;
  /** スヌーズオプション */
  snoozeOptions?: SnoozeOption[];
  /** テストID */
  testId?: string;
  /** 読み取り専用 */
  readOnly?: boolean;
  /** 展開/折りたたみ状態 */
  expanded?: boolean;
  /** 展開状態変更時 */
  onExpandedChange?: (expanded: boolean) => void;
}

/**
 * デフォルトスヌーズオプション
 */
export const DEFAULT_SNOOZE_OPTIONS: SnoozeOption[] = [
  { minutes: 30, label: '30 min' },
  { minutes: 60, label: '1 hour' },
  { minutes: 180, label: '3 hours' },
  { minutes: 1440, label: 'Tomorrow' },
  { minutes: 10080, label: 'Next week' },
];

/**
 * 優先度スコア計算
 */
export function calculatePriorityScore(task: {
  priority?: string;
  due_date?: string | Date | null;
  impact?: number;
  effort?: number;
  risk?: number;
}): number {
  // Urgency based on due date
  let urgency = 0;
  if (task.due_date) {
    const now = Date.now();
    const due = new Date(task.due_date).getTime();
    const daysUntilDue = (due - now) / (1000 * 60 * 60 * 24);

    if (daysUntilDue <= 0) urgency = 10;
    else if (daysUntilDue <= 1) urgency = 8;
    else if (daysUntilDue <= 3) urgency = 6;
    else if (daysUntilDue <= 7) urgency = 4;
    else urgency = 2;
  }

  // Priority bonus
  const priorityBonus: Record<string, number> = {
    urgent: 5,
    high: 3,
    medium: 1,
    low: 0,
    '3': 5,
    '2': 3,
    '1': 1,
    '0': 0,
  };

  const score =
    2 * (task.impact || 5) +
    1.5 * urgency +
    (priorityBonus[task.priority || 'medium'] || 1) +
    (task.risk || 0) -
    (task.effort || 5);

  return Math.round(score * 10) / 10;
}
