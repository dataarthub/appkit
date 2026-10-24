import React from 'react';
import { FileIcon } from '../ui/file-icon';
import type { FileNode } from './types';
import { cn } from '../../lib/utils';
import { Badge } from '../ui/badge';
import { FileContextMenu } from './FileContextMenu';
import { Draggable, Droppable } from '../ui/dnd';
import { ShieldCheck, ShieldAlert, Loader2, Check, FolderOpen } from 'lucide-react';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '../ui/empty';

export interface FileGridViewProps {
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
 * Render a grid of host-owned file nodes with native icon drag handles.
 * @param props - Current nodes, selected ids, optional verification state and host
 * selection/open/delete/detail/rename/tag/verify callbacks; no storage is configured here.
 * @returns The grid view; empty listings show the corresponding empty state.
 * @remarks Place standalone views under DnDProvider from the same native engine.
 * Selection and open callbacks remain host-owned. Import Appkit CSS once.
 * @example
 * ```tsx
 * import {FileGridView} from '@alneas/appkit-react/tools/file-browser';
 * import {DnDProvider} from '@alneas/appkit-react/tools/ui';
 * import '@alneas/appkit-react/styles';
 * export function EmptyFiles() {
 *   return <DnDProvider><FileGridView nodes={[]} selectedIds={[]}
 *     onSelect={() => {}} onOpen={() => {}} onDelete={() => {}} /></DnDProvider>;
 * }
 * ```
 */
export function FileGridView({
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
}: FileGridViewProps) {
  const handleItemClick = (e: React.MouseEvent, node: FileNode) => {
    // Ctrl/Cmd キーで複数選択
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

  const renderNodeContent = (node: FileNode, isSelected: boolean, handleRef?: (element: Element | null) => void) => {
    const tags = node.metadata?.tags?.split(',').filter(Boolean) || [];
    const verification = verifyingIds[node.id];

    return (
      <div
        className={cn(
          'group flex flex-col items-center p-2 rounded-xl transition-all border border-transparent cursor-pointer select-none relative w-full h-full',
          isSelected
            ? 'bg-primary/10 border-primary/20 ring-2 ring-primary/10'
            : 'hover:bg-muted/50 hover:border-muted-foreground/10',
        )}
        onClick={(e) => handleItemClick(e, node)}
        onDoubleClick={() => onOpen(node)}
      >
        <div className='relative w-full aspect-square flex items-center justify-center mb-2'>
          {handleRef ? <button type='button' ref={handleRef} aria-label={`Move ${node.name}`} className='flex items-center justify-center w-full h-full border-0 bg-transparent p-0'>
          <FileIcon
            kind={node.kind}
            contentType={node.contentType}
            className={cn(
              'w-12 h-12 transition-transform',
              isSelected ? 'scale-110' : 'group-hover:scale-105',
            )}
          />
          </button> : (
          <FileIcon
            kind={node.kind}
            contentType={node.contentType}
            className={cn(
              'w-12 h-12 transition-transform',
              isSelected ? 'scale-110' : 'group-hover:scale-105',
            )}
          />
          )}

          {/* 選択チェックマーク */}
          {isSelected && (
            <div className='absolute top-0 right-0 bg-primary text-primary-foreground rounded-full p-0.5 shadow-sm z-10'>
              <Check className='w-3 h-3' strokeWidth={3} />
            </div>
          )}

          {/* 検証ステータス */}
          {verification?.loading && (
            <div className='absolute bottom-0 left-0 bg-background/80 rounded-full p-0.5 shadow-sm'>
              <Loader2 className='h-3 w-3 animate-spin' />
            </div>
          )}
          {verification?.valid === true && (
            <div
              className='absolute bottom-0 left-0 bg-green-100 text-green-700 rounded-full p-0.5 shadow-sm'
              title='Integrity Verified'
            >
              <ShieldCheck className='h-3 w-3' />
            </div>
          )}
          {verification?.valid === false && (
            <div
              className='absolute bottom-0 left-0 bg-destructive/10 text-destructive rounded-full p-0.5 shadow-sm'
              title={verification.error}
            >
              <ShieldAlert className='h-3 w-3' />
            </div>
          )}
        </div>

        <span className='w-full text-center text-xs font-medium truncate px-1 leading-relaxed'>
          {node.name}
        </span>

        <div className='flex flex-wrap justify-center gap-0.5 mt-1 min-h-[16px]'>
          {tags.slice(0, 2).map((tag) => (
            <Badge
              key={tag}
              variant='outline'
              className='px-1 py-0 text-[8px] h-3.5 leading-none bg-background/50'
            >
              {tag}
            </Badge>
          ))}
          {tags.length > 2 && (
            <span className='text-[8px] text-muted-foreground'>+{tags.length - 2}</span>
          )}
        </div>

        {node.size !== undefined && node.kind === 'file' && (
          <span className='text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-0.5'>
            {Math.round(node.size / 1024)} KB
          </span>
        )}
      </div>
    );
  };

  if (nodes.length === 0) {
    return (
      <Empty className='flex-1 border-t rounded-none bg-muted/10'>
        <EmptyHeader>
          <EmptyMedia variant='icon'>
            <FolderOpen />
          </EmptyMedia>
          <EmptyTitle>This folder is empty</EmptyTitle>
          <EmptyDescription>Upload files to get started.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className='flex-1 overflow-auto p-4 bg-muted/5 border-t'>
      <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4'>
        {nodes.map((node) => {
          const isSelected = selectedIds.includes(node.id);

          return (
            <FileContextMenu
              key={node.id}
              node={node}
              onOpen={onOpen}
              onDelete={onDelete}
              onDetails={onDetails}
              onRename={onRename}
              onUpdateTags={onUpdateTags}
              onVerify={onVerify}
            >
              <div className='w-full h-full'>
                {node.kind === 'file' ? (
                  <Draggable id={node.id} data={node}>
                    {({ ref, handleRef, style }) => (
                      <div
                        ref={ref}
                        data-file-drag={node.id}
                        style={style}
                        className='w-full h-full'
                      >
                        {renderNodeContent(node, isSelected, handleRef)}
                      </div>
                    )}
                  </Draggable>
                ) : (
                  <Droppable id={node.id} data={node}>
                    {({ ref, isDropTarget }) => (
                      <div
                        ref={ref}
                        data-file-drop={node.id}
                        data-drop-over={isDropTarget}
                        className={cn(
                          'w-full h-full rounded-xl',
                          isDropTarget && 'bg-primary/10 ring-4 ring-primary/20',
                        )}
                      >
                        {renderNodeContent(node, isSelected)}
                      </div>
                    )}
                  </Droppable>
                )}
              </div>
            </FileContextMenu>
          );
        })}
      </div>
    </div>
  );
}
