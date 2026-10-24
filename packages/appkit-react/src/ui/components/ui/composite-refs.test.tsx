// @vitest-environment jsdom
import * as React from 'react';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { Avatar, AvatarFallback } from './avatar';
import {
  Progress,
  ProgressIndicator,
  ProgressLabel,
  ProgressTrack,
  ProgressValue,
} from './progress';
import { Field, FieldControl, FieldDescription, FieldLabel } from './field';
import { Separator } from './separator';
import { Toast, ToastClose } from './toast';
import { KanbanCardView } from '../../../tools/components/kanban/KanbanCardView';
import { PriorityCard } from '../../../tools/components/priority-queue/PriorityCard';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

test('progress refs target the composed parts while accessible values update', () => {
  const root = React.createRef<HTMLDivElement>();
  const track = React.createRef<HTMLDivElement>();
  const indicator = React.createRef<HTMLDivElement>();
  const label = React.createRef<HTMLSpanElement>();
  const value = React.createRef<HTMLSpanElement>();
  const tree = (amount: number) => (
    <Progress ref={root} value={amount}>
      <ProgressLabel ref={label}>Upload</ProgressLabel>
      <ProgressValue ref={value} />
      <ProgressTrack ref={track}>
        <ProgressIndicator ref={indicator} />
      </ProgressTrack>
    </Progress>
  );
  const view = render(tree(25));
  expect(root.current).toBe(view.getByRole('progressbar', { name: 'Upload' }));
  expect(root.current?.getAttribute('aria-valuenow')).toBe('25');
  expect(label.current?.textContent).toBe('Upload');
  expect(value.current?.textContent).toContain('25');
  expect(track.current?.contains(indicator.current)).toBe(true);
  view.rerender(tree(75));
  expect(root.current?.getAttribute('aria-valuenow')).toBe('75');
  expect(value.current?.textContent).toContain('75');
  view.unmount();
  for (const ref of [root, track, indicator, label, value]) expect(ref.current).toBeNull();
});

test('avatar fallback and separator retain their DOM refs and props', () => {
  const avatar = React.createRef<HTMLSpanElement>();
  const fallback = React.createRef<HTMLSpanElement>();
  const separator = React.createRef<HTMLDivElement>();
  const view = render(
    <>
      <Avatar ref={avatar} size='sm'>
        <AvatarFallback ref={fallback}>AB</AvatarFallback>
      </Avatar>
      <Separator ref={separator} orientation='vertical' />
    </>,
  );
  expect(avatar.current?.getAttribute('data-size')).toBe('sm');
  expect(fallback.current?.textContent).toBe('AB');
  expect(avatar.current?.contains(fallback.current)).toBe(true);
  expect(separator.current).toBe(view.getByRole('separator'));
  expect(separator.current?.getAttribute('aria-orientation')).toBe('vertical');
  view.unmount();
  expect(avatar.current).toBeNull();
  expect(fallback.current).toBeNull();
  expect(separator.current).toBeNull();
});

test('field labels and descriptions stay associated with the control through forwarded refs', () => {
  const field = React.createRef<HTMLDivElement>();
  const label = React.createRef<HTMLLabelElement>();
  const description = React.createRef<HTMLParagraphElement>();
  const view = render(
    <Field ref={field} name='email'>
      <FieldLabel ref={label}>Email</FieldLabel>
      <FieldControl />
      <FieldDescription ref={description}>Work address</FieldDescription>
    </Field>,
  );
  const input = view.getByRole('textbox', { name: 'Email' });
  expect(field.current?.contains(input)).toBe(true);
  expect(label.current).toBe(view.getByText('Email'));
  expect(input.getAttribute('aria-describedby')?.split(' ')).toContain(description.current?.id);
  fireEvent.click(label.current!);
  // The wrapper must preserve the native label/control association.
  expect(label.current?.htmlFor).toBe(input.id);
  view.unmount();
  expect(field.current).toBeNull();
  expect(label.current).toBeNull();
  expect(description.current).toBeNull();
});

test('toast timer, controlled visibility, close callback and refs retain their lifecycle', () => {
  vi.useFakeTimers();
  const toast = React.createRef<HTMLDivElement>();
  const close = React.createRef<HTMLButtonElement>();
  const requests: boolean[] = [];
  const onOpenChange = (open: boolean) => {
    requests.push(open);
  };
  const tree = (open: boolean) => (
    <Toast ref={toast} open={open} duration={1000} onOpenChange={onOpenChange}>
      Notification
      <ToastClose ref={close} />
    </Toast>
  );
  const view = render(tree(true));
  expect(toast.current?.getAttribute('data-slot')).toBe('toast');
  expect(close.current).toBe(view.getByRole('button', { name: 'Dismiss notification' }));
  act(() => {
    vi.advanceTimersByTime(999);
  });
  expect(requests).toEqual([]);
  act(() => {
    vi.advanceTimersByTime(1);
  });
  expect(requests).toEqual([false]);
  fireEvent.click(close.current!);
  expect(requests).toEqual([false, false]);
  view.rerender(tree(false));
  expect(toast.current).toBeNull();
  expect(close.current).toBeNull();
  view.rerender(tree(true));
  expect(toast.current).not.toBeNull();
  view.unmount();
  act(() => {
    vi.advanceTimersByTime(1000);
  });
  expect(requests).toEqual([false, false]);
});

test('kanban presentation cards retain their ref target and displayed task', () => {
  const ref = React.createRef<HTMLDivElement>();
  const view = render(
    <KanbanCardView
      ref={ref}
      task={{ id: 'task', title: 'Review', status: 'todo', priority: 'high' }}
      testId='task'
    />,
  );
  expect(ref.current).toBe(view.getByTestId('task'));
  expect(ref.current?.getAttribute('data-priority')).toBe('high');
  expect(ref.current?.textContent).toContain('Review');
  view.unmount();
  expect(ref.current).toBeNull();
});

test('priority cards retain their native ref and task click behavior', () => {
  const ref = React.createRef<HTMLDivElement>();
  let clicks = 0;
  const view = render(
    <PriorityCard
      ref={ref}
      task={{ id: 'task', title: 'First task', status: 'todo' }}
      rank={1}
      testId='priority'
      onClick={() => clicks++}
    />,
  );
  expect(ref.current).toBe(view.getByTestId('priority'));
  fireEvent.click(view.getByText('First task'));
  expect(clicks).toBe(1);
  view.unmount();
  expect(ref.current).toBeNull();
});
