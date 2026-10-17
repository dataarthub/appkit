import * as React from 'react';
import * as m from '../../paraglide/messages.js';
import { getLocale } from '../../paraglide/runtime.js';
import {
  format,
  addMonths,
  addWeeks,
  addDays,
  subMonths,
  subWeeks,
  subDays,
  startOfWeek,
} from 'date-fns';
import { ja, enUS } from 'date-fns/locale';
import { ResourceCalendarProps, CalendarViewMode, CalendarEvent } from './types';
import { cn } from "../../lib/utils";
import { Button } from '../ui/button';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  LayoutGrid,
  StretchHorizontal,
  Users,
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger } from '../ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';

import { MonthView } from './views/MonthView';
import { TimeGridView } from './views/TimeGridView';
import { TimelineView } from './views/TimelineView';
import { AgendaView } from './views/AgendaView';
import { ResourceGridView } from './views/ResourceView';
import { CalendarOptionsContext } from './calendar-context';
import { calendarRange } from './calendar-layout';

/**
 * リソースカレンダーコンポーネント
 *
 * 月・週・日・タイムライン・リソース表示に対応した多機能カレンダー。
 *
 * ## Features
 * - 6つのビューモード（month, week, day, timeline, resource, agenda）
 * - リソース別イベント表示
 * - 日付・時間枠の選択（クリック／キーボード）
 * - イベントクリック時の詳細表示
 * - 日本語/英語ローカライズ
 * - カスタムヘッダー/背景色
 *
 * ## AI/Automation Attributes
 * - `data-testid`: Container element
 * - `data-view`: Current view mode
 * - `data-event-count`: Number of events
 *
 * @example
 * ```tsx
 * import { ResourceCalendar } from '@alneas/appkit-react/tools/calendar';
 *
 * const events = [
 *   {
 *     id: '1',
 *     title: '会議',
 *     start: new Date('2024-01-15 10:00'),
 *     end: new Date('2024-01-15 11:00'),
 *     resourceId: 'room-a',
 *   },
 * ];
 *
 * const resources = [
 *   { id: 'room-a', title: '会議室A' },
 *   { id: 'room-b', title: '会議室B' },
 * ];
 *
 * <ResourceCalendar
 *   events={events}
 *   resources={resources}
 *   defaultView="week"
 *   onEventClick={(event) => console.log(event)}
 * />
 * ```
 *
 * @param props - {@link ResourceCalendarProps}
 * @returns リソースカレンダーコンポーネント
 */
