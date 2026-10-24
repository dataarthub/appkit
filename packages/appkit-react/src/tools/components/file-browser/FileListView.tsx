import React from 'react';
import { FileIcon } from '../ui/file-icon';
import type { FileNode } from './types';
import { format } from 'date-fns';
import { cn } from '../../lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Badge } from '../ui';
import { FileContextMenu } from './FileContextMenu';
import { Draggable, Droppable } from '../ui/dnd';
import { ShieldCheck, ShieldAlert, Loader2 } from 'lucide-react';

export interface FileListViewProps {
  /** 表示するノード一覧 */
  nodes: FileNode[];
  /** 選択されているノードのID一覧 */
  selectedIds: string[];
  /** 検証状態のマップ */
  verifyingIds?: Record<string, { loading: boolean; valid?: boolean; error?: string }>;
  /** 選択状態が変更された時のコールバック */
  onSelect: (ids: string[]) => void;
  /** ノードがダブルクリック（またはフォルダ移動）された時のコールバック */
  onOpen: (node: FileNode) => void;
  /** ノードを削除する時のコールバック */
  onDelete: (node: FileNode) => void;
  /** 詳細を表示する時のコールバック */
  onDetails?: (node: FileNode) => void;
  /** 名前変更時のコールバック */
  onRename?: (node: FileNode) => void;
  /** タグ更新時のコールバック */
  onUpdateTags?: (node: FileNode) => void;
  /** 整合性検証時のコールバック */
  onVerify?: (node: FileNode) => void;
}

/**
 * ファイルのバイト数を人間が読みやすい形式に変換
 */
function formatSize(bytes?: number): string {
  if (bytes === undefined) return '-';
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Render a semantic table of host-owned file nodes with native icon drag handles.
 * @param props - Current nodes, selected ids, optional verification state and host
 * selection/open/delete/detail/rename/tag/verify callbacks; no storage is configured here.
 * @returns The table view; empty listings show the corresponding empty state.
 * @remarks Place standalone views under DnDProvider from the same native engine.
 * Selection and open callbacks remain host-owned. Import Appkit CSS once.
 * @example
 * ```tsx
 * import {FileListView} from '@alneas/appkit-react/tools/file-browser';
 * import {DnDProvider} from '@alneas/appkit-react/tools/ui';
 * import '@alneas/appkit-react/styles';
 * export function EmptyFiles() {
 *   return <DnDProvider><FileListView nodes={[]} selectedIds={[]}
 *     onSelect={() => {}} onOpen={() => {}} onDelete={() => {}} /></DnDProvider>;
 * }
 * ```
 */
export function FileListView({
  nodes,
  selectedIds,
  verifyingIds = {},
  onSelect,
  onOpen,
  onDelete,
  onDetails,
  onRename,
  onUpdateTags,
  onVerify,
}: FileListViewProps) {
  const handleRowClick = (e: React.MouseEvent, node: FileNode) => {
    if (e.metaKey || e.ctrlKey) {
      if (selectedIds.includes(node.id)) {
        onSelect(selectedIds.filter((id) => id !== node.id));
      } else {
        onSelect([...selectedIds, node.id]);
      }
    } else {
      onSelect([node.id]);
    }
  };

  const renderNodeContent = (
    node: FileNode, isSelected: boolean,
    rowProps: React.ComponentPropsWithRef<typeof TableRow> & {'data-file-drop'?: string; 'data-drop-over'?: boolean} = {},
    dragHandle?: (element: Element | null) => void,
  ) => {
    const tags = node.metadata?.tags?.split(',').filter(Boolean) || [];
    const verification = verifyingIds[node.id];

    return (
      <TableRow
        {...rowProps}
        className={cn(
          'cursor-pointer transition-colors group select-none w-full border-b',
          isSelected && 'bg-primary/5 hover:bg-primary/10',
          rowProps.className,
        )}
        onClick={(e) => handleRowClick(e, node)}
        onDoubleClick={() => onOpen(node)}
      >
        <TableCell className='font-medium'>
          <div className='flex items-center gap-3'>
            {dragHandle ? (
              <button type='button' aria-label={`Move ${node.name}`} ref={dragHandle}>
                <FileIcon kind={node.kind} contentType={node.contentType} className='h-4 w-4 shrink-0' />
              </button>
            ) : <FileIcon kind={node.kind} contentType={node.contentType} className='h-4 w-4 shrink-0' />}
            <span className='truncate'>{node.name}</span>
            {verification?.loading && (
              <Loader2 className='h-3 w-3 animate-spin text-muted-foreground' />
            )}
            {verification?.valid === true && (
              <span title='Integrity Verified'>
                <ShieldCheck className='h-3 w-3 text-green-600' />
              </span>
            )}
            {verification?.valid === false && (
              <span title={verification.error || 'Integrity Failure'}>
                <ShieldAlert className='h-3 w-3 text-destructive' />
              </span>
            )}
          </div>
        </TableCell>
        <TableCell className='text-muted-foreground whitespace-nowrap'>
          {node.kind === 'file' ? formatSize(node.size) : '--'}
        </TableCell>
        <TableCell className='text-muted-foreground whitespace-nowrap'>
          {node.kind === 'folder' ? 'Folder' : node.contentType || 'File'}
        </TableCell>
        <TableCell>
          <div className='flex flex-wrap gap-1'>
            {tags.map((tag) => (
              <Badge
                key={tag}
                variant='secondary'
                className='px-1.5 py-0 text-[10px] h-4 bg-muted/50'
              >
                {tag}
              </Badge>
            ))}
          </div>
        </TableCell>
        <TableCell className='text-right text-muted-foreground whitespace-nowrap'>
          {node.lastModified ? format(node.lastModified, 'yyyy/MM/dd HH:mm') : '--'}
        </TableCell>
      </TableRow>
    );
  };

  return (
    <div className='flex-1 overflow-auto'>
      <Table className='relative'>
        <TableHeader className='bg-muted/30 sticky top-0 z-10'>
          <TableRow>
            <TableHead className='w-[35%]'>Name</TableHead>
            <TableHead>Size</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Tags</TableHead>
            <TableHead className='text-right'>Modified</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {nodes.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className='h-32 text-center text-muted-foreground'>
                No items found.
              </TableCell>
            </TableRow>
          ) : (
            nodes.map((node) => {
              const isSelected = selectedIds.includes(node.id);

              const withContextMenu = (row: React.ReactElement) => (
                <FileContextMenu node={node} onOpen={onOpen} onDelete={onDelete}
                  onDetails={onDetails} onRename={onRename} onUpdateTags={onUpdateTags} onVerify={onVerify}>
                  {row}
                </FileContextMenu>
              );
              const item = node.kind === 'file' ? (
                <Draggable id={node.id} data={node}>
                  {({ ref, style, handleRef, isDragging }) =>
                    withContextMenu(renderNodeContent(node, isSelected,
                      { ref, style, className: cn(isDragging && 'z-50') },
                      handleRef))}
                </Draggable>
              ) : (
                <Droppable id={node.id} data={node}>
                  {({ ref, isDropTarget }) => withContextMenu(renderNodeContent(node, isSelected,
                    { ref, 'data-file-drop': node.id, 'data-drop-over': isDropTarget, className: cn(isDropTarget && 'bg-primary/10 ring-2 ring-primary/20 inset-x-0') }))}
                </Droppable>
              );

              return <React.Fragment key={node.id}>{item}</React.Fragment>;
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
