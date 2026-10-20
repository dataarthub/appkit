import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within, waitFor } from 'storybook/test';
import { LoginForm, ProtectedRoute, ShowFor, useAuth, useUserProfile } from '../../src/tools/auth';
import { DataTableView } from '../../src/tools/components/data-table/data-table-view';
import { FormView } from '../../src/tools/form';
import { Button } from '../../src/tools/components/ui/button';
import * as messages from '../../src/tools/paraglide/messages.js';
import { FetchFileBrowser, HttpProviders, stateHandlers, type VerificationDomain, type VerificationState, type StoryRecord } from './http-fixtures';

function SessionContent({ domain, state }: { domain: VerificationDomain; state: VerificationState }) {
  const { user, isLoading, error, logout } = useAuth();
  const { profile, isLoading: profileLoading, error: profileError } = useUserProfile();
  const [redirect, setRedirect] = useState('');
  // This is a host's composition of the public lifecycle hooks and components.
  // No story argument selects an outcome here: only HTTP/provider results do.
  if (error || profileError) return <p role='alert'>{(error || profileError)?.message}</p>;
  return <section aria-label={domain === 'data-table' ? 'Protected records' : 'Account access'} className='space-y-4'>
    <h1 className='text-xl font-semibold'>{domain === 'data-table' ? 'Project records' : 'Account access'}</h1>
    {!isLoading && !user && <>
      <p role='status'>Sign in to continue</p>
      <LoginForm socialProviders={[]} />
    </>}
    {redirect && !user && <p>Requested route: {redirect}</p>}
    <ProtectedRoute
      roles={['editor', 'admin']}
      onRedirect={setRedirect}
      loginPath='/sign-in'
      fallback={<p role='status'>Verifying account access</p>}
      unauthorizedFallback={<p role='alert'>{!profile && !profileLoading ? 'No account profile' : 'Editor access required'}</p>}
    >
      {user && <>
        <p>Signed in as {user.email}</p>
        <ShowFor roles={['admin']}><p>Administrator access granted</p></ShowFor>
        {domain === 'data-table' ? <DataTableView<StoryRecord>
          testId='verified-records'
          collection='records'
          columns={[
            { accessorKey: 'name', header: 'Project' },
            { accessorKey: 'status', header: 'Status' },
          ]}
          loadingContent={<p role='status'>Loading project records</p>}
          emptyContent={<p role='status'>No project records</p>}
          errorContent={failure => <p role='alert'>{failure.message}</p>}
          showRowNumber={false}
          enableColumnOrdering={false}
        /> : domain === 'form-view' ? <RecordEditor /> : domain === 'file-browser' ? <FetchFileBrowser state={state} /> : <p role='status'>Profile verified</p>}
        <Button onClick={() => { void logout(); }}>Sign out</Button>
      </>}
    </ProtectedRoute>
  </section>;
}

function RecordEditor() {
  const [saved, setSaved] = useState('');
  const [deleted, setDeleted] = useState(false);
  return <>
    {deleted ? <p role='status'>Project record deleted</p> : <FormView<StoryRecord>
      testId='verified-form'
      collection='records'
      mode='edit'
      id='record-1'
      schema={{ type: 'object', properties: { name: { type: 'string', title: 'Project name', minLength: 1 } }, required: ['name'] }}
      validation={{ cast: { numericMode: 'strict' } }}
      loadingContent={<p role='status'>Loading project form</p>}
      errorContent={failure => <p role='alert'>{failure.message}</p>}
      onSuccess={record => setSaved(`Saved project: ${record.name}`)}
      showDelete
      onDeleteSuccess={() => setDeleted(true)}
      stickyActions={false}
    />}
    {saved && <p role='status'>{saved}</p>}
  </>;
}

function LifecycleExample({ domain, state }: { domain: VerificationDomain; state: VerificationState }) {
  return <HttpProviders key={`${domain}/${state}`} domain={domain} state={state}><SessionContent domain={domain} state={state} /></HttpProviders>;
}

