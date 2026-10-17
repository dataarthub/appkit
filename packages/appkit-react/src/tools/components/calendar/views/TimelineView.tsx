import * as React from 'react';
import * as m from '../../../paraglide/messages.js';
import {
  format,
  addDays,
  isToday,
  eachDayOfInterval,
  isWeekend,
  startOfWeek,
  startOfMonth,
  endOfMonth,
  startOfDay,
  addHours,
} from 'date-fns';
import { Locale } from 'date-fns';
import { CalendarEvent, CalendarResource } from '../types';
import { cn } from "../../../lib/utils";
import { ScrollArea } from '../../ui/scroll-area';
import { User } from 'lucide-react';
import { calendarRange, layoutEvents, activateOnKey } from '../calendar-layout';
import { useCalendarOptions } from '../calendar-context';

interface TimelineViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  resources: CalendarResource[];
  onEventClick?: (event: CalendarEvent) => void;
  locale: Locale;
  duration?: 'day' | 'week' | 'month';
  headingBgColor?: string;
  defaultBgColor?: string;
}

/**
 * リソースごとに時間軸でイベントの予定を表示するタイムラインビューコンポーネント。
 */
export function TimelineView({
  currentDate,
  events,
  resources,
  onEventClick,
  locale,
  duration = 'week',
  headingBgColor,
  defaultBgColor,
}: TimelineViewProps) {
  const { components } = useCalendarOptions();
  // Config
  const ROW_HEIGHT = 50;
  const HEADER_HEIGHT = 50;
  const SIDEBAR_WIDTH = 180;

  interface TimelineColumn {
    date: Date;
    label: string;
    group: string;
    key: string;
  }

  const { totalWidth, columns, headers, scale, cellWidth } = React.useMemo(() => {
    let start: Date;
    let cols: TimelineColumn[] = [];
    let colScale: 'hour' | 'day' = 'day';
    let width = 50;

    // 1. Determine Range & Scale
    switch (duration) {
      case 'day':
        start = startOfDay(currentDate);
        colScale = 'hour';
        width = 80;
        // Generate Hours
        for (let i = 0; +addHours(start, i) < +addDays(start, 1); i++) {
          const date = addHours(start, i);
          cols.push({
            date,
            label: format(date, 'H:00'),
            group: format(start, 'yyyy/M/d (EEE)', { locale }),
            key: date.toISOString(),
          });
        }
        break;
      case 'week': {
        start = startOfWeek(currentDate, { weekStartsOn: 0 });
        colScale = 'hour'; // Changed to hour to show Time in row 2
        width = 60; // Narrower per hour

        // Generate Days -> Hours
        const days = eachDayOfInterval({ start: start, end: addDays(start, 6) });
        days.forEach((day) => {
          const dayLabel = format(day, 'M/d (EEE)', { locale });
          for (let h = 0; +addHours(startOfDay(day), h) < +addDays(startOfDay(day), 1); h++) {
            const date = addHours(startOfDay(day), h);
            cols.push({
              date: date,
              label: format(date, 'H:00'),
              group: dayLabel,
              key: date.toISOString(),
            });
          }
        });
        break;
      }
      case 'month': {
        start = startOfMonth(currentDate);
        const end = endOfMonth(currentDate);
        colScale = 'day';
        width = 40;
        // Generate Days
        const monthDays = eachDayOfInterval({ start, end });
        const monthLabel = format(start, 'yyyy/M', { locale });
        cols = monthDays.map((d) => ({
          date: d,
          label: format(d, 'd'),
          group: monthLabel,
          key: d.toISOString(),
        }));
        break;
      }
      default:
        start = startOfWeek(currentDate, { weekStartsOn: 0 });
    }

    // 2. Group Headers
    const groups: { label: string; span: number }[] = [];
    if (cols.length > 0) {
      let currentGroup = cols[0].group;
      let span = 0;
      cols.forEach((col) => {
        if (col.group !== currentGroup) {
          groups.push({ label: currentGroup, span });
          currentGroup = col.group;
          span = 0;
        }
        span++;
      });
      groups.push({ label: currentGroup, span });
    }

    return {
      totalWidth: cols.length * width,
      columns: cols,
      headers: groups,
      scale: colScale,
      startDate: start,
      cellWidth: width,
    };
  }, [currentDate, duration, locale]);

  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const sidebarRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const chart = scrollContainerRef.current?.querySelector<HTMLElement>(
      '[data-slot="scroll-area-viewport"]',
    );
    const sidebar = sidebarRef.current?.querySelector<HTMLElement>(
      '[data-slot="scroll-area-viewport"]',
    );
    if (!chart || !sidebar) return;
    const syncChart = () => {
      if (sidebar.scrollTop !== chart.scrollTop) sidebar.scrollTop = chart.scrollTop;
    };
    const syncSidebar = () => {
      if (chart.scrollTop !== sidebar.scrollTop) chart.scrollTop = sidebar.scrollTop;
    };
    chart.addEventListener('scroll', syncChart);
    sidebar.addEventListener('scroll', syncSidebar);
    return () => {
      chart.removeEventListener('scroll', syncChart);
      sidebar.removeEventListener('scroll', syncSidebar);
    };
  }, []);

  // Group events by Resource
  const eventMap = React.useMemo(() => {
    const map = new Map<string, ReturnType<typeof layoutEvents>>();
    const range = calendarRange(currentDate, 'timeline', duration);
    for (const resource of resources)
      map.set(
        resource.id,
        layoutEvents(
          events.filter((event) => event.resourceId === resource.id),
          range.start,
          range.end,
        ),
      );
    return map;
  }, [events, resources, currentDate, duration]);
  const rowSize = (id: string) =>
    ROW_HEIGHT * Math.max(1, ...(eventMap.get(id) ?? []).map((event) => event.lanes));
  const position = (date: Date) => {
    const index = columns.findIndex(
      (column, i) =>
        +date >= +column.date && (i === columns.length - 1 || +date < +columns[i + 1].date),
    );
    if (index < 0) return 0;
    const start = columns[index].date;
    const end = scale === 'hour' ? addHours(start, 1) : addDays(start, 1);
    return Math.min(totalWidth, (index + (+date - +start) / (+end - +start)) * cellWidth);
  };

  return (
    <div
      className='flex flex-col h-full bg-background border relative overflow-hidden'
      style={{ backgroundColor: defaultBgColor }}
    >
      <div className='flex flex-1 overflow-hidden'>
        {/* Fixed Sidebar */}
        <div
          className='flex-none border-r z-40 shadow-sm'
          style={{ width: SIDEBAR_WIDTH, backgroundColor: headingBgColor }}
        >
          <div
            className='border-b font-semibold text-sm flex items-center px-4 text-muted-foreground'
            style={{
              height: duration === 'day' ? HEADER_HEIGHT : HEADER_HEIGHT * 2,
              backgroundColor: headingBgColor,
            }}
          >
            {m.calendar_resources({ defaultValue: 'Resources' })}
          </div>
          <ScrollArea
            ref={sidebarRef}
            style={{
              height: `calc(100% - ${duration === 'day' ? HEADER_HEIGHT : HEADER_HEIGHT * 2}px)`,
            }}
          >
            <div className='flex flex-col'>
              {resources.map((res) => (
                <div
                  key={res.id}
                  className='border-b flex items-center px-4 hover:bg-muted/50 truncate font-normal text-sm'
                  style={{ height: rowSize(res.id) }}
                  title={res.title}
                >
                  {components?.resourceHeader ? (
                    components.resourceHeader({ resource: res })
                  ) : (
                    <>
                      <div className='w-8 h-8 rounded-full bg-muted flex items-center justify-center mr-2 flex-shrink-0'>
                        {res.avatar ? (
                          <img src={res.avatar} className='w-full h-full rounded-full' />
                        ) : (
                          <User className='w-4 h-4 text-muted-foreground' />
                        )}
                      </div>
                      <span className='truncate'>{res.title}</span>
                    </>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Timeline Area */}
        <ScrollArea className='flex-1' ref={scrollContainerRef}>
          <div style={{ width: totalWidth, minWidth: '100%' }}>
            {/* Headers */}
            <div
              className='sticky top-0 z-30 border-b shadow-sm'
              style={{ backgroundColor: headingBgColor }}
            >
              {/* Row 1: Group Header */}
              {duration !== 'day' && (
                <div className='flex border-b h-[50px]' style={{ backgroundColor: headingBgColor }}>
                  {headers.map((group, i) => (
                    <div
                      key={i}
                      className='flex items-center justify-center border-r px-2 font-medium text-sm text-foreground/80'
                      style={{ width: group.span * cellWidth }}
                    >
                      {group.label}
                    </div>
                  ))}
                </div>
              )}
              {/* Row 2: Detail Header */}
              <div className='flex h-[50px]' style={{ backgroundColor: headingBgColor }}>
                {columns.map((col) => (
                  <div
                    key={col.key}
                    className={cn(
                      'flex-none border-r text-center flex flex-col justify-center text-xs text-muted-foreground',
                      scale === 'day' && isWeekend(col.date) && 'bg-muted/10',
                      scale === 'day' && isToday(col.date) && 'bg-primary/20',
                      scale === 'hour' && isWeekend(col.date) && 'bg-muted/5',
                    )}
                    style={{ width: cellWidth }}
                  >
                    {col.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Grid & Events */}
            <div className='relative'>
              <div className='absolute inset-0 flex pointer-events-none z-0'>
                {columns.map((col) => (
                  <div
                    key={col.key}
                    className={cn(
                      'flex-none border-r h-full',
                      scale === 'day' && isWeekend(col.date) && 'bg-muted/5',
                      scale === 'day' && isToday(col.date) && 'bg-primary/5',
                    )}
                    style={{ width: cellWidth }}
                  />
                ))}
              </div>

              <div className='relative z-10'>
                {resources.map((res) => (
                  <div
                    key={res.id}
                    className='border-b relative group'
                    style={{ height: rowSize(res.id) }}
                  >
                    {eventMap.get(res.id)?.map(({ event, start, end, lane }) => {
                      const left = position(start);
                      const style = { left, width: Math.max(1, position(end) - left) };
                      return (
                        <div
                          key={event.id}
                          data-event-id={event.id}
                          role='button'
                          tabIndex={0}
                          onKeyDown={(e) => activateOnKey(e, () => onEventClick?.(event))}
                          className={cn(
                            'absolute top-2 bottom-2 rounded px-2 flex items-center text-xs font-semibold shadow-sm cursor-pointer hover:brightness-110 border border-white/10 overflow-hidden whitespace-nowrap',
                            event.color
                              ? `bg-[${event.color}] text-white`
                              : 'bg-primary text-primary-foreground',
                            event.className,
                          )}
                          style={{ ...style, height: ROW_HEIGHT - 16, top: lane * ROW_HEIGHT + 8 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            onEventClick?.(event);
                          }}
                        >
                          {components?.event ? components.event({ event }) : event.title}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
