import * as React from 'react';
import { format } from 'date-fns';
import { Calendar, Flag, MessageSquare, Paperclip } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import type { KanbanCardProps } from './types';

const PRIORITY_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  low: {
    bg: 'bg-muted',
    text: 'text-muted-foreground',
    label: 'Low',
  },
  medium: {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-700 dark:text-blue-300',
    label: 'Medium',
  },
  high: {
    bg: 'bg-orange-100 dark:bg-orange-900/30',
    text: 'text-orange-700 dark:text-orange-300',
    label: 'High',
  },
  urgent: {
    bg: 'bg-destructive/10',
    text: 'text-destructive',
    label: 'Urgent',
  },
};

/** Presentation only: safe for drag overlays and compound cards (no duplicate draggable registration). */
export const KanbanCardView = React.forwardRef<HTMLDivElement, KanbanCardProps>(
  ({ task, testId }, ref) => {
    const priorityStyle = PRIORITY_STYLES[task.priority || 'medium'] || PRIORITY_STYLES.medium;
    return (
      <Card
        ref={ref}
        data-slot='kanban-card'
        data-testid={testId}
        data-priority={task.priority}
        className={cn(
          'hover:shadow-md transition-all duration-200',
          'border-border/50 hover:border-border',
          task.priority === 'high' && 'bg-orange-50/50 dark:bg-orange-950/10',
          task.priority === 'urgent' && 'bg-destructive/5',
        )}
      >
        <CardHeader className='p-3 pb-1 space-y-1'>
          {/* キー & プロジェクト */}
          <div className='flex items-center justify-between gap-2'>
            {task.key && (
              <span
                data-slot='kanban-card-key'
                className='text-[10px] font-mono text-muted-foreground uppercase bg-muted/50 px-1.5 py-0.5 rounded'
              >
                {task.key}
              </span>
            )}
            {task.project?.name && (
              <Badge
                variant='outline'
                className='text-[10px] px-1.5 py-0 font-normal'
                style={{
                  borderColor: task.project.color,
                  color: task.project.color,
                }}
              >
                {task.project.name}
              </Badge>
            )}
          </div>

          {/* タイトル */}
          <CardTitle className='text-sm font-medium leading-tight line-clamp-2'>
            {task.title}
          </CardTitle>
        </CardHeader>

        <CardContent className='p-3 pt-2'>
          {/* タグ */}
          {task.tags && task.tags.length > 0 && (
            <div className='flex flex-wrap gap-1 mb-2'>
              {task.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant='secondary' className='text-[10px] px-1.5 py-0'>
                  {tag}
                </Badge>
              ))}
              {task.tags.length > 3 && (
                <span className='text-[10px] text-muted-foreground'>+{task.tags.length - 3}</span>
              )}
            </div>
          )}

          {/* メタ情報 */}
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              {/* 優先度 */}
              <Badge
                variant='secondary'
                className={cn('text-[10px] px-1.5 py-0', priorityStyle.bg, priorityStyle.text)}
              >
                <Flag className='w-2.5 h-2.5 mr-0.5' />
                {priorityStyle.label}
              </Badge>

              {/* 期限 */}
              {task.due_date && (
                <span className='flex items-center text-[10px] text-muted-foreground'>
                  <Calendar className='w-3 h-3 mr-0.5' />
                  {format(new Date(task.due_date), 'MM/dd')}
                </span>
              )}

              {/* コメント数 */}
              {task.commentCount && task.commentCount > 0 && (
                <span className='flex items-center text-[10px] text-muted-foreground'>
                  <MessageSquare className='w-3 h-3 mr-0.5' />
                  {task.commentCount}
                </span>
              )}

              {/* 添付ファイル数 */}
              {task.attachmentCount && task.attachmentCount > 0 && (
                <span className='flex items-center text-[10px] text-muted-foreground'>
                  <Paperclip className='w-3 h-3 mr-0.5' />
                  {task.attachmentCount}
                </span>
              )}
            </div>

            {/* 担当者 */}
            {task.assignee && (
              <Avatar className='h-5 w-5 border border-background'>
                {task.assignee.avatar && <AvatarImage src={task.assignee.avatar} />}
                <AvatarFallback className='text-[9px] bg-primary/10 text-primary'>
                  {task.assignee.name?.[0] || '?'}
                </AvatarFallback>
              </Avatar>
            )}
          </div>
        </CardContent>
      </Card>
    );
  },
);
KanbanCardView.displayName = 'KanbanCardView';
