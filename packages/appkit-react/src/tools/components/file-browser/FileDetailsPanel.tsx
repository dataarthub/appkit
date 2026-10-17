import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../ui/sheet';
import type { FileNode, FileProvider } from './types';
import { FileIcon } from '../ui/file-icon';
import { format, formatDistanceToNow } from 'date-fns';
import { Info, History, Shield, Calendar, User, Clock, Loader2 } from 'lucide-react';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';

export interface FileDetailsPanelProps {
  /** 対象のノード */
  node: FileNode | null;
  /** ファイルプロバイダー */
  provider: FileProvider;
  /** 閉じる時のコールバック */
  onClose: () => void;
}

/**
 * ファイルの詳細情報と監査ログを表示するサイドパネル
 */
export function FileDetailsPanel({ node, provider: _provider, onClose }: FileDetailsPanelProps) {
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  useEffect(() => {
    if (node && node.kind === 'file') {
      // 監査ログの取得（モック/将来の実装）
      queueMicrotask(() => {
        setIsLoadingLogs(true);
      });
      // 実際には provider を通じて取得するか、直接 data-access を叩く
      setTimeout(() => {
        setAuditLogs([
          {
            id: '1',
            action: 'store',
            userId: 'user-001',
            timestamp: new Date(Date.now() - 86400000 * 2),
            reason: 'Initial upload',
          },
          {
            id: '2',
            action: 'update-tags',
            userId: 'user-002',
            timestamp: new Date(Date.now() - 3600000),
            reason: 'Categorization',
          },
        ]);
        setIsLoadingLogs(false);
      }, 500);
    }
  }, [node]);

  if (!node) return null;

  const tags = node.metadata?.tags?.split(',').filter(Boolean) || [];

  // Object Lock 期限の計算（デモ用）
  const retentionUntil = node.lastModified
    ? new Date(node.lastModified.getTime() + 86400000 * 365 * 7) // 7年後
    : null;

  return (
    <Sheet open={!!node} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className='w-[400px] sm:w-[540px] p-0 flex flex-col'>
        <SheetHeader className='p-6 border-b'>
          <div className='flex items-center gap-4'>
            <div className='p-3 bg-muted rounded-xl'>
              <FileIcon kind={node.kind} contentType={node.contentType} className='h-8 w-8' />
            </div>
            <div className='flex-1 min-w-0'>
              <SheetTitle className='text-lg font-bold truncate' title={node.name}>
                {node.name}
              </SheetTitle>
              <p className='text-xs text-muted-foreground uppercase tracking-wider font-semibold mt-0.5'>
                {node.kind === 'folder' ? 'Folder' : node.contentType || 'File'}
              </p>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className='flex-1'>
          <div className='p-6 space-y-8'>
            {/* 基本情報 */}
            <section>
              <h3 className='text-sm font-semibold flex items-center gap-2 mb-4'>
                <Info className='h-4 w-4 text-primary' />
                Properties
              </h3>
              <div className='grid grid-cols-2 gap-y-4 text-sm'>
                <div className='text-muted-foreground'>Size</div>
                <div className='font-medium'>
                  {node.size ? `${(node.size / 1024).toFixed(1)} KB` : '--'}
                </div>

                <div className='text-muted-foreground'>Last Modified</div>
                <div className='font-medium'>
                  {node.lastModified ? format(node.lastModified, 'yyyy/MM/dd HH:mm') : '--'}
                </div>

                <div className='text-muted-foreground'>Physical Key</div>
                <div className='font-mono text-[10px] break-all bg-muted/50 p-1 rounded'>
                  {node.physicalKey || 'N/A'}
                </div>
              </div>
            </section>

            <Separator />

            {/* タグ */}
            <section>
              <h3 className='text-sm font-semibold flex items-center gap-2 mb-4'>
                <Badge className='h-4 w-4 p-0' variant='outline'>
                  #
                </Badge>
                Tags
              </h3>
              <div className='flex flex-wrap gap-2'>
                {tags.length > 0 ? (
                  tags.map((tag) => (
                    <Badge key={tag} variant='secondary' className='px-2 py-1'>
                      {tag}
                    </Badge>
                  ))
                ) : (
                  <span className='text-sm text-muted-foreground italic'>No tags assigned</span>
                )}
              </div>
            </section>

            <Separator />

            {/* セキュリティ・電帳法 */}
            {node.kind === 'file' && (
              <section>
                <h3 className='text-sm font-semibold flex items-center gap-2 mb-4'>
                  <Shield className='h-4 w-4 text-green-600' />
                  Compliance & Retention
                </h3>
                <div className='space-y-4'>
                  <div className='bg-green-50 dark:bg-green-950/20 border border-green-100 dark:border-green-900/30 rounded-lg p-3'>
                    <div className='flex items-start gap-3'>
                      <Shield className='h-5 w-5 text-green-600 mt-0.5' />
                      <div>
                        <p className='text-sm font-medium text-green-800 dark:text-green-300'>
                          Object Lock Active
                        </p>
                        <p className='text-xs text-green-700/80 dark:text-green-400/80 mt-0.5'>
                          This file is protected under WORM rules. Deletion is restricted.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className='flex items-center justify-between text-sm'>
                    <div className='flex items-center gap-2 text-muted-foreground'>
                      <Calendar className='h-4 w-4' />
                      Retention Until
                    </div>
                    <div className='font-semibold text-primary'>
                      {retentionUntil ? format(retentionUntil, 'yyyy/MM/dd') : 'N/A'}
                    </div>
                  </div>

                  <div className='flex items-center justify-between text-sm'>
                    <div className='flex items-center gap-2 text-muted-foreground'>
                      <Clock className='h-4 w-4' />
                      Remaining Time
                    </div>
                    <Badge variant='outline' className='font-mono border-primary/20 bg-primary/5'>
                      {retentionUntil ? formatDistanceToNow(retentionUntil) : 'N/A'}
                    </Badge>
                  </div>
                </div>
              </section>
            )}

            <Separator />

            {/* 監査ログ */}
            <section>
              <h3 className='text-sm font-semibold flex items-center gap-2 mb-4'>
                <History className='h-4 w-4 text-blue-500' />
                Audit Trail
              </h3>
              <div className='space-y-4'>
                {isLoadingLogs ? (
                  <div className='flex items-center justify-center p-8 text-muted-foreground'>
                    <Loader2 className='h-6 w-6 animate-spin' />
                  </div>
                ) : auditLogs.length > 0 ? (
                  auditLogs.map((log) => (
                    <div key={log.id} className='relative pl-6 pb-4 border-l last:pb-0'>
                      <div className='absolute left-[-5px] top-1.5 h-2.5 w-2.5 rounded-full bg-blue-500' />
                      <div className='flex flex-col gap-1'>
                        <div className='flex items-center justify-between'>
                          <span className='text-xs font-bold uppercase text-blue-600 dark:text-blue-400'>
                            {log.action}
                          </span>
                          <span className='text-[10px] text-muted-foreground'>
                            {format(log.timestamp, 'yyyy/MM/dd HH:mm')}
                          </span>
                        </div>
                        <p className='text-sm font-medium'>{log.reason}</p>
                        <div className='flex items-center gap-1.5 text-xs text-muted-foreground mt-1'>
                          <User className='h-3 w-3' />
                          {log.userId}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className='text-sm text-muted-foreground italic text-center py-4'>
                    No history records found
                  </p>
                )}
              </div>
            </section>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