const meta = {
  title: 'Verification/HTTP lifecycle',
  component: LifecycleExample,
  parameters: {
    docs: { description: { component: 'Network-boundary verification of public AuthProvider, UserProfileProvider, ProtectedRoute and DataTableView. Host HTTP adapters validate responses with Zod (including Appkit UserSchema). Requires QueryClientProvider, supplied globally, and explicit Appkit styles. Identity endpoints are story fixtures, independent of any hosted identity vendor. Public imports: @alneas/appkit-react/tools/auth and @alneas/appkit-react/tools/data-table.' } },
  },
} satisfies Meta<typeof LifecycleExample>;
export default meta;
type Story = StoryObj<typeof meta>;

function story(domain: VerificationDomain, state: VerificationState): Story {
  return {
    args: { domain, state },
    parameters: { msw: { handlers: () => stateHandlers(domain, state) }, verification: { domain, state } },
    play: async ({ canvasElement }) => {
      const canvas = within(canvasElement);
      if (state === 'loading') {
        if (domain === 'file-browser') {
          const browser = await canvas.findByTestId('verified-file-browser');
          await waitFor(() => expect(browser.querySelector('.animate-spin')).toBeVisible());
          await expect(canvas.queryByText('Survey notes.txt')).not.toBeInTheDocument();
          return;
        }
        const text = domain === 'data-table' ? 'Loading project records' : domain === 'form-view' ? 'Loading project form' : 'Verifying account access';
        await expect(await canvas.findByText(text, { exact: true })).toHaveAttribute('role', 'status');
        if (domain === 'data-table') await expect(canvas.getByTestId('verified-records')).toHaveAttribute('data-status', 'loading');
        if (domain === 'form-view') await expect(canvas.getByTestId('verified-form')).toHaveAttribute('data-status', 'loading');
        if (domain === 'auth-profile') await expect(canvas.queryByRole('button', { name: 'Sign out' })).not.toBeInTheDocument();
        await expect(canvas.queryByText('Acoustic survey')).not.toBeInTheDocument();
      } else if (state === 'signed-out') {
        await expect(await canvas.findByText('Sign in to continue')).toBeVisible();
        await expect(await canvas.findByText('Requested route: /sign-in')).toBeVisible();
        await expect(canvas.queryByText('Acoustic survey')).not.toBeInTheDocument();
        await expect(canvas.queryByRole('button', { name: 'Sign out' })).not.toBeInTheDocument();
      } else if (state === 'restricted') {
        await expect(await canvas.findByRole('alert')).toHaveTextContent('Editor access required');
        await expect(canvas.queryByText('Acoustic survey')).not.toBeInTheDocument();
        await expect(canvas.queryByText('Profile verified')).not.toBeInTheDocument();
        await expect(canvas.queryByText('Administrator access granted')).not.toBeInTheDocument();
      } else if (state === 'error') {
        await expect(await canvas.findByRole('alert')).toHaveTextContent(domain === 'data-table' ? 'Records could not be loaded' : domain === 'form-view' ? 'Record could not be loaded' : domain === 'file-browser' ? 'Files could not be loaded' : 'Session verification failed');
        await expect(canvas.queryByText('Acoustic survey')).not.toBeInTheDocument();
      } else if (state === 'empty') {
        if (domain === 'data-table') {
          await expect(await canvas.findByText('No project records')).toBeVisible();
          await expect(canvas.getByTestId('verified-records')).toHaveAttribute('data-status', 'empty');
          await expect(canvas.getByTestId('verified-records')).toHaveAttribute('data-row-count', '0');
        } else if (domain === 'file-browser') {
          await waitFor(() => expect(canvas.getByText('No items found.')).toBeVisible());
          await expect(canvas.queryByText('Survey notes.txt')).not.toBeInTheDocument();
        } else if (domain === 'form-view') {
          await expect(await canvas.findByRole('textbox', { name: 'Project name' })).toHaveValue('');
          await expect(canvas.getByTestId('verified-form')).toHaveAttribute('data-status', 'ready');
        } else {
          await expect(await canvas.findByRole('alert')).toHaveTextContent('No account profile');
          await expect(canvas.queryByText('Profile verified')).not.toBeInTheDocument();
        }
      } else {
        await expect(await canvas.findByText('Signed in as editor@example.test')).toBeVisible();
        if (domain === 'data-table') {
          await expect(await canvas.findByText('Acoustic survey')).toBeVisible();
          await expect(canvas.getByText('Design review')).toBeVisible();
          await expect(canvas.getByTestId('verified-records')).toHaveAttribute('data-status', 'ready');
          await expect(canvas.getByTestId('verified-records')).toHaveAttribute('data-row-count', '2');
        } else if (domain === 'file-browser') {
          await expect(await canvas.findByText('Survey notes.txt')).toBeVisible();
          await expect(canvas.getByText('Design documents')).toBeVisible();
        } else if (domain === 'form-view') {
          await expect(await canvas.findByRole('textbox', { name: 'Project name' })).toHaveValue('Acoustic survey');
          await expect(canvas.getByTestId('verified-form')).toHaveAttribute('data-status', 'ready');
        } else await expect(await canvas.findByText('Profile verified')).toBeVisible();
        if (state === 'privileged') await expect(canvas.getByText('Administrator access granted')).toBeVisible();
        else await expect(canvas.queryByText('Administrator access granted')).not.toBeInTheDocument();
      }
    },
  };
}

