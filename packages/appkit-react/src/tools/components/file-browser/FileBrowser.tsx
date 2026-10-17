import { useCallback, useMemo, useState } from 'react';
import { useStorageBrowser } from './useStorageBrowser';
import { FileNavbar } from './FileNavbar';
import { FileListView } from './FileListView';
import { FileGridView } from './FileGridView';
import { FilePreview } from './FilePreview';
import { FileDetailsPanel } from './FileDetailsPanel';
import { StorageFileProvider } from './StorageFileProvider';
import type { StorageAdapter } from '../../lib/storage/types';
import type { FileBrowserViewMode, FileNode, FileGroupingAxis, FileProvider } from './types';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { AlertCircle, Loader2 } from 'lucide-react';
import { DnDProvider } from '../ui/dnd';
import type { DragEndEvent } from '@dnd-kit/core';

export interface FileBrowserProps {
  /** ファイルプロバイダー（優先） */
  provider?: FileProvider;
  /** ストレージアダプター（providerが未指定の場合にラップして使用） */
  adapter?: StorageAdapter;
  /** 初期パス */
  initialPath?: string;
  /** 初期表示モード */
  initialViewMode?: FileBrowserViewMode;
  /** グループ化の軸（仮想ツリー用、将来拡張用） */
  groupingAxis?: FileGroupingAxis;
  /** ファイルがクリック（開かれた）時のコールバック */
  onOpenFile?: (node: FileNode, url: string) => void;
  /** クラス名 */
  className?: string;
}

/**
 * 高機能ファイルブラウザコンポーネント
 *
 * S3, R2, OCI などのオブジェクトストレージをエクスプローラー形式で表示・操作します。
 * DBテーブル管理 + UUIDファイル名といった複雑な構成にも FileProvider を通じて対応可能です。
 */
