import * as React from 'react';
import { cn } from '../../lib/utils';

/**
 * コンテンツを指定したアスペクト比（縦横比）に保つためのコンテナ。
 */
function AspectRatio({
  ratio,
  className,
  ...props
}: React.ComponentProps<'div'> & { ratio: number }) {
  return (
    <div
      data-slot='aspect-ratio'
      style={
        {
          '--ratio': ratio,
        } as React.CSSProperties
      }
      className={cn('relative aspect-(--ratio)', className)}
      {...props}
    />
  );
}

export { AspectRatio };
