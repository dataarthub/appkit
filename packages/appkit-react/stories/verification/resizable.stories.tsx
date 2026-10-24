import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within, waitFor } from 'storybook/test';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '../../src/ui/components/ui/resizable';

const meta = {
  title: 'Verification/Resizable panel keyboard contract',
  component: ResizablePanelGroup,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof ResizablePanelGroup>;
export default meta;
type Story = StoryObj<typeof meta>;

export const KeyboardResize: Story = {
  render: () => (
    <div style={{ width: '100%', maxWidth: 600, height: 160 }}>
      <ResizablePanelGroup orientation="horizontal">
        <ResizablePanel
          id="compatibility-left"
          defaultSize="50%"
          minSize="20%"
          maxSize="80%"
        >
          <div data-testid="left-content">Left pane</div>
        </ResizablePanel>
        <ResizableHandle aria-label="Resize panes" withHandle />
        <ResizablePanel
          id="compatibility-right"
          defaultSize="50%"
          minSize="20%"
        >
          Right pane
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const handle = canvas.getByRole('separator', { name: 'Resize panes' });
    const left = canvas.getByTestId('left-content');
    await waitFor(() =>
      expect(left.getBoundingClientRect().width).toBeGreaterThan(0),
    );
    const initial = left.getBoundingClientRect().width;
    handle.focus();
    await userEvent.keyboard('{ArrowRight}');
    await waitFor(() =>
      expect(left.getBoundingClientRect().width).toBeGreaterThan(initial),
    );
    await userEvent.keyboard('{Home}');
    await waitFor(() =>
      expect(left.getBoundingClientRect().width).toBeLessThan(initial),
    );
    await userEvent.keyboard('{End}');
    await waitFor(() =>
      expect(left.getBoundingClientRect().width).toBeGreaterThan(initial),
    );
  },
};
