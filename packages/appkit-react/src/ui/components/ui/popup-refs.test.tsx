// @vitest-environment jsdom
import * as React from 'react';
import { afterEach, expect, test } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from './dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from './sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogTrigger,
} from './alert-dialog';
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
} from './popover';
import { Tooltip, TooltipContent, TooltipTrigger } from './tooltip';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from './dropdown-menu';
import {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from './context-menu';

afterEach(cleanup);

// Exercise real Base UI state/focus and portals: dropping a wrapper ref or its
// render/event props must fail at the consumer-facing DOM.
test.each([
  [
    'dialog',
    Dialog,
    DialogTrigger,
    DialogContent,
    DialogTitle,
    DialogDescription,
  ],
  ['sheet', Sheet, SheetTrigger, SheetContent, SheetTitle, SheetDescription],
] as const)(
  '%s forwards popup/text refs and restores focus after closing',
  async (slot, Root, Trigger, Content, Title, Description) => {
    const user = userEvent.setup();
    const popupRef = React.createRef<HTMLDivElement>();
    const titleRef = React.createRef<HTMLHeadingElement>();
    let description: HTMLParagraphElement | null = null;
    render(
      <Root>
        <Trigger>Open</Trigger>
        <Content ref={popupRef} className="consumer-popup" testId="popup">
          <Title ref={titleRef}>Project details</Title>
          <Description
            ref={(node) => {
              description = node;
            }}
          >
            Review the project
          </Description>
          <button>First action</button>
        </Content>
      </Root>,
    );
    const trigger = screen.getByRole('button', { name: 'Open' });
    await user.click(trigger);
    const popup = await screen.findByRole('dialog', {
      name: 'Project details',
    });
    expect(popupRef.current).toBe(popup);
    expect(popup.getAttribute('data-slot')).toBe(`${slot}-content`);
    expect(popup.classList.contains('consumer-popup')).toBe(true);
    expect(titleRef.current).toBe(
      screen.getByRole('heading', { name: 'Project details' }),
    );
    expect(description).toBe(screen.getByText('Review the project'));
    expect(popup.getAttribute('aria-describedby')).toBe(
      screen.getByText('Review the project').id,
    );
    await waitFor(() =>
      expect(popup.contains(document.activeElement)).toBe(true),
    );
    await user.click(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(trigger));
    expect(popupRef.current).toBeNull();
    expect(titleRef.current).toBeNull();
    expect(description).toBeNull();
  },
);

test('alert dialog composes action/cancel refs and restores focus on cancellation', async () => {
  const user = userEvent.setup();
  const popupRef = React.createRef<HTMLDivElement>();
  const actionRef = React.createRef<HTMLButtonElement>();
  let cancel: HTMLButtonElement | null = null;
  let actions = 0;
  render(
    <AlertDialog>
      <AlertDialogTrigger>Review</AlertDialogTrigger>
      <AlertDialogContent ref={popupRef} size="sm">
        <AlertDialogTitle>Apply changes?</AlertDialogTitle>
        <AlertDialogDescription>Review before applying</AlertDialogDescription>
        <AlertDialogCancel
          ref={(node) => {
            cancel = node;
          }}
        >
          Cancel
        </AlertDialogCancel>
        <AlertDialogAction ref={actionRef} onClick={() => actions++}>
          Apply
        </AlertDialogAction>
      </AlertDialogContent>
    </AlertDialog>,
  );
  const trigger = screen.getByRole('button', { name: 'Review' });
  await user.click(trigger);
  const popup = await screen.findByRole('alertdialog', {
    name: 'Apply changes?',
  });
  expect(popupRef.current).toBe(popup);
  expect(popup.getAttribute('data-size')).toBe('sm');
  expect(cancel).toBe(screen.getByRole('button', { name: 'Cancel' }));
  expect(actionRef.current).toBe(screen.getByRole('button', { name: 'Apply' }));
  await user.click(actionRef.current!);
  expect(actions).toBe(1);
  // The host owns action effects; Cancel supplies the primitive close behavior.
  expect(screen.getByRole('alertdialog')).toBe(popup);
  await user.click(screen.getByRole('button', { name: 'Cancel' }));
  await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
  await waitFor(() => expect(document.activeElement).toBe(trigger));
  expect(popupRef.current).toBeNull();
  expect(actionRef.current).toBeNull();
  expect(cancel).toBeNull();
});

test('popover preserves custom render refs and Escape dismissal', async () => {
  const user = userEvent.setup();
  const popupRef = React.createRef<HTMLDivElement>();
  let title: HTMLHeadingElement | null = null;
  render(
    <Popover>
      <PopoverTrigger>Inspect</PopoverTrigger>
      <PopoverContent ref={popupRef} render={<section />}>
        <PopoverTitle
          ref={(node) => {
            title = node;
          }}
          render={<h3 />}
        >
          Inspector
        </PopoverTitle>
        <PopoverDescription>Project settings</PopoverDescription>
        <button>Edit</button>
      </PopoverContent>
    </Popover>,
  );
  const trigger = screen.getByRole('button', { name: 'Inspect' });
  await user.click(trigger);
  const popup = await screen.findByRole('dialog', { name: 'Inspector' });
  expect(popupRef.current).toBe(popup);
  expect(popup.tagName).toBe('SECTION');
  expect(title).toBe(
    screen.getByRole('heading', { level: 3, name: 'Inspector' }),
  );
  await waitFor(() =>
    expect(popup.contains(document.activeElement)).toBe(true),
  );
  await user.keyboard('{Escape}');
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  await waitFor(() => expect(document.activeElement).toBe(trigger));
  expect(popupRef.current).toBeNull();
  expect(title).toBeNull();
});

test('tooltip forwards its portal ref on keyboard focus and clears it on blur', async () => {
  const user = userEvent.setup();
  const popupRef = React.createRef<HTMLDivElement>();
  render(
    <>
      <Tooltip>
        <TooltipTrigger>Help</TooltipTrigger>
        <TooltipContent ref={popupRef} className="consumer-tooltip">
          More information
        </TooltipContent>
      </Tooltip>
      <button>Next</button>
    </>,
  );
  await user.tab();
  const tooltip = await screen.findByText('More information');
  expect(popupRef.current).toBe(tooltip);
  expect(tooltip.textContent).toContain('More information');
  expect(tooltip.classList.contains('consumer-tooltip')).toBe(true);
  expect(
    screen
      .getByRole('button', { name: 'Help' })
      .hasAttribute('data-popup-open'),
  ).toBe(true);
  await user.tab();
  await waitFor(() =>
    expect(screen.queryByText('More information')).toBeNull(),
  );
  expect(popupRef.current).toBeNull();
  expect(document.activeElement).toBe(
    screen.getByRole('button', { name: 'Next' }),
  );
});

test('dropdown refs compose with checked state and custom rendered item selection', async () => {
  const user = userEvent.setup();
  const popupRef = React.createRef<HTMLDivElement>();
  const checkboxRef = React.createRef<HTMLDivElement>();
  const itemRef = React.createRef<HTMLDivElement>();
  let radio: HTMLDivElement | null = null;
  let selected = 0;
  render(
    <DropdownMenu>
      <DropdownMenuTrigger>Options</DropdownMenuTrigger>
      <DropdownMenuContent ref={popupRef}>
        <DropdownMenuCheckboxItem ref={checkboxRef} closeOnClick={false}>
          Show details
        </DropdownMenuCheckboxItem>
        <DropdownMenuRadioGroup defaultValue="one">
          <DropdownMenuRadioItem value="one" closeOnClick={false}>
            One
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem
            ref={(node) => {
              radio = node;
            }}
            value="two"
            closeOnClick={false}
          >
            Two
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuItem
          ref={itemRef}
          render={<a href="#selected" />}
          onClick={() => selected++}
        >
          Select
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>,
  );
  const trigger = screen.getByRole('button', { name: 'Options' });
  await user.click(trigger);
  const menu = await screen.findByRole('menu');
  expect(popupRef.current).toBe(menu);
  const checkbox = screen.getByRole('menuitemcheckbox', {
    name: 'Show details',
  });
  expect(checkboxRef.current).toBe(checkbox);
  expect(checkbox.getAttribute('aria-checked')).toBe('false');
  await user.click(checkbox);
  expect(checkbox.getAttribute('aria-checked')).toBe('true');
  expect(radio).toBe(screen.getByRole('menuitemradio', { name: 'Two' }));
  await user.click(screen.getByRole('menuitemradio', { name: 'Two' }));
  expect(
    screen
      .getByRole('menuitemradio', { name: 'Two' })
      .getAttribute('aria-checked'),
  ).toBe('true');
  expect(
    screen
      .getByRole('menuitemradio', { name: 'One' })
      .getAttribute('aria-checked'),
  ).toBe('false');
  const item = screen.getByRole('menuitem', { name: 'Select' });
  expect(itemRef.current).toBe(item);
  expect(item.tagName).toBe('A');
  await user.click(item);
  expect(selected).toBe(1);
  await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
  await waitFor(() => expect(document.activeElement).toBe(trigger));
  expect(popupRef.current).toBeNull();
  expect(checkboxRef.current).toBeNull();
  expect(radio).toBeNull();
});

test('context menu forwards trigger/item refs through right-click selection', async () => {
  const user = userEvent.setup();
  const triggerRef = React.createRef<HTMLDivElement>();
  const popupRef = React.createRef<HTMLDivElement>();
  const checkboxRef = React.createRef<HTMLDivElement>();
  let item: HTMLDivElement | null = null;
  let selected = 0;
  render(
    <ContextMenu>
      <ContextMenuTrigger ref={triggerRef} tabIndex={0}>
        Document
      </ContextMenuTrigger>
      <ContextMenuContent ref={popupRef}>
        <ContextMenuCheckboxItem ref={checkboxRef} closeOnClick={false}>
          Pinned
        </ContextMenuCheckboxItem>
        <ContextMenuItem
          ref={(node) => {
            item = node;
          }}
          onClick={() => selected++}
        >
          Open document
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>,
  );
  const trigger = screen.getByText('Document');
  expect(triggerRef.current).toBe(trigger);
  fireEvent.contextMenu(trigger, { button: 2, clientX: 20, clientY: 20 });
  const menu = await screen.findByRole('menu');
  expect(popupRef.current).toBe(menu);
  expect(checkboxRef.current).toBe(
    screen.getByRole('menuitemcheckbox', { name: 'Pinned' }),
  );
  await user.click(screen.getByRole('menuitemcheckbox', { name: 'Pinned' }));
  expect(checkboxRef.current?.getAttribute('aria-checked')).toBe('true');
  expect(item).toBe(screen.getByRole('menuitem', { name: 'Open document' }));
  await user.click(screen.getByRole('menuitem', { name: 'Open document' }));
  expect(selected).toBe(1);
  await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
  expect(popupRef.current).toBeNull();
  expect(item).toBeNull();
});
