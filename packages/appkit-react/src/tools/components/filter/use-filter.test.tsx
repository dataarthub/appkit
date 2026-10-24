// @vitest-environment jsdom
import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { useFilter } from './use-filter';
import type { FilterFieldSpec, FilterResult, UseFilterOptions } from './filter-types';

afterEach(cleanup);
const fields: FilterFieldSpec[] = [{ field: 'status', operator: 'eq' }];

test('server rendering reads the initial filter without notifying onChange', () => {
  const received: FilterResult[] = [];
  function Screen() {
    const { filter } = useFilter({
      fields,
      defaultValues: { status: 'active' },
      onChange: next => received.push(next),
    });
    return <p>{String(filter.status)}</p>;
  }
  expect(renderToString(<Screen />)).toBe('<p>active</p>');
  expect(received).toEqual([]);
});

test('notifies only on a changed filter, using the latest callback', () => {
  const first: FilterResult[] = [];
  const latest: FilterResult[] = [];
  const hook = renderHook(
    ({ onChange }: Pick<UseFilterOptions, 'onChange'>) => useFilter({ fields, onChange }),
    {
      initialProps: {
        onChange: (filter: FilterResult) => {
          first.push(filter);
        },
      },
      wrapper: StrictMode,
    },
  );
  expect(first).toEqual([]);
  act(() => hook.result.current.setField('status', 'active'));
  expect(first).toEqual([{ status: 'active' }]);
  hook.rerender({
    onChange: (filter) => {
      latest.push(filter);
    },
  });
  expect(latest).toEqual([]);
  act(() => hook.result.current.setField('status', 'active'));
  expect(latest).toEqual([]);
  act(() => hook.result.current.setField('status', 'done'));
  expect(latest).toEqual([{ status: 'done' }]);
  expect(first).toEqual([{ status: 'active' }]);
  act(() => hook.result.current.reset());
  expect(latest).toEqual([{ status: 'done' }, {}]);
  expect(hook.result.current.isEmpty).toBe(true);
});

test('adding or removing a callback does not replay unchanged filters', () => {
  const received: FilterResult[] = [];
  const initialProps: Pick<UseFilterOptions, 'onChange'> = { onChange: undefined };
  const hook = renderHook(
    ({ onChange }: Pick<UseFilterOptions, 'onChange'>) => useFilter({ fields, onChange }),
    {
      initialProps,
    },
  );
  act(() => hook.result.current.setField('status', 'active'));
  hook.rerender({
    onChange: (filter) => {
      received.push(filter);
    },
  });
  expect(received).toEqual([]);
  act(() => hook.result.current.setField('status', 'done'));
  expect(received).toEqual([{ status: 'done' }]);
  hook.rerender({ onChange: undefined });
  act(() => hook.result.current.reset());
  expect(received).toEqual([{ status: 'done' }]);
});

test('a changed default filter is delivered once to the callback from the same update', () => {
  const received: string[] = [];
  const hook = renderHook(
    ({ label, status }) =>
      useFilter({
        fields,
        defaultValues: { status },
        onChange: (filter) => received.push(`${label}:${filter.status}`),
      }),
    { initialProps: { label: 'first', status: 'active' }, wrapper: StrictMode },
  );
  expect(received).toEqual(['first:active']);
  hook.rerender({ label: 'latest', status: 'done' });
  expect(received).toEqual(['first:active', 'latest:done']);
});
