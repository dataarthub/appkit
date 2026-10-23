// @vitest-environment jsdom
import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import { cleanup, fireEvent, render, renderHook } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { useKeyboardShortcuts, type KeyboardShortcut } from './use-keyboard-shortcut';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function keydown(init: KeyboardEventInit = {}) {
  const event = new KeyboardEvent('keydown', {
    key: 'S',
    bubbles: true,
    cancelable: true,
    ...init,
  });
  window.dispatchEvent(event);
  return event;
}

test('server rendering does not register browser listeners or invoke shortcuts', () => {
  const add = vi.spyOn(window, 'addEventListener');
  const received: string[] = [];
  function Screen() {
    useKeyboardShortcuts([{ key: 's', handler: () => received.push('save') }]);
    return <p>Ready</p>;
  }
  expect(renderToString(<Screen />)).toBe('<p>Ready</p>');
  expect(add.mock.calls.filter(([type]) => type === 'keydown')).toEqual([]);
  expect(received).toEqual([]);
});

test.each([
  [{}, {}, true],
  [{ ctrlKey: true }, { ctrlKey: true }, true],
  [{ ctrlKey: true }, { metaKey: true }, true],
  [{ ctrlKey: true }, {}, false],
  [{ ctrlKey: false }, {}, true],
  [{ ctrlKey: false }, { ctrlKey: true }, false],
  [{ ctrlKey: false }, { metaKey: true }, false],
  [{ metaKey: true }, { metaKey: true }, true],
  [{ metaKey: false }, { metaKey: true }, false],
  [{ shiftKey: true }, { shiftKey: true }, true],
  [{ shiftKey: true }, {}, false],
  [{ shiftKey: false }, { shiftKey: true }, false],
  [{ altKey: true }, { altKey: true }, true],
  [{ altKey: true }, {}, false],
  [{ altKey: false }, { altKey: true }, false],
  [{ ctrlKey: true, metaKey: false }, { ctrlKey: true }, true],
  [{ ctrlKey: true, metaKey: false }, { metaKey: true }, false],
] as const)('preserves modifier matching: %j with %j', (modifiers, eventInit, matches) => {
  const received: KeyboardEvent[] = [];
  renderHook(() =>
    useKeyboardShortcuts([{ key: 's', ...modifiers, handler: (event) => received.push(event) }]),
  );
  const event = keydown(eventInit);
  expect(received).toEqual(matches ? [event] : []);
  expect(event.defaultPrevented).toBe(matches);
});

test('runs only the first match, honors preventDefault:false and ignores other keys', () => {
  const received: string[] = [];
  renderHook(() =>
    useKeyboardShortcuts([
      { key: 's', preventDefault: false, handler: () => received.push('first') },
      { key: 's', handler: () => received.push('second') },
    ]),
  );
  expect(keydown().defaultPrevented).toBe(false);
  expect(keydown({ key: 'x' }).defaultPrevented).toBe(false);
  expect(received).toEqual(['first']);
});

test('uses current shortcut definitions and callbacks after rerender', () => {
  const received: string[] = [];
  const hook = renderHook(
    ({ key, label }) => useKeyboardShortcuts([{ key, handler: () => received.push(label) }]),
    { initialProps: { key: 's', label: 'first' } },
  );
  keydown();
  hook.rerender({ key: 'x', label: 'latest' });
  expect(keydown().defaultPrevented).toBe(false);
  keydown({ key: 'x' });
  hook.rerender({ key: 'x', label: 'new callback' });
  keydown({ key: 'x' });
  expect(received).toEqual(['first', 'latest', 'new callback']);
});

test('disables, re-enables and cleans up without duplicate calls in StrictMode', () => {
  let count = 0;
  const hook = renderHook(
    ({ enabled }) => useKeyboardShortcuts([{ key: 's', handler: () => count++ }], enabled),
    { initialProps: { enabled: false }, wrapper: StrictMode },
  );
  expect(keydown().defaultPrevented).toBe(false);
  hook.rerender({ enabled: true });
  keydown();
  expect(count).toBe(1);
  hook.rerender({ enabled: false });
  expect(keydown().defaultPrevented).toBe(false);
  expect(count).toBe(1);
  hook.rerender({ enabled: true });
  keydown();
  expect(count).toBe(2);
  hook.unmount();
  expect(keydown().defaultPrevented).toBe(false);
  expect(count).toBe(2);
});

test('continues handling input, repeated and composition events', () => {
  const received: KeyboardEvent[] = [];
  function Input() {
    useKeyboardShortcuts([{ key: 's', handler: (event) => received.push(event) }]);
    return <input aria-label='Editor' />;
  }
  const view = render(<Input />);
  const event = new KeyboardEvent('keydown', {
    key: 's',
    repeat: true,
    isComposing: true,
    bubbles: true,
    cancelable: true,
  });
  fireEvent(view.getByRole('textbox'), event);
  expect(received).toEqual([event]);
  expect(event.defaultPrevented).toBe(true);
});

test('keeps the subscription while inline definitions change and still runs the latest handler', () => {
  const add = vi.spyOn(window, 'addEventListener');
  const remove = vi.spyOn(window, 'removeEventListener');
  const received: number[] = [];
  const hook = renderHook(
    ({ value }) => useKeyboardShortcuts([{ key: 's', handler: () => received.push(value) }]),
    { initialProps: { value: 1 } },
  );
  const keydownCalls = () => add.mock.calls.filter(([type]) => type === 'keydown');
  const initial = keydownCalls();
  hook.rerender({ value: 2 });
  keydown();
  expect(received).toEqual([2]);
  expect(keydownCalls()).toHaveLength(initial.length);
  expect(remove.mock.calls.filter(([type]) => type === 'keydown')).toHaveLength(0);
  hook.unmount();
  expect(remove).toHaveBeenCalledWith('keydown', initial[0][1]);
});
