import * as React from 'react';
import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import { ChevronRight, MoreHorizontal } from 'lucide-react';

import { cn } from '../../lib/utils';

/**
 * Renders a breadcrumb navigation landmark labeled breadcrumb by default.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered Breadcrumb composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. The host owns destinations and any overflow menu. Link uses Base UI render composition; custom render elements must accept merged anchor props. Separator and Ellipsis are hidden from assistive technology.
 * @example
 * ```tsx
 * import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator, BreadcrumbEllipsis } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Breadcrumb><BreadcrumbList><BreadcrumbItem><BreadcrumbLink href="/">Home</BreadcrumbLink></BreadcrumbItem><BreadcrumbSeparator /><BreadcrumbItem><BreadcrumbEllipsis /></BreadcrumbItem><BreadcrumbSeparator /><BreadcrumbItem><BreadcrumbPage>Project</BreadcrumbPage></BreadcrumbItem></BreadcrumbList></Breadcrumb>);
 * }
 * ```
 */
function Breadcrumb({ className, ...props }: React.ComponentProps<'nav'>) {
  return (
    <nav aria-label='breadcrumb' data-slot='breadcrumb' className={cn(className)} {...props} />
  );
}

/**
 * Renders an ordered list of breadcrumb levels.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered BreadcrumbList composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. The host owns destinations and any overflow menu. Link uses Base UI render composition; custom render elements must accept merged anchor props. Separator and Ellipsis are hidden from assistive technology.
 * @example
 * ```tsx
 * import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator, BreadcrumbEllipsis } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Breadcrumb><BreadcrumbList><BreadcrumbItem><BreadcrumbLink href="/">Home</BreadcrumbLink></BreadcrumbItem><BreadcrumbSeparator /><BreadcrumbItem><BreadcrumbEllipsis /></BreadcrumbItem><BreadcrumbSeparator /><BreadcrumbItem><BreadcrumbPage>Project</BreadcrumbPage></BreadcrumbItem></BreadcrumbList></Breadcrumb>);
 * }
 * ```
 */
function BreadcrumbList({ className, ...props }: React.ComponentProps<'ol'>) {
  return (
    <ol
      data-slot='breadcrumb-list'
      className={cn(
        'text-muted-foreground gap-1.5 text-sm flex flex-wrap items-center break-words',
        className,
      )}
      {...props}
    />
  );
}

/**
 * Renders one list item in a breadcrumb trail.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered BreadcrumbItem composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. The host owns destinations and any overflow menu. Link uses Base UI render composition; custom render elements must accept merged anchor props. Separator and Ellipsis are hidden from assistive technology.
 * @example
 * ```tsx
 * import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator, BreadcrumbEllipsis } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Breadcrumb><BreadcrumbList><BreadcrumbItem><BreadcrumbLink href="/">Home</BreadcrumbLink></BreadcrumbItem><BreadcrumbSeparator /><BreadcrumbItem><BreadcrumbEllipsis /></BreadcrumbItem><BreadcrumbSeparator /><BreadcrumbItem><BreadcrumbPage>Project</BreadcrumbPage></BreadcrumbItem></BreadcrumbList></Breadcrumb>);
 * }
 * ```
 */
function BreadcrumbItem({ className, ...props }: React.ComponentProps<'li'>) {
  return (
    <li
      data-slot='breadcrumb-item'
      className={cn('gap-1 inline-flex items-center', className)}
      {...props}
    />
  );
}

/**
 * Renders a breadcrumb anchor or a caller-supplied useRender element.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered BreadcrumbLink composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. The host owns destinations and any overflow menu. Link uses Base UI render composition; custom render elements must accept merged anchor props. Separator and Ellipsis are hidden from assistive technology.
 * @example
 * ```tsx
 * import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator, BreadcrumbEllipsis } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Breadcrumb><BreadcrumbList><BreadcrumbItem><BreadcrumbLink href="/">Home</BreadcrumbLink></BreadcrumbItem><BreadcrumbSeparator /><BreadcrumbItem><BreadcrumbEllipsis /></BreadcrumbItem><BreadcrumbSeparator /><BreadcrumbItem><BreadcrumbPage>Project</BreadcrumbPage></BreadcrumbItem></BreadcrumbList></Breadcrumb>);
 * }
 * ```
 */
