/**
 * Kanban Board Types
 *
 * カンバンボードコンポーネントの型定義
 */

/**
 * カンバンカラム定義
 */
export interface KanbanColumn {
  /** カラムID（ステータス値と対応） */
  id: string;
  /** 表示タイトル */
  title: string;
  /** カラムカラー */
  color?: string;
  /** 最大タスク数（WIP制限） */
  limit?: number;
  /** カスタムカードレンダラー */
  renderCard?: (props: KanbanCardProps) => React.ReactNode;
}

/**
 * カンバンタスク
 */
export interface KanbanTask {
  /** タスクID */
  id: string;
  /** タスク名 */
  title: string;
  /** タスクキー（例: PROJ-123） */
  key?: string;
  /** 説明 */
  description?: string;
  /** ステータス（カラムIDと対応） */
  status: string;
  /** 優先度 */
  priority?: 'low' | 'medium' | 'high' | 'urgent' | string;
  /** 期限 */
  due_date?: string | Date | null;
  /** タグ */
  tags?: string[];
  /** プロジェクト情報 */
  project?: {
    name?: string;
    color?: string;
  };
  /** 担当者情報 */
  assignee?: {
    id?: string;
    name?: string;
    avatar?: string;
  };
  /** コメント数 */
  commentCount?: number;
  /** 添付ファイル数 */
  attachmentCount?: number;
  /** 拡張フィールド */
  [key: string]: unknown;
}

/**
 * ソートオプション
 */
export type KanbanSortOption =
  | 'default'
  | 'priority-desc'
  | 'priority-asc'
  | 'due-asc'
  | 'due-desc'
  | 'title-asc'
  | 'title-desc';

/**
 * カンバンボードProps
 */
export interface KanbanBoardProps {
  /** タスク一覧 */
  tasks: KanbanTask[];
  /** カラム定義 */
  columns: KanbanColumn[];
  /** ステータスフィールド名（デフォルト: 'status'） */
  statusField?: string;
  /** タスククリック時のコールバック */
  onTaskClick?: (task: KanbanTask) => void;
  /** ステータス変更時のコールバック */
  onStatusChange?: (taskId: string, newStatus: string) => void | Promise<void>;
  /** 並び順変更時のコールバック */
  onOrderChange?: (taskId: string, newIndex: number, columnId: string) => void | Promise<void>;
  /** スタイルクラス */
  className?: string;
  /** テストID */
  testId?: string;
  /** ソート機能を表示 */
  showSort?: boolean;
  /** 初期ソート */
  initialSort?: KanbanSortOption;
  /** 読み取り専用 */
  readOnly?: boolean;
  /** 楽観的アップデートを無効化 */
  disableOptimisticUpdates?: boolean;
  /** カスタムカードレンダラー */
  renderCard?: (props: KanbanCardProps) => React.ReactNode;
}

/**
 * カンバンカラムProps
 */
export interface KanbanColumnProps {
  /** 読み取り専用。カスタムレンダラーもdisableDragを尊重してください。 */
  readOnly?: boolean;
  /** カラム定義 */
  column: KanbanColumn;
  /** タスク一覧 */
  tasks: KanbanTask[];
  /** タスククリック時 */
  onTaskClick?: (task: KanbanTask) => void;
  /** テストID */
  testId?: string;
  /** カスタムカードレンダラー */
  renderCard?: (props: KanbanCardProps) => React.ReactNode;
}

/**
 * カンバンカードProps
 */
export interface KanbanCardProps {
  /** タスク */
  task: KanbanTask;
  /** クリック時 */
  onClick?: () => void;
  /** テストID */
  testId?: string;
  /** ドラッグ無効化 */
  disableDrag?: boolean;
}

/**
 * デフォルトカラム定義
 */
export const DEFAULT_KANBAN_COLUMNS: KanbanColumn[] = [
  { id: 'backlog', title: 'Backlog' },
  { id: 'todo', title: 'To Do' },
  { id: 'in_progress', title: 'In Progress' },
  { id: 'review', title: 'Review' },
  { id: 'done', title: 'Done' },
];
