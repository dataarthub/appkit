import { forwardRef, type ComponentPropsWithoutRef, type ComponentRef } from 'react';
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';

import { cn } from '../../lib/utils';
import { Button } from './button';

/**
 * Renders the navigation landmark containing host-managed page controls.
 * @param props - Component attributes and children accepted by the declared native/underlying prop type; className customizes wrapper styling.
 * @returns The rendered Pagination composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. The host owns page state, destinations, loading and boundary disabling. Previous/Next are Buttons rather than anchors; use onClick or Base UI render composition. isActive defaults to false/absent and only adds aria-current and styling. Ellipsis is hidden from assistive technology. The ref prop forwards to the rendered control or container declared by the component ref type.
 * @example
 * ```tsx
 * import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationPrevious, PaginationNext, PaginationEllipsis } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Pagination><PaginationContent><PaginationItem><PaginationPrevious onClick={() => console.log("Previous requested")} /></PaginationItem><PaginationItem><PaginationLink href="?page=1" isActive>1</PaginationLink></PaginationItem><PaginationItem><PaginationEllipsis /></PaginationItem><PaginationItem><PaginationNext onClick={() => console.log("Next requested")} /></PaginationItem></PaginationContent></Pagination>);
 * }
 * ```
 */
const Pagination = forwardRef<ComponentRef<'nav'>, ComponentPropsWithoutRef<'nav'>>(
  ({ className, ...props }, ref) => (
    <nav
      ref={ref}
      role='navigation'
      aria-label='pagination'
      className={cn('mx-auto flex w-full justify-center', className)}
      {...props}
    />
  ),
);
Pagination.displayName = 'Pagination';

/**
 * Lays out pagination items in a horizontal unordered list.
 * @param props - Component attributes and children accepted by the declared native/underlying prop type; className customizes wrapper styling.
 * @returns The rendered PaginationContent composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. The host owns page state, destinations, loading and boundary disabling. Previous/Next are Buttons rather than anchors; use onClick or Base UI render composition. isActive defaults to false/absent and only adds aria-current and styling. Ellipsis is hidden from assistive technology. The ref prop forwards to the rendered control or container declared by the component ref type.
 * @example
 * ```tsx
 * import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationPrevious, PaginationNext, PaginationEllipsis } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Pagination><PaginationContent><PaginationItem><PaginationPrevious onClick={() => console.log("Previous requested")} /></PaginationItem><PaginationItem><PaginationLink href="?page=1" isActive>1</PaginationLink></PaginationItem><PaginationItem><PaginationEllipsis /></PaginationItem><PaginationItem><PaginationNext onClick={() => console.log("Next requested")} /></PaginationItem></PaginationContent></Pagination>);
 * }
 * ```
 */
const PaginationContent = forwardRef<ComponentRef<'ul'>, ComponentPropsWithoutRef<'ul'>>(
  ({ className, ...props }, ref) => (
    <ul ref={ref} className={cn('flex flex-row items-center gap-1', className)} {...props} />
  ),
);
PaginationContent.displayName = 'PaginationContent';

/**
 * Renders one pagination list item.
 * @param props - Component attributes and children accepted by the declared native/underlying prop type; className customizes wrapper styling.
 * @returns The rendered PaginationItem composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. The host owns page state, destinations, loading and boundary disabling. Previous/Next are Buttons rather than anchors; use onClick or Base UI render composition. isActive defaults to false/absent and only adds aria-current and styling. Ellipsis is hidden from assistive technology. The ref prop forwards to the rendered control or container declared by the component ref type.
 * @example
 * ```tsx
 * import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationPrevious, PaginationNext, PaginationEllipsis } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Pagination><PaginationContent><PaginationItem><PaginationPrevious onClick={() => console.log("Previous requested")} /></PaginationItem><PaginationItem><PaginationLink href="?page=1" isActive>1</PaginationLink></PaginationItem><PaginationItem><PaginationEllipsis /></PaginationItem><PaginationItem><PaginationNext onClick={() => console.log("Next requested")} /></PaginationItem></PaginationContent></Pagination>);
 * }
 * ```
 */
const PaginationItem = forwardRef<ComponentRef<'li'>, ComponentPropsWithoutRef<'li'>>(
  ({ className, ...props }, ref) => <li ref={ref} className={cn('', className)} {...props} />,
);
PaginationItem.displayName = 'PaginationItem';

/**
 * Native anchor attributes and current-page styling for PaginationLink.
 * @remarks Inherited native or primitive props keep their upstream types and behavior; this declaration documents only the wrapper-owned options.
 * @see PaginationLink
 */
type PaginationLinkProps = ComponentPropsWithoutRef<'a'> & {
  /**
   * Adds current-page styling and aria-current=page when true; absent means inactive.
   */
  isActive?: boolean;
};

/**
 * Renders a page anchor with optional current-page styling and aria-current.
 * @param props - Component attributes and children accepted by the declared native/underlying prop type; className customizes wrapper styling.
 * @returns The rendered PaginationLink composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. The host owns page state, destinations, loading and boundary disabling. Previous/Next are Buttons rather than anchors; use onClick or Base UI render composition. isActive defaults to false/absent and only adds aria-current and styling. Ellipsis is hidden from assistive technology.
 * @example
 * ```tsx
 * import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationPrevious, PaginationNext, PaginationEllipsis } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Pagination><PaginationContent><PaginationItem><PaginationPrevious onClick={() => console.log("Previous requested")} /></PaginationItem><PaginationItem><PaginationLink href="?page=1" isActive>1</PaginationLink></PaginationItem><PaginationItem><PaginationEllipsis /></PaginationItem><PaginationItem><PaginationNext onClick={() => console.log("Next requested")} /></PaginationItem></PaginationContent></Pagination>);
 * }
 * ```
 */
