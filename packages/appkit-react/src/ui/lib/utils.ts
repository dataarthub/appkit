import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Tailwind CSS のクラス名を安全に結合し、競合を解決します。
 * clsx で条件付きクラスを処理し、tailwind-merge で重複するスタイルを上書きします。
 *
 * @param inputs - 結合するクラス名の配列（文字列、オブジェクト、ブール値など）
 * @returns 最適化されたクラス名文字列
 *
 * @example
 * ```typescript
 * cn('px-2 py-1', isPrimary && 'bg-blue-500', className)
 * ```
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
