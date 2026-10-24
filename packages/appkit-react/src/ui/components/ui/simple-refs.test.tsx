// @vitest-environment jsdom
import * as React from 'react';
import { afterEach, expect, expectTypeOf, test } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from './card';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from './table';
import { Textarea, type TextareaProps } from './textarea';

afterEach(cleanup);

// Preserve the former forwardRef props, including each specific ref target.
type FormerProps<P, E> = React.PropsWithoutRef<P> & React.RefAttributes<E>;
test('public component props retain the former ref and attribute types', () => {
  // Vitest normally transpiles without checking types, and the package tsconfig
  // excludes tests. test:typescript-tooling compiles these assertions in normal CI.
  expectTypeOf<React.ComponentProps<typeof Card>>().toEqualTypeOf<
    FormerProps<React.ComponentProps<'div'> & { size?: 'default' | 'sm' }, HTMLDivElement>
  >();
  expectTypeOf<React.ComponentProps<typeof CardHeader>>().toEqualTypeOf<
    FormerProps<React.ComponentProps<'div'>, HTMLDivElement>
  >();
  expectTypeOf<React.ComponentProps<typeof CardTitle>>().toEqualTypeOf<
    React.ComponentProps<typeof CardHeader>
  >();
  expectTypeOf<React.ComponentProps<typeof CardDescription>>().toEqualTypeOf<
    React.ComponentProps<typeof CardHeader>
  >();
  expectTypeOf<React.ComponentProps<typeof CardAction>>().toEqualTypeOf<
    React.ComponentProps<typeof CardHeader>
  >();
  expectTypeOf<React.ComponentProps<typeof CardContent>>().toEqualTypeOf<
    React.ComponentProps<typeof CardHeader>
  >();
  expectTypeOf<React.ComponentProps<typeof CardFooter>>().toEqualTypeOf<
    React.ComponentProps<typeof CardHeader>
  >();
  expectTypeOf<React.ComponentProps<typeof Table>>().toEqualTypeOf<
    FormerProps<React.HTMLAttributes<HTMLTableElement>, HTMLTableElement>
  >();
  expectTypeOf<React.ComponentProps<typeof TableHeader>>().toEqualTypeOf<
    FormerProps<React.HTMLAttributes<HTMLTableSectionElement>, HTMLTableSectionElement>
  >();
  expectTypeOf<React.ComponentProps<typeof TableBody>>().toEqualTypeOf<
    React.ComponentProps<typeof TableHeader>
  >();
  expectTypeOf<React.ComponentProps<typeof TableFooter>>().toEqualTypeOf<
    React.ComponentProps<typeof TableHeader>
  >();
  expectTypeOf<React.ComponentProps<typeof TableRow>>().toEqualTypeOf<
    FormerProps<React.HTMLAttributes<HTMLTableRowElement>, HTMLTableRowElement>
  >();
  expectTypeOf<React.ComponentProps<typeof TableHead>>().toEqualTypeOf<
    FormerProps<React.ThHTMLAttributes<HTMLTableCellElement>, HTMLTableCellElement>
  >();
  expectTypeOf<React.ComponentProps<typeof TableCell>>().toEqualTypeOf<
    FormerProps<React.TdHTMLAttributes<HTMLTableCellElement>, HTMLTableCellElement>
  >();
  expectTypeOf<React.ComponentProps<typeof TableCaption>>().toEqualTypeOf<
    FormerProps<React.HTMLAttributes<HTMLTableCaptionElement>, HTMLTableCaptionElement>
  >();
  expectTypeOf<React.ComponentProps<typeof Textarea>>().toEqualTypeOf<
    FormerProps<TextareaProps, HTMLTextAreaElement>
  >();
});

