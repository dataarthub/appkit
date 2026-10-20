import type { Meta, StoryObj } from '@storybook/react-vite';
import { WorkflowStatusPanel } from '../../../src/tools/components/workflow/WorkflowStatusPanel';
import { Send, CheckCircle, XCircle, FileText } from 'lucide-react';
// React is used via JSX transform, no need for explicit import if not using hooks/types
// import React from 'react';

const meta: Meta<typeof WorkflowStatusPanel> = {
  title: 'Components/Workflow/WorkflowStatusPanel',
  component: WorkflowStatusPanel,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof WorkflowStatusPanel>;

const statusInfoMap = {
  Draft: {
    title: '下書き',
    description: 'このドキュメントは現在下書き状態です。内容を確認し、承認申請を行ってください。',
    nextSteps: ['内容のセルフチェック', '承認申請ボタンを押す'],
    color: 'bg-slate-500',
  },
  Pending: {
    title: '承認待ち',
    description: '承認者による確認が行われています。',
    nextSteps: ['承認または却下を待つ'],
    color: 'bg-amber-800 text-white',
  },
  Approved: {
    title: '承認済み',
    description: 'このドキュメントは承認されました。発行手続きに進めます。',
    nextSteps: ['PDFを発行する'],
    color: 'bg-emerald-700 text-white',
  },
};

const actions = [
  {
    action: 'submit',
    label: '承認申請',
    description: '上長に承認を依頼します',
    icon: <Send className='h-4 w-4' />,
    color: 'bg-blue-600',
    enabledStatuses: ['Draft'],
    required: true,
  },
  {
    action: 'approve',
    label: '承認する',
    description: '内容を承認します',
    icon: <CheckCircle className='h-4 w-4' />,
    color: 'bg-emerald-600',
    enabledStatuses: ['Pending'],
  },
  {
    action: 'reject',
    label: '却下する',
    description: '内容を却下し、下書きに戻します',
    icon: <XCircle className='h-4 w-4' />,
    color: 'bg-rose-600',
    enabledStatuses: ['Pending'],
  },
  {
    action: 'export',
    label: 'PDF発行',
    description: '最終版のPDFを出力します',
    icon: <FileText className='h-4 w-4' />,
    color: 'bg-indigo-600',
    enabledStatuses: ['Approved'],
  },
];

export const DraftState: Story = {
  args: {
    currentStatus: 'Draft',
    statusInfoMap,
    actions,
    onAction: (action: any) => console.log('Action:', action),
  },
  render: (args: any) => (
    <div className='w-[600px]'>
      <WorkflowStatusPanel {...args} />
    </div>
  ),
};

export const PendingState: Story = {
  args: {
    ...DraftState.args,
    currentStatus: 'Pending',
  },
  render: (args: any) => (
    <div className='w-[600px]'>
      <WorkflowStatusPanel {...args} />
    </div>
  ),
};

export const ApprovedState: Story = {
  args: {
    ...DraftState.args,
    currentStatus: 'Approved',
  },
  render: (args: any) => (
    <div className='w-[600px]'>
      <WorkflowStatusPanel {...args} />
    </div>
  ),
};
