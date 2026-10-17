/**
 * Gantt Grid Component
 *
 * Background grid with day columns, today highlight, and time markers.
 */

import { isToday, isWeekend, isSameDay } from 'date-fns';
import { cn } from "../../../lib/utils";
import type { GanttViewMode, GanttGridConfig, GanttMarker } from '../types';

export interface GanttGridProps {
  allDays: Date[];
  startDate: Date;
  cellWidth: number;
  rowHeight: number;
  viewMode: GanttViewMode;
  gridConfig?: GanttGridConfig;
  markers?: GanttMarker[];
  getXPosition: (date: Date) => number;
}

/**
 * ガントチャートのタイムライン背景に表示されるグリッド線、今日の日付のハイライト、およびカスタムマーカーを描画するグリッドコンポーネント。
 */
export function GanttGrid({
  allDays,
  startDate,
  cellWidth,
  viewMode,
  gridConfig,
  markers = [],
  getXPosition,
}: GanttGridProps) {
  const showVerticalBorders = gridConfig?.showVerticalBorders ?? true;
  const showWeekendHighlight = gridConfig?.showWeekendHighlight ?? true;
  const showTodayHighlight = gridConfig?.showTodayHighlight ?? true;

  return (
    <div className='absolute inset-0 flex pointer-events-none'>
      {/* Day Columns */}
      {allDays.map((day) => {
        let borderClass = '';
        if (showVerticalBorders) {
          if (viewMode === 'Day') {
            borderClass = 'border-r';
          } else if (viewMode === 'Week' && day.getDay() === 1) {
            borderClass = 'border-l';
          } else if (viewMode === 'Month' && day.getDate() === 1) {
            borderClass = 'border-l';
          }
        }

        return (
          <div
            key={`grid-${day.toISOString()}`}
            className={cn(
              'flex-shrink-0 h-full',
              borderClass,
              showWeekendHighlight && isWeekend(day) && viewMode === 'Day'
                ? 'bg-muted/20'
                : 'bg-transparent',
              showTodayHighlight && isToday(day) && 'bg-primary/5',
            )}
            style={{ width: cellWidth }}
          />
        );
      })}

      {/* Current Time Indicator */}
      {(isSameDay(new Date(), startDate) || new Date() > startDate) && viewMode !== 'Month' && (
        <div
          className='absolute top-0 bottom-0 border-l-2 border-red-500/50 z-30 pointer-events-none'
          style={{ left: getXPosition(new Date()) + cellWidth / 2 }}
        >
          <div className='w-2 h-2 bg-red-500 rounded-full -ml-[5px] mt-[-4px]' />
        </div>
      )}

      {/* Custom Markers */}
      {markers.map((marker) => {
        const date = new Date(marker.date);
        const left = getXPosition(date);
        const color = marker.color || 'var(--primary)';

        if (marker.type === 'range' && marker.endDate) {
          const endDate = new Date(marker.endDate);
          const endLeft = getXPosition(endDate);
          const width = endLeft - left;

          return (
            <div
              key={marker.id}
              className='absolute top-0 bottom-0 opacity-20 pointer-events-none'
              style={{
                left,
                width,
                backgroundColor: color,
                zIndex: 5,
              }}
              title={marker.label}
            />
          );
        }

        return (
          <div
            key={marker.id}
            className='absolute top-0 bottom-0 border-l-2 border-dashed z-20 pointer-events-none'
            style={{
              left,
              borderColor: color,
            }}
            title={marker.label}
          >
            {marker.label && (
              <span
                className='absolute top-0 left-1 text-[10px] font-semibold whitespace-nowrap px-1 rounded'
                style={{ color, backgroundColor: `color-mix(in srgb, ${color} 20%, transparent)` }}
              >
                {marker.label}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
