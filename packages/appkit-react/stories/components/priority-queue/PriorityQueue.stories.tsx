import type { Meta, StoryObj } from '@storybook/react-vite';
import { PriorityQueue } from '../../../src/tools/components/priority-queue/PriorityQueue';
import { calculatePriorityScore } from '../../../src/tools/components/priority-queue/types';
import type { PriorityTask } from '../../../src/tools/components/priority-queue/types';

const meta = {
  title: 'Components/PriorityQueue',
  component: PriorityQueue,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
Display tasks sorted by their priority scores.

## Features
- Automatic priority-score sorting
- Completion and snooze callbacks
- Manual priority-factor adjustments
- Compact display mode

## Required setup

The application supplies tasks and update callbacks. Completion, snooze and score edits here do not update a backend. Import @alneas/appkit-react/styles once in the host application; the Storybook preview supplies it here.

## Public import
\`\`\`tsx
import { PriorityQueue, calculatePriorityScore } from '@alneas/appkit-react/tools/priority-queue';
\`\`\`
        `,
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    onTaskClick: { action: 'taskClick' },
    onTaskComplete: { action: 'taskComplete' },
    onTaskSnooze: { action: 'taskSnooze' },
    onRecalculate: { action: 'recalculate' },
  },
} satisfies Meta<typeof PriorityQueue>;

export default meta;
type Story = StoryObj<typeof meta>;

const sampleTasks: PriorityTask[] = [
  {
    id: '1',
    title: 'Critical bug fix',
    impact: 5,
    risk: 2,
    effort: 2,
    due_date: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    status: 'todo',
    score: calculatePriorityScore({
      impact: 5,
      risk: 2,
      effort: 2,
      due_date: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    }),
  },
  {
    id: '2',
    title: 'Feature implementation',
    impact: 4,
    risk: 3,
    effort: 3,
    due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    status: 'todo',
    score: calculatePriorityScore({
      impact: 4,
      risk: 3,
      effort: 3,
      due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    }),
  },
  {
    id: '3',
    title: 'Documentation update',
    impact: 2,
    risk: 1,
    effort: 2,
    due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'todo',
    score: calculatePriorityScore({
      impact: 2,
      risk: 1,
      effort: 2,
      due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    }),
  },
  {
    id: '4',
    title: 'Code review',
    impact: 3,
    risk: 2,
    effort: 1,
    due_date: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
    status: 'in_progress',
    score: calculatePriorityScore({
      impact: 3,
      risk: 2,
      effort: 1,
      due_date: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
    }),
  },
];

export const Default: Story = {
  args: {
    tasks: sampleTasks,
  },
};

export const Compact: Story = {
  args: {
    tasks: sampleTasks,
    compact: true,
  },
};

export const ReadOnly: Story = {
  args: {
    tasks: sampleTasks,
    readOnly: true,
  },
};

export const MaxItems: Story = {
  args: {
    tasks: sampleTasks,
    maxItems: 2,
  },
};

export const Empty: Story = {
  args: {
    tasks: [],
  },
};
