import type { Meta, StoryObj } from '@storybook/react-vite';
import { ResourceGridView as ResourceCalendar } from '../../../../src/tools/components/calendar/views/ResourceView';
import { CalendarResource as Resource, CalendarEvent as SchedulerEvent } from '../../../../src/tools/components/calendar/types';
import { setHours, setMinutes } from 'date-fns';

const meta = {
  title: 'Calendar/ResourceView',
  component: ResourceCalendar,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof ResourceCalendar>;

export default meta;
type Story = StoryObj<typeof meta>;

const today = new Date();
const resources: Resource[] = [
  { id: '1', title: 'Room A', prices: { base: 1000, peak: 1500, weekend: 2000 } },
  { id: '2', title: 'Room B', prices: { base: 1200, peak: 1800, weekend: 2400 } },
  { id: '3', title: 'Room C', prices: { base: 800, peak: 1200, weekend: 1600 } },
  { id: '4', title: 'Room D' },
  { id: '5', title: 'Room E' },
];

const events: SchedulerEvent[] = [
  {
    id: 'e1',
    resourceId: '1',
    title: 'Meeting 1',
    start: setMinutes(setHours(today, 10), 0),
    end: setMinutes(setHours(today, 11), 30),
    description: 'Project Sync',
    color: 'bg-blue-500',
  },
  {
    id: 'e2',
    resourceId: '2',
    title: 'Workshop',
    start: setMinutes(setHours(today, 13), 0),
    end: setMinutes(setHours(today, 16), 0),
    description: 'Design Thinking',
    color: 'bg-green-500',
  },
  {
    id: 'e3',
    resourceId: '1',
    title: 'Lunch Break',
    start: setMinutes(setHours(today, 12), 0),
    end: setMinutes(setHours(today, 13), 0),
    color: 'bg-gray-400',
  },
];

export const Default: Story = {
  args: {
    date: today,
    resources,
    events,
    startHour: 8,
    endHour: 20,
  },
  render: (args: any) => (
    <div className='h-[600px] w-full'>
      <ResourceCalendar {...args} />
    </div>
  ),
};

export const Weekend: Story = {
  args: {
    date: today,
    resources,
    events,
    isWeekendOrHoliday: true,
  },
  render: (args: any) => (
    <div className='h-[600px] w-full'>
      <ResourceCalendar {...args} />
    </div>
  ),
};
