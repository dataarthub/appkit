'use client';

import * as React from 'react';
import { AlertDialog as AlertDialogPrimitive } from '@base-ui/react/alert-dialog';

import { cn } from '../../lib/utils';
import { Button } from '../../components/ui/button';

/**
 * Coordinates an alert dialog that requests an explicit user decision.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered AlertDialog composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Keep popup, trigger and close controls under AlertDialog. Content supplies its own portal/backdrop; separate Portal/Overlay exports are for custom compositions. Base UI owns dialog state and focus. The host owns action effects.
 * @example
 * ```tsx
 * import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<AlertDialog><AlertDialogTrigger>Review</AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Apply changes?</AlertDialogTitle><AlertDialogDescription>Review your changes before applying them.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => console.log("Apply requested")}>Apply</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>);
 * }
 * ```
 */
const AlertDialog = (props: AlertDialogPrimitive.Root.Props) => (
  <AlertDialogPrimitive.Root data-slot='alert-dialog' {...props} />
);
AlertDialog.displayName = 'AlertDialog';

/**
 * Renders the control that requests opening its alert dialog.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered AlertDialogTrigger composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Keep popup, trigger and close controls under AlertDialog. Content supplies its own portal/backdrop; separate Portal/Overlay exports are for custom compositions. Base UI owns dialog state and focus. The host owns action effects.
 * @example
 * ```tsx
 * import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<AlertDialog><AlertDialogTrigger>Review</AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Apply changes?</AlertDialogTitle><AlertDialogDescription>Review your changes before applying them.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => console.log("Apply requested")}>Apply</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>);
 * }
 * ```
 */
function AlertDialogTrigger({
  children,
  ...props
}: AlertDialogPrimitive.Trigger.Props) {
  return (
    <AlertDialogPrimitive.Trigger
      data-slot='alert-dialog-trigger'
      {...props}
    >
      {children}
    </AlertDialogPrimitive.Trigger>
  );
}
AlertDialogTrigger.displayName = 'AlertDialogTrigger';

/**
 * Mounts alert-dialog descendants into the Base UI portal target.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered AlertDialogPortal composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Keep popup, trigger and close controls under AlertDialog. Content supplies its own portal/backdrop; separate Portal/Overlay exports are for custom compositions. Base UI owns dialog state and focus. The host owns action effects. The ref prop forwards to the rendered control or container declared by the component ref type.
 * @example
 * ```tsx
 * import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<AlertDialog><AlertDialogTrigger>Review</AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Apply changes?</AlertDialogTitle><AlertDialogDescription>Review your changes before applying them.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => console.log("Apply requested")}>Apply</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>);
 * }
 * ```
 */
const AlertDialogPortal = React.forwardRef<HTMLDivElement, AlertDialogPrimitive.Portal.Props>(
  ({ ...props }, ref) => (
    <AlertDialogPrimitive.Portal ref={ref} data-slot='alert-dialog-portal' {...props} />
  ),
);
AlertDialogPortal.displayName = 'AlertDialogPortal';

/**
 * Renders the fixed backdrop for an alert dialog.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered AlertDialogOverlay composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Keep popup, trigger and close controls under AlertDialog. Content supplies its own portal/backdrop; separate Portal/Overlay exports are for custom compositions. Base UI owns dialog state and focus. The host owns action effects. The ref prop forwards to the rendered control or container declared by the component ref type.
 * @example
 * ```tsx
 * import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<AlertDialog><AlertDialogTrigger>Review</AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Apply changes?</AlertDialogTitle><AlertDialogDescription>Review your changes before applying them.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => console.log("Apply requested")}>Apply</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>);
 * }
 * ```
 */
const AlertDialogOverlay = React.forwardRef<HTMLDivElement, AlertDialogPrimitive.Backdrop.Props>(
  ({ className, ...props }, ref) => (
    <AlertDialogPrimitive.Backdrop
      ref={ref}
      data-slot='alert-dialog-overlay'
      className={cn(
        'data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 bg-black/10 duration-100 supports-backdrop-filter:backdrop-blur-xs fixed inset-0 isolate z-50',
        className,
      )}
      {...props}
    />
  ),
);
AlertDialogOverlay.displayName = 'AlertDialogOverlay';

/**
 * Portals an alert popup with its backdrop and default or small sizing.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling. Wrapper defaults: size='default'.
 * @returns The rendered AlertDialogContent composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Keep popup, trigger and close controls under AlertDialog. Content supplies its own portal/backdrop; separate Portal/Overlay exports are for custom compositions. Base UI owns dialog state and focus. The host owns action effects. The ref prop forwards to the rendered control or container declared by the component ref type.
 * @example
 * ```tsx
 * import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<AlertDialog><AlertDialogTrigger>Review</AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Apply changes?</AlertDialogTitle><AlertDialogDescription>Review your changes before applying them.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => console.log("Apply requested")}>Apply</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>);
 * }
 * ```
 */
