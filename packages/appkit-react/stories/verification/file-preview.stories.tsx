import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within, waitFor } from 'storybook/test';
import { http, HttpResponse, delay } from 'msw';
import { z } from 'zod';
import { FilePreview } from '../../src/tools/components/file-browser/FilePreview';

const node = { id: 'notes-1', name: 'Survey notes.txt', kind: 'file' as const, contentType: 'text/plain', size: 42 };
const base = '/__appkit_verification__/file-preview';
type State = 'loading' | 'success' | 'error' | 'http-error' | 'empty';

function PreviewExample({ state }: { state: State }) {
  const [open, setOpen] = useState(true);
  return <>
    <h1>Project file preview</h1>
    <FilePreview node={open ? node : null} url={`${base}/${state}/notes.txt`} onClose={() => setOpen(false)} />
    {!open && <p role='status'>File preview closed</p>}
  </>;
}

const meta = {
  title: 'Verification/File preview HTTP lifecycle',
  component: PreviewExample,
  beforeEach: ({ canvasElement }) => async () => {
    // Close after assertions and axe while the native effect aborts any request
    // held in its loading state before the next story installs fresh handlers.
    const page = within(canvasElement.ownerDocument.body);
    const close = page.queryByRole('button', { name: /close/i });
    if (close) await userEvent.click(close);
  },
  parameters: {
    docs: { description: { component: 'Native FilePreview text fetching via browser MSW, including transport rejection and non-2xx HTTP errors. This UI has no authentication API; host-provided signed URL authorization is outside this component. Closing a preview aborts pending text reads.' } },
  },
} satisfies Meta<typeof PreviewExample>;
export default meta;
type Story = StoryObj<typeof meta>;

function handlers(state: State) {
  return [http.get(`${base}/${state}/notes.txt`, async () => {
    if (state === 'loading') await delay('infinite');
    if (state === 'error') return HttpResponse.error();
    if (state === 'http-error') return HttpResponse.text('Preview access rejected', { status: 422 });
    return HttpResponse.text(z.string().parse(state === 'empty' ? '' : 'Survey completed. Review room dimensions.'));
  })];
}

export const Loading: Story = {
  args: { state: 'loading' },
  parameters: { msw: { handlers: handlers('loading') }, verification: { domain: 'file-preview', state: 'loading' } },
  play: async ({ canvasElement }) => {
    const page = within(canvasElement.ownerDocument.body);
    const dialog = await page.findByRole('dialog');
    await waitFor(() => expect(page.getByText('Survey notes.txt')).toBeVisible());
    await waitFor(() => expect(page.getByRole('dialog').querySelector('.animate-spin')).toBeVisible());
    await expect(dialog.querySelector('pre')).not.toBeInTheDocument();
  },
};
export const Success: Story = {
  args: { state: 'success' },
  parameters: { msw: { handlers: handlers('success') }, verification: { domain: 'file-preview', state: 'success' } },
  play: async ({ canvasElement }) => {
    const page = within(canvasElement.ownerDocument.body);
    await waitFor(() => expect(page.getByText('Survey completed. Review room dimensions.')).toBeVisible());
    await expect(page.getByRole('link', { name: 'Download' })).toHaveAttribute('href', `${base}/success/notes.txt`);
    await expect(page.getByRole('link', { name: 'Download' })).toHaveAttribute('download', 'Survey notes.txt');
    await expect(page.getByRole('link', { name: 'Open in new tab' })).toHaveAttribute('target', '_blank');
    await userEvent.click(page.getByRole('button', { name: /close/i }));
    await expect(await page.findByText('File preview closed')).toBeVisible();
    await waitFor(() => expect(page.queryByRole('dialog')).not.toBeInTheDocument());
  },
};
export const Empty: Story = {
  args: { state: 'empty' },
  parameters: { msw: { handlers: handlers('empty') }, verification: { domain: 'file-preview', state: 'empty' } },
  play: async ({ canvasElement }) => {
    const page = within(canvasElement.ownerDocument.body);
    const dialog = await page.findByRole('dialog');
    // Empty text is a successful zero-byte file, not a fabricated placeholder.
    await waitFor(() => expect(dialog.querySelector('pre')?.textContent).toBe(''));
    await waitFor(() => expect(page.getByRole('dialog')).toBeVisible());
    await expect(dialog.querySelector('.animate-spin')).not.toBeInTheDocument();
  },
};
export const NetworkError: Story = {
  args: { state: 'error' },
  parameters: { msw: { handlers: handlers('error') }, verification: { domain: 'file-preview', state: 'error' } },
  play: async ({ canvasElement }) => {
    const page = within(canvasElement.ownerDocument.body);
    await waitFor(() => expect(page.getByText('Failed to load text content.')).toBeVisible());
    await expect(page.getByRole('dialog').querySelector('.animate-spin')).not.toBeInTheDocument();
  },
};

export const HttpError: Story = {
  args: { state: 'http-error' },
  parameters: { msw: { handlers: handlers('http-error') }, verification: { domain: 'file-preview', state: 'error' } },
  play: async ({ canvasElement }) => {
    const page = within(canvasElement.ownerDocument.body);
    await waitFor(() => expect(page.getByText('Failed to load text content.')).toBeVisible());
    await expect(page.queryByText('Preview access rejected')).not.toBeInTheDocument();
    await expect(page.getByRole('dialog').querySelector('.animate-spin')).not.toBeInTheDocument();
  },
};
