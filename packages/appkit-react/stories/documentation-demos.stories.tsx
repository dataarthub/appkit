import type { Meta, StoryObj } from '@storybook/react-vite';
import FormDemo from './demos/form';
import DataTableDemo from './demos/data-table';
import KanbanDemo from './demos/kanban';
import CalendarDemo from './demos/calendar';
import GanttDemo from './demos/gantt';

export default { title: 'Examples/Documentation', parameters: { layout: 'padded' } } satisfies Meta;
type Story = StoryObj;
export const Form: Story = { render: () => <FormDemo /> };
export const DataTable: Story = { render: () => <DataTableDemo /> };
export const Kanban: Story = { render: () => <KanbanDemo /> };
export const Calendar: Story = { render: () => <CalendarDemo /> };
export const Gantt: Story = { render: () => <GanttDemo /> };

// Compose only components owned by the public package.
export const Workspace: Story = {
  render: () => <div className="space-y-6">
    <header><h1 className="text-2xl font-bold">Project workspace</h1></header>
    <section aria-label="Request form"><FormDemo /></section>
    <section aria-label="Records"><DataTableDemo /></section>
    <section aria-label="Board"><KanbanDemo /></section>
  </div>,
};
