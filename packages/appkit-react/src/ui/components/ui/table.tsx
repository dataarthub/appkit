import * as React from 'react';

import { cn } from '../../lib/utils';

/**
 * Wraps a native table in a horizontal overflow container.
 * @param props - Component attributes and children accepted by the declared native/underlying prop type; className customizes wrapper styling.
 * @returns The rendered Table composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Use valid native table nesting. Table className/props/ref target the table, not its outer overflow div. These wrappers do not sort, paginate or manage selection; data-state=selected affects only row styling. The ref prop forwards to the rendered control or container declared by the component ref type.
 * @example
 * ```tsx
 * import { Table, TableHeader, TableBody, TableFooter, TableRow, TableHead, TableCell, TableCaption } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Table><TableCaption>Documents</TableCaption><TableHeader><TableRow><TableHead scope="col">Title</TableHead></TableRow></TableHeader><TableBody><TableRow><TableCell>Draft</TableCell></TableRow></TableBody><TableFooter><TableRow><TableCell>1 document</TableCell></TableRow></TableFooter></Table>);
 * }
 * ```
 */
const Table = React.forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => (
    <div data-slot='table-container' className='relative w-full overflow-x-auto'>
      <table
        ref={ref}
        data-slot='table'
        className={cn('w-full caption-bottom text-sm', className)}
        {...props}
      />
    </div>
  ),
);
Table.displayName = 'Table';

/**
 * Renders the native table header section with row borders.
 * @param props - Component attributes and children accepted by the declared native/underlying prop type; className customizes wrapper styling.
 * @returns The rendered TableHeader composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Use valid native table nesting. Table className/props/ref target the table, not its outer overflow div. These wrappers do not sort, paginate or manage selection; data-state=selected affects only row styling. The ref prop forwards to the rendered control or container declared by the component ref type.
 * @example
 * ```tsx
 * import { Table, TableHeader, TableBody, TableFooter, TableRow, TableHead, TableCell, TableCaption } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Table><TableCaption>Documents</TableCaption><TableHeader><TableRow><TableHead scope="col">Title</TableHead></TableRow></TableHeader><TableBody><TableRow><TableCell>Draft</TableCell></TableRow></TableBody><TableFooter><TableRow><TableCell>1 document</TableCell></TableRow></TableFooter></Table>);
 * }
 * ```
 */
const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead
    ref={ref}
    data-slot='table-header'
    className={cn('[&_tr]:border-b', className)}
    {...props}
  />
));
TableHeader.displayName = 'TableHeader';

/**
 * Renders the native table body section.
 * @param props - Component attributes and children accepted by the declared native/underlying prop type; className customizes wrapper styling.
 * @returns The rendered TableBody composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Use valid native table nesting. Table className/props/ref target the table, not its outer overflow div. These wrappers do not sort, paginate or manage selection; data-state=selected affects only row styling. The ref prop forwards to the rendered control or container declared by the component ref type.
 * @example
 * ```tsx
 * import { Table, TableHeader, TableBody, TableFooter, TableRow, TableHead, TableCell, TableCaption } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Table><TableCaption>Documents</TableCaption><TableHeader><TableRow><TableHead scope="col">Title</TableHead></TableRow></TableHeader><TableBody><TableRow><TableCell>Draft</TableCell></TableRow></TableBody><TableFooter><TableRow><TableCell>1 document</TableCell></TableRow></TableFooter></Table>);
 * }
 * ```
 */
const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    data-slot='table-body'
    className={cn('[&_tr:last-child]:border-0', className)}
    {...props}
  />
));
TableBody.displayName = 'TableBody';

/**
 * Renders the native table footer section with muted styling.
 * @param props - Component attributes and children accepted by the declared native/underlying prop type; className customizes wrapper styling.
 * @returns The rendered TableFooter composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Use valid native table nesting. Table className/props/ref target the table, not its outer overflow div. These wrappers do not sort, paginate or manage selection; data-state=selected affects only row styling. The ref prop forwards to the rendered control or container declared by the component ref type.
 * @example
 * ```tsx
 * import { Table, TableHeader, TableBody, TableFooter, TableRow, TableHead, TableCell, TableCaption } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Table><TableCaption>Documents</TableCaption><TableHeader><TableRow><TableHead scope="col">Title</TableHead></TableRow></TableHeader><TableBody><TableRow><TableCell>Draft</TableCell></TableRow></TableBody><TableFooter><TableRow><TableCell>1 document</TableCell></TableRow></TableFooter></Table>);
 * }
 * ```
 */
const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    data-slot='table-footer'
    className={cn('bg-muted/50 border-t font-medium [&>tr]:last:border-b-0', className)}
    {...props}
  />
));
TableFooter.displayName = 'TableFooter';

