import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import {
  Button, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
  DialogTrigger, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../src/ui';
import {
  expectInViewport, expectNoClippedText, expectNoHorizontalOverflow, expectUsableControl,
} from './geometry';

const meta = {
  title: 'Verification/Interaction',
  parameters: { layout: 'fullscreen' },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

function ContactForm() {
  const [savedEmail, setSavedEmail] = useState('');
  return (
    <section aria-labelledby='contact-title' className='w-full max-w-sm space-y-4'>
      <h1 id='contact-title'>Contact preferences</h1>
      <form className='space-y-4' onSubmit={(event) => {
        event.preventDefault();
        setSavedEmail(String(new FormData(event.currentTarget).get('email')));
      }}>
        <div className='space-y-2'>
          <Label htmlFor='contact-email'>Email address</Label>
          <Input id='contact-email' name='email' type='email' required autoComplete='email' />
        </div>
        <Button type='submit'>Save contact preferences</Button>
      </form>
      <p role='status'>{savedEmail ? `Preferences saved for ${savedEmail}` : 'No preferences saved.'}</p>
    </section>
  );
}

export const KeyboardFormSubmission: Story = {
  render: () => <ContactForm />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const email = canvas.getByRole('textbox', { name: 'Email address' });
    const save = canvas.getByRole('button', { name: 'Save contact preferences' });
    expectNoHorizontalOverflow();
    expectUsableControl(email);
    expectUsableControl(save);
    expectNoClippedText(canvas.getByText('Email address'));
    await userEvent.tab();
    await expect(email).toHaveFocus();
    await userEvent.type(email, 'reader@example.com');
    await userEvent.tab();
    await expect(save).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await expect(canvas.getByRole('status')).toHaveTextContent('Preferences saved for reader@example.com');
    expectNoHorizontalOverflow();
    expectInViewport(canvas.getByRole('status'));
    expectNoClippedText(canvas.getByRole('status'));
  },
};

function ProfileDialog() {
  const [savedName, setSavedName] = useState('');
  return (
    <Dialog>
      <DialogTrigger render={<Button>Edit profile</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit profile</DialogTitle>
          <DialogDescription>Update the name shown on your profile.</DialogDescription>
        </DialogHeader>
        <form className='space-y-4' onSubmit={(event) => {
          event.preventDefault();
          setSavedName(String(new FormData(event.currentTarget).get('displayName')));
        }}>
          <div className='space-y-2'>
            <Label htmlFor='profile-name'>Display name</Label>
            <Input id='profile-name' name='displayName' defaultValue={savedName} required autoComplete='name' />
          </div>
          <Button type='submit'>Save profile</Button>
        </form>
        <p role='status'>{savedName ? `Profile saved for ${savedName}` : 'Your changes have not been saved.'}</p>
      </DialogContent>
    </Dialog>
  );
}

export const DialogSubmissionAndFocusReturn: Story = {
  render: () => <ProfileDialog />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const page = within(canvasElement.ownerDocument.body);
    const trigger = canvas.getByRole('button', { name: 'Edit profile' });
    expectUsableControl(trigger);
    await userEvent.click(trigger);
    const dialog = await page.findByRole('dialog', { name: 'Edit profile' });
    const overlay = within(dialog);
    const name = overlay.getByRole('textbox', { name: 'Display name' });
    const save = overlay.getByRole('button', { name: 'Save profile' });
    await waitFor(() => {
      expectInViewport(dialog);
      expectUsableControl(name);
      expectUsableControl(save);
      expectUsableControl(overlay.getByRole('button', { name: 'Close' }));
    });
    expectNoHorizontalOverflow();
    expectNoClippedText(overlay.getByText('Display name'));
    expectNoClippedText(overlay.getByText('Update the name shown on your profile.'));
    await userEvent.click(name);
    await expect(name).toHaveFocus();
    await userEvent.type(name, 'Alex Reader');
    await userEvent.tab();
    await expect(save).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await expect(overlay.getByRole('status')).toHaveTextContent('Profile saved for Alex Reader');
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(page.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());
    await userEvent.keyboard('{Enter}');
    const reopened = await page.findByRole('dialog', { name: 'Edit profile' });
    await expect(within(reopened).getByRole('textbox', { name: 'Display name' })).toHaveValue('Alex Reader');
    await waitFor(() => expectInViewport(reopened));
    expectNoHorizontalOverflow();
    // Leave the actual portal open so the automatic axe pass audits the modal state.
  },
};

function DeliverySelect() {
  const [delivery, setDelivery] = useState<string | null>('Weekly');
  return (
    <section aria-labelledby='delivery-title' className='w-full max-w-sm space-y-4'>
      <h1 id='delivery-title'>Delivery preferences</h1>
      <Label id='delivery-label'>Delivery frequency</Label>
      <Select value={delivery} onValueChange={setDelivery}>
        <SelectTrigger aria-labelledby='delivery-label' className='w-full'><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value='Daily'>Daily</SelectItem>
          <SelectItem value='Weekly'>Weekly</SelectItem>
          <SelectItem value='Monthly'>Monthly</SelectItem>
        </SelectContent>
      </Select>
      <p role='status'>Delivery frequency: {delivery}</p>
      <a href='#delivery-title'>Review preferences</a>
    </section>
  );
}

export const SelectChoiceAndOpenOverlay: Story = {
  render: () => <DeliverySelect />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const page = within(canvasElement.ownerDocument.body);
    const trigger = canvas.getByRole('combobox', { name: 'Delivery frequency' });
    expectUsableControl(trigger);
    await userEvent.click(trigger);
    const daily = await page.findByRole('option', { name: 'Daily' });
    await waitFor(() => expectUsableControl(daily));
    await userEvent.click(daily);
    await expect(canvas.getByRole('status')).toHaveTextContent('Delivery frequency: Daily');
    await waitFor(() => expect(trigger).toHaveFocus());
    await userEvent.keyboard('{ArrowDown}');
    await page.findByRole('listbox');
    await userEvent.tab();
    await waitFor(() => expect(page.queryByRole('listbox')).not.toBeInTheDocument());
    await expect(canvas.getByRole('link', { name: 'Review preferences' })).toHaveFocus();
    await userEvent.tab({ shift: true });
    await expect(trigger).toHaveFocus();
    await userEvent.keyboard('{ArrowDown}');
    const listbox = await page.findByRole('listbox');
    await waitFor(() => {
      expectInViewport(listbox);
      for (const option of within(listbox).getAllByRole('option')) expectUsableControl(option);
    });
    expectNoHorizontalOverflow();
    // Leave the real listbox open for the automatic axe audit of its options.
  },
};
