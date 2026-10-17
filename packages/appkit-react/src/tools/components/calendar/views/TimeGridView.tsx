import * as React from 'react';
import {
  format,
  addDays,
  startOfWeek,
  eachDayOfInterval,
  isSameDay,
  isToday,
  setHours,
  startOfDay,
} from 'date-fns';
import { Locale } from 'date-fns';
import { CalendarEvent, CalendarResource, CalendarViewMode } from '../types';
import { cn } from "../../../lib/utils";
import { layoutEvents, eventsForDay, activateOnKey, isBusinessTime } from '../calendar-layout';
import { useCalendarOptions } from '../calendar-context';

interface TimeGridViewProps {
  currentDate: Date;
  view: CalendarViewMode; // 'day' | 'week'
  events: CalendarEvent[];
  resources: CalendarResource[];
  onEventClick?: (event: CalendarEvent) => void;
  onDateSelect?: (start: Date, end: Date, resourceId?: string) => void;
  locale: Locale;
  startHour?: number;
  endHour?: number;
  cellHeight?: number; // Height per hour slot approx
  headingBgColor?: string;
  defaultBgColor?: string;
}

type TimeGridColumn = {
  id: string;
  title: string;
  date: Date;
  type: 'date' | 'resource' | 'resource-date';
  resourceId?: string;
  resource?: CalendarResource;
  dayLabel?: string;
};

/**
 * イベントの予定を時間軸（グリッド）形式で日次または週次で表示するカレンダービューコンポーネント。
 */
