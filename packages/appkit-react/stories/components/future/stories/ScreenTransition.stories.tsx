import type { Meta, StoryObj } from '@storybook/react-vite';
import { ScreenTransition } from '../../../../src/tools/components/future/ScreenTransition';
import { useState } from 'react';

const meta: Meta<typeof ScreenTransition> = {
  title: 'Future/ScreenTransition',
  component: ScreenTransition,
  tags: ['autodocs'],
  argTypes: {
    type: {
      control: 'select',
      options: ['wipe', 'sweep', 'radial', 'glitch', 'zoom', 'curtain'],
    },
  },
};
export default meta;
type Story = StoryObj<any>;

export const Wipe: Story = {
  args: { type: 'wipe', trigger: 0 },
  render: (args) => <TransitionDemo {...args} />,
};
export const Sweep: Story = {
  args: { type: 'sweep', trigger: 0 },
  render: (args) => <TransitionDemo {...args} />,
};
export const Radial: Story = {
  args: { type: 'radial', trigger: 0 },
  render: (args) => <TransitionDemo {...args} />,
};
export const Glitch: Story = {
  args: { type: 'glitch', trigger: 0 },
  render: (args) => <TransitionDemo {...args} />,
};
export const Zoom: Story = {
  args: { type: 'zoom', trigger: 0 },
  render: (args) => <TransitionDemo {...args} />,
};
export const Curtain: Story = {
  args: { type: 'curtain', trigger: 0 },
  render: (args) => <TransitionDemo {...args} />,
};

function TransitionDemo({ type = 'wipe' }: { type?: string }) {
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);

  return (
    <div style={{ padding: 40, minHeight: 300 }}>
      <div style={{ marginBottom: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
        <button onClick={() => setCount((c) => c + 1)} style={{ padding: '8px 16px', cursor: 'pointer' }}>
          Trigger Transition
        </button>
        <span style={{ fontFamily: 'monospace', fontSize: 12 }}>Page: {page}</span>
      </div>
      <ScreenTransition type={type as any} trigger={count} onHalf={() => setPage((p) => (p === 1 ? 2 : 1))}>
        <div
          style={{
            padding: 40,
            border: '1px solid #00f3ff',
            borderRadius: 4,
            background: page === 1 ? 'rgba(0,243,255,0.05)' : 'rgba(255,123,0,0.05)',
          }}
        >
          <h2 style={{ fontFamily: 'Orbitron, sans-serif', letterSpacing: 2 }}>
            {page === 1 ? 'PAGE 01 // DASHBOARD' : 'PAGE 02 // ANALYTICS'}
          </h2>
          <p style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--foreground)' }}>Transition type: {type}</p>
        </div>
      </ScreenTransition>
    </div>
  );
}
