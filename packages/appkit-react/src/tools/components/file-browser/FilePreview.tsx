import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import type { FileNode } from './types';
import { FileIcon } from '../ui/file-icon';
import { Loader2, Download, ExternalLink } from 'lucide-react';
import { Button } from '../ui/button';

export interface FilePreviewProps {
  /** プレビュー対象のノード */
  node: FileNode | null;
  /** 署名付きURL */
  url: string | null;
  /** モーダルを閉じる時のコールバック */
  onClose: () => void;
}

/**
 * ファイルのプレビューを表示するモーダルコンポーネント
 */
export function FilePreview({ node, url, onClose }: FilePreviewProps) {
  const [loading, setLoading] = useState(true);
  const [textContent, setTextContent] = useState<string | null>(null);

  const isOpen = !!node && !!url;
  const mime = node?.contentType?.toLowerCase() || '';
  const isImage = mime.includes('image/');
  const isPdf = mime.includes('pdf');
  const isText =
    mime.includes('text/') ||
    mime.includes('json') ||
    mime.includes('javascript') ||
    mime.includes('typescript');

  useEffect(() => {
    if (isOpen && isText && url) {
      queueMicrotask(() => {
        setLoading(true);
      });
      fetch(url)
        .then((res) => res.text())
        .then((text) => {
          setTextContent(text);
          setLoading(false);
        })
        .catch(() => {
          setTextContent('Failed to load text content.');
          setLoading(false);
        });
    } else {
      queueMicrotask(() => {
        setLoading(false);
        setTextContent(null);
      });
    }
  }, [isOpen, isText, url]);

  if (!node) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className='max-w-4xl w-[90vw] h-[85vh] flex flex-col p-0 overflow-hidden gap-0'>
        <DialogHeader className='p-4 border-b flex-row items-center justify-between space-y-0'>
          <div className='flex items-center gap-3 pr-8'>
            <FileIcon kind={node.kind} contentType={node.contentType} className='h-5 w-5' />
            <DialogTitle className='text-base font-semibold truncate'>{node.name}</DialogTitle>
          </div>
          <div className='flex items-center gap-2'>
            <Button variant='outline' size='sm' className='h-8 gap-2' nativeButton={false} render={<a href={url || '#'} download={node.name} />}>
                <Download className='h-3.5 w-3.5' />
                <span>Download</span>
            </Button>
            <Button variant='ghost' size='sm' className='h-8' nativeButton={false} render={<a href={url || '#'} target='_blank' rel='noreferrer' aria-label='Open in new tab' />}>
                <ExternalLink className='h-3.5 w-3.5' />
            </Button>
          </div>
        </DialogHeader>

        <div className='flex-1 bg-muted/20 relative overflow-auto flex items-center justify-center'>
          {loading && (
            <div className='absolute inset-0 flex items-center justify-center bg-background/50 z-10'>
              <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
            </div>
          )}

          {isImage && url && (
            <img
              src={url}
              alt={node.name}
              className='max-w-full max-h-full object-contain shadow-lg'
              onLoad={() => setLoading(false)}
            />
          )}

          {isPdf && url && (
            <iframe
              src={`${url}#toolbar=0`}
              title={node.name}
              className='w-full h-full border-none'
              onLoad={() => setLoading(false)}
            />
          )}

          {isText && textContent !== null && (
            <pre className='w-full h-full p-6 font-mono text-xs overflow-auto bg-background whitespace-pre-wrap'>
              {textContent}
            </pre>
          )}

          {!isImage && !isPdf && !isText && (
            <div className='text-center p-12'>
              <FileIcon
                kind={node.kind}
                contentType={node.contentType}
                className='h-16 w-16 mx-auto mb-4 opacity-20'
              />
              <p className='text-muted-foreground'>Preview not available for this file type.</p>
              <p className='text-xs mt-2'>Please download the file to view it.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
