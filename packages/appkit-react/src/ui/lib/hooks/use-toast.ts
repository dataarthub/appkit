import * as React from 'react';

const TOAST_LIMIT = 5;
const TOAST_REMOVE_DELAY = 5000;

/**
 * In-memory notification record read by a host renderer.
 *
 * @see useToast for subscription and display; see toast for creation.
 */
type ToasterToast = {
  /**
   * Generated decimal string identifier used for updates and dismissal.
   */
  id: string;
  /**
   * Optional heading content rendered by the host.
   */
  title?: React.ReactNode;
  /**
   * Optional body content rendered by the host.
   */
  description?: React.ReactNode;
  /**
   * Optional host-rendered action element.
   */
  action?: React.ReactNode;
  /**
   * Whether the host renderer should show this notification.
   */
  open?: boolean;
  /**
   * Optional host open-state callback; toast replaces it with dismissal handling.
   *
   * @param open - New host-rendered visibility.
   *
   * @returns No value.
   */
  onOpenChange?: (open: boolean) => void;
  /**
   * Presentation intent; default is normal styling, destructive indicates an error.
   */
  variant?: 'default' | 'destructive';
  /**
   * Requested host display duration in milliseconds; toast defaults to 3000 or 5000 for destructive.
   */
  duration?: number;
};

const _actionTypes = {
  ADD_TOAST: 'ADD_TOAST',
  UPDATE_TOAST: 'UPDATE_TOAST',
  DISMISS_TOAST: 'DISMISS_TOAST',
  REMOVE_TOAST: 'REMOVE_TOAST',
} as const;

let count = 0;

function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER;
  return count.toString();
}

type ActionType = typeof _actionTypes;

/**
 * Reducer message for adding, updating, closing or removing stored notifications.
 *
 * @see reducer for direct reduction; normal callers use toast/useToast.
 */
type Action =
  | {
      /** Insert a notification at the front and cap the list at five. */
      type: ActionType['ADD_TOAST'];
      /** Complete notification to insert. */
      toast: ToasterToast;
    }
  | {
      /** Merge fields into the matching notification ID. */
      type: ActionType['UPDATE_TOAST'];
      /** Fields to merge; id selects the existing notification. */
      toast: Partial<ToasterToast>;
    }
  | {
      /** Close matching notifications and queue removal after five seconds. */
      type: ActionType['DISMISS_TOAST'];
      /** Target ID; omission affects all notifications. */
      toastId?: ToasterToast['id'];
    }
  | {
      /** Remove matching notifications immediately. */
      type: ActionType['REMOVE_TOAST'];
      /** Target ID; omission affects all notifications. */
      toastId?: ToasterToast['id'];
    };

/**
 * Current module-global notification list exposed by useToast.
 *
 * @see useToast for subscription.
 */
interface State {
  /**
   * Newest-first notifications, capped at five when a notification is added.
   */
  toasts: ToasterToast[];
}

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

const addToRemoveQueue = (toastId: string) => {
  if (toastTimeouts.has(toastId)) {
    return;
  }

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId);
    dispatch({
      type: 'REMOVE_TOAST',
      toastId: toastId,
    });
  }, TOAST_REMOVE_DELAY);

  toastTimeouts.set(toastId, timeout);
};

/**
 * Reduces notification actions, scheduling delayed removal when notifications are dismissed.
 *
 * @param state - Existing newest-first notification list.
 *
 * @param action - Add/update/dismiss/remove instruction; omitted IDs in dismiss/remove affect all.
 *
 * @returns New list state; unrecognized update IDs leave entries unchanged.
 *
 * @remarks Dismissal closes entries and schedules module-global removal timers for 5000 ms,
 * so this reducer has a timer side effect. Adding truncates to five; duration does not
 * schedule dismissal here. Normal application code should use toast/useToast.
 *
 * @example
 * ```ts
 * import { reducer } from '@alneas/appkit-react/ui/hooks';
 * const state = reducer({ toasts: [] }, { type: 'REMOVE_TOAST' });
 * ```
 */