const AlertDialogContent = React.forwardRef<
  HTMLDivElement,
  AlertDialogPrimitive.Popup.Props & { /**
 * Visual size preset; defaults to default unless the owning component states otherwise.
 */
  /**
   * Visual size preset; defaults to default unless the owning component states otherwise.
   */
  size?: 'default' | 'sm' }
>(({ className, size = 'default', children, ...props }, ref) => (
  <AlertDialogPortal>
    <AlertDialogOverlay />
    <AlertDialogPrimitive.Popup
      ref={ref}
      data-slot='alert-dialog-content'
      data-size={size}
      className={cn(
        'data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 bg-background ring-foreground/10 gap-4 rounded-xl p-4 ring-1 duration-100 data-[size=default]:max-w-xs data-[size=sm]:max-w-xs data-[size=default]:sm:max-w-sm group/alert-dialog-content fixed top-1/2 left-1/2 z-50 grid w-full -translate-x-1/2 -translate-y-1/2 outline-none',
        className,
      )}
      {...props}
    >
      {children}
    </AlertDialogPrimitive.Popup>
  </AlertDialogPortal>
));
AlertDialogContent.displayName = 'AlertDialogContent';

/**
 * Groups alert-dialog heading, description and optional media.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered AlertDialogHeader composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Keep popup, trigger and close controls under AlertDialog. Content supplies its own portal/backdrop; separate Portal/Overlay exports are for custom compositions. Base UI owns dialog state and focus. The host owns action effects. The ref prop forwards to the rendered control or container declared by the component ref type.
 * @example
 * ```tsx
 * import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<AlertDialog><AlertDialogTrigger>Review</AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Apply changes?</AlertDialogTitle><AlertDialogDescription>Review your changes before applying them.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => console.log("Apply requested")}>Apply</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>);
 * }
 * ```
 */
const AlertDialogHeader = React.forwardRef<HTMLDivElement, React.ComponentProps<'div'>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-slot='alert-dialog-header'
      className={cn(
        'grid grid-rows-[auto_1fr] place-items-center gap-1.5 text-center has-data-[slot=alert-dialog-media]:grid-rows-[auto_auto_1fr] has-data-[slot=alert-dialog-media]:gap-x-4 sm:group-data-[size=default]/alert-dialog-content:place-items-start sm:group-data-[size=default]/alert-dialog-content:text-left sm:group-data-[size=default]/alert-dialog-content:has-data-[slot=alert-dialog-media]:grid-rows-[auto_1fr]',
        className,
      )}
      {...props}
    />
  ),
);
AlertDialogHeader.displayName = 'AlertDialogHeader';

/**
 * Lays out alert-dialog decision controls at the popup footer.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered AlertDialogFooter composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Keep popup, trigger and close controls under AlertDialog. Content supplies its own portal/backdrop; separate Portal/Overlay exports are for custom compositions. Base UI owns dialog state and focus. The host owns action effects. The ref prop forwards to the rendered control or container declared by the component ref type.
 * @example
 * ```tsx
 * import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<AlertDialog><AlertDialogTrigger>Review</AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Apply changes?</AlertDialogTitle><AlertDialogDescription>Review your changes before applying them.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => console.log("Apply requested")}>Apply</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>);
 * }
 * ```
 */
const AlertDialogFooter = React.forwardRef<HTMLDivElement, React.ComponentProps<'div'>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-slot='alert-dialog-footer'
      className={cn(
        'bg-muted/50 -mx-4 -mb-4 rounded-b-xl border-t p-4 flex flex-col-reverse gap-2 group-data-[size=sm]/alert-dialog-content:grid group-data-[size=sm]/alert-dialog-content:grid-cols-2 sm:flex-row sm:justify-end',
        className,
      )}
      {...props}
    />
  ),
);
AlertDialogFooter.displayName = 'AlertDialogFooter';

/**
 * Styles an icon or illustration placed in the alert-dialog header.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered AlertDialogMedia composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Keep popup, trigger and close controls under AlertDialog. Content supplies its own portal/backdrop; separate Portal/Overlay exports are for custom compositions. Base UI owns dialog state and focus. The host owns action effects. The ref prop forwards to the rendered control or container declared by the component ref type.
 * @example
 * ```tsx
 * import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<AlertDialog><AlertDialogTrigger>Review</AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Apply changes?</AlertDialogTitle><AlertDialogDescription>Review your changes before applying them.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => console.log("Apply requested")}>Apply</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>);
 * }
 * ```
 */
const AlertDialogMedia = React.forwardRef<HTMLDivElement, React.ComponentProps<'div'>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-slot='alert-dialog-media'
      className={cn(
        "bg-muted mb-2 inline-flex size-10 items-center justify-center rounded-md sm:group-data-[size=default]/alert-dialog-content:row-span-2 *:[svg:not([class*='size-'])]:size-6",
        className,
      )}
      {...props}
    />
  ),
);
AlertDialogMedia.displayName = 'AlertDialogMedia';

