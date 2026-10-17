import type { ReactNode } from 'react';

export interface DisplayField<T> {
  key: string;
  label: string;
  width?: string;
  className?: string;
  render?: (value: unknown, item: T) => ReactNode;
}