export const DataLoading: Story = story('data-table', 'loading');
export const DataSuccess: Story = story('data-table', 'success');
export const DataEmpty: Story = story('data-table', 'empty');
export const DataError: Story = story('data-table', 'error');
export const DataSignedOut: Story = story('data-table', 'signed-out');
export const DataRestricted: Story = story('data-table', 'restricted');
export const DataPrivileged: Story = story('data-table', 'privileged');
export const AuthLoading: Story = story('auth-profile', 'loading');
export const AuthSuccess: Story = story('auth-profile', 'success');
export const AuthEmpty: Story = story('auth-profile', 'empty');
export const AuthError: Story = story('auth-profile', 'error');
export const AuthSignedOut: Story = story('auth-profile', 'signed-out');
export const AuthRestricted: Story = story('auth-profile', 'restricted');
export const AuthPrivileged: Story = story('auth-profile', 'privileged');
export const FormLoading: Story = story('form-view', 'loading');
export const FormSuccess: Story = story('form-view', 'success');
// FormView's native null-record behavior is a blank editable form, rather than a
// distinct "not found" UI. Verify that actual contract without adding a mock UI.
export const FormEmpty: Story = story('form-view', 'empty');
export const FormError: Story = story('form-view', 'error');
export const FormSignedOut: Story = story('form-view', 'signed-out');
export const FormRestricted: Story = story('form-view', 'restricted');
export const FormPrivileged: Story = story('form-view', 'privileged');
export const FilesLoading: Story = story('file-browser', 'loading');
export const FilesSuccess: Story = story('file-browser', 'success');
export const FilesEmpty: Story = story('file-browser', 'empty');
export const FilesError: Story = story('file-browser', 'error');
export const FilesSignedOut: Story = story('file-browser', 'signed-out');
export const FilesRestricted: Story = story('file-browser', 'restricted');
export const FilesPrivileged: Story = story('file-browser', 'privileged');

