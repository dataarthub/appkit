// @vitest-environment jsdom
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import * as React from 'react';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, expect, expectTypeOf, test } from 'vitest';
import * as formActionBar from './../../../tools/components/form/form-action-bar';
import * as formContainer from './../../../tools/components/form/form-container';
import * as formGrid from './../../../tools/components/form/form-grid';
import * as alertDialog from './alert-dialog';
import * as contextMenu from './context-menu';
import * as dialog from './dialog';
import * as dropdownMenu from './dropdown-menu';
import * as label from './label';
import * as layout from './layout';
import * as mobileForm from './mobile-form';
import * as pagination from './pagination';
import * as popover from './popover';
import * as sheet from './sheet';
import * as toast from './toast';

afterEach(cleanup);
type FormerProps<P, E> = React.PropsWithoutRef<P> & React.RefAttributes<E>;
test('additional native wrappers preserve the previous public props and ref types', () => {
  execFileSync(
    process.execPath,
    [
      createRequire(import.meta.url).resolve('typescript/lib/tsc.js'),
      '--ignoreConfig',
      '--noEmit',
      '--strict',
      '--skipLibCheck',
      '--types',
      'node',
      '--jsx',
      'react-jsx',
      '--esModuleInterop',
      '--target',
      'es2022',
      '--module',
      'esnext',
      '--moduleResolution',
      'bundler',
      fileURLToPath(import.meta.url),
    ],
    { stdio: 'inherit' },
  );
  expectTypeOf<React.ComponentProps<typeof formActionBar.FormActionBar>>().toEqualTypeOf<
    FormerProps<formActionBar.FormActionBarProps, HTMLDivElement>
  >();
  expectTypeOf<React.ComponentProps<typeof formContainer.FormContainer>>().toEqualTypeOf<
    FormerProps<formContainer.FormContainerProps, HTMLDivElement>
  >();
  expectTypeOf<React.ComponentProps<typeof formGrid.FormGrid>>().toEqualTypeOf<
    FormerProps<formGrid.FormGridProps, HTMLDivElement>
  >();
  expectTypeOf<React.ComponentProps<typeof formGrid.FormGridItem>>().toEqualTypeOf<
    FormerProps<formGrid.FormGridItemProps, HTMLDivElement>
  >();
  expectTypeOf<React.ComponentProps<typeof alertDialog.AlertDialogHeader>>().toEqualTypeOf<
    FormerProps<React.ComponentProps<'div'>, HTMLDivElement>
  >();
  expectTypeOf<React.ComponentProps<typeof alertDialog.AlertDialogFooter>>().toEqualTypeOf<
    FormerProps<React.ComponentProps<'div'>, HTMLDivElement>
  >();
  expectTypeOf<React.ComponentProps<typeof alertDialog.AlertDialogMedia>>().toEqualTypeOf<
    FormerProps<React.ComponentProps<'div'>, HTMLDivElement>
  >();
  expectTypeOf<React.ComponentProps<typeof contextMenu.ContextMenuShortcut>>().toEqualTypeOf<
    FormerProps<React.ComponentProps<'span'>, HTMLSpanElement>
  >();
  expectTypeOf<React.ComponentProps<typeof dialog.DialogHeader>>().toEqualTypeOf<
    FormerProps<React.ComponentPropsWithoutRef<'div'>, HTMLDivElement>
  >();
  expectTypeOf<React.ComponentProps<typeof dialog.DialogFooter>>().toEqualTypeOf<
    FormerProps<
      React.ComponentPropsWithoutRef<'div'> & {
        /**
         * Controls whether the wrapper inserts its own close button; see the component for its default.
         */
        /**
         * Controls whether the wrapper inserts its own close button; see the component for its default.
         */
        showCloseButton?: boolean;
      },
      HTMLDivElement
    >
  >();
  expectTypeOf<React.ComponentProps<typeof dropdownMenu.DropdownMenuShortcut>>().toEqualTypeOf<
    FormerProps<React.ComponentProps<'span'>, HTMLSpanElement>
  >();
  expectTypeOf<React.ComponentProps<typeof label.Label>>().toEqualTypeOf<
    FormerProps<React.ComponentProps<'label'>, HTMLLabelElement>
  >();
  expectTypeOf<React.ComponentProps<typeof layout.Layout>>().toEqualTypeOf<
    FormerProps<layout.LayoutProps, HTMLDivElement>
  >();
  expectTypeOf<React.ComponentProps<typeof mobileForm.MobileForm>>().toEqualTypeOf<
    FormerProps<mobileForm.MobileFormProps, HTMLFormElement>
  >();
  expectTypeOf<React.ComponentProps<typeof mobileForm.MobileFormSection>>().toEqualTypeOf<
    FormerProps<mobileForm.MobileFormSectionProps, HTMLDivElement>
  >();
  expectTypeOf<React.ComponentProps<typeof pagination.Pagination>>().toEqualTypeOf<
    FormerProps<React.ComponentPropsWithoutRef<'nav'>, React.ComponentRef<'nav'>>
  >();
  expectTypeOf<React.ComponentProps<typeof pagination.PaginationContent>>().toEqualTypeOf<
    FormerProps<React.ComponentPropsWithoutRef<'ul'>, React.ComponentRef<'ul'>>
  >();
  expectTypeOf<React.ComponentProps<typeof pagination.PaginationItem>>().toEqualTypeOf<
    FormerProps<React.ComponentPropsWithoutRef<'li'>, React.ComponentRef<'li'>>
  >();
  expectTypeOf<React.ComponentProps<typeof popover.PopoverHeader>>().toEqualTypeOf<
    FormerProps<React.ComponentPropsWithoutRef<'div'>, HTMLDivElement>
  >();
  expectTypeOf<React.ComponentProps<typeof sheet.SheetHeader>>().toEqualTypeOf<
    FormerProps<React.ComponentPropsWithoutRef<'div'>, HTMLDivElement>
  >();
  expectTypeOf<React.ComponentProps<typeof sheet.SheetFooter>>().toEqualTypeOf<
    FormerProps<React.ComponentPropsWithoutRef<'div'>, HTMLDivElement>
  >();
  expectTypeOf<React.ComponentProps<typeof toast.ToastTitle>>().toEqualTypeOf<
    FormerProps<React.HTMLAttributes<HTMLHeadingElement>, HTMLHeadingElement>
  >();
  expectTypeOf<React.ComponentProps<typeof toast.ToastDescription>>().toEqualTypeOf<
    FormerProps<React.HTMLAttributes<HTMLParagraphElement>, HTMLParagraphElement>
  >();
  expectTypeOf<React.ComponentProps<typeof toast.ToastAction>>().toEqualTypeOf<
    FormerProps<React.ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement>
  >();
});