/**
 * Provides the accessible heading for its alert popup.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered AlertDialogTitle composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Keep popup, trigger and close controls under AlertDialog. Content supplies its own portal/backdrop; separate Portal/Overlay exports are for custom compositions. Base UI owns dialog state and focus. The host owns action effects. The ref prop forwards to the rendered control or container declared by the component ref type.
 * @example
 * ```tsx
 * import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<AlertDialog><AlertDialogTrigger>Review</AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Apply changes?</AlertDialogTitle><AlertDialogDescription>Review your changes before applying them.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => console.log("Apply requested")}>Apply</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>);
 * }
 * ```
 */
const AlertDialogTitle = React.forwardRef<HTMLHeadingElement, AlertDialogPrimitive.Title.Props>(
  ({ className, ...props }, ref) => (
    <AlertDialogPrimitive.Title
      ref={ref}
      data-slot='alert-dialog-title'
      className={cn(
        'text-sm font-medium sm:group-data-[size=default]/alert-dialog-content:group-has-data-[slot=alert-dialog-media]/alert-dialog-content:col-start-2',
        className,
      )}
      {...props}
    />
  ),
);
AlertDialogTitle.displayName = 'AlertDialogTitle';

/**
 * Provides the accessible explanatory text for its alert popup.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered AlertDialogDescription composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Keep popup, trigger and close controls under AlertDialog. Content supplies its own portal/backdrop; separate Portal/Overlay exports are for custom compositions. Base UI owns dialog state and focus. The host owns action effects. The ref prop forwards to the rendered control or container declared by the component ref type.
 * @example
 * ```tsx
 * import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<AlertDialog><AlertDialogTrigger>Review</AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Apply changes?</AlertDialogTitle><AlertDialogDescription>Review your changes before applying them.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => console.log("Apply requested")}>Apply</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>);
 * }
 * ```
 */
const AlertDialogDescription = React.forwardRef<
  HTMLParagraphElement,
  AlertDialogPrimitive.Description.Props
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Description
    ref={ref}
    data-slot='alert-dialog-description'
    className={cn(
      'text-muted-foreground *:[a]:hover:text-foreground text-sm text-balance md:text-pretty *:[a]:underline *:[a]:underline-offset-3',
      className,
    )}
    {...props}
  />
));
AlertDialogDescription.displayName = 'AlertDialogDescription';

/**
 * Renders an Appkit button for a host-owned alert-dialog action.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling.
 * @returns The rendered AlertDialogAction composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Keep popup, trigger and close controls under AlertDialog. Content supplies its own portal/backdrop; separate Portal/Overlay exports are for custom compositions. Base UI owns dialog state and focus. The host owns action effects. The ref prop forwards to the rendered control or container declared by the component ref type. This is a Button wrapper, not a Base UI close primitive; clicking it does not automatically close the dialog.
 * @example
 * ```tsx
 * import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<AlertDialog><AlertDialogTrigger>Review</AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Apply changes?</AlertDialogTitle><AlertDialogDescription>Review your changes before applying them.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => console.log("Apply requested")}>Apply</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>);
 * }
 * ```
 */
const AlertDialogAction = React.forwardRef<HTMLButtonElement, React.ComponentProps<typeof Button>>(
  ({ className, ...props }, ref) => (
    <Button ref={ref} data-slot='alert-dialog-action' className={cn(className)} {...props} />
  ),
);
AlertDialogAction.displayName = 'AlertDialogAction';

/**
 * Renders a close control styled as an outline button.
 * @param props - Component attributes and children accepted by the declared Base UI or native prop type; className customizes wrapper styling. Wrapper defaults: variant='outline', size='default'.
 * @returns The rendered AlertDialogCancel composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Keep popup, trigger and close controls under AlertDialog. Content supplies its own portal/backdrop; separate Portal/Overlay exports are for custom compositions. Base UI owns dialog state and focus. The host owns action effects. The ref prop forwards to the rendered control or container declared by the component ref type. variant defaults to outline and size to default; the Base UI Close primitive is rendered through Button.
 * @example
 * ```tsx
 * import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<AlertDialog><AlertDialogTrigger>Review</AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Apply changes?</AlertDialogTitle><AlertDialogDescription>Review your changes before applying them.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => console.log("Apply requested")}>Apply</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>);
 * }
 * ```
 */
const AlertDialogCancel = React.forwardRef<
  HTMLButtonElement,
  AlertDialogPrimitive.Close.Props & Pick<React.ComponentProps<typeof Button>, 'variant' | 'size'>
>(({ className, variant = 'outline', size = 'default', ...props }, ref) => (
  <AlertDialogPrimitive.Close
    ref={ref}
    data-slot='alert-dialog-cancel'
    className={cn(className)}
    render={<Button variant={variant} size={size} />}
    {...props}
  />
));
AlertDialogCancel.displayName = 'AlertDialogCancel';

export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogTitle,
  AlertDialogTrigger,
};