export const SearchAndRefreshFiles: Story = {
  ...story('file-browser', 'success'),
  parameters: { msw: { handlers: () => stateHandlers('file-browser', 'success') } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('Survey notes.txt')).toBeVisible();
    const search = canvas.getByRole('textbox', { name: 'Search files' });
    await userEvent.type(search, 'Survey');
    await userEvent.keyboard('{Enter}');
    await waitFor(() => expect(canvas.queryByText('Design documents')).not.toBeInTheDocument());
    await expect(canvas.getByText('Survey notes.txt')).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Refresh files' }));
    await expect(await canvas.findByText('Survey notes (refreshed).txt')).toBeVisible();
    await expect(canvas.queryByText('Design documents')).not.toBeInTheDocument();
    await expect(search).toHaveValue('Survey');
    await userEvent.clear(search);
    await userEvent.keyboard('{Enter}');
    await expect(await canvas.findByText('Design documents')).toBeVisible();
    await expect(canvas.getByText('Survey notes.txt')).toBeVisible();
  },
};

export const SaveRejectionRetryAndSuccess: Story = {
  ...story('form-view', 'success'),
  parameters: { msw: { handlers: () => stateHandlers('form-view', 'success', { rejectFirstSave: true }) } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = await canvas.findByRole('textbox', { name: 'Project name' });
    await userEvent.clear(input);
    await userEvent.type(input, 'Updated acoustic survey');
    await userEvent.click(canvas.getByRole('button', { name: '更新' }));
    await expect(await canvas.findByRole('alert')).toHaveTextContent('Project name could not be saved. Try again.');
    await expect(input).toHaveValue('Updated acoustic survey');
    await expect(canvas.getByTestId('verified-form')).toHaveAttribute('data-status', 'error');
    await expect(canvas.queryByText('Saved project: Updated acoustic survey')).not.toBeInTheDocument();
    await userEvent.click(canvas.getByRole('button', { name: '更新' }));
    await expect(await canvas.findByText('Saved project: Updated acoustic survey')).toBeVisible();
    await expect(canvas.queryByRole('alert')).not.toBeInTheDocument();
    await expect(canvas.getByTestId('verified-form')).toHaveAttribute('data-status', 'success');
  },
};

export const DeletePersistedRecord: Story = {
  ...story('form-view', 'success'),
  parameters: { msw: { handlers: () => stateHandlers('form-view', 'success') } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByRole('textbox', { name: 'Project name' })).toHaveValue('Acoustic survey');
    await userEvent.click(canvas.getByRole('button', { name: '削除' }));
    await expect(await canvas.findByText('Project record deleted')).toBeVisible();
    await expect(canvas.queryByTestId('verified-form')).not.toBeInTheDocument();
  },
};

export const SignOutClearsProtectedRecords: Story = {
  ...story('data-table', 'success'),
  parameters: { msw: { handlers: () => stateHandlers('data-table', 'success') } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('Acoustic survey')).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Sign out' }));
    await expect(await canvas.findByText('Sign in to continue')).toBeVisible();
    await waitFor(() => expect(canvas.queryByTestId('verified-records')).not.toBeInTheDocument());
    await expect(canvas.queryByText('Administrator access granted')).not.toBeInTheDocument();
  },
};

export const SignInLoadsProtectedRecords: Story = {
  ...story('data-table', 'signed-out'),
  parameters: { msw: { handlers: () => stateHandlers('data-table', 'signed-out') } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('Sign in to continue')).toBeVisible();
    await userEvent.type(canvas.getByRole('textbox', { name: messages.auth_email() }), 'editor@example.test');
    await userEvent.type(canvas.getByLabelText(messages.auth_password()), 'story-password');
    await userEvent.click(canvas.getByRole('button', { name: messages.signIn() }));
    await expect(await canvas.findByText('Acoustic survey')).toBeVisible();
    await expect(canvas.getByText('Signed in as editor@example.test')).toBeVisible();
    await expect(canvas.queryByText('Sign in to continue')).not.toBeInTheDocument();
    await expect(canvas.getByTestId('verified-records')).toHaveAttribute('data-row-count', '2');
  },
};
