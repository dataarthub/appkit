import type { Meta, StoryObj } from '@storybook/react-vite';
import { addDays, startOfDay } from 'date-fns';
import { GanttChart } from '../../../src/tools/components/gantt/GanttChart';
import { planGanttTasks } from '../../../src/tools/components/gantt/hooks/gantt-planning';
import type { GanttTask } from '../../../src/tools/components/gantt/types';

const meta = {
  title: 'Components/GanttChart',
  component: GanttChart,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
ガントチャートコンポーネント。タスクをタイムライン形式で表示し、進捗管理やリソース計画を支援。

## Features
- 階層タスク（サブタスク）表示
- 進捗率の可視化とスライダー編集（キーボード対応）
- バーの移動・両端リサイズ（明示的に有効化、キーボード・キャンセル対応）
- FS/SS/FF/SF依存線と前方日程調整（一括保存）
- 稼働日・休日カレンダー、依存関係ベースのクリティカルパス、容量制約による平準化
- ベースライン比較
- ダイアログによるタスク編集
- フィルタリング機能
- カスタムマーカー
- 日次/週次/月次ビュー切替

## Import
\`\`\`tsx
import { GanttChart } from '@alneas/appkit-react/tools/gantt';
\`\`\`
        `,
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    onTaskClick: { action: 'taskClick' },
    onTaskUpdate: { action: 'taskUpdate' },
    onTaskDelete: { action: 'taskDelete' },
  },
} satisfies Meta<typeof GanttChart>;

export default meta;
type Story = StoryObj<typeof meta>;

const sampleTasks: GanttTask[] = [
  {
    id: '1',
    title: 'Phase 1: Planning',
    start_date: '2024-01-01',
    due_date: '2024-01-15',
    created_at: '2024-01-01',
    status: 'done',
    progress: 100,
    priority: 'high',
  },
  {
    id: '2',
    title: 'Phase 2: Development',
    start_date: '2024-01-16',
    due_date: '2024-02-28',
    created_at: '2024-01-01',
    status: 'doing',
    progress: 60,
    priority: 'high',
  },
  {
    id: '3',
    title: 'Frontend Implementation',
    start_date: '2024-01-16',
    due_date: '2024-02-15',
    created_at: '2024-01-01',
    status: 'doing',
    progress: 75,
    parent_id: '2',
    level: 1,
    assignee_name: 'John Doe',
  },
  {
    id: '4',
    title: 'Backend API',
    start_date: '2024-01-20',
    due_date: '2024-02-20',
    created_at: '2024-01-01',
    status: 'doing',
    progress: 40,
    parent_id: '2',
    level: 1,
    assignee_name: 'Jane Smith',
  },
  {
    id: '5',
    title: 'Phase 3: Testing',
    start_date: '2024-03-01',
    due_date: '2024-03-15',
    created_at: '2024-01-01',
    status: 'todo',
    progress: 0,
    priority: 'medium',
  },
];

export const Default: Story = {
  args: {
    tasks: sampleTasks,
    initialViewMode: 'Week',
  },
};

/** 進捗スライダーをポインター・矢印キーで操作する例。 */
export const EditableProgress: Story = {
  args: {
    tasks: [
      {
        id: 'progress',
        title: 'Progress editing',
        status: 'doing',
        created_at: new Date(),
        start_date: new Date(),
        due_date: new Date(Date.now() + 7 * 86_400_000),
        progress: 40,
      },
    ],
    progressConfig: { showProgress: true, editableProgress: true },
    onTaskUpdate: () => {},
  },
};

export const MonthView: Story = {
  args: {
    tasks: sampleTasks,
    initialViewMode: 'Month',
  },
};

export const DayView: Story = {
  args: {
    tasks: sampleTasks,
    initialViewMode: 'Day',
  },
};

export const WithMilestones: Story = {
  args: {
    tasks: sampleTasks,
    milestones: [
      {
        id: 'm1',
        name: 'Sprint Review',
        due_date: '2024-02-01',
        color: 'red',
      },
      {
        id: 'm2',
        name: 'Release',
        due_date: '2024-03-15',
        color: 'green',
      },
    ],
  },
};

