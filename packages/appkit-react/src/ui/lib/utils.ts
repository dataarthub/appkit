import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combines conditional class values with clsx and resolves Tailwind conflicts with tailwind-merge.
 *
 * @param inputs - Class strings, arrays or conditional objects accepted by clsx.
 *
 * @returns A merged class string; later conflicting Tailwind utilities generally win.
 *
 * @remarks Pure formatting helper; no React provider or stylesheet is required to call it.
 *
 * @example
 * ```ts
 * import { cn } from '@alneas/appkit-react/ui/utils';
 * const className = cn('px-2 py-1', { 'bg-blue-500': true }, 'px-4');
 * ```
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
