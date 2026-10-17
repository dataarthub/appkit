import * as React from 'react';
import { cn } from "../../lib/utils";
import type { FieldWidth } from "../../lib/schema";

/**
 * フィールド幅に対応するグリッドスパン
 * - short: 1列 (最小幅)
 * - medium: 1列 (デフォルト)
 * - long: 2列にスパン
 * - full: 全列にスパン
 */
const widthToSpan: Record<FieldWidth, string> = {
  short: 'col-span-1',
  medium: 'col-span-1',
  long: 'md:col-span-2',
  full: 'col-span-full',
};

export type GridColumns = 1 | 2 | 3;

export interface FormGridProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * グリッドの列数
   * @default 2
   */
  columns?: GridColumns;
  /**
   * グリッド間のギャップサイズ
   * @default "md"
   */
  gap?: 'sm' | 'md' | 'lg';
}

const gapClasses = {
  sm: 'gap-3',
  md: 'gap-4 md:gap-6',
  lg: 'gap-6 md:gap-8',
};

const columnClasses = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 md:grid-cols-2',
  3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
};

/**
 * レスポンシブなフォームグリッドコンテナ
 *
 * モバイルでは1列、タブレット/デスクトップでは複数列のレイアウトを提供します。
 * フィールド幅ヒントに基づいて適切なスパンを適用します。
 *
 * @example
 * ```tsx
 * <FormGrid columns={2} gap="md">
 *   <FormGridItem width="short">
 *     <Input label="郵便番号" />
 *   </FormGridItem>
 *   <FormGridItem width="full">
 *     <Textarea label="備考" />
 *   </FormGridItem>
 * </FormGrid>
 * ```
 */
export const FormGrid = React.forwardRef<HTMLDivElement, FormGridProps>(
  ({ className, columns = 2, gap = 'md', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('grid', columnClasses[columns], gapClasses[gap], className)}
        {...props}
      >
        {children}
      </div>
    );
  },
);
FormGrid.displayName = 'FormGrid';

export interface FormGridItemProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * フィールドの幅ヒント
   * @default "medium"
   */
  width?: FieldWidth;
}

/**
 * FormGrid内の個別アイテム
 *
 * フィールドの幅に応じて適切なグリッドスパンを適用します。
 */
export const FormGridItem = React.forwardRef<HTMLDivElement, FormGridItemProps>(
  ({ className, width = 'medium', children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn(widthToSpan[width], className)} {...props}>
        {children}
      </div>
    );
  },
);
FormGridItem.displayName = 'FormGridItem';
