
import {
  FileIcon as FileGenericIcon,
  FileText,
  FileImage,
  FileVideo,
  FileAudio,
  FileArchive,
  FileCode,
  FileSpreadsheet,
  FolderIcon,
} from 'lucide-react';
import { cn } from '../../lib/utils';

export type FileIconKind = 'file' | 'folder';

export interface FileIconProps {
  /** 種類（ファイルまたはフォルダ） */
  kind: FileIconKind;
  /** MIMEタイプ */
  contentType?: string;
  /** クラス名 */
  className?: string;
}

/**
 * ファイルの種類やMIMEタイプに応じたアイコンを表示するコンポーネント
 */
export function FileIcon({ kind, contentType, className }: FileIconProps) {
  if (kind === 'folder') {
    return <FolderIcon className={cn('text-blue-500 fill-blue-500/20', className)} />;
  }

  const mime = contentType?.toLowerCase() || '';

  if (mime.includes('image/')) {
    return <FileImage className={cn('text-orange-500', className)} />;
  }
  if (mime.includes('video/')) {
    return <FileVideo className={cn('text-purple-500', className)} />;
  }
  if (mime.includes('audio/')) {
    return <FileAudio className={cn('text-pink-500', className)} />;
  }
  if (mime.includes('pdf')) {
    return <FileText className={cn('text-red-500', className)} />;
  }
  if (mime.includes('spreadsheet') || mime.includes('excel') || mime.includes('csv')) {
    return <FileSpreadsheet className={cn('text-green-600', className)} />;
  }
  if (mime.includes('zip') || mime.includes('archive') || mime.includes('tar')) {
    return <FileArchive className={cn('text-yellow-600', className)} />;
  }
  if (
    mime.includes('javascript') ||
    mime.includes('typescript') ||
    mime.includes('html') ||
    mime.includes('css') ||
    mime.includes('json')
  ) {
    return <FileCode className={cn('text-blue-600', className)} />;
  }
  if (mime.includes('text/')) {
    return <FileText className={cn('text-gray-500', className)} />;
  }

  return <FileGenericIcon className={cn('text-gray-400', className)} />;
}
