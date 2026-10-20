
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

/**
 * Selects folder treatment or MIME-based file icon treatment.
 * @remarks Inherited native or primitive props keep their upstream types and behavior; this declaration documents only the wrapper-owned options.
 * @see FileIcon
 */
export type FileIconKind = 'file' | 'folder';

/**
 * Visual classification inputs for FileIcon; no file bytes are inspected.
 * @remarks Inherited native or primitive props keep their upstream types and behavior; this declaration documents only the wrapper-owned options.
 * @see FileIcon
 */
export interface FileIconProps {
  /**
   * folder always renders the folder icon; file selects by contentType.
   */
  kind: FileIconKind;
  /**
   * Optional MIME text used for case-insensitive substring matching; missing/unmatched uses a generic file icon.
   */
  contentType?: string;
  /**
   * Additional classes merged with wrapper styling; see the component for the targeted element.
   */
  className?: string;
}

/**
 * Selects a folder or file-type icon using a lowercase MIME substring match.
 * @param props - Component attributes and children accepted by the declared native/underlying prop type; className customizes wrapper styling.
 * @returns The rendered FileIcon composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. kind=folder takes precedence over contentType. Missing or unrecognized MIME types use the generic file icon. This is visual classification only: it does not validate file contents, read a file or enforce upload restrictions.
 * @example
 * ```tsx
 * import { FileIcon } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<FileIcon kind="file" contentType="application/pdf" className="size-5" />);
 * }
 * ```
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
