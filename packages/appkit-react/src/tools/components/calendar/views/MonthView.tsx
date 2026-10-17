import * as React from 'react';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  format,
  addDays,
} from 'date-fns';
import { CalendarEvent } from '../types';
import { Locale } from 'date-fns';
import { cn } from "../../../lib/utils";
import { eventsForDay, activateOnKey } from '../calendar-layout';
import { useCalendarOptions } from '../calendar-context';

interface MonthViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
  onDateSelect?: (start: Date, end: Date) => void;
  locale: Locale;
  headingBgColor?: string;
  defaultBgColor?: string;
}

/**
 * イベントの予定を月次グリッド形式で表示するカレンダーの月ビューコンポーネント。
 */
export function MonthView({
  currentDate,
  events,
  onEventClick,
  onDateSelect,
  locale,
  headingBgColor,
  defaultBgColor,
}: MonthViewProps) {
  const { components } = useCalendarOptions();
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const dateFormat = 'd';
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const weekDays = React.useMemo(() => {
    const days = [];
    const weekStart = startOfWeek(currentDate);
    for (let i = 0; i < 7; i++) {
      days.push(
        <div
          key={i}
          className='py-2 text-xs font-semibold text-center text-muted-foreground uppercase border-b border-r'
          style={{ backgroundColor: headingBgColor }}
        >
          {format(addDays(weekStart, i), 'EEE', { locale })}
        </div>,
      );
    }
    return days;
  }, [currentDate, locale, headingBgColor]);

  const getEventsForDay = (day: Date) => {
    return eventsForDay(events, day);
  };

  return (
    <div className='flex flex-col h-full' style={{ backgroundColor: defaultBgColor }}>
      <div
        className='grid grid-cols-7 flex-none border-l'
        style={{ backgroundColor: headingBgColor }}
      >
        {weekDays}
      </div>

      <div
        className='flex-1 grid grid-cols-7 border-l border-b'
        style={{ gridTemplateRows: `repeat(${days.length / 7}, minmax(0, 1fr))` }}
      >
        {days.map((day) => {
          const dayEvents = getEventsForDay(day);
          const isSelectedMonth = isSameMonth(day, monthStart);

          return (
            <div
              key={day.toISOString()}
              className={cn(
                'border-r border-b min-h-[80px] p-1 flex flex-col transition-colors hover:bg-muted/10 cursor-pointer overflow-hidden',
                !isSelectedMonth && 'bg-muted/10 text-muted-foreground',
                isToday(day) && 'bg-primary/5',
              )}
              onClick={() => onDateSelect?.(day, addDays(day, 1))}
            >
              <div className='flex justify-between items-center px-1 mb-1'>
                <button
                  type='button'
                  aria-label={`${format(day, 'd')} (${format(day, 'yyyy-MM-dd')})`}
                  disabled={!onDateSelect}
                  className={cn(
                    'text-sm font-medium h-6 w-6 flex items-center justify-center rounded-full',
                    isToday(day) && 'bg-primary text-primary-foreground',
                  )}
                >
                  {format(day, dateFormat)}
                </button>
              </div>

              <div className='flex-1 flex flex-col gap-1 overflow-hidden'>
                {dayEvents.slice(0, 4).map((event) => (
                  <div
                    key={event.id}
                    data-event-id={event.id}
                    role='button'
                    tabIndex={0}
                    onKeyDown={(e) => activateOnKey(e, () => onEventClick?.(event))}
                    className={cn(
                      'text-xs px-1.5 py-0.5 rounded truncate font-medium cursor-pointer transition-opacity hover:opacity-80',
                      event.color ? `bg-[${event.color}]` : 'bg-primary/10 text-primary',
                      event.className,
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick?.(event);
                    }}
                    title={event.title}
                  >
                    {components?.event ? (
                      components.event({ event })
                    ) : (
                      <>
                        {!event.allDay && (
                          <span className='mr-1 opacity-75 text-[0.7rem]'>
                            {format(new Date(event.start), 'HH:mm')}
                          </span>
                        )}
                        {event.title}
                      </>
                    )}
                  </div>
                ))}
                {dayEvents.length > 4 && (
                  <div className='text-[10px] text-muted-foreground pl-1'>
                    + {dayEvents.length - 4} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
