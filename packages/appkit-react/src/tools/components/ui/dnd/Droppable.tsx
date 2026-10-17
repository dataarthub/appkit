import React from 'react';
import { useDroppable } from '@dnd-kit/core';

export interface DroppableProps {
  /** 一意識別子 */
  id: string;
  /** ドロップイベントに付随させるデータ */
  data?: Record<string, any>;
  /** 無効化フラグ */
  disabled?: boolean;
  /** 子要素 */
  children: (props: {
    setNodeRef: (node: HTMLElement | null) => void;
    isOver: boolean;
  }) => React.ReactNode;
}

/**
 * ドロップ可能な領域を作成するコンポーネント
 */
export function Droppable({ id, data, disabled, children }: DroppableProps) {
  const { isOver, setNodeRef } = useDroppable({
    id,
    data,
    disabled,
  });

  return <>{children({ setNodeRef, isOver })}</>;
}