export function FileBrowser({
  provider: propProvider,
  adapter,
  initialPath = '',
  initialViewMode = 'grid',
  groupingAxis,
  onOpenFile,
  className,
}: FileBrowserProps) {
  // モーダル・パネル状態
  const [previewNode, setPreviewNode] = useState<FileNode | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [detailsNode, setDetailsNode] = useState<FileNode | null>(null);

  // アダプターが直接渡された場合は標準のプロバイダーでラップする
  const provider = useMemo(() => {
    if (propProvider) return propProvider;
    if (adapter) return new StorageFileProvider(adapter);
    throw new Error('Either provider or adapter must be provided to FileBrowser');
  }, [propProvider, adapter]);

  const {
    state,
    verifyingIds,
    navigate,
    navigateUp,
    search,
    openNode,
    setViewMode,
    select,
    refresh,
    deleteNodes,
    renameNode,
    updateTags,
    verifyNode,
  } = useStorageBrowser({
    provider,
    initialPath,
    initialViewMode,
    groupingAxis,
  });

  const handleOpen = useCallback(
    async (node: FileNode) => {
      const url = await openNode(node);
      if (url) {
        setPreviewNode(node);
        setPreviewUrl(url);
        onOpenFile?.(node, url);
      }
    },
    [openNode, onOpenFile],
  );

  const handleDelete = useCallback(
    async (node: FileNode) => {
      if (confirm(`Are you sure you want to delete "${node.name}"?`)) {
        await deleteNodes([node.id]);
      }
    },
    [deleteNodes],
  );

  const handleDetails = useCallback((node: FileNode) => {
    setDetailsNode(node);
  }, []);

  const handleRename = useCallback(
    async (node: FileNode) => {
      const newName = prompt('Enter new name:', node.name);
      if (newName && newName !== node.name) {
        await renameNode(node.id, newName);
      }
    },
    [renameNode],
  );

  const handleUpdateTags = useCallback(
    async (node: FileNode) => {
      const currentTags = node.metadata?.tags || '';
      const newTags = prompt('Enter tags (comma separated):', currentTags);
      if (newTags !== null && newTags !== currentTags) {
        await updateTags(node.id, newTags);
      }
    },
    [updateTags],
  );

  const handleCreateFolder = useCallback(async () => {
    const name = prompt('Enter folder name:');
    if (name) {
      await provider.createFolder(state.path, name);
      refresh();
    }
  }, [provider, state.path, refresh]);

  const handleUpload = useCallback(async () => {
    // 簡易的なファイル選択
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.onchange = async (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (!files) return;

      for (const file of Array.from(files)) {
        await provider.uploadFile(state.path, file, file.name);
      }
      refresh();
    };
    input.click();
  }, [provider, state.path, refresh]);

  /**
   * ドラッグ&ドロップ終了時の処理
   */
  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over) return;

      const activeNode = active.data.current as FileNode;
      const overNode = over.data.current as FileNode;

      // ファイルをフォルダにドロップした場合のみ移動を実行
      if (activeNode.kind === 'file' && overNode.kind === 'folder') {
        const targetPath = overNode.id.endsWith('/') ? overNode.id : `${overNode.id}/`;

        // 同じ場所なら何もしない
        if (activeNode.id.startsWith(targetPath)) return;

        try {
          await provider.moveNode(activeNode.id, targetPath);
          refresh();
        } catch (error) {
          alert(error instanceof Error ? error.message : 'Failed to move file');
        }
      }
    },
    [provider, refresh],
  );

  return (
    <div
      className={`flex flex-col h-full bg-background border rounded-lg overflow-hidden ${className}`}
    >
      {/* ツールバー */}
      <FileNavbar
        path={state.path}
        viewMode={state.viewMode}
        isLoading={state.isLoading}
        onNavigate={navigate}
        onNavigateUp={navigateUp}
        onSetViewMode={setViewMode}
        onRefresh={refresh}
        onSearch={search}
        onUpload={handleUpload}
        onCreateFolder={handleCreateFolder}
      />

      {/* エラー表示 */}
      {state.error && (
        <Alert variant='destructive' className='m-2'>
          <AlertCircle className='h-4 w-4' />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      {/* メインコンテンツ */}
      <DnDProvider onDragEnd={handleDragEnd}>
        <div className='flex-1 relative flex flex-col min-h-0'>
          {state.isLoading && state.nodes.length === 0 ? (
            <div className='flex-1 flex items-center justify-center'>
              <Loader2 className='w-8 h-8 animate-spin text-muted-foreground' />
            </div>
          ) : (
            <>
              {state.viewMode === 'list' ? (
                <FileListView
                  nodes={state.nodes}
                  selectedIds={state.selectedIds}
                  verifyingIds={verifyingIds}
                  onSelect={select}
                  onOpen={handleOpen}
                  onDelete={handleDelete}
                  onDetails={handleDetails}
                  onRename={handleRename}
                  onUpdateTags={handleUpdateTags}
                  onVerify={(node) => void verifyNode(node.id)}
                />
              ) : (
                <FileGridView
                  nodes={state.nodes}
                  selectedIds={state.selectedIds}
                  verifyingIds={verifyingIds}
                  onSelect={select}
                  onOpen={handleOpen}
                  onDelete={handleDelete}
                  onDetails={handleDetails}
                  onRename={handleRename}
                  onUpdateTags={handleUpdateTags}
                  onVerify={(node) => void verifyNode(node.id)}
                />
              )}
            </>
          )}
        </div>
      </DnDProvider>

      {/* ステータスバー */}
      <div className='px-3 py-1.5 border-t bg-muted/30 flex items-center justify-between text-[11px] text-muted-foreground'>
        <div className='flex items-center gap-3'>
          <span>{state.nodes.length} items</span>
          {state.selectedIds.length > 0 && (
            <span className='text-primary font-medium'>{state.selectedIds.length} selected</span>
          )}
        </div>
        <div>{state.path || 'Root'}</div>
      </div>

      {/* プレビューモーダル */}
      <FilePreview
        node={previewNode}
        url={previewUrl}
        onClose={() => {
          setPreviewNode(null);
          setPreviewUrl(null);
        }}
      />

      {/* 詳細パネル */}
      <FileDetailsPanel
        node={detailsNode}
        provider={provider}
        onClose={() => setDetailsNode(null)}
      />
    </div>
  );
}
