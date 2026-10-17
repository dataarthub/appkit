export {};
import { format, startOfDay, addDays, eachDayOfInterval } from 'date-fns';
import { eventsForDay, activateOnKey } from '../calendar-layout';
import { useCalendarOptions } from '../calendar-context';
import { Locale } from 'date-fns';
import { CalendarEvent } from '../types';
import { ScrollArea } from '../../ui/scroll-area';
import { cn } from "../../../lib/utils";

interface AgendaViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  locale: Locale;
  onEventClick?: (event: CalendarEvent) => void;
  daysToShow?: number;
  headingBgColor?: string;
  defaultBgColor?: string;
}

/**
 * イベントの予定を日付順にリスト形式で表示するカレンダービューコンポーネント。
 */
export function AgendaView({
  currentDate,
  events,
  locale,
  onEventClick,
  daysToShow = 30,
  headingBgColor: _headingBgColor,
  defaultBgColor,
}: AgendaViewProps) {
  const { components } = useCalendarOptions();
  const startDate = startOfDay(currentDate);
  const endDate = addDays(startDate, Math.max(1, daysToShow) - 1);
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const getEventsForDay = (day: Date) => {
    return eventsForDay(events, day);
  };

  return (
    <ScrollArea className='h-full bg-background' style={{ backgroundColor: defaultBgColor }}>
      <div className='p-4 space-y-8'>
        {days.map((day) => {
          const dayEvents = getEventsForDay(day);
          if (dayEvents.length === 0) return null;

          return (
            <div key={day.toISOString()} className='flex gap-6'>
              <div className='w-24 flex-none text-right'>
                <div className='text-2xl font-bold'>{format(day, 'd')}</div>
                <div className='text-sm text-muted-foreground uppercase'>
                  {format(day, 'EEE', { locale })}
                </div>
              </div>
              <div className='flex-1 space-y-2'>
                {dayEvents.map((event) => (
                  <div
                    key={event.id}
                    data-event-id={event.id}
                    role='button'
                    tabIndex={0}
                    onKeyDown={(e) => activateOnKey(e, () => onEventClick?.(event))}
                    onClick={() => onEventClick?.(event)}
                    className={cn(
                      'p-3 rounded-lg border bg-card hover:bg-accent transition-colors cursor-pointer flex items-center justify-between group',
                      event.color && `border-l-4 border-l-[${event.color}]`,
                    )}
                  >
                    {components?.event ? (
                      components.event({ event })
                    ) : (
                      <div className='flex items-center gap-4'>
                        <div className='text-sm font-medium text-muted-foreground w-12 text-center'>
                          {event.allDay ? '—' : format(new Date(event.start), 'HH:mm')}
                        </div>
                        <div>
                          <div className='font-semibold'>{event.title}</div>
                          {event.description && (
                            <div className='text-xs text-muted-foreground line-clamp-1'>
                              {event.description}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        {!days.some((day) => getEventsForDay(day).length > 0) && (
          <div className='text-center py-20 text-muted-foreground italic'>No upcoming events</div>
        )}
      </div>
    </ScrollArea>
  );
}