export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'ADD_TOAST':
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      };

    case 'UPDATE_TOAST':
      return {
        ...state,
        toasts: state.toasts.map((t) => (t.id === action.toast.id ? { ...t, ...action.toast } : t)),
      };

    case 'DISMISS_TOAST': {
      const { toastId } = action;

      if (toastId) {
        addToRemoveQueue(toastId);
      } else {
        state.toasts.forEach((toast) => {
          addToRemoveQueue(toast.id);
        });
      }

      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === undefined
            ? {
                ...t,
                open: false,
              }
            : t,
        ),
      };
    }
    case 'REMOVE_TOAST':
      if (action.toastId === undefined) {
        return {
          ...state,
          toasts: [],
        };
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      };
  }
};

const listeners: Array<(state: State) => void> = [];

let memoryState: State = { toasts: [] };

function dispatch(action: Action) {
  memoryState = reducer(memoryState, action);
  listeners.forEach((listener) => {
    listener(memoryState);
  });
}

/**
 * Notification creation inputs; IDs are generated by toast.
 *
 * @see toast for creation.
 */
type Toast = Omit<ToasterToast, 'id'>;

/**
 * Adds an open notification to the module-global store and returns controls for it.
 *
 * @param props - Content, intent and optional duration; ID/open/onOpenChange are managed here.
 *
 * @returns Generated ID plus dismiss and update controls. Updates preserve the generated ID.
 *
 * @remarks Default duration is 3000 ms, or 5000 ms for destructive. Duration is metadata
 * for the host renderer; this store does not auto-dismiss after duration. Calling dismiss
 * closes the notification and queues removal five seconds later. At most five added
 * notifications are retained. State is shared across hook consumers in this module;
 * mount a renderer consuming useToast, and import Appkit styles for styled UI.
 *
 * @example
 * ```ts
 * import { toast } from '@alneas/appkit-react/ui/hooks';
 * const notice = toast({ title: 'Saved', description: 'The host operation completed.' });
 * notice.dismiss();
 * ```
 */
function toast({ duration, ...props }: Toast & {
  /** Display-duration metadata in milliseconds; not an internal auto-dismiss timer. */
  duration?: number;
}) {
  const id = genId();

  // デフォルトの表示時間: エラーは5秒、それ以外は3秒
  const actualDuration = duration ?? (props.variant === 'destructive' ? 5000 : 3000);

  /**
   * Merges fields into this notification while preserving its generated ID.
   *
   * @param props - Notification fields; the supplied id is overwritten by this notification ID.
   *
   * @returns No value after the store update.
   *
   * @see toast for the creation/control example.
   *
   * @example
   * ```ts
   * import { toast } from '@alneas/appkit-react/ui/hooks';
   * const notice = toast({ title: 'Working' });
   * notice.update({ id: notice.id, title: 'Complete' });
   * notice.dismiss();
   * ```
   */
  const update = (props: ToasterToast) =>
    dispatch({
      type: 'UPDATE_TOAST',
      toast: { ...props, id },
    });
  /**
   * Closes this notification and queues its removal after five seconds.
   *
   * @returns No value after dispatching dismissal.
   *
   * @see toast for a complete example.
   *
   * @example
   * ```ts
   * import { toast } from '@alneas/appkit-react/ui/hooks';
   * const notice = toast({ title: 'Status' });
   * notice.dismiss();
   * ```
   */
  const dismiss = () => dispatch({ type: 'DISMISS_TOAST', toastId: id });

  dispatch({
    type: 'ADD_TOAST',
    toast: {
      ...props,
      id,
      duration: actualDuration,
      open: true,
      onOpenChange: (open: boolean) => {
        if (!open) dismiss();
      },
    },
  });

  return {
    /** Generated notification identifier. */
    id: id,
    /**
     * Close and queue removal; see toast for usage.
     * @returns No value after dispatching dismissal.
     *
     * @see toast for the canonical control example.
     */
    dismiss,
    /**
     * Merge notification fields while preserving id; see toast.
     * @param props - Fields to merge; id is replaced by the original generated ID.
     *
     * @returns No value after dispatching the update.
     *
     * @see toast for the canonical control example.
     */
    update,
  };
}

