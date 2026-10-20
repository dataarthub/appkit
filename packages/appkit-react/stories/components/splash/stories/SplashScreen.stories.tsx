import type { Meta, StoryObj } from '@storybook/react-vite';
import { SplashScreen } from '../../../../src/tools/components/splash/SplashScreen';
import { useState } from 'react';

const meta = {
  title: 'Future/SplashScreen',
  component: SplashScreen,
  tags: ['autodocs'],
  args: {
    show: true,
    type: 'glitch',
    duration: 600,
    phase: 'loading',
  },
} satisfies Meta<typeof SplashScreen>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const CustomMessage: Story = {
  args: {
    phase: undefined,
    message: 'データベースに接続しています...',
  },
};

export const WithLogo: Story = {
  args: {
    logo: (
      <div
        style={{
          fontFamily: 'Orbitron, sans-serif',
          fontSize: 24,
          letterSpacing: 8,
          color: 'var(--foreground)',
          textShadow: '0 0 20px var(--primary)',
        }}
      >
        MY APP
      </div>
    ),
  },
};

export const Interactive: Story = {
  render: () => {
    const [show, setShow] = useState(true);
    return (
      <div style={{ padding: 40 }}>
        <button
          onClick={() => setShow((s) => !s)}
          style={{ padding: '8px 16px', cursor: 'pointer', marginBottom: 16 }}
        >
          {show ? 'Hide Splash' : 'Show Splash'}
        </button>
        {show && <SplashScreen show={show} type="radial" phase="hydrating" />}
      </div>
    );
  },
};
