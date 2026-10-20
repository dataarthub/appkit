'use client';

import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from './toast';
import { useToast } from '../../lib/hooks/use-toast';

/**
 * Renders notifications from the module-level Appkit toast store and supplies a Base UI provider/viewport.
 * @returns The rendered Toaster composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Mount one Toaster in the client application shell. It subscribes through useToast; it does not require an external ToastProvider or QueryClient. Notifications use the custom div-based Toast wrapper, not Base UI toast manager data. State is in-memory/module-scoped rather than durable or per-request; the host owns notification content. Mapped Toast divs are siblings of ToastViewport rather than children of it, so the viewport does not position those notification elements; provide host layout if needed.
 * @example
 * ```tsx
 * import { toast } from '@alneas/appkit-react/ui/hooks';
 * import { Toaster } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<><button onClick={() => toast({ title: "Draft ready", description: "Review your draft." })}>Notify</button><Toaster /></>);
 * }
 * ```
 */
export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} toast={{ id } as unknown as { id: string }} {...props}>
            <div className='grid gap-1'>
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && <ToastDescription>{description}</ToastDescription>}
            </div>
            {action}
            <ToastClose />
          </Toast>
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );
}
