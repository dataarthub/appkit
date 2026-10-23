import * as React from 'react';
import { cn } from "../../lib/utils";

const containerWidths = {
  sm: 'max-w-sm', // 384px
  md: 'max-w-md', // 448px
  lg: 'max-w-lg', // 512px
  xl: 'max-w-xl', // 576px
  '2xl': 'max-w-2xl', // 672px
  '3xl': 'max-w-3xl', // 768px
  '4xl': 'max-w-4xl', // 896px
  '5xl': 'max-w-5xl', // 1024px
} as const;

export type FormContainerWidth = keyof typeof containerWidths;

export interface FormContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * コンテナの最大幅
   * @default "4xl" (896px)
   */
  maxWidth?: FormContainerWidth;
  /**
   * フルスクリーンモード (max-width制限なし)
   */
  fullWidth?: boolean;
}

/**
 * フォーム用の中央揃えコンテナ
 *
 * デスクトップ画面での読みやすさを確保するため、適切な最大幅で中央揃えにします。
 * レスポンシブパディングを提供し、一貫した余白を保ちます。
 *
 * @example
 * ```tsx
 * <FormContainer maxWidth="4xl">
 *   <form>...</form>
 * </FormContainer>
 * ```
 */
export function FormContainer({
  ref,
  className,
  maxWidth = '4xl',
  fullWidth = false,
  children,
  ...props
}: React.PropsWithoutRef<FormContainerProps> & React.RefAttributes<HTMLDivElement>) {
  return (
    <div
      ref={ref}
      className={cn(
        'mx-auto w-full px-4 py-6 md:px-6 lg:px-8',
        !fullWidth && containerWidths[maxWidth],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
FormContainer.displayName = 'FormContainer';