function BreadcrumbLink({ className, render, ...props }: useRender.ComponentProps<'a'>) {
  return useRender({
    defaultTagName: 'a',
    props: mergeProps<'a'>(
      {
        className: cn('hover:text-foreground transition-colors', className),
      },
      props,
    ),
    render,
    state: {
      slot: 'breadcrumb-link',
    },
  });
}

/**
 * Marks the current breadcrumb as an aria-current page link without navigation.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered BreadcrumbPage composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. The host owns destinations and any overflow menu. Link uses Base UI render composition; custom render elements must accept merged anchor props. Separator and Ellipsis are hidden from assistive technology.
 * @example
 * ```tsx
 * import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator, BreadcrumbEllipsis } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Breadcrumb><BreadcrumbList><BreadcrumbItem><BreadcrumbLink href="/">Home</BreadcrumbLink></BreadcrumbItem><BreadcrumbSeparator /><BreadcrumbItem><BreadcrumbEllipsis /></BreadcrumbItem><BreadcrumbSeparator /><BreadcrumbItem><BreadcrumbPage>Project</BreadcrumbPage></BreadcrumbItem></BreadcrumbList></Breadcrumb>);
 * }
 * ```
 */
function BreadcrumbPage({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      data-slot='breadcrumb-page'
      role='link'
      aria-disabled='true'
      aria-current='page'
      className={cn('text-foreground font-normal', className)}
      {...props}
    />
  );
}

/**
 * Renders a presentation-only separator, defaulting to a right chevron.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered BreadcrumbSeparator composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. The host owns destinations and any overflow menu. Link uses Base UI render composition; custom render elements must accept merged anchor props. Separator and Ellipsis are hidden from assistive technology.
 * @example
 * ```tsx
 * import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator, BreadcrumbEllipsis } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Breadcrumb><BreadcrumbList><BreadcrumbItem><BreadcrumbLink href="/">Home</BreadcrumbLink></BreadcrumbItem><BreadcrumbSeparator /><BreadcrumbItem><BreadcrumbEllipsis /></BreadcrumbItem><BreadcrumbSeparator /><BreadcrumbItem><BreadcrumbPage>Project</BreadcrumbPage></BreadcrumbItem></BreadcrumbList></Breadcrumb>);
 * }
 * ```
 */
function BreadcrumbSeparator({ children, className, ...props }: React.ComponentProps<'li'>) {
  return (
    <li
      data-slot='breadcrumb-separator'
      role='presentation'
      aria-hidden='true'
      className={cn('[&>svg]:size-3.5', className)}
      {...props}
    >
      {children ?? <ChevronRight className='h-4 w-4' />}
    </li>
  );
}

/**
 * Renders a presentation-only overflow marker without expanding hidden items.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered BreadcrumbEllipsis composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. The host owns destinations and any overflow menu. Link uses Base UI render composition; custom render elements must accept merged anchor props. Separator and Ellipsis are hidden from assistive technology.  children are replaced by the overflow icon and hidden More text.
 * @example
 * ```tsx
 * import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator, BreadcrumbEllipsis } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Breadcrumb><BreadcrumbList><BreadcrumbItem><BreadcrumbLink href="/">Home</BreadcrumbLink></BreadcrumbItem><BreadcrumbSeparator /><BreadcrumbItem><BreadcrumbEllipsis /></BreadcrumbItem><BreadcrumbSeparator /><BreadcrumbItem><BreadcrumbPage>Project</BreadcrumbPage></BreadcrumbItem></BreadcrumbList></Breadcrumb>);
 * }
 * ```
 */
function BreadcrumbEllipsis({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      data-slot='breadcrumb-ellipsis'
      role='presentation'
      aria-hidden='true'
      className={cn('size-5 [&>svg]:size-4 flex items-center justify-center', className)}
      {...props}
    >
      <MoreHorizontal className='h-4 w-4' />
      <span className='sr-only'>More</span>
    </span>
  );
}

export {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
};
