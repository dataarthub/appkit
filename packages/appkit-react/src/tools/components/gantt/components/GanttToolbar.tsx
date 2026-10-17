/**
 * Gantt Toolbar Component
 *
 * Top toolbar with navigation, view mode, zoom, and filter controls.
 */

import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Filter, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { Button } from '../../ui/button';
import { cn } from "../../../lib/utils";
import type { GanttViewMode, GanttScaleConfig, GanttFilterConfig } from '../types';

export interface GanttToolbarProps {
  currentDate: Date;
  viewMode: GanttViewMode;
  scaleConfig?: GanttScaleConfig;
  filterConfig?: GanttFilterConfig;
  onViewModeChange: (mode: GanttViewMode) => void;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onToggleTaskList?: () => void;
  onToggleChart?: () => void;
  onOpenFilter?: () => void;
}

const VIEW_MODES: GanttViewMode[] = ['Day', 'Week', 'Month'];

/**
 * ガントチャートの上部に表示される、期間ナビゲーション、表示モード切り替え（日/週/月）、ズーム、フィルターなどを制御するツールバーコンポーネント。
 */
export function GanttToolbar({
  currentDate,
  viewMode,
  scaleConfig,
  filterConfig,
  onViewModeChange,
  onPrevious,
  onNext,
  onToday,
  onZoomIn,
  onZoomOut,
  onToggleTaskList,
  onToggleChart,
  onOpenFilter,
}: GanttToolbarProps) {
  const locale = enUS;

  const t = (key: string) => {
    const map: Record<string, string> = {
      today: 'Today',
      day: 'Day',
      week: 'Week',
      month: 'Month',
    };
    return map[key.toLowerCase()] || key;
  };

  return (
    <div className='flex items-center justify-between border-b bg-muted/20 [padding:var(--spacing-2)]'>
      {/* Left: Navigation */}
      <div className='flex items-center [gap:var(--spacing-2)]'>
        <Button
          variant='outline'
          size='icon'
          onClick={onPrevious} aria-label="Previous period"
          className='[height:calc(var(--spacing-4)*2)] [width:calc(var(--spacing-4)*2)]'
        >
          <ChevronLeft className='[height:var(--spacing-4)] [width:var(--spacing-4)]' />
        </Button>

        <span className='text-center [font-size:var(--text-sm)] [font-weight:var(--font-weight-semibold)] [width:calc(var(--spacing-4)*32)]'>
          {format(currentDate, 'MMMM yyyy', { locale })}
        </span>

        <Button
          variant='outline'
          size='icon'
          onClick={onNext} aria-label="Next period"
          className='[height:calc(var(--spacing-4)*2)] [width:calc(var(--spacing-4)*2)]'
        >
          <ChevronRight className='[height:var(--spacing-4)] [width:var(--spacing-4)]' />
        </Button>

        <Button variant='ghost' size='sm' onClick={onToday}>
          {t('today')}
        </Button>
      </div>

      {/* Center: View Mode Toggle */}
      <div className='flex items-center [gap:var(--spacing-2)]'>
        <div className='flex bg-muted [border-radius:var(--radius)] [padding:var(--spacing-1)]'>
          {VIEW_MODES.map((m) => (
            <button
              key={m}
              onClick={() => onViewModeChange(m)}
              className={cn(
                'transition-all [padding-left:var(--spacing-3)] [padding-right:var(--spacing-3)] [padding-top:var(--spacing-1)] [padding-bottom:var(--spacing-1)] [font-size:var(--text-xs)] [font-weight:var(--font-weight-medium)] [border-radius:var(--radius-sm)]',
                viewMode === m
                  ? 'bg-background text-foreground [box-shadow:var(--shadow-sm)]'
                  : 'text-foreground/80 hover:text-foreground',
              )}
            >
              {t(m)}
            </button>
          ))}
        </div>
      </div>

      {/* Right: Controls */}
      <div className='flex items-center [gap:var(--spacing-2)]'>
        {/* Zoom Controls */}
        {scaleConfig?.zoomControls && (
          <div className='flex items-center [gap:var(--spacing-1)]'>
            <Button variant='ghost' size='icon' onClick={onZoomOut} aria-label="Zoom out" className='h-7 w-7'>
              <ZoomOut className='h-4 w-4' />
            </Button>
            <Button variant='ghost' size='icon' onClick={onZoomIn} aria-label="Zoom in" className='h-7 w-7'>
              <ZoomIn className='h-4 w-4' />
            </Button>
          </div>
        )}

        {/* Display Toggle */}
        {(onToggleTaskList || onToggleChart) && (
          <Button
            variant='ghost'
            size='icon'
            onClick={onToggleTaskList || onToggleChart} aria-label="Toggle task list"
            className='h-7 w-7'
          >
            <Eye className='h-4 w-4' />
          </Button>
        )}

        {/* Filter */}
        {filterConfig?.enabled && (
          <Button variant='ghost' size='icon' onClick={onOpenFilter} aria-label="Filter tasks" className='h-7 w-7'>
            <Filter className='h-4 w-4' />
          </Button>
        )}
      </div>
    </div>
  );
}
