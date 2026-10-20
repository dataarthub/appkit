/**
 * Priority Card Component
 *
 * Focus Mode 用の優先度タスクカード
 */

import * as React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Check, ChevronDown, ChevronUp, Clock, Pause, Sparkles, Zap } from 'lucide-react';

import { cn } from '../../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Slider } from '../ui/slider';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import type { PriorityCardProps } from './types';
import { DEFAULT_SNOOZE_OPTIONS } from './types';

/**
 * スコアに応じた色クラス
 */
function getScoreColor(score: number): string {
  if (score >= 15) return 'text-destructive';
  if (score >= 10) return 'text-orange-700 dark:text-orange-400';
  if (score >= 5) return 'text-yellow-800 dark:text-yellow-400';
  return 'text-muted-foreground';
}

/**
 * スコアに応じた背景
 */
function getScoreBg(score: number): string {
  if (score >= 15) return 'bg-destructive/5';
  if (score >= 10) return 'bg-orange-50/50 dark:bg-orange-950/10';
  return '';
}

/**
 * 優先度カード
 */
export const PriorityCard = React.forwardRef<HTMLDivElement, PriorityCardProps>(
  (
    {
      task,
      rank,
      onClick,
      onComplete,
      onSnooze,
      onFactorsUpdate,
      snoozeOptions = DEFAULT_SNOOZE_OPTIONS,
      testId,
      readOnly = false,
      expanded: controlledExpanded,
      onExpandedChange,
    },
    ref,
  ) => {
    const [localExpanded, setLocalExpanded] = React.useState(false);
    const expanded = controlledExpanded ?? localExpanded;
    const setExpanded = onExpandedChange ?? setLocalExpanded;

    const [factors, setFactors] = React.useState({
      impact: task.impact || 5,
      effort: task.effort || 5,
      risk: task.risk || 0,
    });

    const score = task.score ?? 0;
    const isOverdue = task.due_date && new Date(task.due_date) < new Date();

    const handleFactorChange = (field: 'impact' | 'effort' | 'risk', value: number) => {
      const newFactors = { ...factors, [field]: value };
      setFactors(newFactors);
      onFactorsUpdate?.(newFactors);
    };

    return (
      <Card
        ref={ref}
        data-slot='priority-card'
        data-testid={testId}
        data-rank={rank}
        data-score={score}
        className={cn(
          'transition-all duration-200',
          getScoreBg(score),
          rank === 1 &&
            'ring-2 ring-primary shadow-md bg-gradient-to-r from-primary/5 to-transparent',
          onClick && 'cursor-pointer hover:shadow-md',
        )}
        onClick={onClick}
      >
        <CardHeader className='p-3 pb-2'>
          <div className='flex items-start gap-3'>
            {/* ランク */}
            <div
              data-slot='priority-rank'
              className={cn(
                'flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold',
                rank === 1
                  ? 'bg-primary text-primary-foreground'
                  : rank <= 3
                    ? 'bg-muted text-foreground'
                    : 'bg-muted/50 text-muted-foreground',
              )}
            >
              {rank}
            </div>

            {/* コンテンツ */}
            <div className='flex-1 min-w-0'>
              <div className='flex items-center justify-between gap-2 mb-1'>
                {/* プロジェクト */}
                {task.project?.name && (
                  <Badge
                    variant='outline'
                    className='text-[10px] px-1.5 py-0 font-normal shrink-0'
                    style={{
                      borderColor: task.project.color,
                      color: task.project.color,
                    }}
                  >
                    {task.project.name}
                  </Badge>
                )}

                {/* スコア */}
                <div
                  data-slot='priority-score'
                  className={cn('flex items-center gap-1 text-sm font-bold', getScoreColor(score))}
                >
                  <Zap className='w-3 h-3' />
                  {score.toFixed(1)}
                </div>
              </div>

              <CardTitle className='text-sm font-medium leading-snug line-clamp-2'>
                {task.title}
              </CardTitle>

              {/* メタ情報 */}
              <div className='flex items-center gap-2 mt-2 text-xs text-muted-foreground'>
                {task.due_date && (
                  <span
                    className={cn(
                      'flex items-center gap-0.5',
                      isOverdue && 'text-destructive font-medium',
                    )}
                  >
                    <Clock className='w-3 h-3' />
                    {formatDistanceToNow(new Date(task.due_date), {
                      addSuffix: true,
                    })}
                  </span>
                )}
                {task.assignee && (
                  <Avatar className='h-4 w-4'>
                    {task.assignee.avatar && <AvatarImage src={task.assignee.avatar} />}
                    <AvatarFallback className='text-[8px]'>
                      {task.assignee.name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            </div>

            {/* アクション */}
            {!readOnly && (
              <div
                data-slot='priority-actions'
                className='flex gap-1'
                onClick={(e) => e.stopPropagation()}
              >
                <Button
                  size='icon'
                  variant='ghost'
                  className='h-7 w-7'
                  aria-label={`Complete ${task.title}`}
                  onClick={onComplete}
                  testId={testId ? `${testId}-complete` : undefined}
                >
                  <Check className='h-4 w-4 text-green-600' />
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger
                    aria-label={`Snooze ${task.title}`}
                    className='inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-7 w-7'
                    data-testid={testId ? `${testId}-snooze` : undefined}
                  >
                    <Pause className='h-4 w-4 text-muted-foreground' />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align='end'>
                    {snoozeOptions.map((opt) => (
                      <DropdownMenuItem key={opt.minutes} onClick={() => onSnooze?.(opt.minutes)}>
                        {opt.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
        </CardHeader>

        {/* ファクターエディター */}
        {!readOnly && onFactorsUpdate && (
          <Collapsible open={expanded} onOpenChange={setExpanded}>
            <CollapsibleTrigger
              className='w-full h-6 flex items-center justify-center text-xs text-muted-foreground hover:bg-muted/50 transition-colors'
              data-testid={testId ? `${testId}-expand` : undefined}
              onClick={(e) => e.stopPropagation()}
            >
              <Sparkles className='w-3 h-3 mr-1' />
              Adjust Factors
              {expanded ? (
                <ChevronUp className='w-3 h-3 ml-1' />
              ) : (
                <ChevronDown className='w-3 h-3 ml-1' />
              )}
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent
                data-slot='priority-factors'
                className='p-3 pt-2 space-y-3 border-t'
                onClick={(e) => e.stopPropagation()}
              >
                {/* Impact */}
                <div className='space-y-1'>
                  <div className='flex justify-between text-xs'>
                    <span className='text-muted-foreground'>Impact</span>
                    <span className='font-medium'>{factors.impact}</span>
                  </div>
                  <Slider
                    value={[factors.impact]}
                    min={1}
                    max={10}
                    step={1}
                    onValueChange={(val) => {
                      const v = Array.isArray(val) ? val[0] : val;
                      handleFactorChange('impact', v as number);
                    }}
                  />
                </div>

                {/* Effort */}
                <div className='space-y-1'>
                  <div className='flex justify-between text-xs'>
                    <span className='text-muted-foreground'>Effort</span>
                    <span className='font-medium'>{factors.effort}</span>
                  </div>
                  <Slider
                    value={[factors.effort]}
                    min={1}
                    max={10}
                    step={1}
                    onValueChange={(val) => {
                      const v = Array.isArray(val) ? val[0] : val;
                      handleFactorChange('effort', v as number);
                    }}
                  />
                </div>

                {/* Risk */}
                <div className='space-y-1'>
                  <div className='flex justify-between text-xs'>
                    <span className='text-muted-foreground'>Risk</span>
                    <span className='font-medium'>{factors.risk}</span>
                  </div>
                  <Slider
                    value={[factors.risk]}
                    min={0}
                    max={10}
                    step={1}
                    onValueChange={(val) => {
                      const v = Array.isArray(val) ? val[0] : val;
                      handleFactorChange('risk', v as number);
                    }}
                  />
                </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        )}
      </Card>
    );
  },
);

PriorityCard.displayName = 'PriorityCard';