export const WithBaseline: Story = {
  args: {
    tasks: sampleTasks.map((t) => ({
      ...t,
      baseline_start: t.start_date,
      baseline_end: t.due_date,
    })),
    baselineConfig: {
      showBaseline: true,
      baselineColor: 'gray',
    },
  },
};

export const ReadOnly: Story = {
  args: {
    tasks: sampleTasks,
    editMode: 'none',
  },
};

export const Empty: Story = {
  args: {
    tasks: [],
  },
};

/** Native date editing and dependency scheduling, with no external Gantt engine. */
export const DateEditingAndDependencies: Story = {
  args: {
    tasks: ['Design', 'Implementation', 'Review'].map((title, index) => ({
      id: String(index),
      title,
      status: 'todo',
      created_at: startOfDay(new Date()),
      start_date: addDays(startOfDay(new Date()), index * 3),
      due_date: addDays(startOfDay(new Date()), index * 3 + 3),
      progress: index === 0 ? 40 : 0,
    })),
    dependencies: [
      { id: 'design-implementation', sourceId: '0', targetId: '1', type: 'FS' },
      { id: 'implementation-review', sourceId: '1', targetId: '2', type: 'FS' },
    ],
    initialViewMode: 'Day',
    dateEditing: { enabled: true },
    autoSchedule: true,
    progressConfig: { showProgress: true, editableProgress: true },
    // Story uses the chart's optimistic state. Applications persist the batch here.
    onTasksChange: () => {},
  },
};

/** Capacity delays are a preview until an edit is saved; CPM deliberately excludes resource constraints. */
export const WorkingCalendarAndCapacity: Story = {
  args: {
    tasks: ['Design A', 'Design B', 'Review'].map((title, index) => ({
      id: String(index),
      title,
      status: 'todo',
      created_at: startOfDay(new Date()),
      start_date: startOfDay(new Date()),
      due_date: addDays(startOfDay(new Date()), index === 2 ? 1 : 3),
      durationDays: index === 2 ? 1 : 3,
      assignee_id: index === 2 ? 'reviewer' : 'designer',
    })),
    dependencies: [{ id: 'design-review', sourceId: '1', targetId: '2', type: 'FS' }],
    schedulingOptions: {
      calendar: { workingWeekdays: [1, 2, 3, 4, 5], holidays: ['2026-09-21', '2026-09-22'] },
      resourceLeveling: {
        enabled: true,
        resources: [
          { id: 'designer', capacity: 1 },
          { id: 'reviewer', capacity: 1 },
        ],
      },
    },
    showCriticalPath: true,
    autoSchedule: true,
    dateEditing: { enabled: true },
    initialViewMode: 'Day',
    onTasksChange: () => {},
  },
};

/** Applications can prepare the initial schedule explicitly before displaying it. */
export const LeveledWorkingSchedule: Story = {
  args: {
    ...WorkingCalendarAndCapacity.args,
    tasks: planGanttTasks(
      WorkingCalendarAndCapacity.args!.tasks!,
      WorkingCalendarAndCapacity.args!.dependencies!,
      WorkingCalendarAndCapacity.args!.schedulingOptions,
    ).tasks,
  },
};

/** Bounded task DOM, synchronized panes, cross-window links and keyboard navigation. */
export const FiveThousandTasks: Story = {
  render: (args) => (
    <div style={{ height: 600 }}>
      <GanttChart {...args} />
    </div>
  ),
  args: {
    tasks: Array.from({ length: 5000 }, (_, i) => ({
      id: `large-${i}`,
      title: `Task ${i + 1}`,
      status: 'todo',
      created_at: startOfDay(new Date()),
      start_date: addDays(startOfDay(new Date()), i % 10),
      due_date: addDays(startOfDay(new Date()), (i % 10) + 2),
    })),
    dependencies: [{ id: 'cross-window', sourceId: 'large-0', targetId: 'large-4999', type: 'FS' }],
    displayConfig: { virtualizeRows: true },
    dateEditing: { enabled: true },
    onTasksChange: () => {},
    initialViewMode: 'Day',
  },
};