/**
 * Renders a native table row with hover and optional selected-state styling.
 * @param props - Component attributes and children accepted by the declared native/underlying prop type; className customizes wrapper styling.
 * @returns The rendered TableRow composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Use valid native table nesting. Table className/props/ref target the table, not its outer overflow div. These wrappers do not sort, paginate or manage selection; data-state=selected affects only row styling. The ref prop forwards to the rendered control or container declared by the component ref type.
 * @example
 * ```tsx
 * import { Table, TableHeader, TableBody, TableFooter, TableRow, TableHead, TableCell, TableCaption } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Table><TableCaption>Documents</TableCaption><TableHeader><TableRow><TableHead scope="col">Title</TableHead></TableRow></TableHeader><TableBody><TableRow><TableCell>Draft</TableCell></TableRow></TableBody><TableFooter><TableRow><TableCell>1 document</TableCell></TableRow></TableFooter></Table>);
 * }
 * ```
 */
const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => (
    <tr
      ref={ref}
      data-slot='table-row'
      className={cn(
        'hover:bg-muted/50 data-[state=selected]:bg-muted border-b transition-colors',
        className,
      )}
      {...props}
    />
  ),
);
TableRow.displayName = 'TableRow';

/**
 * Renders a native table heading cell.
 * @param props - Component attributes and children accepted by the declared native/underlying prop type; className customizes wrapper styling.
 * @returns The rendered TableHead composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Use valid native table nesting. Table className/props/ref target the table, not its outer overflow div. These wrappers do not sort, paginate or manage selection; data-state=selected affects only row styling. The ref prop forwards to the rendered control or container declared by the component ref type.
 * @example
 * ```tsx
 * import { Table, TableHeader, TableBody, TableFooter, TableRow, TableHead, TableCell, TableCaption } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Table><TableCaption>Documents</TableCaption><TableHeader><TableRow><TableHead scope="col">Title</TableHead></TableRow></TableHeader><TableBody><TableRow><TableCell>Draft</TableCell></TableRow></TableBody><TableFooter><TableRow><TableCell>1 document</TableCell></TableRow></TableFooter></Table>);
 * }
 * ```
 */
const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    data-slot='table-head'
    className={cn(
      'text-foreground h-10 px-2 text-left align-middle font-medium whitespace-nowrap [&:has([role=checkbox])]:pr-0 dark:bg-secondary dark:text-secondary-foreground bg-muted/30',
      className,
    )}
    {...props}
  />
));
TableHead.displayName = 'TableHead';

/**
 * Renders a native table data cell.
 * @param props - Component attributes and children accepted by the declared native/underlying prop type; className customizes wrapper styling.
 * @returns The rendered TableCell composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Use valid native table nesting. Table className/props/ref target the table, not its outer overflow div. These wrappers do not sort, paginate or manage selection; data-state=selected affects only row styling. The ref prop forwards to the rendered control or container declared by the component ref type.
 * @example
 * ```tsx
 * import { Table, TableHeader, TableBody, TableFooter, TableRow, TableHead, TableCell, TableCaption } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Table><TableCaption>Documents</TableCaption><TableHeader><TableRow><TableHead scope="col">Title</TableHead></TableRow></TableHeader><TableBody><TableRow><TableCell>Draft</TableCell></TableRow></TableBody><TableFooter><TableRow><TableCell>1 document</TableCell></TableRow></TableFooter></Table>);
 * }
 * ```
 */
const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    data-slot='table-cell'
    className={cn('p-2 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0', className)}
    {...props}
  />
));
TableCell.displayName = 'TableCell';

/**
 * Renders the native table caption below the table content.
 * @param props - Component attributes and children accepted by the declared native/underlying prop type; className customizes wrapper styling.
 * @returns The rendered TableCaption composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Use valid native table nesting. Table className/props/ref target the table, not its outer overflow div. These wrappers do not sort, paginate or manage selection; data-state=selected affects only row styling. The ref prop forwards to the rendered control or container declared by the component ref type.
 * @example
 * ```tsx
 * import { Table, TableHeader, TableBody, TableFooter, TableRow, TableHead, TableCell, TableCaption } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Table><TableCaption>Documents</TableCaption><TableHeader><TableRow><TableHead scope="col">Title</TableHead></TableRow></TableHeader><TableBody><TableRow><TableCell>Draft</TableCell></TableRow></TableBody><TableFooter><TableRow><TableCell>1 document</TableCell></TableRow></TableFooter></Table>);
 * }
 * ```
 */
const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    data-slot='table-caption'
    className={cn('text-muted-foreground mt-4 text-sm', className)}
    {...props}
  />
));
TableCaption.displayName = 'TableCaption';

export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption };
