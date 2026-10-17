import React from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '../ui/context-menu';
import {
  FileText,
  Download,
  Trash2,
  Copy,
  FolderOpen,
  Edit2,
  Tags,
  ShieldCheck,
  Info,
} from 'lucide-react';
import type { FileNode } from './types';

export interface FileContextMenuProps {
  /** 対象のノード */
  node: FileNode;
  /** 子要素（トリガーとなる要素） */
  children: React.ReactNode;
  /** ノードを開く時のコールバック */
  onOpen: (node: FileNode) => void;
  /** 削除する時のコールバック */
  onDelete: (node: FileNode) => void;
  /** 詳細を表示する時のコールバック */
  onDetails?: (node: FileNode) => void;
  /** 名前変更時のコールバック */
  onRename?: (node: FileNode) => void;
  /** タグ更新時のコールバック */
  onUpdateTags?: (node: FileNode) => void;
  /** 整合性検証時のコールバック */
  onVerify?: (node: FileNode) => void;
  /** ダウンロードする時のコールバック（将来用） */
  onDownload?: (node: FileNode) => void;
}

/**
 * ファイル/フォルダを右クリックした時に表示されるメニュー
 */
export function FileContextMenu({
  node,
  children,
  onOpen,
  onDelete,
  onDetails,
  onRename,
  onUpdateTags,
  onVerify,
}: FileContextMenuProps) {
  const handleCopyKey = () => {
    if (node.physicalKey) {
      void navigator.clipboard.writeText(node.physicalKey);
    }
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger render={React.isValidElement(children) ? children : <div />}>{React.isValidElement(children) ? undefined : children}</ContextMenuTrigger>
      <ContextMenuContent className='w-56'>
        <ContextMenuItem onClick={() => onOpen(node)}>
          {node.kind === 'folder' ? (
            <FolderOpen className='mr-2 h-4 w-4 text-blue-500' />
          ) : (
            <FileText className='mr-2 h-4 w-4 text-primary' />
          )}
          <span>{node.kind === 'folder' ? 'Open Folder' : 'Preview'}</span>
        </ContextMenuItem>

        {node.kind === 'file' && (
          <ContextMenuItem onClick={() => onOpen(node)}>
            <Download className='mr-2 h-4 w-4' />
            <span>Download</span>
          </ContextMenuItem>
        )}

        <ContextMenuSeparator />

        {onDetails && (
          <ContextMenuItem onClick={() => onDetails(node)}>
            <Info className='mr-2 h-4 w-4 text-primary' />
            <span>View Details</span>
          </ContextMenuItem>
        )}

        <ContextMenuSeparator />

        {onRename && (
          <ContextMenuItem onClick={() => onRename(node)}>
            <Edit2 className='mr-2 h-4 w-4' />
            <span>Rename</span>
          </ContextMenuItem>
        )}

        {onUpdateTags && node.kind === 'file' && (
          <ContextMenuItem onClick={() => onUpdateTags(node)}>
            <Tags className='mr-2 h-4 w-4' />
            <span>Edit Tags</span>
          </ContextMenuItem>
        )}

        {onVerify && node.kind === 'file' && (
          <ContextMenuItem onClick={() => onVerify(node)}>
            <ShieldCheck className='mr-2 h-4 w-4 text-green-600' />
            <span>Verify Integrity</span>
          </ContextMenuItem>
        )}

        <ContextMenuSeparator />

        <ContextMenuItem onClick={handleCopyKey} disabled={!node.physicalKey}>
          <Copy className='mr-2 h-4 w-4' />
          <span>Copy Key</span>
        </ContextMenuItem>

        <ContextMenuSeparator />

        <ContextMenuItem variant='destructive' onClick={() => onDelete(node)}>
          <Trash2 className='mr-2 h-4 w-4' />
          <span>Delete</span>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
