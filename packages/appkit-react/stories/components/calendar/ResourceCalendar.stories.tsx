import type { Meta, StoryObj } from '@storybook/react-vite';
import { ResourceCalendar } from '../../../src/tools/components/calendar/ResourceCalendar';
import type { CalendarEvent, CalendarResource } from '../../../src/tools/components/calendar/types';

const meta = {
  title: 'Components/ResourceCalendar',
  component: ResourceCalendar,
  args: { defaultDate: new Date(2024, 0, 15) },
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
リソースカレンダーコンポーネント。月・週・日・タイムライン・リソース表示に対応。

## Features
- 6つのビューモード（month, week, day, timeline, resource, agenda）
- リソース別イベント表示
- クリック・キーボードによる時間枠選択
- イベントクリック時の詳細表示
- 日本語/英語ローカライズ

## Import
\`\`\`tsx
import { ResourceCalendar } from '@alneas/appkit-react/tools/calendar';
\`\`\`
        `,
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    onEventClick: { action: 'eventClick' },
    onDateSelect: { action: 'dateSelect' },
    onViewChange: { action: 'viewChange' },
  },
} satisfies Meta<typeof ResourceCalendar>;

export default meta;
type Story = StoryObj<typeof meta>;

const sampleResources: CalendarResource[] = [
  { id: 'room-a', title: '会議室A', color: 'blue' },
  { id: 'room-b', title: '会議室B', color: 'green' },
  { id: 'room-c', title: '会議室C', color: 'purple' },
];

const sampleEvents: CalendarEvent[] = [
  {
    id: '1',
    title: 'チームミーティング',
    start: new Date('2024-01-15 10:00'),
    end: new Date('2024-01-15 11:00'),
    resourceId: 'room-a',
  },
  {
    id: '2',
    title: 'クライアント打ち合わせ',
    start: new Date('2024-01-15 14:00'),
    end: new Date('2024-01-15 15:30'),
    resourceId: 'room-b',
  },
  {
    id: '3',
    title: 'スプリントレビュー',
    start: new Date('2024-01-16 09:00'),
    end: new Date('2024-01-16 10:00'),
    resourceId: 'room-a',
  },
  {
    id: '4',
    title: '1on1',
    start: new Date('2024-01-17 13:00'),
    end: new Date('2024-01-17 13:30'),
    resourceId: 'room-c',
  },
];

export const Default: Story = {
  args: {
    events: sampleEvents,
    resources: sampleResources,
    defaultView: 'week',
  },
};

export const MonthView: Story = {
  args: {
    events: sampleEvents,
    defaultView: 'month',
  },
};

export const DayView: Story = {
  args: {
    events: sampleEvents,
    resources: sampleResources,
    defaultView: 'day',
  },
};

export const TimelineView: Story = {
  args: {
    events: sampleEvents,
    resources: sampleResources,
    defaultView: 'timeline',
  },
};

export const ResourceView: Story = {
  args: {
    events: sampleEvents,
    resources: sampleResources,
    defaultView: 'resource',
  },
};

export const AgendaView: Story = {
  args: {
    events: sampleEvents,
    defaultView: 'agenda',
  },
};

export const NoResources: Story = {
  args: {
    events: sampleEvents,
    resources: [],
    defaultView: 'month',
  },
};

export const Empty: Story = {
  args: {
    events: [],
    resources: sampleResources,
    defaultView: 'week',
  },
};

/** 日跨ぎ・同時刻・終日の予定を比較する回帰確認用の例。 */
export const OverlappingAndOvernight: Story = {
  args: {
    defaultDate: new Date(2026, 8, 15),
    defaultView: 'day',
    resources: [{ id: 'room', title: 'Room' }],
    events: [
      {
        id: 'night',
        title: '前日からの予定',
        resourceId: 'room',
        start: new Date(2026, 8, 14, 23),
        end: new Date(2026, 8, 15, 10),
      },
      {
        id: 'one',
        title: '予定A',
        resourceId: 'room',
        start: new Date(2026, 8, 15, 9),
        end: new Date(2026, 8, 15, 11),
      },
      {
        id: 'two',
        title: '予定B',
        resourceId: 'room',
        start: new Date(2026, 8, 15, 10),
        end: new Date(2026, 8, 15, 12),
      },
      {
        id: 'all',
        title: '終日',
        resourceId: 'room',
        start: new Date(2026, 8, 15),
        end: new Date(2026, 8, 16),
        allDay: true,
      },
    ],
  },
};