export function ResourceCalendar({
  events,
  resources = [],
  defaultDate = new Date(),
  defaultView = 'week',
  view: controlledView,
  className,
  onEventClick,
  onDateSelect,
  onViewChange,
  onRangeChange,
  components,
  businessHours,
  enabledViews,
  showDoubleArrows,
  headerBgColor = 'color-mix(in srgb, hsl(var(--muted)) 50%, hsl(var(--background)))',
  headingBgColor = 'color-mix(in srgb, hsl(var(--muted)) 30%, hsl(var(--background)))',
  defaultBgColor = 'hsl(var(--background))',
}: ResourceCalendarProps) {
  const [currentDate, setCurrentDate] = React.useState(defaultDate);
  const [internalView, setView] = React.useState<CalendarViewMode>(defaultView);
  const view = controlledView ?? internalView;

  const [lastGridView, setLastGridView] = React.useState<CalendarViewMode>('week');
  const [timelineDuration, setTimelineDuration] = React.useState<'day' | 'week' | 'month'>('week');
  const [selectedResourceId, setSelectedResourceId] = React.useState<string>('all');
  const [selectedEvent, setSelectedEvent] = React.useState<CalendarEvent | null>(null);
  const language = getLocale();
  const range = calendarRange(currentDate, view, timelineDuration);
  const rangeStart = +range.start;
  const rangeEnd = +range.end;
  const lastNotifiedRange = React.useRef('');
  React.useEffect(() => {
    const key = `${rangeStart}:${rangeEnd}`;
    if (onRangeChange && lastNotifiedRange.current !== key) {
      lastNotifiedRange.current = key;
      onRangeChange({ start: new Date(rangeStart), end: new Date(rangeEnd) });
    }
  }, [rangeStart, rangeEnd, onRangeChange]);
  const options = React.useMemo(() => ({ components, businessHours }), [components, businessHours]);

  const locale = React.useMemo(() => {
    return language === 'en' ? enUS : ja;
  }, [language]);

  const filteredResources = React.useMemo(() => {
    if (selectedResourceId === 'all') return resources;
    return resources.filter((r) => r.id === selectedResourceId);
  }, [resources, selectedResourceId]);

  const filteredEvents = React.useMemo(() => {
    if (selectedResourceId === 'all') return events;
    return events.filter((e) => e.resourceId === selectedResourceId);
  }, [events, selectedResourceId]);

  const handlePrevious = () => {
    let newDate: Date;
    switch (view) {
      case 'month':
        newDate = subMonths(currentDate, 1);
        break;
      case 'week':
        newDate = subWeeks(currentDate, 1);
        break;
      case 'day':
        newDate = subDays(currentDate, 1);
        break;
      case 'resource':
        newDate = subDays(currentDate, 1);
        break;
      case 'timeline':
        newDate =
          timelineDuration === 'day'
            ? subDays(currentDate, 1)
            : timelineDuration === 'month'
              ? subMonths(currentDate, 1)
              : subWeeks(currentDate, 1);
        break;
      default:
        newDate = subMonths(currentDate, 1);
    }
    setCurrentDate(newDate);
  };

  const handleNext = () => {
    let newDate: Date;
    switch (view) {
      case 'month':
        newDate = addMonths(currentDate, 1);
        break;
      case 'week':
        newDate = addWeeks(currentDate, 1);
        break;
      case 'day':
        newDate = addDays(currentDate, 1);
        break;
      case 'resource':
        newDate = addDays(currentDate, 1);
        break;
      case 'timeline':
        newDate =
          timelineDuration === 'day'
            ? addDays(currentDate, 1)
            : timelineDuration === 'month'
              ? addMonths(currentDate, 1)
              : addWeeks(currentDate, 1);
        break;
      default:
        newDate = addMonths(currentDate, 1);
    }
    setCurrentDate(newDate);
  };

  const handlePreviousLarge = () => {
    let newDate: Date;
    switch (view) {
      case 'month':
        newDate = subMonths(currentDate, 12);
        break;
      case 'week':
        newDate = subMonths(currentDate, 1);
        break;
      case 'day':
        newDate = subWeeks(currentDate, 1);
        break;
      case 'resource':
        newDate = subWeeks(currentDate, 1);
        break;
      case 'timeline':
        newDate = subMonths(currentDate, 1);
        break;
      default:
        newDate = subMonths(currentDate, 12);
    }
    setCurrentDate(newDate);
  };

  const handleNextLarge = () => {
    let newDate: Date;
    switch (view) {
      case 'month':
        newDate = addMonths(currentDate, 12);
        break;
      case 'week':
        newDate = addMonths(currentDate, 1);
        break;
      case 'day':
        newDate = addWeeks(currentDate, 1);
        break;
      case 'resource':
        newDate = addWeeks(currentDate, 1);
        break;
      case 'timeline':
        newDate = addMonths(currentDate, 1);
        break;
      default:
        newDate = addMonths(currentDate, 12);
    }
    setCurrentDate(newDate);
  };

  const handleViewChange = (v: string) => {
    if (view === 'timeline') {
      if (v === 'day' || v === 'week' || v === 'month') {
        setTimelineDuration(v as 'day' | 'week' | 'month');
        return;
      }
    }

    const newView = v as CalendarViewMode;
    setView(newView);
    onViewChange?.(newView);

    if (newView !== 'timeline' && newView !== 'agenda' && newView !== 'resource') {
      setLastGridView(newView);
    }
  };

  const toggleViewMode = (mode: 'grid' | 'timeline' | 'resource') => {
    const next = mode === 'grid' ? lastGridView : mode;
    setView(next);
    onViewChange?.(next);
  };

  const headerTitle = React.useMemo(() => {
    if (
      view === 'day' ||
      view === 'resource' ||
      (view === 'timeline' && timelineDuration === 'day')
    ) {
      return format(currentDate, language === 'en' ? 'MMMM d, yyyy' : 'yyyy年 M月 d日', { locale });
    }
    if (view === 'week' || (view === 'timeline' && timelineDuration === 'week')) {
      const start = startOfWeek(currentDate, { weekStartsOn: 0 }); // Assuming Sunday start
      // To match "21日-27日" style roughly
      // If same month: 10月 21日 - 27日
      // If different month: 9月 28日 - 10月 4日
      const end = addDays(start, 6);

      if (language === 'ja') {
        if (start.getMonth() === end.getMonth()) {
          return `${format(start, 'yyyy年 M月d日', { locale })} - ${format(end, 'd日', { locale })}`;
        }
        return `${format(start, 'yyyy年 M月d日', { locale })} - ${format(end, 'M月d日', { locale })}`;
      } else {
        if (start.getMonth() === end.getMonth()) {
          return `${format(start, 'MMM d')} - ${format(end, 'd, yyyy')}`;
        }
        return `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`;
      }
    }
    return format(currentDate, language === 'en' ? 'MMMM yyyy' : 'yyyy年 MMMM', { locale });
  }, [currentDate, locale, language, view, timelineDuration]);

  return (
    <CalendarOptionsContext.Provider value={options}>
      <div
        className={cn(
          'flex flex-col h-full border overflow-hidden [border-radius:var(--radius-lg)]',
          className,
        )}
        style={{ backgroundColor: defaultBgColor }}
      >
        {/* Toolbar */}
        {components?.toolbar ? (
          components.toolbar({
            date: currentDate,
            view,
            title: headerTitle,
            range,
            timelineDuration,
            onPrevious: handlePrevious,
            onNext: handleNext,
            onToday: () => setCurrentDate(new Date()),
            onViewChange: handleViewChange,
          })
        ) : (
          <div
            className='flex items-center justify-between border-b px-4 py-2 overflow-x-auto min-h-[52px]'
            style={{ backgroundColor: headerBgColor }}
          >
            <div className='flex items-center gap-2 flex-none'>
              {showDoubleArrows && (
                <Button
                  variant='outline'
                  size='icon'
                  onClick={handlePreviousLarge}
                  aria-label={language === 'ja' ? '大きく前へ' : 'Previous large interval'}
                  className='h-8 w-8'
                >
                  <ChevronsLeft className='h-4 w-4' />
                </Button>
              )}
              <Button
                variant='outline'
                size='icon'
                onClick={handlePrevious}
                aria-label={language === 'ja' ? '前の期間' : 'Previous interval'}
                className='h-8 w-8'
              >
                <ChevronLeft className='h-4 w-4' />
              </Button>
              <Button variant='outline' size='sm' onClick={() => setCurrentDate(new Date())}>
                {m.calendar_today()}
              </Button>
              <Button
                variant='outline'
                size='icon'
                onClick={handleNext}
                aria-label={language === 'ja' ? '次の期間' : 'Next interval'}
                className='h-8 w-8'
              >
                <ChevronRight className='h-4 w-4' />
              </Button>
              {showDoubleArrows && (
                <Button
                  variant='outline'
                  size='icon'
                  onClick={handleNextLarge}
                  aria-label={language === 'ja' ? '大きく次へ' : 'Next large interval'}
                  className='h-8 w-8'
                >
                  <ChevronsRight className='h-4 w-4' />
                </Button>
              )}
              <span className='ml-2 text-lg font-semibold whitespace-nowrap'>{headerTitle}</span>
            </div>

            <div className='flex items-center gap-2 flex-none ml-4'>
              {resources.length > 0 && (
                <Select
                  value={selectedResourceId}
                  onValueChange={(v) => v && setSelectedResourceId(v)}
                >
                  <SelectTrigger aria-label={language === 'ja' ? 'リソース' : 'Resource'} className='bg-background w-[200px] h-9'>
                    <span>
                      {selectedResourceId === 'all'
                        ? language === 'ja'
                          ? 'すべてのリソース'
                          : 'All Resources'
                        : resources.find((r) => r.id === selectedResourceId)?.title ||
                          selectedResourceId}
                    </span>
                  </SelectTrigger>
                  <SelectContent className='bg-popover'>
                    <SelectItem value='all'>
                      {language === 'ja' ? 'すべてのリソース' : 'All Resources'}
                    </SelectItem>
                    {resources.map((res) => (
                      <SelectItem key={res.id} value={res.id}>
                        {res.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* View Type Switcher (Icon Group) */}
              <div className='flex items-center border overflow-hidden bg-background rounded-md flex-none'>
                {(!enabledViews ||
                  enabledViews.includes('week') ||
                  enabledViews.includes('day') ||
                  enabledViews.includes('month')) && (
                  <Button
                    variant='ghost'
                    size='icon'
                    onClick={() => toggleViewMode('grid')}
                    className={cn(
                      'rounded-none h-9 w-9',
                      view !== 'timeline' &&
                        view !== 'resource' &&
                        'bg-muted text-accent-foreground',
                    )}
                    title={m.calendar_view_grid({ defaultValue: 'Grid' })}
                  >
                    <LayoutGrid className='h-4 w-4' />
                  </Button>
                )}
                {(!enabledViews || enabledViews.includes('timeline')) && (
                  <>
                    <div className='bg-border w-[1px] h-4' />
                    <Button
                      variant='ghost'
                      size='icon'
                      onClick={() => toggleViewMode('timeline')}
                      className={cn(
                        'rounded-none h-9 w-9',
                        view === 'timeline' && 'bg-muted text-accent-foreground',
                      )}
                      title={m.calendar_view_timeline({ defaultValue: 'Timeline' })}
                    >
                      <StretchHorizontal className='h-4 w-4' />
                    </Button>
                  </>
                )}
                {(!enabledViews || enabledViews.includes('resource')) && (
                  <>
                    <div className='bg-border w-[1px] h-4' />
                    <Button
                      variant='ghost'
                      size='icon'
                      onClick={() => toggleViewMode('resource')}
                      className={cn(
                        'rounded-none h-9 w-9',
                        view === 'resource' && 'bg-muted text-accent-foreground',
                      )}
                      title={m.calendar_view_resource({ defaultValue: 'Resource' })}
                    >
                      <Users className='h-4 w-4' />
                    </Button>
                  </>
                )}
              </div>

              {/* Time Scope Switcher (Text Group) */}
              {view !== 'resource' && (
                <div className='flex items-center border overflow-hidden bg-background rounded-md flex-none'>
                  {(!enabledViews || enabledViews.includes('day')) && (
                    <Button
                      variant='ghost'
                      size='sm'
                      onClick={() => handleViewChange('day')}
                      className={cn(
                        'rounded-none px-3 h-9',
                        (view === 'day' || (view === 'timeline' && timelineDuration === 'day')) &&
                          'bg-muted font-medium text-accent-foreground',
                      )}
                    >
                      {m.calendar_view_day()}
                    </Button>
                  )}
                  {(!enabledViews || enabledViews.includes('week')) && (
                    <>
                      <div className='bg-border w-[1px] h-4' />
                      <Button
                        variant='ghost'
                        size='sm'
                        onClick={() => handleViewChange('week')}
                        className={cn(
                          'rounded-none px-3 h-9',
                          (view === 'week' ||
                            (view === 'timeline' && timelineDuration === 'week')) &&
                            'bg-muted font-medium text-accent-foreground',
                        )}
                      >
                        {m.calendar_view_week()}
                      </Button>
                    </>
                  )}
                  {(!enabledViews || enabledViews.includes('month')) && (
                    <>
                      <div className='bg-border w-[1px] h-4' />
                      <Button
                        variant='ghost'
                        size='sm'
                        onClick={() => handleViewChange('month')}
                        className={cn(
                          'rounded-none px-3 h-9',
                          (view === 'month' ||
                            (view === 'timeline' && timelineDuration === 'month')) &&
                            'bg-muted font-medium text-accent-foreground',
                        )}
                      >
                        {m.calendar_view_month()}
                      </Button>
                    </>
                  )}
                  {view !== 'timeline' && (!enabledViews || enabledViews.includes('agenda')) && (
                    <>
                      <div className='bg-border w-[1px] h-4' />
                      <Button
                        variant='ghost'
                        size='sm'
                        onClick={() => handleViewChange('agenda')}
                        className={cn(
                          'rounded-none px-3 h-9',
                          view === 'agenda' && 'bg-muted font-medium text-accent-foreground',
                        )}
                      >
                        {m.calendar_view_agenda({ defaultValue: 'List' })}
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
        {/* View Content */}
        <div className='flex-1 overflow-hidden relative min-h-0'>
          {view === 'month' && (
            <MonthView
              currentDate={currentDate}
              events={filteredEvents}
              onEventClick={(e) => {
                setSelectedEvent(e);
                onEventClick?.(e);
              }}
              onDateSelect={onDateSelect}
              locale={locale}
              headingBgColor={headingBgColor}
              defaultBgColor={defaultBgColor}
            />
          )}
          {(view === 'week' || view === 'day') && (
            <TimeGridView
              view={view}
              currentDate={currentDate}
              events={filteredEvents}
              resources={filteredResources}
              onDateSelect={onDateSelect}
              locale={locale}
              onEventClick={(e) => {
                setSelectedEvent(e);
                onEventClick?.(e);
              }}
              headingBgColor={headingBgColor}
              defaultBgColor={defaultBgColor}
            />
          )}
          {view === 'timeline' && (
            <TimelineView
              currentDate={currentDate}
              events={filteredEvents}
              resources={filteredResources}
              locale={locale}
              duration={timelineDuration}
              onEventClick={(e) => {
                setSelectedEvent(e);
                onEventClick?.(e);
              }}
              headingBgColor={headingBgColor}
              defaultBgColor={defaultBgColor}
            />
          )}
          {view === 'agenda' && (
            <AgendaView
              currentDate={currentDate}
              events={filteredEvents}
              locale={locale}
              onEventClick={(e) => {
                setSelectedEvent(e);
                onEventClick?.(e);
              }}
              headingBgColor={headingBgColor}
              defaultBgColor={defaultBgColor}
            />
          )}
          {view === 'resource' && (
            <ResourceGridView
              date={currentDate}
              events={filteredEvents}
              resources={filteredResources}
              onEmptySlotClick={
                onDateSelect
                  ? (resourceId, start) =>
                      onDateSelect(start, new Date(+start + 30 * 60_000), resourceId)
                  : undefined
              }
              onEventClick={(e) => {
                setSelectedEvent(e);
                onEventClick?.(e);
              }}
            />
          )}
        </div>

        {/* Event Detail Dialog */}
        <Dialog open={!!selectedEvent} onOpenChange={(open) => !open && setSelectedEvent(null)}>
          <DialogContent className='bg-popover'>
            <DialogHeader>
              <DialogTitle className='text-xl font-bold'>{selectedEvent?.title}</DialogTitle>
              <DialogDescription className='text-sm text-muted-foreground'>
                {selectedEvent &&
                  format(new Date(selectedEvent.start), 'yyyy/MM/dd HH:mm', { locale })}
                {' - '}
                {selectedEvent && format(new Date(selectedEvent.end), 'HH:mm', { locale })}
              </DialogDescription>
            </DialogHeader>
            {selectedEvent?.description && (
              <div className='py-4 text-sm whitespace-pre-wrap text-foreground'>
                {selectedEvent.description as string}
              </div>
            )}
            {selectedEvent?.resourceId && (
              <div className='mt-2 text-xs font-semibold text-muted-foreground uppercase border-t pt-2'>
                Resource: {resources.find((r) => r.id === selectedEvent.resourceId)?.title}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </CalendarOptionsContext.Provider>
  );
}
