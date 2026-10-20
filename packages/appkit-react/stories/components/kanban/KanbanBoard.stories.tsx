import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
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
カンバンボードコンポーネント。ドラッグ&ドロップによるタスク移動、ソート、WIP制限に対応。

## Features
- ドラッグ&ドロップによるタスク移動
- Tabでカード選択、Space/Enterで移動開始・確定、左右矢印で列選択、Escapeで取消
- readOnlyではドラッグ開始も無効。タッチは250ms長押し
- カラムごとのWIP制限
- ソート機能（優先度、期限、タイトル）
- 楽観的UIアップデート
- カスタムカードレンダラー

## Import
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
    assignee: { name: 'John Doe', avatar: 'https://i.pravatar.cc/32?u=1' },
  },
  {
    id: '2',
    title: 'API integration',
    key: 'PROJ-102',
    status: 'todo',
    priority: 'medium',
    due_date: '2024-02-20',
    tags: ['backend'],
    assignee: { name: 'Jane Smith', avatar: 'https://i.pravatar.cc/32?u=2' },
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
    assignee: { name: 'Bob Wilson', avatar: 'https://i.pravatar.cc/32?u=3' },
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
