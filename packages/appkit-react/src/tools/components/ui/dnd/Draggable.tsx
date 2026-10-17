import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

export interface DraggableProps {
  /** 一意識別子 */
  id: string;
  /** ドラッグイベントに付随させるデータ */
  data?: Record<string, any>;
  /** 子要素 */
  children: (props: {
    attributes: any;
    listeners: any;
    setNodeRef: (node: HTMLElement | null) => void;
    isDragging: boolean;
    style: React.CSSProperties;
  }) => React.ReactNode;
}

/**
 * ドラッグ可能な要素を作成するコンポーネント
 */
export function Draggable({ id, data, children }: DraggableProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
    data,
  });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : undefined,
    cursor: 'grab',
  };

  return <>{children({ attributes, listeners, setNodeRef, isDragging, style })}</>;
}