export function TimeGridView({
  currentDate,
  view,
  events,
  resources,
  onEventClick,
  onDateSelect,
  locale,
  startHour = 0,
  endHour = 24,
  cellHeight = 60,
  headingBgColor,
  defaultBgColor,
}: TimeGridViewProps) {
  const { components, businessHours } = useCalendarOptions();
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const columns = React.useMemo<TimeGridColumn[]>(() => {
    if (view === 'week') {
      const start = startOfWeek(currentDate, { weekStartsOn: 0 }); // Sunday start
      const days = eachDayOfInterval({ start, end: addDays(start, 6) });

      if (resources.length > 0) {
        const cols: TimeGridColumn[] = [];
        days.forEach((day) => {
          resources.forEach((res) => {
            cols.push({
              id: `${day.toISOString()}-${res.id}`,
              title: res.title,
              dayLabel: format(day, 'M/d (EEE)', { locale }),
              date: day,
              resourceId: res.id,
              resource: res,
              type: 'resource-date',
            });
          });
        });
        return cols;
      } else {
        return days.map<TimeGridColumn>((day) => ({
          id: day.toISOString(),
          title: format(day, 'M/d (EEE)', { locale }),
          date: day,
          type: 'date',
        }));
      }
    } else {
      // Day View
      if (resources.length > 0) {
        return resources.map<TimeGridColumn>((res) => ({
          id: res.id,
          title: res.title,
          resource: res,
          date: currentDate,
          type: 'resource',
        }));
      } else {
        return [
          {
            id: 'single-day',
            title: format(currentDate, 'M/d (EEE)', { locale }),
            date: currentDate,
            type: 'date',
          } as TimeGridColumn,
        ];
      }
    }
  }, [view, currentDate, resources, locale]);

  const uniqueDates = React.useMemo(() => {
    const dates: Date[] = [];
    columns.forEach((col) => {
      if (!dates.some((d) => isSameDay(d, col.date))) {
        dates.push(col.date);
      }
    });
    return dates;
  }, [columns]);

  // Time Slots
  const hours = React.useMemo(() => {
    const slots = [];
    for (let i = startHour; i < endHour; i++) {
      slots.push(i);
    }
    return slots;
  }, [startHour, endHour]);

  // Filter events for a column
  const getEventsForColumn = (col: TimeGridColumn) => {
    return eventsForDay(events, col.date).filter(
      (event) => !col.resource || event.resourceId === col.resource.id,
    );
  };

  // Auto-scroll to 9am
  React.useEffect(() => {
    if (scrollRef.current) {
      const currentHourOffset = 9;
      const offset = (currentHourOffset - startHour) * cellHeight;
      scrollRef.current.scrollTop = Math.max(0, offset);
    }
  }, [view, startHour, cellHeight]);

  const isLargeGrid = columns.length > 7;
  const colWidth = isLargeGrid ? 160 : 0;
  const gridStyle = {
    gridTemplateColumns:
      colWidth > 0 ? `repeat(${columns.length}, ${colWidth}px)` : `repeat(${columns.length}, 1fr)`,
    minWidth: colWidth > 0 ? columns.length * colWidth : '100%',
    width: colWidth > 0 ? 'fit-content' : '100%',
  };

  return (
    <div
      className='flex flex-col h-full bg-background relative select-none'
      style={{ backgroundColor: defaultBgColor }}
    >
      <div
        ref={scrollRef}
        className='flex-1 overflow-auto bg-background'
        style={{ backgroundColor: defaultBgColor }}
      >
        <div className='relative' style={{ width: gridStyle.width }}>
          {/* Corner + Header sticky row */}
          <div
            className='sticky top-0 z-[40] flex flex-col border-b bg-muted/20'
            style={{ backgroundColor: headingBgColor }}
          >
            {/* Row 1: Dates */}
            <div className='flex' style={{ backgroundColor: headingBgColor }}>
              <div
                className='sticky left-0 z-[60] w-14 flex-none border-r min-h-[40px]'
                style={{ backgroundColor: headingBgColor }}
              />
              <div className='flex-1 grid' style={gridStyle}>
                {uniqueDates.map((date) => {
                  const resourceCount = columns.filter((col) => isSameDay(col.date, date)).length;
                  return (
                    <div
                      key={date.toISOString()}
                      className={cn(
                        'py-1 text-center border-l flex flex-col justify-center',
                        isToday(date) && 'text-primary bg-primary/10',
                      )}
                      style={{
                        gridColumn: `span ${resourceCount}`,
                        backgroundColor: headingBgColor,
                      }}
                    >
                      <span className='text-base font-normal'>
                        {format(date, 'M/d (EEE)', { locale })}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Row 2: Resources (Show only if resources exist) */}
            {resources.length > 0 && (
              <div className='flex border-t bg-background'>
                <div
                  className='sticky left-0 z-[60] w-14 flex-none border-r bg-background min-h-[30px]'
                  style={{ backgroundColor: headingBgColor }}
                />
                <div className='flex-1 grid' style={gridStyle}>
                  {columns.map((col) => (
                    <div
                      key={col.id}
                      className={cn(
                        'py-1 text-center border-l truncate px-2 flex flex-col justify-center min-h-[30px]',
                        isToday(col.date) && 'bg-primary/10',
                      )}
                      style={{ backgroundColor: headingBgColor }}
                    >
                      <span className='text-sm font-normal text-muted-foreground truncate'>
                        {col.resource && components?.resourceHeader
                          ? components.resourceHeader({ resource: col.resource })
                          : col.title}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {columns.some((col) => getEventsForColumn(col).some((event) => event.allDay)) && (
            <div className='flex border-b' data-calendar-all-day>
              <div className='w-14 flex-none text-xs text-center'>—</div>
              <div className='flex-1 grid' style={gridStyle}>
                {columns.map((col) => (
                  <div key={col.id} className='border-l p-1'>
                    {getEventsForColumn(col)
                      .filter((event) => event.allDay)
                      .map((event) => (
                        <div
                          key={event.id}
                          data-event-id={event.id}
                          role='button'
                          tabIndex={0}
                          className='rounded bg-primary/10 text-primary p-1 text-xs cursor-pointer'
                          onClick={() => onEventClick?.(event)}
                          onKeyDown={(e) => activateOnKey(e, () => onEventClick?.(event))}
                        >
                          {components?.event ? components.event({ event }) : event.title}
                        </div>
                      ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Body Row */}
          <div className='flex relative'>
            {/* Time Axis (Sticky Left) */}
            <div
              className='sticky left-0 z-[30] w-14 flex-none border-r'
              style={{ backgroundColor: headingBgColor }}
            >
              {hours.map((h) => (
                <div
                  key={h}
                  className='relative border-b text-xs text-muted-foreground text-right pr-2 py-1'
                  style={{ height: cellHeight }}
                >
                  <span className='top-1 relative pl-1 font-medium'>
                    {format(setHours(new Date(), h), 'H:00')}
                  </span>
                </div>
              ))}
            </div>

            {/* Grid Content */}
            <div className='flex-1 grid relative' style={gridStyle}>
              <div className='absolute inset-0 pointer-events-none z-0 flex flex-col'>
                {hours.map((h) => (
                  <div key={h} className='border-b w-full' style={{ height: cellHeight }} />
                ))}
              </div>

              {columns.map((col) => {
                const day = startOfDay(col.date);
                const from = setHours(day, startHour);
                const to = setHours(day, endHour);
                const colEvents = layoutEvents(
                  getEventsForColumn(col).filter((event) => !event.allDay),
                  from,
                  to,
                );
                const isColToday = isToday(col.date);

                return (
                  <div
                    key={col.id}
                    className={cn('relative border-l min-w-0 h-full', isColToday && 'bg-primary/5')}
                  >
                    {hours.map((hour) => {
                      const start = setHours(day, hour);
                      return (
                        <button
                          key={hour}
                          type='button'
                          aria-label={`${format(start, 'yyyy-MM-dd HH:mm')} ${col.resource?.title ?? ''}`}
                          disabled={!onDateSelect}
                          className={cn(
                            'absolute left-0 w-full border-b hover:bg-muted/20 focus-visible:ring-2 focus-visible:ring-primary',
                            !isBusinessTime(start, businessHours, col.resource) && 'bg-muted/30',
                          )}
                          style={{ top: (hour - startHour) * cellHeight, height: cellHeight }}
                          onClick={() =>
                            onDateSelect?.(start, setHours(day, hour + 1), col.resource?.id)
                          }
                        />
                      );
                    })}
                    {/* Events */}
                    {colEvents.map(({ event, start, end, lane, lanes }) => {
                      const startMinutes = start.getHours() * 60 + start.getMinutes();
                      const endMinutes = isSameDay(end, day)
                        ? end.getHours() * 60 + end.getMinutes()
                        : endHour * 60;
                      const style = {
                        top: ((startMinutes - startHour * 60) / 60) * cellHeight,
                        height: Math.max(1, ((endMinutes - startMinutes) / 60) * cellHeight),
                        left: `calc(${(lane / lanes) * 100}% + 2px)`,
                        width: `calc(${100 / lanes}% - 4px)`,
                      };
                      return (
                        <div
                          key={event.id}
                          data-event-id={event.id}
                          role='button'
                          tabIndex={0}
                          onKeyDown={(e) => activateOnKey(e, () => onEventClick?.(event))}
                          className={cn(
                            'absolute z-10 rounded border px-2 text-xs shadow-sm cursor-pointer hover:brightness-95 overflow-hidden',
                            event.color
                              ? `bg-[${event.color}] text-white`
                              : 'bg-primary text-primary-foreground border-primary',
                            event.className,
                          )}
                          style={style}
                          onClick={(e) => {
                            e.stopPropagation();
                            onEventClick?.(event);
                          }}
                          title={`${format(new Date(event.start), 'HH:mm')} - ${event.title}`}
                        >
                          {components?.event ? (
                            components.event({ event })
                          ) : (
                            <>
                              <div className='font-semibold truncate'>{event.title}</div>
                              <div className='text-[0.65rem] opacity-90 truncate'>
                                {format(new Date(event.start), 'HH:mm')} -{' '}
                                {format(new Date(event.end), 'HH:mm')}
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}

                    {/* Current Time Indicator (if Today) */}
                    {isColToday && (
                      <div
                        className='absolute w-full border-t-2 border-red-500 z-20 pointer-events-none'
                        style={{
                          top: `${((new Date().getHours() * 60 + new Date().getMinutes() - startHour * 60) / 60) * cellHeight}px`,
                        }}
                      >
                        <div className='w-2 h-2 bg-red-500 rounded-full -mt-[5px] -ml-[5px]' />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
