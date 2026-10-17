import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type FocusEvent,
  type UIEvent,
} from 'react';

/** Deterministic first window for SSR; overscan plus a focused/dragged row keep controls mounted. */
export function ganttRowWindow(
  count: number,
  rowHeight: number,
  scrollTop: number,
  height: number,
  enabled: boolean,
  pinned = -1,
) {
  const start = enabled ? Math.min(count, Math.max(0, Math.floor(scrollTop / rowHeight) - 4)) : 0;
  const end = enabled ? Math.min(count, Math.ceil((scrollTop + height) / rowHeight) + 4) : count;
  const indices = Array.from({ length: Math.max(0, end - start) }, (_, i) => start + i);
  if (pinned >= 0 && pinned < count && !indices.includes(pinned)) indices.push(pinned);
  indices.sort((a, b) => a - b);
  return { start, end, indices };
}
const controls = 'button:not(:disabled),input:not(:disabled),[tabindex="0"]';

/** Synchronize two vertical viewports without coupling chart horizontal scroll. */
export function useGanttRowWindow(
  ids: string[],
  rowHeight: number,
  enabled: boolean,
  editingId?: string,
  paneKey = '',
) {
  const listRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState({ top: 0, height: 480, bottomInset: 0 });
  const [focusedId, setFocusedId] = useState<string | undefined>();
  const [pointerId, setPointerId] = useState<string | undefined>();
  const focusFrame = useRef<number | undefined>(undefined);
  const pinned = ids.indexOf(pointerId ?? focusedId ?? editingId ?? '');
  const window = ganttRowWindow(
    ids.length,
    rowHeight,
    viewport.top,
    viewport.height,
    enabled,
    pinned,
  );

  const onScroll = (event: UIEvent<HTMLDivElement>) => {
    const source = event.currentTarget;
    // React may consume this update after the DOM has scrolled again. Capture
    // event-time values so the updater stays pure and both panes use one position.
    const top = source.scrollTop;
    const other = source === listRef.current ? chartRef.current : listRef.current;
    if (other && other.scrollTop !== top) other.scrollTop = top;
    const height = Math.max(1, source.clientHeight - (source === chartRef.current ? rowHeight : 0));
    setViewport((previous) =>
      previous.top === top && previous.height === height
        ? previous
        : { ...previous, top, height },
    );
  };
  useEffect(() => {
    const measure = () => {
      const source = chartRef.current ?? listRef.current;
      if (!source) return;
      const height = Math.max(
        1,
        source.clientHeight - (source === chartRef.current ? rowHeight : 0),
      );
      const top = source.scrollTop;
      const bottomInset = chartRef.current
        ? chartRef.current.offsetHeight - chartRef.current.clientHeight
        : 0;
      if (listRef.current) listRef.current.scrollTop = top;
      if (chartRef.current) chartRef.current.scrollTop = top;
      setViewport((previous) =>
        previous.top === top && previous.height === height && previous.bottomInset === bottomInset
          ? previous
          : { top, height, bottomInset },
      );
    };
    const frame = requestAnimationFrame(measure);
    const observer = new ResizeObserver(measure);
    if (chartRef.current) observer.observe(chartRef.current);
    if (listRef.current) observer.observe(listRef.current);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [ids.length, rowHeight, enabled, paneKey]);
  useEffect(
    () => () => {
      if (focusFrame.current !== undefined) cancelAnimationFrame(focusFrame.current);
    },
    [],
  );
  const rowId = (element: EventTarget | null) =>
    element instanceof Element
      ? element.closest<HTMLElement>('[data-gantt-row-id]')?.dataset.ganttRowId
      : undefined;
  const onFocusCapture = (event: FocusEvent<HTMLDivElement>) => setFocusedId(rowId(event.target));
  const onBlurCapture = (event: FocusEvent<HTMLDivElement>) => {
    // A dialog keeps its source row via editingId. Moving focus between panes pins the new row.
    setFocusedId(rowId(event.relatedTarget));
  };
  const onKeyDownCapture = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!enabled || event.altKey || event.metaKey) return;
    const index = ids.indexOf(rowId(event.target) ?? '');
    if (index < 0) return;
    const target = event.target as HTMLElement;
    const row = target.closest<HTMLElement>('[data-gantt-row-id]')!;
    const items = [...row.querySelectorAll<HTMLElement>(controls)];
    let next = index;
    let last = false;
    if (event.key === 'Tab') {
      if (event.ctrlKey) return;
      if (event.shiftKey ? target !== items[0] : target !== items[items.length - 1]) return;
      next += event.shiftKey ? -1 : 1;
      last = event.shiftKey;
    } else if (event.ctrlKey && ['Home', 'End'].includes(event.key)) {
      next = event.key === 'Home' ? 0 : ids.length - 1;
    } else return;
    if (next < 0 || next >= ids.length) return; // Leave the component normally; no focus trap.
    event.preventDefault();
    event.stopPropagation();
    setFocusedId(ids[next]);
    const pane = event.currentTarget;
    const top = next * rowHeight;
    if (top < viewport.top || top + rowHeight > viewport.top + viewport.height) {
      if (listRef.current) listRef.current.scrollTop = top;
      if (chartRef.current) chartRef.current.scrollTop = top;
      setViewport((previous) => ({ ...previous, top }));
    }
    if (focusFrame.current !== undefined) cancelAnimationFrame(focusFrame.current);
    focusFrame.current = requestAnimationFrame(() => {
      const nextRow = [...pane.querySelectorAll<HTMLElement>('[data-gantt-row-id]')].find(
        (element) => element.dataset.ganttRowId === ids[next],
      );
      const elements = nextRow?.querySelectorAll<HTMLElement>(controls);
      (last ? elements?.[elements.length - 1] : elements?.[0])?.focus({ preventScroll: true });
    });
  };
  return {
    ...window,
    bottomInset: viewport.bottomInset,
    listRef,
    chartRef,
    onScroll,
    onFocusCapture,
    onBlurCapture,
    onKeyDownCapture,
    onPointerDownCapture: (event: { target: EventTarget }) => setPointerId(rowId(event.target)),
    onPointerUpCapture: () => setPointerId(undefined),
    onPointerCancelCapture: () => setPointerId(undefined),
    onLostPointerCapture: () => setPointerId(undefined),
  };
}
