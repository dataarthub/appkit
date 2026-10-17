import * as React from 'react';
import { format, getHours, getMinutes, setHours, setMinutes, startOfDay } from 'date-fns';
import { ja } from 'date-fns/locale';
import { cn } from "../../../lib/utils";
import { CalendarEvent, CalendarResource } from '../types';
import { layoutEvents, activateOnKey, isBusinessTime } from '../calendar-layout';
import { useCalendarOptions } from '../calendar-context';

// Dimensions
const LEFT_COL_WIDTH = 96; // w-24
const RIGHT_COL_WIDTH = 96;
const HEADER_HEIGHT = 48; // h-12

export interface ResourceGridViewProps {
  /** 表示する日付 */
  date: Date;
  /** リソースのリスト */
  resources: CalendarResource[];
  /** イベントのリスト */
  events: CalendarEvent[];
  /** 開始時間 (時) デフォルト: 9 */
  startHour?: number;
  /** 終了時間 (時) デフォルト: 23 */
  endHour?: number;
  /** 1セルの時間 (分) デフォルト: 30 */
  cellDuration?: number; // minutes
  /** 1セルの幅 (px) デフォルト: 48 */
  cellWidth?: number; // pixels
  /** 行の高さ (px) デフォルト: 48 */
  rowHeight?: number; // pixels
  /** イベントクリック時のコールバック */
  onEventClick?: (event: CalendarEvent) => void;
  /** 空きスロットクリック時のコールバック */
  onEmptySlotClick?: (resourceId: string, time: Date) => void;
  /** 週末・祝日かどうか (価格表示などに影響) */
  isWeekendOrHoliday?: boolean;
  /** 営業時間 (網掛け表示に使用) */
  businessHours?: { start: number; end: number }[];
  /** 追加のクラス名 */
  className?: string;
}

/**
 * リソースカレンダーコンポーネント
 *
 * リソースごとのタイムラインを表示し、イベントを配置します。
 */
