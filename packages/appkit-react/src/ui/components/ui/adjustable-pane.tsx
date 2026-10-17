import { useCallback, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '../ui/resizable';
import { cn } from '../../lib/utils';

/**
 * AdjustablePane のプロパティ
 * Properties for the AdjustablePane component
 */
export type AdjustablePaneProps = {
  /** ペインの表示位置 / Side to display the pane */
  side?: 'right' | 'bottom';
  /** ペインの開閉状態 / Whether the pane is open */
  open: boolean;
  /** ペインを閉じる時のコールバック / Callback when closing the pane */
  onClose?: () => void;
  /** 初期サイズ（パーセンテージ） / Initial size in percentage */
  initialSize?: number;
  /** 最小サイズ（パーセンテージ） / Minimum size in percentage */
  minSize?: number;
  /** 最大サイズ（パーセンテージ） / Maximum size in percentage */
  maxSize?: number;
  /** コンテナのクラス名 / Container className */
  className?: string;
  /** ペイン内部のクラス名 / Pane content className */
  paneClassName?: string;
  /** ペイン内のコンテンツ / Content rendered inside the pane */
  children?: React.ReactNode;
  /** メインエリアのコンテンツ / Content rendered in the main area */
  main?: React.ReactNode;
};

/**
 * リサイズ可能なサイドペイン / ボトムペインコンポーネント。
 * マウスドラッグでサイズを調整でき、右側または下側に配置可能。
 *
 * A resizable side/bottom pane component with drag-to-resize,
 * close button, and configurable min/max sizes.
 *
 * @example
 * ```tsx
 * <AdjustablePane
 *   open={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   initialSize={35}
 *   main={<MainContent />}
 * >
 *   <PaneContent />
 * </AdjustablePane>
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
