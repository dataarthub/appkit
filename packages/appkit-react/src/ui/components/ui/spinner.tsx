import { cn } from '../../lib/utils';
import { Loader2Icon } from 'lucide-react';

/**
 * 読み込み中や非同期処理の実行中を示す回転するスピナーアイコン。
 */
function Spinner({ className, ...props }: React.ComponentProps<'svg'>) {
  return (
    <Loader2Icon
      role='status'
      aria-label='Loading'
      className={cn('size-4 animate-spin', className)}
      {...props}
    />
  );
}

export { Spinner };