const PaginationLink = ({ className, isActive, ...props }: PaginationLinkProps) => (
  <a
    aria-current={isActive ? 'page' : undefined}
    className={cn(
      'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
      isActive || 'hover:bg-accent hover:text-accent-foreground',
      isActive && 'bg-accent text-accent-foreground',
      className,
    )}
    {...props}
  />
);
PaginationLink.displayName = 'PaginationLink';

/**
 * Renders a previous-page Button with a chevron and fixed English text.
 * @param props - Component attributes and children accepted by the declared native/underlying prop type; className customizes wrapper styling.
 * @returns The rendered PaginationPrevious composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. The host owns page state, destinations, loading and boundary disabling. Previous/Next are Buttons rather than anchors; use onClick or Base UI render composition. isActive defaults to false/absent and only adds aria-current and styling. Ellipsis is hidden from assistive technology. The ref prop forwards to the rendered control or container declared by the component ref type.  children are replaced by the fixed icon and English Previous/Next label.
 * @example
 * ```tsx
 * import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationPrevious, PaginationNext, PaginationEllipsis } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Pagination><PaginationContent><PaginationItem><PaginationPrevious onClick={() => console.log("Previous requested")} /></PaginationItem><PaginationItem><PaginationLink href="?page=1" isActive>1</PaginationLink></PaginationItem><PaginationItem><PaginationEllipsis /></PaginationItem><PaginationItem><PaginationNext onClick={() => console.log("Next requested")} /></PaginationItem></PaginationContent></Pagination>);
 * }
 * ```
 */
const PaginationPrevious = forwardRef<
  ComponentRef<typeof Button>,
  ComponentPropsWithoutRef<typeof Button>
>(({ className, ...props }, ref) => (
  <Button
    ref={ref}
    aria-label='Go to previous page'
    size='default'
    variant='ghost'
    className={cn('gap-1 pl-2.5', className)}
    {...props}
  >
    <ChevronLeft className='h-4 w-4' />
    <span>Previous</span>
  </Button>
));
PaginationPrevious.displayName = 'PaginationPrevious';

/**
 * Renders a next-page Button with a chevron and fixed English text.
 * @param props - Component attributes and children accepted by the declared native/underlying prop type; className customizes wrapper styling.
 * @returns The rendered PaginationNext composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. The host owns page state, destinations, loading and boundary disabling. Previous/Next are Buttons rather than anchors; use onClick or Base UI render composition. isActive defaults to false/absent and only adds aria-current and styling. Ellipsis is hidden from assistive technology. The ref prop forwards to the rendered control or container declared by the component ref type.  children are replaced by the fixed icon and English Previous/Next label.
 * @example
 * ```tsx
 * import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationPrevious, PaginationNext, PaginationEllipsis } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Pagination><PaginationContent><PaginationItem><PaginationPrevious onClick={() => console.log("Previous requested")} /></PaginationItem><PaginationItem><PaginationLink href="?page=1" isActive>1</PaginationLink></PaginationItem><PaginationItem><PaginationEllipsis /></PaginationItem><PaginationItem><PaginationNext onClick={() => console.log("Next requested")} /></PaginationItem></PaginationContent></Pagination>);
 * }
 * ```
 */
const PaginationNext = forwardRef<
  ComponentRef<typeof Button>,
  ComponentPropsWithoutRef<typeof Button>
>(({ className, ...props }, ref) => (
  <Button
    ref={ref}
    aria-label='Go to next page'
    size='default'
    variant='ghost'
    className={cn('gap-1 pr-2.5', className)}
    {...props}
  >
    <span>Next</span>
    <ChevronRight className='h-4 w-4' />
  </Button>
));
PaginationNext.displayName = 'PaginationNext';

/**
 * Renders a decorative omitted-pages marker.
 * @param props - Component attributes and children accepted by the declared native/underlying prop type; className customizes wrapper styling.
 * @returns The rendered PaginationEllipsis composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. The host owns page state, destinations, loading and boundary disabling. Previous/Next are Buttons rather than anchors; use onClick or Base UI render composition. isActive defaults to false/absent and only adds aria-current and styling. Ellipsis is hidden from assistive technology.
 * @example
 * ```tsx
 * import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationPrevious, PaginationNext, PaginationEllipsis } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Pagination><PaginationContent><PaginationItem><PaginationPrevious onClick={() => console.log("Previous requested")} /></PaginationItem><PaginationItem><PaginationLink href="?page=1" isActive>1</PaginationLink></PaginationItem><PaginationItem><PaginationEllipsis /></PaginationItem><PaginationItem><PaginationNext onClick={() => console.log("Next requested")} /></PaginationItem></PaginationContent></Pagination>);
 * }
 * ```
 */
const PaginationEllipsis = ({ className, ...props }: ComponentPropsWithoutRef<'span'>) => (
  <span
    aria-hidden
    className={cn('flex h-9 w-9 items-center justify-center', className)}
    {...props}
  >
    <MoreHorizontal className='h-4 w-4' />
    <span className='sr-only'>More pages</span>
  </span>
);
PaginationEllipsis.displayName = 'PaginationEllipsis';

export {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
};