test.each([
  [Card, 'card'],
  [CardHeader, 'card-header'],
  [CardTitle, 'card-title'],
  [CardDescription, 'card-description'],
  [CardAction, 'card-action'],
  [CardContent, 'card-content'],
  [CardFooter, 'card-footer'],
] as const)('%s keeps its div ref, styling and native events', (Component, slot) => {
  const ref = React.createRef<HTMLDivElement>();
  let clicks = 0;
  const view = render(
    <Component ref={ref} className='custom-card' onClick={() => clicks++}>
      Content
    </Component>,
  );
  const element = view.getByText('Content');
  expect(ref.current).toBe(element);
  expect(element.tagName).toBe('DIV');
  expect(element.getAttribute('data-slot')).toBe(slot);
  expect(element.classList.contains('custom-card')).toBe(true);
  fireEvent.click(element);
  expect(clicks).toBe(1);
  view.unmount();
  expect(ref.current).toBeNull();
});

test('card size defaults and compact size survive rerender', () => {
  const view = render(<Card>Content</Card>);
  expect(view.getByText('Content').getAttribute('data-size')).toBe('default');
  view.rerender(<Card size='sm'>Content</Card>);
  expect(view.getByText('Content').getAttribute('data-size')).toBe('sm');
});

test('table refs target the correct native slots and release callback resources', () => {
  const tableRef = React.createRef<HTMLTableElement>();
  const nodes = new Map<string, HTMLElement>();
  const refFor = (slot: string) => (element: HTMLElement | null) => {
    if (!element) return;
    nodes.set(slot, element);
    return () => {
      nodes.delete(slot);
    };
  };
  const view = render(
    <Table ref={tableRef} className='custom-table' aria-label='Records'>
      <TableCaption ref={refFor('table-caption')}>Records</TableCaption>
      <TableHeader ref={refFor('table-header')}>
        <TableRow ref={refFor('table-row')}>
          <TableHead ref={refFor('table-head')} scope='col'>
            Name
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody ref={refFor('table-body')}>
        <TableRow>
          <TableCell ref={refFor('table-cell')} colSpan={2}>
            Draft
          </TableCell>
        </TableRow>
      </TableBody>
      <TableFooter ref={refFor('table-footer')}>
        <TableRow>
          <TableCell>Total</TableCell>
        </TableRow>
      </TableFooter>
    </Table>,
  );
  const table = view.getByRole('table', { name: 'Records' });
  expect(tableRef.current).toBe(table);
  expect(table.classList.contains('custom-table')).toBe(true);
  expect(table.parentElement?.getAttribute('data-slot')).toBe('table-container');
  for (const [slot, tag] of [
    ['table-caption', 'CAPTION'],
    ['table-header', 'THEAD'],
    ['table-row', 'TR'],
    ['table-head', 'TH'],
    ['table-body', 'TBODY'],
    ['table-cell', 'TD'],
    ['table-footer', 'TFOOT'],
  ]) {
    expect(nodes.get(slot)?.tagName).toBe(tag);
    expect(nodes.get(slot)?.getAttribute('data-slot')).toBe(slot);
  }
  expect(nodes.get('table-head')?.getAttribute('scope')).toBe('col');
  expect(nodes.get('table-cell')?.getAttribute('colspan')).toBe('2');
  view.unmount();
  expect(tableRef.current).toBeNull();
  expect(nodes.size).toBe(0);
});

test('textarea supports focus, controlled edits and changing object/callback refs', () => {
  const ref = React.createRef<HTMLTextAreaElement>();
  let value = '';
  const onChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    value = event.target.value;
  };
  const view = render(
    <Textarea
      ref={ref}
      testId='notes'
      className='custom-input'
      value='First'
      onChange={onChange}
    />,
  );
  const element = view.getByTestId('notes') as HTMLTextAreaElement;
  expect(ref.current).toBe(element);
  expect(element.getAttribute('data-slot')).toBe('textarea');
  expect(element.classList.contains('custom-input')).toBe(true);
  ref.current?.focus();
  expect(document.activeElement).toBe(element);
  fireEvent.change(element, { target: { value: 'Edited' } });
  expect(value).toBe('Edited');
  let attached: HTMLTextAreaElement | null = null;
  const callbackRef = (node: HTMLTextAreaElement | null) => {
    attached = node;
  };
  view.rerender(<Textarea ref={callbackRef} testId='notes' value='Updated' onChange={onChange} />);
  expect(ref.current).toBeNull();
  expect(attached).toBe(element);
  expect(element.value).toBe('Updated');
  view.unmount();
  expect(attached).toBeNull();
});
