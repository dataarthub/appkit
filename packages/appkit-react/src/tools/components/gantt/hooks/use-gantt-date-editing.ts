import { useEffect, useRef, useState, type PointerEvent, type KeyboardEvent } from 'react';
import { addDays, differenceInCalendarDays } from 'date-fns';
import type { ComputedTask, GanttDateEditingConfig } from '../types';

type Operation = 'move' | 'start' | 'end';
/** Calendar-day edit with a minimum one-day resized duration. */
export function editedDates(start: Date, end: Date, operation: Operation, days: number) {
  const duration = Math.max(1, differenceInCalendarDays(end, start));
  const delta =
    operation === 'start'
      ? Math.min(days, duration - 1)
      : operation === 'end'
        ? Math.max(days, 1 - duration)
        : days;
  return {
    start: operation === 'end' ? start : addDays(start, delta),
    end: operation === 'start' ? end : addDays(end, delta),
    delta,
  };
}

/** Pointer capture + keyboard editing; preview stays local until pointer-up. */
export function useGanttDateEditing(
  task: ComputedTask,
  cellWidth: number,
  config: GanttDateEditingConfig | undefined,
  onChange: ((id: string, start: Date, end: Date) => void) | undefined,
  disabled = false,
) {
  const enabled = Boolean(
    config?.enabled && onChange && Number.isFinite(cellWidth) && cellWidth > 0,
  );
  const snap =
    Number.isSafeInteger(config?.snapDays) && config!.snapDays! > 0 ? config!.snapDays! : 1;
  const [preview, setPreview] = useState<{ operation: Operation; days: number } | null>(null);
  const drag = useRef<{ pointerId: number; x: number; operation: Operation; days: number } | null>(
    null,
  );
  const suppressClick = useRef(false);
  const key = `${task.id}:${+task.computedStart}:${+task.computedEnd}:${enabled}:${disabled}:${cellWidth}:${snap}:${config?.movable}:${config?.resizable}`;
  const [previousKey, setPreviousKey] = useState(key);
  if (previousKey !== key) {
    setPreviousKey(key);
    setPreview(null);
  }
  // Ref invalidation occurs in an effect, while event handlers also compare their captured key.
  const activeKey = useRef(key);
  useEffect(() => {
    activeKey.current = key;
    drag.current = null;
  }, [key]);
  const isDragging = preview !== null;
  useEffect(() => {
    if (!isDragging) return;
    const escape = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape' && drag.current) {
        event.preventDefault();
        event.stopPropagation();
        drag.current = null;
        suppressClick.current = true;
        setPreview(null);
      }
    };
    document.addEventListener('keydown', escape, true);
    return () => document.removeEventListener('keydown', escape, true);
  }, [isDragging]);
  const available = (operation: Operation) =>
    enabled && (operation === 'move' ? config?.movable !== false : config?.resizable !== false);
  const allowed = (operation: Operation) => !disabled && available(operation);
  const commit = (operation: Operation, days: number) => {
    const next = editedDates(task.computedStart, task.computedEnd, operation, days);
    if (next.delta && Number.isFinite(+next.start) && Number.isFinite(+next.end))
      onChange?.(task.id, next.start, next.end);
  };
  const bind = (operation: Operation) => ({
    onPointerDown(event: PointerEvent<HTMLElement>) {
      suppressClick.current = false;
      if (!allowed(operation) || event.button !== 0 || drag.current) return;
      event.preventDefault();
      event.stopPropagation();
      event.currentTarget.focus();
      event.currentTarget.setPointerCapture(event.pointerId);
      drag.current = { pointerId: event.pointerId, x: event.clientX, operation, days: 0 };
      setPreview({ operation, days: 0 });
    },
    onPointerMove(event: PointerEvent<HTMLElement>) {
      const current = drag.current;
      if (!current || current.pointerId !== event.pointerId || activeKey.current !== key) return;
      const days = Math.round((event.clientX - current.x) / cellWidth / snap) * snap;
      current.days = days;
      setPreview({ operation: current.operation, days });
    },
    onPointerUp(event: PointerEvent<HTMLElement>) {
      const current = drag.current;
      if (!current || current.pointerId !== event.pointerId) return;
      drag.current = null;
      setPreview(null);
      const days = Math.round((event.clientX - current.x) / cellWidth / snap) * snap;
      suppressClick.current = days !== 0;
      if (event.currentTarget.hasPointerCapture(event.pointerId))
        event.currentTarget.releasePointerCapture(event.pointerId);
      if (activeKey.current === key && allowed(operation)) commit(current.operation, days);
    },
    onPointerCancel() {
      drag.current = null;
      suppressClick.current = true;
      setPreview(null);
    },
    onLostPointerCapture() {
      if (drag.current) {
        drag.current = null;
        suppressClick.current = true;
        setPreview(null);
      }
    },
    onKeyDown(event: KeyboardEvent<HTMLElement>) {
      if (
        event.target !== event.currentTarget ||
        !allowed(operation) ||
        !['ArrowLeft', 'ArrowRight'].includes(event.key)
      )
        return;
      event.preventDefault();
      event.stopPropagation();
      commit(operation, (event.key === 'ArrowRight' ? 1 : -1) * snap);
    },
  });
  const delta = preview
    ? editedDates(task.computedStart, task.computedEnd, preview.operation, preview.days).delta
    : 0;
  return {
    bind,
    allowed,
    available,
    leftDelta: preview?.operation === 'end' ? 0 : delta * cellWidth,
    widthDelta:
      preview?.operation === 'start'
        ? -delta * cellWidth
        : preview?.operation === 'end'
          ? delta * cellWidth
          : 0,
    consumeClick: () => {
      const value = suppressClick.current;
      suppressClick.current = false;
      return value;
    },
  };
}