export function ResourceGridView({
  date,
  resources,
  events,
  startHour = 9,
  endHour = 23,
  cellDuration: requestedCellDuration = 30,
  cellWidth = 48,
  rowHeight = 48,
  onEventClick,
  onEmptySlotClick,
  isWeekendOrHoliday = false,
  businessHours = [{ start: 9, end: 22 }],
  className,
}: ResourceGridViewProps) {
  const cellDuration =
    Number.isFinite(requestedCellDuration) && requestedCellDuration >= 1
      ? requestedCellDuration
      : 30;
  const { components, businessHours: calendarBusinessHours } = useCalendarOptions();
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  // Time slots generation
  const timeSlots = React.useMemo(() => {
    const slots = [];
    const totalMinutes = (endHour - startHour) * 60;
    const count = totalMinutes / cellDuration;

    for (let i = 0; i < count; i++) {
      const time = setMinutes(setHours(startOfDay(date), startHour), i * cellDuration);
      slots.push(time);
    }
    return slots;
  }, [date, startHour, endHour, cellDuration]);

  // Group events by resource
  const eventsByResource = React.useMemo(() => {
    const groups = new Map<string, ReturnType<typeof layoutEvents>>();
    const day = startOfDay(date);
    for (const resource of resources) {
      groups.set(
        resource.id,
        layoutEvents(
          events.filter((event) => event.resourceId === resource.id),
          setHours(day, startHour),
          setHours(day, endHour),
        ),
      );
    }
    return groups;
  }, [events, resources, date, startHour, endHour]);
  const displayRowHeight =
    rowHeight *
    Math.max(
      1,
      ...Array.from(eventsByResource.values(), (segments) =>
        Math.max(1, ...segments.map((segment) => segment.lanes)),
      ),
    );

  const calculatePosition = (eventStart: Date, eventEnd: Date) => {
    const startTotalMinutes = getHours(eventStart) * 60 + getMinutes(eventStart) - startHour * 60;
    const durationMinutes = (eventEnd.getTime() - eventStart.getTime()) / (1000 * 60);

    const left = (startTotalMinutes / cellDuration) * cellWidth;
    const width = (durationMinutes / cellDuration) * cellWidth;

    return { left, width };
  };

  const isBusinessHour = (time: Date, resource: CalendarResource) => {
    if (calendarBusinessHours !== undefined || resource.businessHours !== undefined)
      return isBusinessTime(time, calendarBusinessHours, resource);
    const timeVal = getHours(time) + getMinutes(time) / 60;
    return businessHours.some((bh) => timeVal >= bh.start && timeVal < bh.end);
  };

  const totalContentWidth = timeSlots.length * cellWidth;
  const totalContentHeight = resources.length * displayRowHeight;

  // Scroll Sync Refs
  const headerTopRef = React.useRef<HTMLDivElement>(null);
  const headerBottomRef = React.useRef<HTMLDivElement>(null);
  const headerLeftRef = React.useRef<HTMLDivElement>(null);
  const headerRightRef = React.useRef<HTMLDivElement>(null);
  const overlayRef = React.useRef<HTMLDivElement>(null);

  // Refs for layout containers to update positions efficiently
  const rightHeaderContainerRef = React.useRef<HTMLDivElement>(null);
  const bottomHeaderContainerRef = React.useRef<HTMLDivElement>(null);
  const topHeaderContainerRef = React.useRef<HTMLDivElement>(null);
  const leftHeaderContainerRef = React.useRef<HTMLDivElement>(null);
  const topRightCornerRef = React.useRef<HTMLDivElement>(null);
  const bottomRightCornerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const updateLayout = () => {
      const viewportWidth = container.clientWidth;
      const viewportHeight = container.clientHeight;

      const contentRightEdge = LEFT_COL_WIDTH + totalContentWidth;
      const stickyRightEdge = viewportWidth - RIGHT_COL_WIDTH;
      const rightHeaderLeft = Math.min(contentRightEdge, stickyRightEdge);
      const totalVisualWidth = rightHeaderLeft + RIGHT_COL_WIDTH;

      if (rightHeaderContainerRef.current) {
        rightHeaderContainerRef.current.style.left = `${Math.max(0, rightHeaderLeft)}px`;
      }
      if (topHeaderContainerRef.current) {
        topHeaderContainerRef.current.style.width = `${totalVisualWidth}px`;
      }
      if (topRightCornerRef.current) {
        topRightCornerRef.current.style.left = `${Math.max(0, rightHeaderLeft)}px`;
      }

      const contentBottomEdge = HEADER_HEIGHT + totalContentHeight;
      const stickyBottomEdge = viewportHeight - HEADER_HEIGHT;
      const bottomHeaderTop = Math.min(contentBottomEdge, stickyBottomEdge);

      if (bottomHeaderContainerRef.current) {
        bottomHeaderContainerRef.current.style.top = `${Math.max(0, bottomHeaderTop)}px`;
        bottomHeaderContainerRef.current.style.width = `${totalVisualWidth}px`;
      }
      if (bottomRightCornerRef.current) {
        bottomRightCornerRef.current.style.left = `${Math.max(0, rightHeaderLeft)}px`;
        bottomRightCornerRef.current.style.top = `${Math.max(0, bottomHeaderTop)}px`;
      }

      const sidebarHeight = Math.max(0, bottomHeaderTop - HEADER_HEIGHT);

      if (leftHeaderContainerRef.current) {
        leftHeaderContainerRef.current.style.height = `${sidebarHeight}px`;
      }
      if (rightHeaderContainerRef.current) {
        rightHeaderContainerRef.current.style.height = `${sidebarHeight}px`;
      }
    };

    const observer = new ResizeObserver(updateLayout);
    observer.observe(container);
    updateLayout();

    return () => observer.disconnect();
  }, [totalContentWidth, totalContentHeight]);

  // Event Selection State
  const [selectedEvent, setSelectedEvent] = React.useState<{
    event: CalendarEvent;
    position: { top: number; left: number };
  } | null>(null);

  const handleEventClick = (e: React.MouseEvent, event: CalendarEvent) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const containerRect = scrollContainerRef.current?.getBoundingClientRect();

    if (containerRect) {
      const top = rect.bottom - containerRect.top;
      const left = rect.left - containerRect.left;
      setSelectedEvent({ event, position: { top, left } });
    }
  };

  const handlePopoverClick = () => {
    if (selectedEvent && onEventClick) {
      onEventClick(selectedEvent.event);
      setSelectedEvent(null);
    }
  };

  const closePopover = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedEvent(null);
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollLeft } = e.currentTarget;
    if (headerTopRef.current) {
      headerTopRef.current.style.transform = `translateX(${-scrollLeft}px)`;
    }
    if (headerBottomRef.current) {
      headerBottomRef.current.style.transform = `translateX(${-scrollLeft}px)`;
    }
    if (headerLeftRef.current) {
      headerLeftRef.current.style.transform = `translateY(${-scrollTop}px)`;
    }
    if (headerRightRef.current) {
      headerRightRef.current.style.transform = `translateY(${-scrollTop}px)`;
    }
  };

  return (
    <div className={cn('relative h-full w-full overflow-hidden border bg-background', className)}>
      <div
        ref={scrollContainerRef}
        className='relative h-full w-full overflow-auto'
        onScroll={handleScroll}
      >
        {/* 1. STICKY OVERLAY LAYER */}
        <div
          ref={overlayRef}
          className='pointer-events-none sticky left-0 top-0 z-30 flex h-full w-full flex-col justify-between'
        >
          {/* Top Header Row Wrapper */}
          <div
            ref={topHeaderContainerRef}
            className='pointer-events-auto absolute left-0 top-0 z-40 border-b bg-background'
            style={{ height: HEADER_HEIGHT }}
          >
            <div className='pointer-events-none absolute left-0 right-0 top-0 h-full border-t' />
            {/* Static Left Corner */}
            <div
              className='absolute left-0 top-0 z-50 border-l border-r bg-muted/50'
              style={{ width: LEFT_COL_WIDTH, height: HEADER_HEIGHT }}
            />
            {/* Scrolling Top Time Labels */}
            <div
              className='absolute bottom-0 top-0 overflow-hidden bg-muted/50'
              style={{ left: LEFT_COL_WIDTH, right: RIGHT_COL_WIDTH }}
            >
              <div
                ref={headerTopRef}
                className='will-change-transform absolute left-0 top-0 flex h-full items-center'
              >
                {timeSlots.map((time, i) => {
                  const isHour = getMinutes(time) === 0;
                  return (
                    <div
                      key={i}
                      className={cn(
                        'relative box-border flex flex-none items-center justify-start pl-1 text-sm font-medium text-muted-foreground',
                        isHour ? 'border-l' : '',
                      )}
                      style={{ width: cellWidth, height: '100%' }}
                    >
                      {isHour && format(time, 'H時', { locale: ja })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Bottom Header Row Wrapper */}
          <div
            ref={bottomHeaderContainerRef}
            className='pointer-events-auto absolute left-0 top-full z-40 border-b border-t bg-background transition-all duration-0'
            style={{ height: HEADER_HEIGHT }}
          >
            <div className='pointer-events-none absolute left-0 right-0 top-0 h-full border-b' />
            <div
              className='absolute left-0 top-0 z-50 border-b border-l border-r bg-muted/50'
              style={{ width: LEFT_COL_WIDTH, height: HEADER_HEIGHT }}
            />
            <div
              className='absolute bottom-0 top-0 overflow-hidden bg-muted/50'
              style={{ left: LEFT_COL_WIDTH, right: RIGHT_COL_WIDTH }}
            >
              <div
                ref={headerBottomRef}
                className='will-change-transform absolute left-0 top-0 flex h-full items-center'
              >
                {timeSlots.map((time, i) => {
                  const isHour = getMinutes(time) === 0;
                  return (
                    <div
                      key={i}
                      className={cn(
                        'relative box-border flex flex-none items-center justify-start pl-1 text-sm font-medium text-muted-foreground',
                        isHour ? 'border-l' : '',
                      )}
                      style={{ width: cellWidth, height: '100%' }}
                    >
                      {isHour && format(time, 'H時', { locale: ja })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Left Sidebar Column */}
          <div
            ref={leftHeaderContainerRef}
            className='pointer-events-auto absolute left-0 z-20 overflow-hidden border-l border-r bg-background'
            style={{ top: HEADER_HEIGHT, width: LEFT_COL_WIDTH }}
          >
            <div
              ref={headerLeftRef}
              className='will-change-transform absolute left-0 top-0 flex w-full flex-col bg-background'
            >
              {resources.map((resource) => (
                <div
                  key={resource.id}
                  className='box-border flex flex-col items-center justify-center border-b bg-muted/30 px-1 text-center text-sm font-medium text-foreground truncate'
                  style={{ height: displayRowHeight }}
                  title={resource.title}
                >
                  <div>
                    {components?.resourceHeader
                      ? components.resourceHeader({ resource })
                      : resource.title}
                  </div>
                  {resource.prices && (
                    <div className='text-xs font-normal text-muted-foreground'>
                      {isWeekendOrHoliday ? resource.prices.weekend : resource.prices.base}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Right Sidebar Column */}
          <div
            ref={rightHeaderContainerRef}
            className='pointer-events-auto absolute left-full z-20 overflow-hidden border-l border-r bg-background transition-all duration-0'
            style={{ top: HEADER_HEIGHT, width: RIGHT_COL_WIDTH }}
          >
            <div
              ref={headerRightRef}
              className='will-change-transform absolute left-0 top-0 flex w-full flex-col bg-background'
            >
              {resources.map((resource) => (
                <div
                  key={resource.id}
                  className='box-border flex flex-col items-center justify-center border-b bg-muted/30 px-1 text-center text-sm font-medium text-foreground truncate'
                  style={{ height: displayRowHeight }}
                  title={resource.title}
                >
                  <div>{resource.title}</div>
                  {resource.prices && (
                    <div className='text-xs font-normal text-muted-foreground'>
                      {isWeekendOrHoliday ? resource.prices.weekend : resource.prices.peak}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Dynamic Corners */}
          <div
            ref={topRightCornerRef}
            className='pointer-events-auto absolute left-full top-0 z-50 border-b border-l border-r border-t bg-muted/50'
            style={{ width: RIGHT_COL_WIDTH, height: HEADER_HEIGHT }}
          />
          <div
            ref={bottomRightCornerRef}
            className='pointer-events-auto absolute left-full top-full z-50 border-b border-l border-r border-t bg-muted/50'
            style={{ width: RIGHT_COL_WIDTH, height: HEADER_HEIGHT }}
          />
        </div>

        {/* 2. CONTENT LAYER */}
        <div
          className='absolute left-0 top-0 z-10'
          style={{
            width: totalContentWidth + LEFT_COL_WIDTH + RIGHT_COL_WIDTH,
            height: totalContentHeight + HEADER_HEIGHT * 2,
          }}
        >
          {/* POPOVER TOOLTIP */}
          {selectedEvent && (
            <>
              <div className='fixed inset-0 z-40 cursor-default' onClick={closePopover} />
              <div
                className='pointer-events-auto absolute z-50 cursor-pointer rounded-lg border bg-popover p-2 shadow-lg hover:bg-accent'
                style={{
                  top: selectedEvent.position.top - HEADER_HEIGHT + 10,
                  left: selectedEvent.position.left - LEFT_COL_WIDTH + 10,
                  width: 320,
                }}
                onClick={handlePopoverClick}
              >
                <div className='mb-1 -mx-2 -mt-2 flex items-center justify-between rounded-t-lg bg-primary px-2 py-1 text-primary-foreground'>
                  <span className='text-sm font-bold'>
                    {format(selectedEvent.event.start, 'HH:mm')} -{' '}
                    {format(selectedEvent.event.end, 'HH:mm')}
                  </span>
                </div>
                <div className='grid gap-1'>
                  <div className='text-sm font-semibold'>{selectedEvent.event.title}</div>
                  {selectedEvent.event.description && (
                    <div className='text-xs text-muted-foreground'>
                      {selectedEvent.event.description}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          <div
            className='absolute'
            style={{
              top: HEADER_HEIGHT,
              left: LEFT_COL_WIDTH,
              width: totalContentWidth,
              height: totalContentHeight,
            }}
          >
            {resources.map((resource) => (
              <div
                key={resource.id}
                className='relative flex box-border border-b bg-background'
                style={{ height: displayRowHeight, width: totalContentWidth }}
              >
                {timeSlots.map((time, colIdx) => {
                  const isHourStart = getMinutes(time) === 0;
                  return (
                    <button
                      key={colIdx}
                      type='button'
                      disabled={!onEmptySlotClick}
                      aria-label={`${resource.title} ${format(time, 'yyyy-MM-dd HH:mm')}`}
                      className={cn(
                        'pointer-events-auto box-border h-full flex-none border-r hover:bg-muted/10',
                        isHourStart ? 'border-border' : 'border-border border-dashed',
                        !isBusinessHour(time, resource) && 'bg-muted/20',
                      )}
                      style={{ width: cellWidth }}
                      onClick={() => onEmptySlotClick && onEmptySlotClick(resource.id, time)}
                    />
                  );
                })}

                {eventsByResource.get(resource.id)?.map(({ event, start, end, lane }) => {
                  const { left, width } = calculatePosition(start, end);
                  return (
                    <div
                      key={event.id}
                      data-event-id={event.id}
                      role='button'
                      tabIndex={0}
                      onKeyDown={(e) => activateOnKey(e, () => onEventClick?.(event))}
                      className={cn(
                        'pointer-events-auto absolute z-10 select-none overflow-hidden rounded px-1 text-xs text-white shadow-sm hover:opacity-90',
                        event.color || 'bg-primary text-primary-foreground',
                      )}
                      style={{
                        left,
                        width: Math.max(1, width - 2),
                        top: lane * rowHeight + 4,
                        height: rowHeight - 8,
                      }}
                      onClick={(e) => handleEventClick(e, event)}
                      title={`${event.title} (${format(event.start, 'HH:mm')} - ${format(
                        event.end,
                        'HH:mm',
                      )})`}
                    >
                      {components?.event ? (
                        components.event({ event })
                      ) : (
                        <>
                          <div className='truncate font-semibold'>{event.title}</div>
                          {width > 40 && event.description && (
                            <div className='truncate opacity-90'>{event.description}</div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
