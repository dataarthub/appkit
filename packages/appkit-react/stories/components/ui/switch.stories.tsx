import type { StoryObj } from '@storybook/react-vite';
import { Switch } from '../../../src/tools/components/ui/switch';
import { Label } from '../../../src/tools/components/ui/label';

const meta = {
  title: 'UI/Switch',
  component: Switch,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  args: { 'aria-label': 'Receive notifications' },
} as any;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};

export const Checked: Story = {
  args: {
    defaultChecked: true,
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};

export const DisabledChecked: Story = {
  args: {
    disabled: true,
    defaultChecked: true,
  },
};

export const WithLabel: Story = {
  render: () => (
    <div className='flex items-center space-x-2'>
      <Switch id='airplane-mode' />
      <Label htmlFor='airplane-mode'>Airplane Mode</Label>
    </div>
  ),
};

export const Settings: Story = {
  render: () => (
    <div className='space-y-4'>
      <div className='flex items-center justify-between'>
        <Label htmlFor='notifications' className='flex flex-col gap-1'>
          <span>Notifications</span>
          <span className='font-normal text-sm text-muted-foreground'>
            Receive notifications about updates
          </span>
        </Label>
        <Switch id='notifications' defaultChecked />
      </div>
      <div className='flex items-center justify-between'>
        <Label htmlFor='marketing' className='flex flex-col gap-1'>
          <span>Marketing emails</span>
          <span className='font-normal text-sm text-muted-foreground'>
            Receive emails about new products
          </span>
        </Label>
        <Switch id='marketing' />
      </div>
      <div className='flex items-center justify-between'>
        <Label htmlFor='security' className='flex flex-col gap-1'>
          <span>Security alerts</span>
          <span className='font-normal text-sm text-muted-foreground'>
            Get notified about security updates
          </span>
        </Label>
        <Switch id='security' defaultChecked />
      </div>
    </div>
  ),
};
