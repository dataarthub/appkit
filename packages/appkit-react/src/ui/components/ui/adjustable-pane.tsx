import { useCallback, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '../ui/resizable';
import { cn } from '../../lib/utils';

/**
 * Controlled pane visibility, percentage size bounds and content for AdjustablePane.
 * @remarks Inherited native or primitive props keep their upstream types and behavior; this declaration documents only the wrapper-owned options.
 * @see AdjustablePane
 */
export type AdjustablePaneProps = {
  /**
   * Pane placement; defaults to right. bottom selects vertical resizing.
   */
  side?: 'right' | 'bottom';
  /**
   * Controlled visibility; the host updates this value in response to close/open requests.
   */
  open: boolean;
  /**
   * Called by the close button; the host must set open=false. Omitted hides the close button.
   * @returns No value; complete the host callback action.
   */
  onClose?: () => void;
  /**
   * Initial pane share in percent (default 30); later changes reset local size before clamping.
   */
  initialSize?: number;
  /**
   * Minimum pane share in percent (default 20). Supply bounds in a consistent 0–100 range; the wrapper does not validate them.
   */
  minSize?: number;
  /**
   * Maximum pane share in percent (default 60). Supply a value at least minSize.
   */
  maxSize?: number;
  /**
   * Additional classes merged with wrapper styling; see the component for the targeted element.
   */
  className?: string;
  /**
   * Additional classes on the scrollable pane content container.
   */
  paneClassName?: string;
  /**
   * Content rendered in the wrapper's child region.
   */
  children?: React.ReactNode;
  /**
   * Content rendered in the remaining main panel.
   */
  main?: React.ReactNode;
};

/**
 * Divides a container between main content and a mouse-resizable right or bottom pane.
 * @param props - Component attributes and children accepted by the declared native/underlying prop type; className customizes wrapper styling. Wrapper defaults: side='right', initialSize=30, minSize=20, maxSize=60.
 * @returns The rendered AdjustablePane composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Give the host a nonzero width and height. open is controlled; onClose requests closure without changing it. Sizes are percentages clamped between minSize/maxSize. Changing initialSize resets local size. Drag listeners attach to window and are removed on mouseup; unmount during a drag does not install separate cleanup. This wrapper implements mouse resizing; it does not add keyboard resizing.
 * @example
 * ```tsx
 * import { AdjustablePane } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<AdjustablePane open side="right" main={<p>Main content</p>}>Details</AdjustablePane>);
 * }
 * ```
 */
export function AdjustablePane({
  side = 'right',
  open,
  onClose,
  initialSize = 30,
  minSize = 20,
  maxSize = 60,
  className,
  paneClassName,
  children,
  main,
}: AdjustablePaneProps) {
  const vertical = side === 'bottom';
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState<number>(initialSize);
  const [prevInitialSize, setPrevInitialSize] = useState(initialSize);

  if (initialSize !== prevInitialSize) {
    setSize(initialSize);
    setPrevInitialSize(initialSize);
  }

  const clampedSize = Math.min(Math.max(size, minSize), maxSize);

  const startDrag = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();

      const onMove = (ev: MouseEvent) => {
        if (vertical) {
          const offset = rect.bottom - ev.clientY;
          const percent = (offset / rect.height) * 100;
          setSize(percent);
        } else {
          const offset = rect.right - ev.clientX;
          const percent = (offset / rect.width) * 100;
          setSize(percent);
        }
      };

      const onUp = () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };

      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    },
    [vertical],
  );

  const mainFlexPercent = 100 - clampedSize;
  const computedMainFlex = open ? `${mainFlexPercent}%` : '100%';
  const computedPaneFlex = open ? `${clampedSize}%` : '0%';

  return (
    <div ref={containerRef} className={cn('h-full w-full', className)}>
      <ResizablePanelGroup
        data-panel-group-direction={vertical ? 'vertical' : 'horizontal'}
        style={{ userSelect: 'none' }}
      >
        {side === 'right' ? (
          <>
            <ResizablePanel className='min-w-0' style={{ flex: `0 0 ${computedMainFlex}` }}>
              <div className='h-full w-full overflow-auto'>{main}</div>
            </ResizablePanel>
            {open && (
              <>
                <ResizableHandle className='cursor-col-resize' onMouseDown={startDrag} />
                <ResizablePanel
                  className='min-w-[200px]'
                  style={{ flex: `0 0 ${computedPaneFlex}` }}
                >
                  <div
                    className={cn('h-full w-full overflow-auto border-l bg-card', paneClassName)}
                  >
                    <div className='sticky top-0 z-10 flex items-center justify-end gap-2 border-b bg-card px-2 py-1'>
                      {onClose && (
                        <button
                          type='button'
                          aria-label='Close pane'
                          className='inline-flex h-7 w-7 items-center justify-center rounded hover:bg-muted'
                          onClick={onClose}
                        >
                          <X className='h-4 w-4' />
                        </button>
                      )}
                    </div>
                    <div className='p-2'>{children}</div>
                  </div>
                </ResizablePanel>
              </>
            )}
          </>
        ) : (
          <>
            <ResizablePanel
              className='min-h-0'
              style={{ flex: `0 0 ${open ? `${100 - clampedSize}%` : '100%'}` }}
            >
              <div className='h-full w-full overflow-auto'>{main}</div>
            </ResizablePanel>
            {open && (
              <>
                <ResizableHandle className='cursor-row-resize' onMouseDown={startDrag} />
                <ResizablePanel
                  className='min-h-[160px]'
                  style={{ flex: `0 0 ${open ? `${clampedSize}%` : '0%'}` }}
                >
                  <div
                    className={cn('h-full w-full overflow-auto border-t bg-card', paneClassName)}
                  >
                    <div className='sticky top-0 z-10 flex items-center justify-end gap-2 border-b bg-card px-2 py-1'>
                      {onClose && (
                        <button
                          type='button'
                          aria-label='Close pane'
                          className='inline-flex h-7 w-7 items-center justify-center rounded hover:bg-muted'
                          onClick={onClose}
                        >
                          <X className='h-4 w-4' />
                        </button>
                      )}
                    </div>
                    <div className='p-2'>{children}</div>
                  </div>
                </ResizablePanel>
              </>
            )}
          </>
        )}
      </ResizablePanelGroup>
    </div>
  );
}
