import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import { KanbanBoard } from '../../../src/tools/components/kanban/KanbanBoard';
import { Kanban } from '../../../src/tools/components/kanban/kanban-compound';
import { DEFAULT_KANBAN_COLUMNS } from '../../../src/tools/components/kanban/types';
import type { KanbanTask } from '../../../src/tools/components/kanban/types';

const meta = {
  title: 'Components/KanbanBoard',
  component: KanbanBoard,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
Display task columns with drag-and-drop movement, sorting and work-in-progress limits.

## Features
- Drag-and-drop task movement
- Tab to focus cards, Space/Enter to start or confirm movement, arrow keys to select columns, Escape to cancel
- Read-only mode disables drag initiation; touch activation uses a 250 ms hold
- Per-column work-in-progress limits
- Priority, due-date and title sorting
- 楽観的UIアップデート
- Custom card rendering

## Required setup

The application owns task state and status/order callbacks. These stories demonstrate local state and do not persist changes to a backend. Import @alneas/appkit-react/styles once in the host application; the Storybook preview supplies it here.

## Public import
\`\`\`tsx
import { KanbanBoard, DEFAULT_KANBAN_COLUMNS } from '@alneas/appkit-react/tools/kanban';
\`\`\`
        `,
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    onTaskClick: { action: 'taskClick' },
    onStatusChange: { action: 'statusChange' },
    onOrderChange: { action: 'orderChange' },
  },
} satisfies Meta<typeof KanbanBoard>;

export default meta;
type Story = StoryObj<typeof meta>;

const sampleTasks: KanbanTask[] = [
  {
    id: '1',
    title: 'Design system update',
    key: 'PROJ-101',
    status: 'backlog',
    priority: 'high',
    due_date: '2024-02-15',
    tags: ['design', 'ui'],
    assignee: { name: 'John Doe', avatar: '/avatar.svg' },
  },
  {
    id: '2',
    title: 'API integration',
    key: 'PROJ-102',
    status: 'todo',
    priority: 'medium',
    due_date: '2024-02-20',
    tags: ['backend'],
    assignee: { name: 'Jane Smith', avatar: '/avatar.svg' },
  },
  {
    id: '3',
    title: 'Unit tests',
    key: 'PROJ-103',
    status: 'in_progress',
    priority: 'high',
    due_date: '2024-02-10',
    tags: ['testing'],
    commentCount: 3,
  },
  {
    id: '4',
    title: 'Documentation',
    key: 'PROJ-104',
    status: 'review',
    priority: 'low',
    tags: ['docs'],
  },
  {
    id: '5',
    title: 'Bug fix: login issue',
    key: 'PROJ-105',
    status: 'done',
    priority: 'urgent',
    assignee: { name: 'Bob Wilson', avatar: '/avatar.svg' },
  },
];

export const Default: Story = {
  args: {
    tasks: sampleTasks,
    columns: DEFAULT_KANBAN_COLUMNS,
  },
};

export const WithCallbacks: Story = {
  args: {
    tasks: sampleTasks,
    columns: DEFAULT_KANBAN_COLUMNS,
    onTaskClick: (task) => console.log('Task clicked:', task),
    onStatusChange: (taskId, newStatus) => console.log('Status change:', taskId, newStatus),
  },
};

export const ReadOnly: Story = {
  args: {
    tasks: sampleTasks,
    columns: DEFAULT_KANBAN_COLUMNS,
    readOnly: true,
  },
};

export const WithWipLimits: Story = {
  args: {
    tasks: sampleTasks,
    columns: [
      { id: 'backlog', title: 'Backlog' },
      { id: 'todo', title: 'To Do', limit: 3 },
      { id: 'in_progress', title: 'In Progress', limit: 2 },
      { id: 'review', title: 'Review', limit: 1 },
      { id: 'done', title: 'Done' },
    ],
  },
};

export const NoSort: Story = {
  args: {
    tasks: sampleTasks,
    columns: DEFAULT_KANBAN_COLUMNS,
    showSort: false,
  },
};