const wrappers: { name: string; component: React.ElementType; tag: string }[] = [
  { name: 'FormActionBar', component: formActionBar.FormActionBar, tag: 'DIV' },
  { name: 'FormContainer', component: formContainer.FormContainer, tag: 'DIV' },
  { name: 'FormGrid', component: formGrid.FormGrid, tag: 'DIV' },
  { name: 'FormGridItem', component: formGrid.FormGridItem, tag: 'DIV' },
  { name: 'AlertDialogHeader', component: alertDialog.AlertDialogHeader, tag: 'DIV' },
  { name: 'AlertDialogFooter', component: alertDialog.AlertDialogFooter, tag: 'DIV' },
  { name: 'AlertDialogMedia', component: alertDialog.AlertDialogMedia, tag: 'DIV' },
  { name: 'ContextMenuShortcut', component: contextMenu.ContextMenuShortcut, tag: 'SPAN' },
  { name: 'DialogHeader', component: dialog.DialogHeader, tag: 'DIV' },
  { name: 'DialogFooter', component: dialog.DialogFooter, tag: 'DIV' },
  { name: 'DropdownMenuShortcut', component: dropdownMenu.DropdownMenuShortcut, tag: 'SPAN' },
  { name: 'Label', component: label.Label, tag: 'LABEL' },
  { name: 'Layout', component: layout.Layout, tag: 'DIV' },
  { name: 'MobileForm', component: mobileForm.MobileForm, tag: 'FORM' },
  { name: 'MobileFormSection', component: mobileForm.MobileFormSection, tag: 'DIV' },
  { name: 'Pagination', component: pagination.Pagination, tag: 'NAV' },
  { name: 'PaginationContent', component: pagination.PaginationContent, tag: 'UL' },
  { name: 'PaginationItem', component: pagination.PaginationItem, tag: 'LI' },
  { name: 'PopoverHeader', component: popover.PopoverHeader, tag: 'DIV' },
  { name: 'SheetHeader', component: sheet.SheetHeader, tag: 'DIV' },
  { name: 'SheetFooter', component: sheet.SheetFooter, tag: 'DIV' },
  { name: 'ToastTitle', component: toast.ToastTitle, tag: 'H3' },
  { name: 'ToastDescription', component: toast.ToastDescription, tag: 'DIV' },
  { name: 'ToastAction', component: toast.ToastAction, tag: 'BUTTON' },
];
test.each(wrappers)(
  '$name retains its native ref target, attributes and events',
  ({ component: Component, tag }) => {
    const ref = React.createRef<HTMLElement>();
    let clicks = 0;
    const view = render(
      React.createElement(
        Component,
        { ref, 'data-testid': 'wrapper', className: 'custom-wrapper', onClick: () => clicks++ },
        'Content',
      ),
    );
    const element = view.getByTestId('wrapper');
    expect(ref.current).toBe(element);
    expect(element.tagName).toBe(tag);
    expect(element.classList.contains('custom-wrapper')).toBe(true);
    fireEvent.click(element);
    expect(clicks).toBe(1);
    let attached: HTMLElement | null = null;
    let released = false;
    const callbackRef = (node: HTMLElement | null) => {
      attached = node;
      return () => {
        released = true;
      };
    };
    view.rerender(
      React.createElement(Component, { ref: callbackRef, 'data-testid': 'wrapper' }, 'Updated'),
    );
    expect(ref.current).toBeNull();
    expect(attached).toBe(element);
    expect(element.textContent).toContain('Updated');
    view.unmount();
    expect(released).toBe(true);
  },
);
