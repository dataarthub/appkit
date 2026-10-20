import type { StoryObj } from '@storybook/react-vite';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../../src/tools/components/ui/tooltip';
import { Button } from '../../../src/tools/components/ui/button';

const meta = {
  title: 'UI/Tooltip',
  component: Tooltip,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story: any) => (
      <TooltipProvider>
        <Story />
      </TooltipProvider>
    ),
  ],
} as any;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button variant='outline' size='icon-sm'>
            Hover for details
          </Button>
        }
      />
      <TooltipContent>
        <p>This is a tooltip</p>
      </TooltipContent>
    </Tooltip>
  ),
};

export const WithIcon: Story = {
  render: () => (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button variant='outline' size='icon-sm'>
            ?
          </Button>
        }
      />
      <TooltipContent>
        <p>More information</p>
      </TooltipContent>
    </Tooltip>
  ),
};

export const LongText: Story = {
  render: () => (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button variant='outline' size='icon-sm'>
            ?
          </Button>
        }
      />
      <TooltipContent className='max-w-xs'>
        <p>
          This is a longer tooltip with more detailed information that might span multiple lines to
          provide comprehensive context.
        </p>
      </TooltipContent>
    </Tooltip>
  ),
};

export const Multiple: Story = {
  render: () => (
    <div className='flex gap-4'>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button variant='outline' size='icon-sm'>
              Top
            </Button>
          }
        />
        <TooltipContent side='top'>
          <p>Tooltip on top</p>
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button variant='outline' size='icon-sm'>
              Right
            </Button>
          }
        />
        <TooltipContent side='right'>
          <p>Tooltip on right</p>
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button variant='outline' size='icon-sm'>
              Bottom
            </Button>
          }
        />
        <TooltipContent side='bottom'>
          <p>Tooltip on bottom</p>
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button variant='outline' size='icon-sm'>
              Left
            </Button>
          }
        />
        <TooltipContent side='left'>
          <p>Tooltip on left</p>
        </TooltipContent>
      </Tooltip>
    </div>
  ),
};
