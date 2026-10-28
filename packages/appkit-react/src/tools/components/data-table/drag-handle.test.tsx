// @vitest-environment jsdom
import {cleanup, render, waitFor} from '@testing-library/react';
import {afterEach, expect, test} from 'vitest';
import {DataTable} from './data-table';

afterEach(cleanup);

test('column reorder buttons retain modern drag accessibility without deprecated aria-grabbed', async () => {
  const view = render(<DataTable data={[{title: 'Review'}]} columns={[{accessorKey: 'title', header: 'Title'}]} />);
  const handle = view.getByRole('button', {name: 'Reorder column title'});
  await waitFor(() => expect(handle.getAttribute('aria-pressed')).toBe('false'));
  expect(handle.hasAttribute('aria-grabbed')).toBe(false);
  expect(handle.getAttribute('aria-roledescription')).toBe('draggable');
  expect(handle.getAttribute('aria-disabled')).toBe('false');
  expect(document.getElementById(handle.getAttribute('aria-describedby')!)?.textContent).toContain('space');
});

import {StrictMode, useCallback, type RefCallback} from 'react';
import {act} from '@testing-library/react';
import {DragDropProvider, useDragDropManager, useDraggable} from '@dnd-kit/react';
import {Accessibility} from '@dnd-kit/dom';
import {useAccessibleDragRef} from '../ui/dnd/use-accessible-drag-ref';

test('native handle state follows active/reset lifecycle and unregisters on unmount', async () => {
  let manager: NonNullable<ReturnType<typeof useDragDropManager>>;
  function DragHandle() {
    manager = useDragDropManager()!;
    const {ref, handleRef} = useDraggable({id: 'title'});
    const accessibleRef = useAccessibleDragRef(handleRef);
    return <div ref={ref}><button ref={accessibleRef}>Reorder title</button></div>;
  }
  const view = render(<StrictMode><DragDropProvider plugins={[Accessibility]}><DragHandle /></DragDropProvider></StrictMode>);
  const handle = view.getByRole('button', {name: 'Reorder title'});
  await waitFor(() => expect(handle.getAttribute('aria-pressed')).toBe('false'));
  expect(manager!.registry.draggables.get('title')!.handle).toBe(handle);
  await act(async () => {
    manager!.dragOperation.sourceIdentifier = 'title';
    manager!.registry.draggables.get('title')!.status = 'dragging';
    manager!.dragOperation.status.set('dragging');
  });
  await waitFor(() => expect(handle.getAttribute('aria-pressed')).toBe('true'));
  expect(handle.hasAttribute('aria-grabbed')).toBe(false);
  expect(document.querySelector('[aria-live="polite"]')).not.toBeNull();
  await act(async () => {
    manager!.registry.draggables.get('title')!.status = 'idle';
    manager!.dragOperation.status.set('idle');
    manager!.dragOperation.sourceIdentifier = null;
  });
  await waitFor(() => expect(handle.getAttribute('aria-pressed')).toBe('false'));
  expect(handle.hasAttribute('aria-grabbed')).toBe(false);
  view.unmount();
  expect(manager!.registry.draggables.get('title')).toBeUndefined();
  handle.setAttribute('aria-grabbed', 'after-unmount');
  await act(async () => {});
  expect(handle.getAttribute('aria-grabbed')).toBe('after-unmount');
});

test.each([false, true])('ref replacement and React 19 cleanup preserve native ref semantics (cleanup=%s)', async (returnsCleanup) => {
  const attached: Array<HTMLElement | null> = [];
  const cleaned: HTMLElement[] = [];
  function Handle({id}: {id: string}) {
    const nativeRef = useCallback<RefCallback<HTMLElement>>((node) => {
      attached.push(node);
      if (returnsCleanup && node) return () => {cleaned.push(node);};
    }, []);
    const ref = useAccessibleDragRef(nativeRef);
    return <button key={id} ref={ref}>{id}</button>;
  }
  const view = render(<Handle id="first" />);
  const first = view.getByRole('button');
  first.setAttribute('aria-grabbed', 'false');
  first.setAttribute('aria-pressed', 'true');
  await waitFor(() => expect(first.hasAttribute('aria-grabbed')).toBe(false));
  expect(first.getAttribute('aria-pressed')).toBe('true');
  view.rerender(<Handle id="second" />);
  const second = view.getByRole('button');
  expect(attached).toEqual(returnsCleanup ? [first, second] : [first, null, second]);
  expect(cleaned).toEqual(returnsCleanup ? [first] : []);
  first.setAttribute('aria-grabbed', 'detached');
  second.setAttribute('aria-grabbed', 'true');
  await waitFor(() => expect(second.hasAttribute('aria-grabbed')).toBe(false));
  expect(first.getAttribute('aria-grabbed')).toBe('detached');
  view.unmount();
  expect(cleaned).toEqual(returnsCleanup ? [first, second] : []);
  expect(attached.at(-1)).toBe(returnsCleanup ? second : null);
});
