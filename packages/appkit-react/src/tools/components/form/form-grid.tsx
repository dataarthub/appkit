import * as React from 'react';
import { cn } from "../../lib/utils";
import type { FieldWidth } from "../../lib/schema";

/**
 * フィールド幅に対応するグリッドスパン
 * - short: 1列 (最小幅)
 * - medium: 1列 (デフォルト)
 * - long: 2列にスパン
 * - full: 全列にスパン
 */
const widthToSpan: Record<FieldWidth, string> = {
  short: 'col-span-1',
  medium: 'col-span-1',
  long: 'md:col-span-2',
  full: 'col-span-full',
};

/**
 * Supported maximum column counts for {@link FormGrid}; smaller screens use fewer columns.
 */
export type GridColumns = 1 | 2 | 3;

/**
 * Grid layout options and native div attributes for {@link FormGrid}.
 */
export interface FormGridProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Maximum columns: 1 always; 2 from md; 3 from lg (two from md).
   * @defaultValue 2
   */
  columns?: GridColumns;
  /**
   * Responsive gap preset: sm uses gap-3, md uses gap-4/md:gap-6, lg uses gap-6/md:gap-8.
   * @defaultValue "md"
   */
  gap?: 'sm' | 'md' | 'lg';
}

const gapClasses = {
  sm: 'gap-3',
  md: 'gap-4 md:gap-6',
  lg: 'gap-6 md:gap-8',
};

const columnClasses = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 md:grid-cols-2',
  3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
};

/**
 * Renders a responsive form layout with configurable column and gap presets.
 * @param props - Grid settings and native div attributes, including children; see {@link FormGridProps}.
 * @returns A div containing the supplied children; fields and labels are owned by the caller.
 * @remarks The ref prop forwards to the rendered div. Import Appkit CSS. Pair controls with explicit labels; Input and Textarea do not accept a label prop.
 * @example
 * ```tsx
 * import { FormGrid, FormGridItem } from '@alneas/appkit-react/tools/form';
 * import { Input, Textarea } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function AddressFields() {
 *   return <FormGrid columns={2} gap="md">
 *     <FormGridItem width="short"><label htmlFor="postal-code">Postal code</label>
 *       <Input id="postal-code" /></FormGridItem>
 *     <FormGridItem width="full"><label htmlFor="notes">Notes</label>
 *       <Textarea id="notes" /></FormGridItem>
 *   </FormGrid>;
 * }
 * ```
 */
export const FormGrid = React.forwardRef<HTMLDivElement, FormGridProps>(
  ({ className, columns = 2, gap = 'md', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('grid', columnClasses[columns], gapClasses[gap], className)}
        {...props}
      >
        {children}
      </div>
    );
  },
);
FormGrid.displayName = 'FormGrid';

/**
 * Width hints and native div attributes for {@link FormGridItem}.
 */
export interface FormGridItemProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Span hint: short/medium use one column, long spans two from md, full spans all columns.
   * @defaultValue "medium"
   */
  width?: FieldWidth;
}

/**
 * Applies a field-width span hint to one child of {@link FormGrid}.
 * @param props - Width (default medium), children and native div attributes; see {@link FormGridItemProps}.
 * @returns A div with responsive span classes wrapping the supplied children.
 * @remarks The ref prop forwards to the rendered div. Import Appkit CSS. A long item can create implicit columns in a one-column grid at md;
 * choose width hints consistent with the parent grid. See the FormGrid example for labeled controls.
 * @example
 * ```tsx
 * import { FormGrid, FormGridItem } from '@alneas/appkit-react/tools/form';
 * import '@alneas/appkit-react/styles';
 * export function FullWidthContent() {
 *   return <FormGrid><FormGridItem width="full">Additional details</FormGridItem></FormGrid>;
 * }
 * ```
 */
export const FormGridItem = React.forwardRef<HTMLDivElement, FormGridItemProps>(
  ({ className, width = 'medium', children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn(widthToSpan[width], className)} {...props}>
        {children}
      </div>
    );
  },
);
FormGridItem.displayName = 'FormGridItem';
