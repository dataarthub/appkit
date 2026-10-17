import type { FileNode, FileProvider as CanonicalFileProvider } from "@alneas/appkit-core/data";
export type { FileNode, FileNodeKind } from "@alneas/appkit-core/data";

/**
 * 表示モード
 */
export type FileBrowserViewMode = 'list' | 'grid';

/**
 * グループ化の軸（仮想ツリー用）
 */
export interface FileGroupingAxis {
  /** メタデータのキー（例: 'transactionDate'） */
  key: string;
  /** 表示ラベル（例: '取引日'） */
  label: string;
  /** 階層化のロジック（例: 日付を年・月で分けるなど、将来拡張用） */
  transform?: (value: string) => string[];
}

/**
 * ファイルブラウザの状態
 */
export interface FileBrowserState {
  /** 現在のパス（物理プレフィックス、例: 'invoices/2026/'） */
  path: string;
  /** 現在表示されているノード一覧 */
  nodes: FileNode[];
  /** 読み込み中かどうか */
  isLoading: boolean;
  /** 選択されているノードのID一覧 */
  selectedIds: string[];
  /** 表示モード */
  viewMode: FileBrowserViewMode;
  /** エラーメッセージ */
  error?: string;
}


/** Existing private URL options remain open for provider-specific integrations. */
export interface FileProvider extends CanonicalFileProvider {
  getUrl(node: FileNode, options?: any): Promise<string>;
}