export const Empty: Story = {
  args: {
    tasks: [],
    columns: DEFAULT_KANBAN_COLUMNS,
  },
};

/** Compound uses the shared D&D engine, while the parent owns task updates and column contents. */
export const Compound: Story = {
  args: {
    tasks: sampleTasks,
    columns: DEFAULT_KANBAN_COLUMNS,
  },
  render: function CompoundExample(args) {
    const [tasks, setTasks] = useState(args.tasks);
    const [previousTasks, setPreviousTasks] = useState(args.tasks);
    if (args.tasks !== previousTasks) {
      setPreviousTasks(args.tasks);
      setTasks(args.tasks);
    }
    const statusField = args.statusField ?? 'status';
    return (
      <Kanban.Root
        tasks={tasks}
        statusField={statusField}
        readOnly={args.readOnly}
        onTaskClick={args.onTaskClick}
        onStatusChange={(taskId, status) => {
          setTasks((current) =>
            current.map((task) => (task.id === taskId ? { ...task, [statusField]: status } : task)),
          );
          args.onStatusChange?.(taskId, status);
        }}
      >
        {args.columns.map((column) => {
          const columnTasks = tasks.filter((task) => task[statusField] === column.id);
          return (
            <Kanban.Column key={column.id} column={column}>
              <Kanban.ColumnHeader
                title={column.title}
                count={columnTasks.length}
                limit={column.limit}
              />
              <Kanban.ColumnBody tasks={columnTasks}>
                {columnTasks.length > 0
                  ? columnTasks.map((task) => (
                      <Kanban.Card key={task.id} task={task}>
                        <strong>{task.title}</strong>
                        <p className='text-xs text-muted-foreground'>{task.key}</p>
                      </Kanban.Card>
                    ))
                  : undefined}
              </Kanban.ColumnBody>
            </Kanban.Column>
          );
        })}
      </Kanban.Root>
    );
  },
};


/** Real component contract: the board stays status-only through empty/occupied columns and cancel. */
export const DragContract: Story = {
  args: {
    tasks: [
      { id: 'move', title: 'Move me', status: 'todo', stage: 'todo' },
      { id: 'stay', title: 'Stay here', status: 'todo', stage: 'todo' },
      { id: 'done-task', title: 'Done task', status: 'done', stage: 'done' },
    ],
    columns: [{id: 'todo', title: 'Todo'}, {id: 'empty', title: 'Empty'}, {id: 'done', title: 'Done'}],
    statusField: 'stage', showSort: false, onStatusChange: fn(), onOrderChange: fn(),
  },
  play: async ({canvasElement, args}) => {
    const card = () => canvasElement.querySelector<HTMLElement>('[data-task-id="move"]')!;
    const column = () => card().closest('[data-column-id]')?.getAttribute('data-column-id');
    await waitFor(()=>expect(card()).toHaveAttribute('tabindex','0'));
    card().focus();
    await userEvent.keyboard('[Space]');
    await waitFor(()=>expect(canvasElement.ownerDocument.querySelector('[data-dnd-overlay]')?.textContent).toContain('Move me'));
    await userEvent.keyboard('{ArrowRight}');
    await waitFor(()=>expect(canvasElement.querySelector('[data-column-id=empty]')).toHaveAttribute('data-over','true'));
    await userEvent.keyboard('[Space]');
    await waitFor(() => expect(column()).toBe('empty'));
    await expect(args.onStatusChange).toHaveBeenCalledWith('move', 'empty');
    // The optimistic board derives the custom status field without mutating task props.
    await expect(args.tasks[0].stage).toBe('todo');
    await waitFor(()=>expect(card()).toHaveAttribute('tabindex','0'));
    card().focus();
    await userEvent.keyboard('[Enter]');
    await waitFor(()=>expect(canvasElement.ownerDocument.querySelector('[data-dnd-overlay]')?.textContent).toContain('Move me'));
    await userEvent.keyboard('{ArrowRight}');
    await waitFor(()=>expect(canvasElement.querySelector('[data-column-id=done]')).toHaveAttribute('data-over','true'));
    await userEvent.keyboard('[Escape]');
    await expect(column()).toBe('empty');
    await expect(args.onStatusChange).toHaveBeenCalledTimes(1);
    await waitFor(()=>expect(card()).toHaveAttribute('tabindex','0'));
    card().focus();
    await userEvent.keyboard('[Space]');
    await waitFor(()=>expect(canvasElement.ownerDocument.querySelector('[data-dnd-overlay]')?.textContent).toContain('Move me'));
    await userEvent.keyboard('{ArrowRight}');
    await waitFor(()=>expect(canvasElement.querySelector('[data-column-id=done]')).toHaveAttribute('data-over','true'));
    await userEvent.keyboard('[Space]');
    await waitFor(() => expect(column()).toBe('done'));
    await expect(args.onStatusChange).toHaveBeenCalledTimes(2);
    await expect(args.onOrderChange).not.toHaveBeenCalled();
  },
};