/**
 * Adds a normal notification with a title and optional content overrides.
 *
 * @param title - Heading content; options.title can override this value.
 *
 * @param options - Other notification inputs; variant is forced to default.
 *
 * @returns Generated ID plus update/dismiss controls, as returned by toast.
 *
 * @remarks Duration defaults to 3000 ms as host-renderer metadata, and can be overridden.
 *
 * @example
 * ```ts
 * import { toast } from '@alneas/appkit-react/ui/hooks';
 * const notice = toast.success('Operation status');
 * notice.dismiss();
 * ```
 */
toast.success = (title: React.ReactNode, options?: Partial<Toast>) =>
  toast({ title, ...options, variant: 'default' });

/**
 * Adds a destructive notification with a title and optional content overrides.
 *
 * @param title - Heading content; options.title can override this value.
 *
 * @param options - Other notification inputs; variant is forced to destructive.
 *
 * @returns Generated ID plus update/dismiss controls, as returned by toast.
 *
 * @remarks Duration defaults to 5000 ms as host-renderer metadata, and can be overridden.
 *
 * @example
 * ```ts
 * import { toast } from '@alneas/appkit-react/ui/hooks';
 * const notice = toast.error('Operation status');
 * notice.dismiss();
 * ```
 */
toast.error = (title: React.ReactNode, options?: Partial<Toast>) =>
  toast({ title, ...options, variant: 'destructive' });

/**
 * Adds a normal notification with a title and optional content overrides.
 *
 * @param title - Heading content; options.title can override this value.
 *
 * @param options - Other notification inputs; variant is forced to default.
 *
 * @returns Generated ID plus update/dismiss controls, as returned by toast.
 *
 * @remarks Duration defaults to 3000 ms as host-renderer metadata, and can be overridden.
 *
 * @example
 * ```ts
 * import { toast } from '@alneas/appkit-react/ui/hooks';
 * const notice = toast.info('Operation status');
 * notice.dismiss();
 * ```
 */
toast.info = (title: React.ReactNode, options?: Partial<Toast>) =>
  toast({ title, ...options, variant: 'default' });

/**
 * Subscribes a component to the shared in-memory notification list.
 *
 * @returns Current notifications, the toast creator and dismiss(id?) that closes one or all entries.
 *
 * @remarks The hook renders nothing; the host must render toasts and honor open/duration.
 * Subscription cleanup removes its listener. Module state/timers survive component
 * unmounts, so this store is not isolated per provider or SSR request. No provider is
 * required; import Appkit styles when using Appkit notification UI.
 *
 * @example
 * ```tsx
 * import { useToast } from '@alneas/appkit-react/ui/hooks';
 * export function Notices() {
 *   const { toasts, dismiss } = useToast();
 *   return <div>{toasts.filter(item => item.open).map(item => <button key={item.id} onClick={() => dismiss(item.id)}>{item.title}</button>)}</div>;
 * }
 * ```
 */
function useToast() {
  const [state, setState] = React.useState<State>(memoryState);

  React.useEffect(() => {
    listeners.push(setState);
    return () => {
      const index = listeners.indexOf(setState);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }, [state]);

  return {
    ...state,
    /**
     * Add notifications; see toast for arguments, results and duration behavior.
     * @param props - Notification content, presentation and optional duration metadata.
     *
     * @returns Generated ID and update/dismiss controls.
     *
     * @see toast for the canonical creation example.
     */
    toast,
    /**
     * Close one or all notifications and queue removal.
     *
     * @param toastId - ID to close; omission closes all current notifications.
     *
     * @returns No value after dispatching dismissal.
     */
    dismiss: (toastId?: string) => dispatch({ type: 'DISMISS_TOAST', toastId }),
  };
}

export { useToast, toast };
