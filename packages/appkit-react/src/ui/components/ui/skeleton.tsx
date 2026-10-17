import { cn } from '../../lib/utils';

/**
 * データ読み込み中に表示するプレースホルダー用のスケルトン（骨組み）コンポーネント。
 */
function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot='skeleton'
      className={cn('bg-muted rounded-md animate-pulse', className)}
      {...props}
    />
  );
}

export { Skeleton };