export const CompoundDragContract: Story = {
  args: {...DragContract.args, onStatusChange: fn(), onOrderChange: fn()},
  render: function ControlledDragContract(args) {
    const [tasks, setTasks] = useState(args.tasks);
    return <Kanban.Root tasks={tasks} statusField='stage' onStatusChange={(id,status) => {
      args.onStatusChange?.(id,status);
      setTasks(current=>current.map(task=>task.id===id?{...task,stage:status}:task));
    }}>
      {args.columns.map(column => <Kanban.Column key={column.id} column={column}>
        <Kanban.ColumnHeader title={column.title}/>
        <Kanban.ColumnBody tasks={tasks.filter(task=>task.stage===column.id)}/>
      </Kanban.Column>)}
    </Kanban.Root>;
  },
  play: async ({canvasElement,args}) => {
    const card=()=>canvasElement.querySelector<HTMLElement>('[data-task-id="move"]')!;
    await waitFor(()=>expect(card()).toHaveAttribute('tabindex','0'));
    card().focus();await userEvent.keyboard('[Space]');
    await waitFor(()=>expect(canvasElement.ownerDocument.querySelector('[data-dnd-overlay]')?.textContent).toContain('Move me'));
    await userEvent.keyboard('{ArrowRight}');
    await waitFor(()=>expect(canvasElement.querySelector('[data-column-id=empty]')).toHaveAttribute('data-over','true'));
    await userEvent.keyboard('[Space]');
    await waitFor(()=>expect(card().closest('[data-column-id]')).toHaveAttribute('data-column-id','empty'));
    await expect(args.onStatusChange).toHaveBeenCalledTimes(1);
    await waitFor(()=>expect(card()).toHaveAttribute('tabindex','0'));
    card().focus();await userEvent.keyboard('[Enter]');
    await waitFor(()=>expect(canvasElement.ownerDocument.querySelector('[data-dnd-overlay]')?.textContent).toContain('Move me'));
    await userEvent.keyboard('{ArrowRight}');
    await waitFor(()=>expect(canvasElement.querySelector('[data-column-id=done]')).toHaveAttribute('data-over','true'));
    await userEvent.keyboard('[Enter]');
    await waitFor(()=>expect(card().closest('[data-column-id]')).toHaveAttribute('data-column-id','done'));
    await expect(args.onStatusChange).toHaveBeenCalledTimes(2);
  },
};

export const ReadOnlyDragContract: Story = {
  args: {...DragContract.args, readOnly: true, onStatusChange: fn()},
  play: async ({canvasElement,args}) => {
    const canvas=within(canvasElement);
    await expect(canvas.getByText('Move me')).toBeVisible();
    canvasElement.querySelector<HTMLElement>('[data-task-id="move"]')!.focus();
    await userEvent.keyboard('[Space]{ArrowRight}[Space]');
    await expect(canvasElement.querySelector('[data-task-id="move"]')!.closest('[data-column-id]')).toHaveAttribute('data-column-id','todo');
    await expect(args.onStatusChange).not.toHaveBeenCalled();
  },
};
