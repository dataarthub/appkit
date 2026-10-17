import { ReactNode } from 'react';

/**
 * カレンダーの表示モード
 */
export type CalendarViewMode = 'day' | 'week' | 'month' | 'timeline' | 'resource' | 'agenda';

/**
 * カレンダーリソース（会議室、人員等）
 *
 * @example
 * ```ts
 * const resources: CalendarResource[] = [
 *   { id: 'room-a', title: '会議室A', color: 'blue' },
 *   { id: 'room-b', title: '会議室B', color: 'green' },
 * ];
 * ```
 */
export interface CalendarResource {
  /** 一意のID */
  id: string;
  /** 表示名 */
  title: string;
  /** 説明 */
  description?: string;
  /** 色（テーマキーまたはHex） */
  color?: string;
  /** アバター画像URL */
  avatar?: string;
  /** 料金設定 */
  prices?: {
    base: number;
    peak: number;
    weekend: number;
  };
  /** 営業時間 */
  businessHours?: { start: number; end: number }[];
  [key: string]: unknown;
}
export type { CalendarEvent } from "@alneas/appkit-core/data";
import type { CalendarEvent } from "@alneas/appkit-core/data";


export interface ResourceCalendarProps {
  events: CalendarEvent[];
  resources?: CalendarResource[];
  defaultDate?: Date;
  defaultView?: CalendarViewMode;
  className?: string;

  // Callbacks
  onEventClick?: (event: CalendarEvent) => void;
  /** 月は1日、日/週は1時間、resourceは30分の半開区間を通知。予定移動ではない。 */
  onDateSelect?: (start: Date, end: Date, resourceId?: string) => void;
  onViewChange?: (view: CalendarViewMode) => void;
  /** 初回と表示期間の変更時に通知。endは排他的。monthは前後月の表示セルも含む。 */
  onRangeChange?: (range: { start: Date; end: Date }) => void;
  view?: CalendarViewMode;

  // View Config
  /** 時間枠の網掛け。resourceの個別営業時間が優先。予約可否の検証は利用側で行う。 */
  businessHours?: {
    daysOfWeek: number[]; // 0=Sun, 1=Mon...
    startTime: string; // '09:00'
    endTime: string; // '17:00'
  }[];

  // Components overrides
  components?: {
    event?: (props: { event: CalendarEvent }) => ReactNode;
    resourceHeader?: (props: { resource: CalendarResource }) => ReactNode;
    /** date, view, title, range, timelineDuration, onPrevious/onNext/onToday/onViewChangeを受け取る。 */
    toolbar?: (props: Record<string, unknown>) => ReactNode;
  };

  // Styling & UI Options
  enabledViews?: CalendarViewMode[];
  showDoubleArrows?: boolean;
  headerBgColor?: string; // Inline style bg for toolbar
  headingBgColor?: string; // Inline style bg for view headings
  defaultBgColor?: string; // Main background
}
